import { Module } from '@nestjs/common'
import { JwtModule } from '@nestjs/jwt'

import { MailModule } from '@/modules/mail/mail.module'
import { PrismaModule } from '@/modules/prisma/prisma.module'
import { UsersModule } from '@/modules/users/users.module'

import { AuthController } from './auth.controller'
import { AuthService } from './auth.service'
import { PasswordResetService } from './password.service'
import { AccessTokenStrategy } from './strategies/accessToken.strategy'
import { RefreshTokenStrategy } from './strategies/refreshToken.strategy'

@Module({
	imports: [JwtModule.register({}), PrismaModule, UsersModule, MailModule],
	controllers: [AuthController],
	providers: [AuthService, AccessTokenStrategy, RefreshTokenStrategy, PasswordResetService],
})
export class AuthModule {}
