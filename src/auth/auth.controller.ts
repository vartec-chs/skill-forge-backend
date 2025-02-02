import { Body, Controller, Get, Param, Post, Query, Req } from '@nestjs/common'
import { ApiBody, ApiOperation, ApiParam, ApiQuery, ApiTags } from '@nestjs/swagger'

import { Role } from '@prisma/client'

import { CreateUserDto } from '@/users/dto/create-user.dto'

import { AuthService } from './auth.service'
import { CurrentUser } from './decorators/current-user.decorator'
import { Public } from './decorators/public.decorator'
import { Roles } from './decorators/roles.decorator'
import {
	ChangePasswordDto,
	ConfirmResetPasswordDto,
	ResetPasswordDto,
} from './dto/reset-password.dto'
import { SignInWithEmailDto, SignInWithPhoneDto } from './dto/sign-in.dto'
import { PasswordResetService } from './password-reset.service'

import { Request } from 'express'

@ApiTags('Auth')
@Controller({ version: '1', path: 'auth' })
export class AuthController {
	constructor(
		private readonly authService: AuthService,
		private readonly passwordResetService: PasswordResetService,
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

	@Public()
	@Get('confirm-email')
	@ApiOperation({ summary: 'Подтверждение электронной почты' })
	@ApiQuery({ name: 'code', description: 'Код подтверждения', required: true, type: Number })
	@ApiQuery({ name: 'email', description: 'Электронная почта', required: true, type: String })
	async confirmEmail(@Query('code') confirmCode: number, @Query('email') email: string) {
		return await this.authService.confirmEmail(confirmCode, email)
	}

	@Post('sign-out')
	@ApiOperation({ summary: 'Выход из системы' })
	async signOut(@Req() req: Request) {
		return await this.authService.signOut(req)
	}

	@Get('me')
	@ApiOperation({ summary: 'Получение информации о пользователе' })
	async getMe(@CurrentUser('userId') userId: string) {
		return await this.authService.getMe(userId)
	}

	@Public()
	@Post('send-password-reset-code/:email')
	@ApiOperation({ summary: 'Отправка кода для сброса пароля' })
	@ApiParam({ name: 'email', description: 'Электронная почта', required: true, type: String })
	async sendPasswordResetCode(@Param('email') email: string) {
		return await this.passwordResetService.sendPasswordResetCode(email)
	}

	@Public()
	@Post('confirm-password-reset')
	@ApiOperation({ summary: 'Подтверждение сброса пароля кодом' })
	@ApiBody({ type: ConfirmResetPasswordDto, description: 'Подтверждение сброса пароля' })
	async confirmPasswordResetCode(@Body() confirmResetPasswordDto: ConfirmResetPasswordDto) {
		return await this.passwordResetService.confirmPasswordReset(confirmResetPasswordDto)
	}

	@Public()
	@Post('reset-password/:resetCodeId')
	@ApiOperation({ summary: 'Сброс пароля' })
	@ApiParam({ name: 'resetCodeId', description: 'ID кода сброса', required: true, type: String })
	@ApiBody({ type: ResetPasswordDto, description: 'Сброс пароля' })
	async resetPassword(
		@Param('resetCodeId') resetCodeId: string,
		@Body() resetPasswordDto: ResetPasswordDto,
	) {
		return await this.passwordResetService.resetPassword(resetCodeId, resetPasswordDto)
	}


	@Public()
	@Post('change-password')
	@ApiOperation({ summary: 'Смена пароля' })
	@ApiBody({ type: ChangePasswordDto, description: 'Смена пароля' })
	async changePassword(@Body() changePasswordDto: ChangePasswordDto) {
		return await this.passwordResetService.changePassword(changePasswordDto)
	}
}
