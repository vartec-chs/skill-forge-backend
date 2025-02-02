import { BadRequestException, HttpException, Injectable, NotFoundException } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { JwtService } from '@nestjs/jwt'

import { PrismaService } from '@/prisma/prisma.service'

import { Role } from '@prisma/client'

import { MailService } from '@/mail/mail.service'
import { CreateUserDto } from '@/users/dto/create-user.dto'
import { UsersService } from '@/users/users.service'

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

		const mailConfirmCode = Math.floor(Math.random() * (9999 - 1000 + 1) + 1000)

		try {
			await this.mailService.sendMailConfirmCode(mailConfirmCode, user.email)
		} catch (error) {
			throw new HttpException(`Ошибка при отправке письма: ${error}`, 500)
		}

		const mailConfirmCodeExpiresAt = new Date(Date.now() + 5 * 60 * 1000)

		await this.prismaService.confirmCode.create({
			data: {
				type: 'MAIL',
				code: mailConfirmCode.toString(),
				expiresAt: mailConfirmCodeExpiresAt,
				userId: user.id,
			},
		})

		return {
			status: 200,
			message:
				'Вы успешно зарегистрировались. Код подтверждения отправлен на вашу электронную почту. Код действителен 5 минут',
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

		if (!user.emailConfirmed) return await this.sendConfirmEmailCode(user.email, user.id)

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

		if (!user.emailConfirmed) return await this.sendConfirmEmailCode(user.email, user.id)

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

		const res = req.res as Response

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

	private async sendConfirmEmailCode(email: string, userId: string) {
		const confirmCode = Math.floor(Math.random() * (9999 - 1000 + 1) + 1000)

		const existsActiveCode = await this.prismaService.confirmCode.findFirst({
			where: {
				type: 'MAIL',
				userId,
			},
		})

		if (existsActiveCode) {
			const currentDate = new Date()
			if (currentDate <= existsActiveCode.expiresAt) {
				const diff = existsActiveCode.expiresAt.getTime() - currentDate.getTime()
				const minutes = Math.floor(diff / 1000 / 60)
				const seconds = Math.floor((diff / 1000) % 60)
				if (minutes > 0) {
					throw new HttpException(
						`Подтверждение по почте уже отправлено. Оставшееся время: ${minutes} минут ${seconds} секунд`,
						400,
						{
							description: 'Подтверждение по почте уже отправлено',
						},
					)
				} else {
					await this.prismaService.confirmCode.deleteMany({
						where: {
							id: existsActiveCode.id,
							type: 'MAIL',
							userId,
						},
					})
				}
			}
		}

		try {
			await this.mailService.sendMailConfirmCode(confirmCode, email)
		} catch (error) {
			throw new HttpException(`Ошибка при отправке письма: ${error}`, 500)
		}

		const mailConfirmCodeExpiresAt = new Date(Date.now() + 5 * 60 * 1000)

		await this.prismaService.confirmCode.create({
			data: {
				type: 'MAIL',
				code: confirmCode.toString(),
				expiresAt: mailConfirmCodeExpiresAt,
				userId,
			},
		})

		return {
			status: 1001,
			message: 'Код подтверждения отправлен на вашу электронную почту. Он активен 5 минут',
			data: email,
		}
	}

	async confirmEmail(confirmCode: number, email: string) {
		const user = await this.prismaService.user.findUnique({
			where: { email },
		})
		if (!user) throw new NotFoundException('Пользователь не найден')

		const existsActiveCode = await this.prismaService.confirmCode.findFirst({
			where: {
				type: 'MAIL',
				userId: user.id,
			},
		})
		if (!existsActiveCode) throw new BadRequestException('Код подтверждения не найден')

		if (existsActiveCode.code !== confirmCode.toString())
			throw new BadRequestException('Код подтверждения неверный')

		const currentDate = new Date()
		if (currentDate > existsActiveCode.expiresAt) {
			await this.prismaService.confirmCode.delete({
				where: {
					id: existsActiveCode.id,
				},
			})

			return await this.sendConfirmEmailCode(email, user.id)
		}

		await this.prismaService.user.update({
			where: {
				id: user.id,
			},
			data: {
				emailConfirmed: true,
			},
		})

		await this.prismaService.confirmCode.delete({
			where: {
				id: existsActiveCode.id,
			},
		})

		return {
			status: 200,
			message: 'Подтверждение по почте успешно',
			data: null,
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
