import { ApiProperty } from '@nestjs/swagger'

import { IsEmail, IsNotEmpty, IsString, MaxLength, MinLength } from 'class-validator'

export class ResetPasswordDto {
	@IsString()
	@IsNotEmpty()
	@MinLength(16)
	@ApiProperty({ description: 'Токен', type: String, required: true })
	token: string

	@IsEmail()
	@ApiProperty({ description: 'Почта', type: String, required: true })
	email: string

	@IsString()
	@IsNotEmpty()
	@MinLength(8)
	@ApiProperty({ description: 'Пароль', type: String, format: 'password', required: true })
	newPassword: string
}

export class ChangePasswordDto {
	@IsString()
	@IsNotEmpty()
	@MinLength(8)
	@ApiProperty({ description: 'Старый пароль', type: String, format: 'password', required: true })
	oldPassword: string

	@IsString()
	@IsNotEmpty()
	@MinLength(8)
	@ApiProperty({ description: 'Новый пароль', type: String, format: 'password', required: true })
	newPassword: string
}

export class RequestPasswordResetDto {
	@IsEmail()
	@IsNotEmpty()
	@ApiProperty({ description: 'Почта', type: String, required: true })
	email: string
}
