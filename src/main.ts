import { ValidationPipe, VersioningType } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { NestFactory, Reflector } from '@nestjs/core'
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger'

import { AppModule } from '@/modules/app.module'
import { AuthGuard } from '@/modules/auth/guards/auth.guard'

import cookieParser from 'cookie-parser'

async function bootstrap() {
	const app = await NestFactory.create(AppModule)
	const configService = app.get(ConfigService)

	app.useGlobalPipes(new ValidationPipe())
	app.use(cookieParser(configService.getOrThrow<string>('COOKIE_SECRET')))
	app.setGlobalPrefix('api/')
	app.enableVersioning({
		type: VersioningType.URI,
		defaultVersion: '1',
	})
	app.enableCors({
		origin: configService.getOrThrow<string>('CORS_ORIGIN'),
		methods: configService.getOrThrow<string>('CORS_METHODS'),
		credentials: configService.getOrThrow<string>('CORS_CREDENTIALS'),
	})

	const reflector = app.get(Reflector)
	app.useGlobalGuards(new AuthGuard(reflector))

	const config = new DocumentBuilder()
		.setTitle('SkillBridge API')
		.setDescription('SkillBridge API documentation')
		.setVersion('1.0')
		.build()

	const document = SwaggerModule.createDocument(app, config)
	SwaggerModule.setup('api/docs', app, document, {
		swaggerOptions: {
			supportsCredentials: true,
		},
	})

	await app.listen(
		configService.getOrThrow<number>('PORT'),
		configService.getOrThrow<string>('HOST'),
		() => {
			console.log(
				`Application is running on: http://${configService.getOrThrow<string>('HOST') === '0.0.0.0' ? 'localhost' : configService.getOrThrow<string>('HOST')}:${configService.getOrThrow<string>('PORT')}/api/docs`,
			)
		},
	)
}
bootstrap()
