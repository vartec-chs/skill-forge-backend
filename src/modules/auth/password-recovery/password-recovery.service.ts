import { MailService } from '@/modules/mail/mail.service';
import { PrismaService } from '@/modules/prisma/prisma.service';
import { UsersService } from '@/modules/users/users.service';
import { generateConfirmToken } from '@/utils/token-generator';
import { BadRequestException, HttpException, Injectable, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as argon2 from 'argon2';
import { ChangePasswordDto, ResetPasswordDto } from './dto/reset-password.dto';

@Injectable()
export class PasswordRecoveryService {
	constructor(
		private readonly prismaService: PrismaService,
		private readonly mailService: MailService,
		private readonly configService: ConfigService,
		private readonly usersService: UsersService,
	) {}


	async sendResetPasswordEmail(email: string) {
		const user = await this.prismaService.user.findUnique({
			where: {
				email,
			},
		})
		if (!user) throw new NotFoundException('Такой пользователь не найден')

		const tokenExists = await this.prismaService.confirmTokens.findFirst({
			where: {
				userId: user.id,
				type: 'RESET_PASSWORD',
			},
		})

		if (tokenExists) {
			const expiresTime = new Date(tokenExists.expiresAt).getTime()
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
						id: tokenExists.id,
					},
				})
			}
		}

		const token = await generateConfirmToken()
		const resetPasswordTokenExpiresAt = new Date(Date.now() + 10 * 60 * 1000)

		const confirmToken = await this.prismaService.confirmTokens.create({
			data: {
				type: 'RESET_PASSWORD',
				token,
				expiresAt: resetPasswordTokenExpiresAt,
				userId: user.id,
			},
		})

		try {
			await this.mailService.sendPasswordResetURL(
				`${this.configService.get('FRONTEND_URL')}/auth/reset-password?token=${token}&email=${user.email}`,
				user.email,
			)
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
			message: 'Письмо с кодом подтверждения отправлено',
			data: null,
		}
	}

	async resetPassword(resetPasswordDto: ResetPasswordDto) {
		const confirmTokenExists = await this.prismaService.confirmTokens.findFirst({
			where: {
				user: {
					email: resetPasswordDto.email,
				},
				type: 'RESET_PASSWORD',
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
		if (confirmTokenExists.token !== resetPasswordDto.token) {
			const updatedConfirmToken = await this.prismaService.confirmTokens.update({
				where: {
					id: confirmTokenExists.id,
				},
				data: {
					attempts: confirmTokenExists.attempts + 1,
				},
			})

			if (updatedConfirmToken.attempts >= 3) {
				await this.prismaService.confirmTokens.delete({
					where: {
						id: confirmTokenExists.id,
					},
				})
				throw new BadRequestException('Слишком много попыток. Токен онулирован')
			}

			throw new BadRequestException('Неверный токен')
		}

		const date = new Date(confirmTokenExists.expiresAt).getTime()
		const now = new Date().getTime()

		if (date < now) {
			await this.prismaService.confirmTokens.delete({
				where: {
					id: confirmTokenExists.id,
				},
			})
			throw new BadRequestException('Срок действия токена истек')
		}

		const hashedPassword = await argon2.hash(resetPasswordDto.newPassword)

		await this.prismaService.user.update({
			where: {
				id: confirmTokenExists.user.id,
			},
			data: {
				password: hashedPassword,
			},
		})

		await this.prismaService.confirmTokens.delete({
			where: {
				id: confirmTokenExists.id,
			},
		})

		return {
			statusCode: 200,
			message: 'Пароль успешно изменен',
		}
	}

	async changePassword(userId: string, changePasswordDto: ChangePasswordDto) {
		const user = await this.usersService.findById(userId)
		if (!user) throw new NotFoundException('Пользователь не найден')

		const isPasswordValid = await argon2.verify(user.password, changePasswordDto.oldPassword)
		if (!isPasswordValid) throw new BadRequestException('Неверный пароль')

		const hashedPassword = await argon2.hash(changePasswordDto.newPassword)

		await this.prismaService.user.update({
			where: {
				id: user.id,
			},
			data: {
				password: hashedPassword,
			},
		})

		return {
			statusCode: 200,
			message: 'Пароль успешно изменен',
			data: null,
		}
	}
}
