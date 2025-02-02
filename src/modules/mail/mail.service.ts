import { MailerService } from '@nestjs-modules/mailer'
import { Injectable } from '@nestjs/common'

@Injectable()
export class MailService {
	constructor(private readonly mailerService: MailerService) {}

	async sendMailConfirmURL(url: string, email: string) {
		return await this.mailerService.sendMail({
			to: email,
			subject: 'Подтверждение регистрации на сайте skill-bridge.ru',
			html: `
			<h3>Подтверждение регистрации</h3>
			<br />
			<br />
			<p>Чтобы завершить регистрацию, перейдите по <a href="${url}">${url}</a></p>
			`,
		})
	}

	async sendPasswordResetURL(url: string, email: string) {
		return await this.mailerService.sendMail({
			to: email,
			subject: 'Сброс пароля на сайте skill-bridge.ru',
			html: `
			<h3>Сброс пароля</h3>
			<br />
			<br />
			<p >Чтобы сбросить пароль, перейдите по <a href="${url}">${url}</a></p>
			`,
		})
	}
}
