import { Body, Controller, Param, Post, Put } from '@nestjs/common'
import { ApiOperation, ApiParam, ApiTags } from '@nestjs/swagger'

import {
	ChangePasswordDto,
	RequestPasswordResetDto,
	ResetPasswordDto,
} from './dto/reset-password.dto'
import { PasswordRecoveryService } from './password-recovery.service'

import { CurrentUser } from '../decorators/current-user.decorator'
import { Public } from '../decorators/public.decorator'

@ApiTags('Password Recovery')
@Controller({ version: '1', path: 'password-recovery' })
export class PasswordRecoveryController {
	constructor(private readonly passwordRecoveryService: PasswordRecoveryService) {}

	@Public()
	@Post('reset')
	@ApiOperation({ summary: 'Сброс пароля' })
	async passwordReset(@Body() resetPasswordDto: ResetPasswordDto) {
		return await this.passwordRecoveryService.resetPassword(resetPasswordDto)
	}

	@Public()
	@Post('request')
	@ApiOperation({ summary: 'Запрос на сброс пароля' })
	@ApiParam({ name: 'email', description: 'Электронная почта', required: true, type: String })
	async requestPasswordReset(@Body() requestPasswordResetDto: RequestPasswordResetDto) {
		return await this.passwordRecoveryService.sendResetPasswordEmail(requestPasswordResetDto.email)
	}

	@Put()
	@ApiOperation({ summary: 'Смена пароля' })
	async changePassword(
		@Body() changePasswordDto: ChangePasswordDto,
		@CurrentUser('userId') userId: string,
	) {
		return await this.passwordRecoveryService.changePassword(userId, changePasswordDto)
	}
}
