import { MailService } from '@/modules/mail/mail.service';
import { PrismaService } from '@/modules/prisma/prisma.service';
import { UsersService } from '@/modules/users/users.service';
import { generateConfirmToken } from '@/utils/token-generator';
import { BadRequestException, HttpException, Injectable, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ConfirmCodeType } from '@prisma/client';

@Injectable()
export class EmailConfirmationService {
	constructor(
		private readonly prismaService: PrismaService,
		private readonly mailService: MailService,
		private readonly configService: ConfigService,
		private readonly usersService: UsersService,
	) {}


	async sendConfirmEmailURL(email: string) {
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
				expiresAt: new Date(Date.now() + 15 * 60 * 1000), // 15 minutes
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
			statusCode: 200,
			message:
				'Вам нужно перейти по ссылке, чтобы подтвердить электронную почту. Ссылка действительна 15 минут. Она уже отправлена на вашу почту',
			data: {
				id: user.id,
				email: user.email,
				mailConfirmCodeExpiresAt: newConfirmToken.expiresAt,
			},
		}
	}

	async resendConfirmEmail(email: string) {
		return await this.sendConfirmEmailURL(email)
	}

	async confirmEmail(token: string, email: string) {
		const confirmTokenExists = await this.prismaService.confirmTokens.findFirst({
			where: {
				type: ConfirmCodeType.MAIL,
				used: false,
				token,
				user: {
					email,
				},
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
			statusCode: 200,
			message: 'Email подтвержден',
			data: {
				id: user.id,
				email: user.email,
			},
		}
	}

}
