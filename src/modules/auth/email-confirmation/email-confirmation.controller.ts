import { Body, Controller, Post, Query } from '@nestjs/common'
import { ApiOperation, ApiQuery, ApiTags } from '@nestjs/swagger'

import { ConfirmEmailDto } from './dto/confirm-email.dto'
import { EmailConfirmationService } from './email-confirmation.service'

import { Public } from '../decorators/public.decorator'

@ApiTags('Email Confirmation')
@Controller({ version: '1', path: 'email-confirmation' })
export class EmailConfirmationController {
	constructor(private readonly emailConfirmationService: EmailConfirmationService) {}

	@Public()
	@Post('resend')
	@ApiOperation({ summary: 'Переслать код подтверждения' })
	@ApiQuery({ name: 'email', description: 'Электронная почта', required: true, type: String })
	async resendConfirmEmail(@Query('email') email: string) {
		return await this.emailConfirmationService.resendConfirmEmail(email)
	}

	@Public()
	@Post()
	@ApiOperation({ summary: 'Подтверждение электронной почты' })
	async confirmEmail(@Body() confirmEmailDto: ConfirmEmailDto) {
		return await this.emailConfirmationService.confirmEmail(
			confirmEmailDto.token,
			confirmEmailDto.email,
		)
	}
}
