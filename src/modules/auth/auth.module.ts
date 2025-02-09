import { Module } from '@nestjs/common'
import { JwtModule } from '@nestjs/jwt'

import { MailModule } from '@/modules/mail/mail.module'
import { PrismaModule } from '@/modules/prisma/prisma.module'
import { UsersModule } from '@/modules/users/users.module'

import { AuthController } from './auth.controller'
import { AuthService } from './auth.service'
import { EmailConfirmationModule } from './email-confirmation/email-confirmation.module'
import { PasswordRecoveryModule } from './password-recovery/password-recovery.module'
import { AccessTokenStrategy } from './strategies/accessToken.strategy'
import { RefreshTokenStrategy } from './strategies/refreshToken.strategy'
import { TwoFactorAuthService } from './two-factor-auth/two-factor-auth.service'

@Module({
	imports: [
		JwtModule.register({}),
		PrismaModule,
		UsersModule,
		MailModule,
		PasswordRecoveryModule,
		EmailConfirmationModule,
	],
	controllers: [AuthController],
	providers: [AuthService, AccessTokenStrategy, RefreshTokenStrategy, TwoFactorAuthService],
})
export class AuthModule {}
