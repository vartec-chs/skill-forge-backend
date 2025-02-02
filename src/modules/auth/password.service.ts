import { BadRequestException, HttpException, Injectable, NotFoundException } from '@nestjs/common'

import { MailService } from '@/modules/mail/mail.service'
import { PrismaService } from '@/modules/prisma/prisma.service'
import { generateConfirmToken } from '@/utils/token-generator'


import * as argon2 from 'argon2'

@Injectable()
export class PasswordResetService {
	constructor(
		private prismaService: PrismaService,
		private mailService: MailService,
	) {}


	async sendResetPasswordEmail(email: string) {}

	async resetPassword() {}

	async changePassword() {}

}