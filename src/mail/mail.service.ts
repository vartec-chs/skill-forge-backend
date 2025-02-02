import { MailerService } from '@nestjs-modules/mailer'
import { Injectable } from '@nestjs/common'

@Injectable()
export class MailService {
	constructor(private readonly mailerService: MailerService) {}

	async sendMailConfirmCode(code: number, email: string) {
		return await this.mailerService.sendMail({
			to: email,
			subject: 'Подтверждение регистрации на сайте skill-bridge.ru',
			html: `
				<p style="font-size: 18px;">Код для подтверждения: <b style="font-size: 18px; ">${code}</b>. Используйте его для подтверждения регистрации.</p>
			`,
		})
	}

	async sendPasswordResetCode(email: string, code: number) {
		return await this.mailerService.sendMail({
			to: email,
			subject: 'Сброс пароля на сайте skill-bridge.ru',
			html: `
				<p style="font-size: 18px;">Код для сброса пароля: <b style="font-size: 18px; ">${code}</b>. Используйте его для сброса пароля.</p>
			`,
		})
	}
}
