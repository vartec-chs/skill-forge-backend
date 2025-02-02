import { BadRequestException, HttpException, Injectable, NotFoundException } from '@nestjs/common'

import { PrismaService } from '@/prisma/prisma.service'

import { MailService } from '@/mail/mail.service'
import { generateConfirmCode } from '@/utils/code-generator'

import {
	ChangePasswordDto,
	ConfirmResetPasswordDto,
	ResetPasswordDto,
} from './dto/reset-password.dto'

import * as argon2 from 'argon2'

@Injectable()
export class PasswordResetService {
	constructor(
		private prismaService: PrismaService,
		private mailService: MailService,
	) {}

	async sendPasswordResetCode(email: string) {
		const user = await this.prismaService.user.findUnique({
			where: { email },
		})

		if (!user) throw new NotFoundException('Пользователь не найден')

		const passwordResetCode = await generateConfirmCode()
		const passwordResetCodeExpiresAt = new Date(Date.now() + 5 * 60 * 1000)

		const existsActiveCode = await this.prismaService.confirmCode.findFirst({
			where: {
				type: 'RESET_PASSWORD',
				userId: user.id,
			},
		})
		if (existsActiveCode) {
			const currentDate = new Date()
			if (currentDate > existsActiveCode.expiresAt) {
				await this.prismaService.confirmCode.delete({
					where: {
						id: existsActiveCode.id,
					},
				})
			} else {
				const diff = existsActiveCode.expiresAt.getTime() - currentDate.getTime()
				const minutes = Math.floor(diff / 1000 / 60)
				const seconds = Math.floor((diff / 1000) % 60)

				if (minutes > 0) {
					throw new BadRequestException(
						`Код подтверждения уже отправлен. Оставшееся время: ${minutes} минут ${seconds} секунд`,
					)
				}
			}
		}

		const newConfirmCode = await this.prismaService.confirmCode.create({
			data: {
				type: 'RESET_PASSWORD',
				code: String(passwordResetCode),
				userId: user.id,
				expiresAt: passwordResetCodeExpiresAt,
			},
		})

		try {
			await this.mailService.sendPasswordResetCode(user.email, passwordResetCode)
		} catch (error) {
			throw new HttpException(`Ошибка при отправке письма: ${error}`, 500)
		}

		return {
			status: 200,
			message: 'Код подтверждения отправлен на вашу электронную почту. Код действителен 5 минут',
			data: {
				id: user.id,
				email: user.email,
				passwordResetCodeExpiresAt,
				confirmCodeId: newConfirmCode.id,
			},
		}
	}

	async confirmPasswordReset(confirmResetPasswordDto: ConfirmResetPasswordDto) {
		const { email, confirmCode } = confirmResetPasswordDto
		const user = await this.prismaService.user.findUnique({
			where: { email },
		})
		if (!user) throw new NotFoundException('Пользователь не найден')

		const existsActiveCode = await this.prismaService.confirmCode.findFirst({
			where: {
				type: 'RESET_PASSWORD',
				userId: user.id,
			},
		})
		if (!existsActiveCode) throw new BadRequestException('Код подтверждения не найден')

		if (existsActiveCode.code !== confirmCode.toString()) {
			const codeUpdated = await this.prismaService.confirmCode.update({
				where: {
					id: existsActiveCode.id,
				},
				data: {
					attempts: {
						increment: 1,
					},
				},
			})

			if (codeUpdated.attempts >= 3) {
				await this.prismaService.confirmCode.delete({
					where: {
						id: existsActiveCode.id,
					},
				})
				throw new BadRequestException('Код подтверждения неверный. Код больше не действителен')
			}

			throw new BadRequestException(
				`Код подтверждения неверный. У вас ${3 - codeUpdated.attempts} попыток`,
			)
		}

		const currentDate = new Date()
		if (currentDate > existsActiveCode.expiresAt) {
			await this.prismaService.confirmCode.delete({
				where: {
					id: existsActiveCode.id,
				},
			})
			throw new BadRequestException('Время действия кода истекло')
		}

		await this.prismaService.confirmCode.update({
			where: {
				id: existsActiveCode.id,
			},
			data: {
				used: true,
			},
		})

		return {
			status: 200,
			message: 'Код подтверждения успешно подтвержден',
			data: {
				resetCodeId: existsActiveCode.id,
				userId: user.id,
			},
		}
	}

	async resetPassword(resetCodeId: string, resetPasswordDto: ResetPasswordDto) {
		const code = await this.prismaService.confirmCode.findUnique({
			where: {
				user: {
					email: resetPasswordDto.email,
				},
				type: 'RESET_PASSWORD',
				id: resetCodeId,
				used: true,
			},
		})

		if (!code) throw new NotFoundException('Код не найден')

		const newPassword = await argon2.hash(resetPasswordDto.password)

		const user = await this.prismaService.user.update({
			where: {
				email: resetPasswordDto.email,
			},
			data: {
				password: newPassword,
			},
			select: {
				id: true,
				email: true,
				firstName: true,
				lastName: true,
				role: true,
				password: true,
				emailConfirmed: true,
			},
		})

		await this.prismaService.confirmCode.delete({
			where: {
				id: code.id,
			},
		})

		return {
			status: 200,
			message: 'Пароль успешно изменен',
			data: user,
		}
	}

	async changePassword(changePasswordDto: ChangePasswordDto) {
		const user = await this.prismaService.user.findUnique({
			where: {
				email: changePasswordDto.email,
			},
		})

		if (!user) throw new NotFoundException('Пользователь не найден')

		const isPasswordValid = await argon2.verify(user.password, changePasswordDto.oldPassword)
		if (!isPasswordValid) throw new BadRequestException('Неверный пароль')

		const newPassword = await argon2.hash(changePasswordDto.newPassword)

		const updatedUser = await this.prismaService.user.update({
			where: {
				email: changePasswordDto.email,
			},
			data: {
				password: newPassword,
			},
			select: {
				id: true,
				email: true,
				firstName: true,
				lastName: true,
				role: true,
				password: true,
				emailConfirmed: true,
			},
		})

		return {
			status: 200,
			message: 'Пароль успешно изменен',
			data: updatedUser,
		}
	}
}
