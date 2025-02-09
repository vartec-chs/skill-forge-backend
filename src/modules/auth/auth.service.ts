import { BadRequestException, HttpException, Injectable, NotFoundException } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { JwtService } from '@nestjs/jwt'

import { Role } from '@prisma/client'

import { MailService } from '@/modules/mail/mail.service'
import { PrismaService } from '@/modules/prisma/prisma.service'
import { CreateUserDto } from '@/modules/users/dto/create-user.dto'
import { UsersService } from '@/modules/users/users.service'
import { generateConfirmToken } from '@/utils/token-generator'

import { SignInWithEmailDto, SignInWithPhoneDto } from './dto/sign-in.dto'
import { EmailConfirmationService } from './email-confirmation/email-confirmation.service'
import { TwoFactorAuthService } from './two-factor-auth/two-factor-auth.service'
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
		private emailConfirmationService: EmailConfirmationService,
		private twoFactorAuthService: TwoFactorAuthService,
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
			statusCode: 200,
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
		return await this.signIn(
			signInWithEmailDto.email,
			signInWithEmailDto.password,
			req,
			signInWithEmailDto.twoFactorMailAuthCode,
		)
	}

	async signInWithPhone(signInWithPhoneDto: SignInWithPhoneDto, req: Request) {
		return await this.signIn(
			signInWithPhoneDto.phone,
			signInWithPhoneDto.password,
			req,
			signInWithPhoneDto.twoFactorMailAuthCode,
		)
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
			statusCode: 200,
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
			statusCode: 200,
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
			statusCode: 200,
			message: 'Обновление токенов успешно',
			data: null,
		}
	}

	private async signIn(data: string, password: string, req: Request, twoFactorMailCode?: string) {
		const user = await this.usersService.findByData(data)
		if (!user) throw new BadRequestException('Неверные данные для входа')

		const isPasswordValid = await argon2.verify(user.password, password)
		if (!isPasswordValid) throw new BadRequestException('Неверные данные для входа')

		const ip = req.ip
		const userAgent = req.headers['user-agent'] as string

		if (!ip || !userAgent) throw new BadRequestException('Ip (и) или userAgent не указан(ы)')

		if (!user.emailConfirmed)
			return await this.emailConfirmationService.sendConfirmEmailURL(user.email)

		if (user.isTwoFactorMailEnabled) {
			if (!twoFactorMailCode) {
				await this.twoFactorAuthService.sendTwoFactorToken(user.email)

				return {
					statusCode: 1100,
					message: 'Проверьте вашу почту. Требуется код двухфакторной аутентификации.',
					data: null,
				}
			} else {
				await this.twoFactorAuthService.validateTwoFactorMailAuthToken(
					twoFactorMailCode,
					user.email,
				)
			}
		}

		const { accessToken, refreshToken } = await this.generateTokens(
			user.id,
			ip,
			userAgent,
			user.role,
		)

		await this.setAuthCookies(req.res, accessToken, refreshToken)

		return {
			statusCode: 200,
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
			// secure: true,
			// sameSite: 'none',
			maxAge: 1000 * 60 * 60 * 24 * 14, // 14 days
		})

		res.cookie('accessToken', accessToken, {
			httpOnly: true,
			// secure: true,
			// sameSite: 'none',
			maxAge: 1000 * 60 * 15, // 15 minutes
		})
	}
}
