import { ApiProperty } from '@nestjs/swagger'

import { IsEmail, IsNotEmpty, IsString } from 'class-validator'

export class ConfirmEmailDto {
	@IsString()
	@IsNotEmpty()
	@IsEmail()
	@ApiProperty({ description: 'Почта', type: String, required: true })
	email: string
	@IsString()
	@IsNotEmpty()
	@ApiProperty({ description: 'Токен', type: String, required: true })
	token: string
}
