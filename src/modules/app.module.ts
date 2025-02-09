import { MailerModule } from '@nestjs-modules/mailer'
import { Module } from '@nestjs/common'
import { ConfigModule, ConfigService } from '@nestjs/config'

import { AuthModule } from './auth/auth.module'
import { FilesModule } from './files/files.module'
import { MailModule } from './mail/mail.module'
import { PrismaModule } from './prisma/prisma.module'
import { UsersModule } from './users/users.module'

@Module({
	imports: [
		ConfigModule.forRoot({
			isGlobal: true,
		}),
		MailerModule.forRootAsync({
			imports: [ConfigModule],
			useFactory: async (configService: ConfigService) => ({
				transport: {
					service: configService.getOrThrow('MAILER_SERVICE'),
					host: configService.getOrThrow('MAILER_HOST'),
					from: configService.getOrThrow('MAILER_FROM'),
					port: configService.getOrThrow('MAILER_PORT'),
					secure: configService.getOrThrow('MAILER_SECURE'),
					auth: {
						user: configService.getOrThrow('MAILER_USER'),
						pass: configService.getOrThrow('MAILER_PASS'),
					},
				},
			}),
			inject: [ConfigService],
		}),
		AuthModule,
		UsersModule,
		PrismaModule,
		MailModule,
		FilesModule,
	],
	controllers: [],
	providers: [],
})
export class AppModule {}
