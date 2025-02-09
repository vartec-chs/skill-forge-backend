import { Body, Controller, Get, Post, Req } from '@nestjs/common'
import { ApiBody, ApiOperation, ApiTags } from '@nestjs/swagger'

import { CreateUserDto } from '@/modules/users/dto/create-user.dto'

import { AuthService } from './auth.service'
import { CurrentUser } from './decorators/current-user.decorator'
import { Public } from './decorators/public.decorator'
import { SignInWithEmailDto, SignInWithPhoneDto } from './dto/sign-in.dto'

import { Request } from 'express'

@ApiTags('Auth')
@Controller({ version: '1', path: 'auth' })
export class AuthController {
	constructor(
		private readonly authService: AuthService,
	) {}

	@Public()
	@Post('sign-up')
	@ApiOperation({ summary: 'Регистрация пользователя' })
	@ApiBody({ type: CreateUserDto, description: 'Регистрация пользователя' })
	async signUp(@Body() createUserDto: CreateUserDto) {
		return await this.authService.signUp(createUserDto)
	}

	@Public()
	@Post('sign-in-with-email')
	@ApiOperation({ summary: 'Вход по электронной почте' })
	@ApiBody({ type: SignInWithEmailDto, description: 'Вход по электронной почте' })
	async signInWithEmail(@Body() signInWithEmailDto: SignInWithEmailDto, @Req() req: Request) {
		return await this.authService.signInWithEmail(signInWithEmailDto, req)
	}

	@Public()
	@Post('sign-in-with-phone')
	@ApiOperation({ summary: 'Вход по телефону' })
	@ApiBody({ type: SignInWithPhoneDto, description: 'Вход по телефону' })
	async signInWithPhone(@Body() signInWithPhoneDto: SignInWithPhoneDto, @Req() req: Request) {
		return await this.authService.signInWithPhone(signInWithPhoneDto, req)
	}

	@Public()
	@Post('refresh-tokens')
	@ApiOperation({ summary: 'Обновление токенов' })
	async refreshToken(@Req() req: Request) {
		return await this.authService.refreshToken(req)
	}

	@Post('sign-out')
	@ApiOperation({ summary: 'Выход из системы' })
	async signOut(@Req() req: Request) {
		return await this.authService.signOut(req)
	}

	@Get('check-auth')
	@ApiOperation({ summary: 'Проверка авторизации' })
	async checkAuth(@CurrentUser('userId') userId: string) {
		return {
			statusCode: 200,
			message: 'Авторизация успешна',
			data: userId,
		}
	}

	@Get('me')
	@ApiOperation({ summary: 'Получение информации о пользователе' })
	async getMe(@CurrentUser('userId') userId: string) {
		return await this.authService.getMe(userId)
	}
}
