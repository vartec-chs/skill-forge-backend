import { Module } from '@nestjs/common'

import { MailModule } from '@/modules/mail/mail.module'
import { PrismaModule } from '@/modules/prisma/prisma.module'
import { UsersModule } from '@/modules/users/users.module'

import { EmailConfirmationController } from './email-confirmation.controller'
import { EmailConfirmationService } from './email-confirmation.service'

@Module({
	imports: [PrismaModule, MailModule, UsersModule],
	controllers: [EmailConfirmationController],
	providers: [EmailConfirmationService],
	exports: [EmailConfirmationService],
})
export class EmailConfirmationModule {}
