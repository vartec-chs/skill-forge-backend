import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common'

import { ConfirmCodeType } from '@prisma/client'

import { MailService } from '@/modules/mail/mail.service'
import { PrismaService } from '@/modules/prisma/prisma.service'

@Injectable()
export class TwoFactorAuthService {
	public constructor(
		private readonly prismaService: PrismaService,
		private readonly mailService: MailService,
	) {}

	public async validateTwoFactorMailAuthToken(code: string, email: string) {
		const existingToken = await this.prismaService.confirmTokens.findFirst({
			where: {
				type: 'TWO_FACTOR_MAIL',
				used: false,
				user: {
					email,
				},
			},
		})

		if (!existingToken) throw new NotFoundException('Код не найден')

		if (existingToken.token !== code) {
			await this.prismaService.confirmTokens.update({
				where: {
					id: existingToken.id,
				},
				data: {
					attempts: {
						increment: 1,
					},
				},
			})

			if (existingToken.attempts >= 3) {
				await this.prismaService.confirmTokens.delete({
					where: {
						id: existingToken.id,
					},
				})
				throw new BadRequestException('Превышено количество попыток')
			}

			throw new BadRequestException('Неверный код подтверждения')
		}
		if (new Date(existingToken.expiresAt) < new Date()) {
			await this.prismaService.confirmTokens.delete({
				where: {
					id: existingToken.id,
				},
			})
			throw new BadRequestException('Срок действия кода истек')
		}

		await this.prismaService.confirmTokens.delete({
			where: {
				id: existingToken.id,
			},
		})

		return true
	}

	public async sendTwoFactorToken(email: string) {
		const twoFactorToken = await this.generateTwoFactorMailToken(email)

		await this.mailService.sendTwoFactorAuthCode(twoFactorToken.user.email, twoFactorToken.token)

		return {
			statusCode: 201,
			message: 'Код отправлен',
			data: null,
		}
	}

	private async generateTwoFactorMailToken(email: string) {
		const token = Math.floor(Math.random() * (1000000 - 100000) + 100000).toString()
		const expiresIn = new Date(new Date().getTime() + 300000) // 5 минут

		const existingToken = await this.prismaService.confirmTokens.findFirst({
			where: {
				user: {
					email,
				},
				type: ConfirmCodeType.TWO_FACTOR_MAIL,
			},
		})

		if (existingToken) {
			await this.prismaService.confirmTokens.delete({
				where: {
					id: existingToken.id,
					type: ConfirmCodeType.TWO_FACTOR_MAIL,
				},
			})
		}

		const twoFactorToken = await this.prismaService.confirmTokens.create({
			data: {
				user: {
					connect: {
						email,
					},
				},
				token,
				expiresAt: expiresIn,
				type: ConfirmCodeType.TWO_FACTOR_MAIL,
			},
			select: {
				id: true,
				token: true,
				expiresAt: true,
				user: {
					select: {
						email: true,
					},
				},
			},
		})

		return twoFactorToken
	}
}
