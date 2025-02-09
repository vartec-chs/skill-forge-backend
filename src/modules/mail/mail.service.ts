import { MailerService } from '@nestjs-modules/mailer'
import { Injectable } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'

import { ConfirmationTemplate } from './templates/confirmation.template'
import { ResetPasswordTemplate } from './templates/reset-password.template'
import { TwoFactorAuthTemplate } from './templates/two-factor-auth.template'

import { render } from '@react-email/components'

@Injectable()
export class MailService {
	constructor(private readonly mailerService: MailerService) {}

	async sendMailConfirmURL(url: string, email: string) {
		const html = await render(ConfirmationTemplate({ confirmLink: url }))

		return await this.sendMail(email, 'Подтверждение почты', html)
	}

	async sendPasswordResetURL(url: string, email: string) {
		const html = await render(ResetPasswordTemplate({ resetLink: url }))

		return await this.sendMail(email, 'Сброс пароля', html)
	}

	async sendTwoFactorAuthCode(email: string, code: string) {
		const html = await render(TwoFactorAuthTemplate({ token: code }))

		return await this.sendMail(email, 'Подтверждение вашей личности', html)
	}

	private async sendMail(email: string, subject: string, html: string) {
		return await this.mailerService.sendMail({
			to: email,
			subject,
			html,
		})
	}
}
