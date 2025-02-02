import { BadRequestException, HttpException, Injectable, NotFoundException } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { JwtService } from '@nestjs/jwt'

import { ConfirmCodeType, Role } from '@prisma/client'

import { MailService } from '@/modules/mail/mail.service'
import { PrismaService } from '@/modules/prisma/prisma.service'
import { CreateUserDto } from '@/modules/users/dto/create-user.dto'
import { UsersService } from '@/modules/users/users.service'
import { generateConfirmToken } from '@/utils/token-generator'

import { ChangePasswordWithTokenDto } from './dto/reset-password.dto'
import { SignInWithEmailDto, SignInWithPhoneDto } from './dto/sign-in.dto'
import { AccessTokenPayload, RefreshTokenPayload } from './types'

import * as argon2 from 'argon2'
import { Request, Response } from 'express'

@Injectable()
export class AuthService {
	constructor(
		private usersService: UsersService,
		private jwtService: JwtService,
		private configService: ConfigService,
		private prismaService: PrismaService,
		private mailService: MailService,
	) {}

	async signUp(createUserDto: CreateUserDto) {
		const user = await this.usersService.create(createUserDto)

		const token = await generateConfirmToken()
		const url = `${this.configService.get('FRONTEND_URL')}/auth/confirm-email?token=${token}&email=${user.email}`

		const mailConfirmCodeExpiresAt = new Date(Date.now() + 5 * 60 * 1000)

		const confirmToken = await this.prismaService.confirmTokens.create({
			data: {
				type: 'MAIL',
				token,
				expiresAt: mailConfirmCodeExpiresAt,
				userId: user.id,
			},
		})

		try {
			await this.mailService.sendMailConfirmURL(url, user.email)
		} catch (error) {
			await this.prismaService.confirmTokens.delete({
				where: {
					id: confirmToken.id,
				},
			})
			throw new HttpException(
				`Ошибка при отправке письма. Действие отменено. Ошибка: ${error}`,
				500,
			)
		}

		return {
			status: 200,
			message:
				'Вы успешно зарегистрировались. Ссылка подтверждения отправлен на вашу электронную почту. Ссылка действительна 5 минут',
			data: {
				id: user.id,
				email: user.email,
				mailConfirmCodeExpiresAt,
			},
		}
	}

	async signInWithEmail(signInWithEmailDto: SignInWithEmailDto, req: Request) {
		const user = await this.usersService.findByEmail(signInWithEmailDto.email)
		if (!user) throw new BadRequestException('Неверные данные для входа')

		const isPasswordValid = await argon2.verify(user.password, signInWithEmailDto.password)
		if (!isPasswordValid) throw new BadRequestException('Неверные данные для входа')

		const ip = req.ip
		const userAgent = req.headers['user-agent'] as string

		if (!ip || !userAgent) throw new BadRequestException('Ip (и) или userAgent не указан(ы)')

		if (!user.emailConfirmed) return await this.sendConfirmEmailURL(user.email)

		const { accessToken, refreshToken } = await this.generateTokens(
			user.id,
			ip,
			userAgent,
			user.role,
		)

		await this.setAuthCookies(req.res, accessToken, refreshToken)

		return {
			status: 200,
			message: 'Авторизация успешна',
			data: {
				id: user.id,
				email: user.email,
				firstName: user.firstName,
				lastName: user.lastName,
				role: user.role,
			},
		}
	}

	async signInWithPhone(signInWithPhoneDto: SignInWithPhoneDto, req: Request) {
		const user = await this.usersService.findByPhone(signInWithPhoneDto.phone)
		if (!user) throw new BadRequestException('Неверные данные для входа')

		const isPasswordValid = await argon2.verify(user.password, signInWithPhoneDto.password)
		if (!isPasswordValid) throw new BadRequestException('Неверные данные для входа')

		const ip = req.ip
		const userAgent = req.headers['user-agent'] as string

		if (!ip || !userAgent) throw new BadRequestException('Ip (и) или userAgent не указан(ы)')

		if (!user.emailConfirmed) return await this.sendConfirmEmailURL(user.email)

		const { accessToken, refreshToken } = await this.generateTokens(
			user.id,
			ip,
			userAgent,
			user.role,
		)

		await this.setAuthCookies(req.res, accessToken, refreshToken)

		return {
			status: 200,
			message: 'Авторизация успешна',
			data: {
				id: user.id,
				email: user.email,
				phone: user.phone,
				firstName: user.firstName,
				lastName: user.lastName,
				role: user.role,
			},
		}
	}

	async signOut(req: Request) {
		const refreshTokenOld = req.cookies.refreshToken
		if (!refreshTokenOld) throw new NotFoundException('Не найден refresh token')

		const { userId } = await this.jwtService
			.verifyAsync<RefreshTokenPayload>(refreshTokenOld, {
				secret: this.configService.get('JWT_REFRESH_TOKEN_SECRET'),
			})
			.catch(async () => {
				await this.prismaService.refreshToken.delete({
					where: {
						userId,
						token: refreshTokenOld,
					},
				})

				throw new BadRequestException('Неверный refresh token')
			})

		await this.prismaService.refreshToken.delete({
			where: {
				userId,
				token: refreshTokenOld,
			},
		})

		const res = req.res

		res.clearCookie('refreshToken')
		res.clearCookie('accessToken')

		return {
			status: 200,
			message: 'Вы вышли из системы',
		}
	}

	async getMe(userId: string) {
		const user = await this.prismaService.user.findUnique({
			where: { id: userId },
			omit: {
				password: true,
			},
		})

		return {
			status: 200,
			message: 'Получена информация о пользователе',
			data: user,
		}
	}

	async refreshToken(req: Request) {
		const refreshTokenOld = req.cookies.refreshToken
		if (!refreshTokenOld) throw new NotFoundException('Не найден refresh token')

		const ip = req.ip
		const userAgent = req.headers['user-agent'] as string

		if (!ip || !userAgent) throw new BadRequestException('Ip (и) или userAgent не указан(ы)')

		const { userId } = await this.jwtService
			.verifyAsync<RefreshTokenPayload>(refreshTokenOld, {
				secret: this.configService.get('JWT_REFRESH_TOKEN_SECRET'),
			})
			.catch(async () => {
				await this.prismaService.refreshToken.delete({
					where: {
						token: refreshTokenOld,
					},
				})

				throw new BadRequestException('Неверный refresh token')
			})

		const user = await this.usersService.findById(userId)
		if (!user) throw new NotFoundException('Пользователь не найден')

		const refreshTokenDB = await this.prismaService.refreshToken.findFirst({
			where: {
				userId,
				token: refreshTokenOld,
			},
		})

		if (!refreshTokenDB) throw new BadRequestException('Неверный refresh token')

		const dt = new Date()
		if (dt > refreshTokenDB.expiresAt) {
			await this.prismaService.refreshToken.delete({
				where: {
					id: refreshTokenDB.id,
				},
			})

			throw new BadRequestException('Токен отозван')
		}

		const { accessToken, refreshToken } = await this.generateTokens(
			user.id,
			ip,
			userAgent,
			user.role,
		)

		await this.setAuthCookies(req.res, accessToken, refreshToken)

		return {
			status: 200,
			message: 'Обновление токенов успешно',
			data: null,
		}
	}

	async resendConfirmEmail(email: string) {
		return await this.sendConfirmEmailURL(email)
	}

	async confirmEmail(token: string, email: string) {
		const confirmTokenExists = await this.prismaService.confirmTokens.findFirst({
			where: {
				user: {
					email,
				},
				type: ConfirmCodeType.MAIL,
				used: false,
			},
			select: {
				id: true,
				expiresAt: true,
				attempts: true,
				token: true,
				user: {
					select: {
						id: true,
						email: true,
					},
				},
			},
		})

		if (!confirmTokenExists) throw new NotFoundException('Код не найден')
		if (confirmTokenExists.token !== token) {
			await this.prismaService.confirmTokens.update({
				where: {
					id: confirmTokenExists.id,
				},
				data: {
					attempts: {
						increment: 1,
					},
				},
			})

			if (confirmTokenExists.attempts >= 3) {
				await this.prismaService.confirmTokens.delete({
					where: {
						id: confirmTokenExists.id,
					},
				})
				throw new BadRequestException('Превышено количество попыток')
			}

			throw new BadRequestException('Неверный код подтверждения')
		}
		if (confirmTokenExists.expiresAt < new Date()) {
			await this.prismaService.confirmTokens.delete({
				where: {
					id: confirmTokenExists.id,
				},
			})
			throw new BadRequestException('Срок действия кода истек')
		}

		const user = confirmTokenExists.user

		await this.prismaService.confirmTokens.delete({
			where: {
				id: confirmTokenExists.id,
			},
		})

		if (!user) throw new NotFoundException('Пользователь не найден')

		await this.prismaService.user.update({
			where: {
				id: user.id,
			},
			data: {
				emailConfirmed: true,
			},
		})

		return {
			status: 200,
			message: 'Email подтвержден',
			data: {
				id: user.id,
				email: user.email,
			},
		}
	}

	private async sendConfirmEmailURL(email: string) {
		const user = await this.usersService.findByEmail(email)
		if (!user) throw new NotFoundException('Пользователь не найден')
		if (user.emailConfirmed) throw new BadRequestException('Почта уже подтверждена')

		const confirmTokenExists = await this.prismaService.confirmTokens.findFirst({
			where: {
				type: ConfirmCodeType.MAIL,
				used: false,
				userId: user.id,
			},
		})

		if (confirmTokenExists) {
			const expiresTime = new Date(confirmTokenExists.expiresAt).getTime()
			const currentTime = new Date().getTime()

			const minutes = (expiresTime - currentTime) / 1000 / 60
			const seconds = ((expiresTime - currentTime) / 1000) % 60

			if (minutes > 0 && seconds >= 30) {
				throw new BadRequestException(
					`Подтверждение почты уже отправлено. Осталось ${minutes} минут ${seconds} секунд до истечения срока действия`,
				)
			} else {
				await this.prismaService.confirmTokens.delete({
					where: {
						id: confirmTokenExists.id,
					},
				})
			}
		}

		const token = await generateConfirmToken()
		const url = `${this.configService.get('FRONTEND_URL')}/auth/confirm-email?token=${token}&email=${email}`

		const newConfirmToken = await this.prismaService.confirmTokens.create({
			data: {
				type: ConfirmCodeType.MAIL,
				token,
				userId: user.id,
				expiresAt: new Date(Date.now() + 15 * 60 * 1000),
			},
		})

		try {
			await this.mailService.sendMailConfirmURL(url, email)
		} catch (error) {
			await this.prismaService.confirmTokens.delete({
				where: {
					id: newConfirmToken.id,
				},
			})
			throw new HttpException(
				`Ошибка при отправке письма. Действие отменено. Ошибка: ${error}`,
				500,
			)
		}

		return {
			status: 200,
			message:
				'Ссылка подтверждения отправлена на вашу электронную почту. Ссылка действительна 5 минут',
			data: {
				id: user.id,
				email: user.email,
				mailConfirmCodeExpiresAt: newConfirmToken.expiresAt,
			},
		}
	}

	private async generateTokens(userId: string, ip: string, userAgent: string, roles: Role[]) {
		const accessTokenPayload: AccessTokenPayload = {
			userId,
			roles,
		}

		const refreshTokenPayload: RefreshTokenPayload = {
			userId,
		}

		const [accessToken, refreshToken] = await Promise.all([
			this.jwtService.signAsync(accessTokenPayload, {
				secret: this.configService.get('JWT_ACCESS_TOKEN_SECRET'),
				expiresIn: this.configService.get('JWT_ACCESS_TOKEN_EXPIRATION_TIME'),
			}),
			this.jwtService.signAsync(refreshTokenPayload, {
				secret: this.configService.get('JWT_REFRESH_TOKEN_SECRET'),
				expiresIn: this.configService.get('JWT_REFRESH_TOKEN_EXPIRATION_TIME'),
			}),
		])

		await this.prismaService.refreshToken.deleteMany({
			where: {
				userId,
				OR: [{ ip }, { userAgent }],
			},
		})

		const currentDate = new Date()

		await this.prismaService.refreshToken.deleteMany({
			where: {
				userId,
				expiresAt: {
					lte: currentDate,
				},
			},
		})

		const expiresDate = new Date()
		expiresDate.setDate(
			expiresDate.getDate() +
				Number(this.configService.get('JWT_REFRESH_TOKEN_EXPIRATION_TIME').replace('d', '')),
		)

		await this.prismaService.refreshToken.create({
			data: {
				userId,
				token: refreshToken,
				ip,
				userAgent,
				expiresAt: expiresDate,
			},
		})

		return {
			accessToken,
			refreshToken,
		}
	}

	private async setAuthCookies(res: Response, accessToken: string, refreshToken: string) {
		res.cookie('refreshToken', refreshToken, {
			httpOnly: true,
			secure: true,
			sameSite: 'none',
			maxAge: 1000 * 60 * 60 * 24 * 14, // 14 days
		})

		res.cookie('accessToken', accessToken, {
			httpOnly: true,
			secure: true,
			sameSite: 'none',
			maxAge: 1000 * 60 * 15, // 15 minutes
		})
	}
}
