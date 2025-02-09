import { Module } from '@nestjs/common'

import { PasswordRecoveryController } from './password-recovery.controller'
import { PasswordRecoveryService } from './password-recovery.service'
import { PrismaModule } from '@/modules/prisma/prisma.module'
import { MailModule } from '@/modules/mail/mail.module'
import { UsersModule } from '@/modules/users/users.module'

@Module({
	imports: [PrismaModule, MailModule, UsersModule],
	controllers: [PasswordRecoveryController],
	providers: [PasswordRecoveryService],
	exports: [PasswordRecoveryService],
})
export class PasswordRecoveryModule {}
