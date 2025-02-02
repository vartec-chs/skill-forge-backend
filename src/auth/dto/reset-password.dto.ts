import { ApiProperty } from '@nestjs/swagger'

import { IsEmail, IsNotEmpty, IsString, MaxLength, MinLength } from 'class-validator'

export class ResetPasswordDto {
	@IsEmail()
	@ApiProperty({ description: 'Почта', type: String, required: true })
	email: string
	@IsString()
	@IsNotEmpty()
	@MinLength(8)
	@ApiProperty({ description: 'Пароль', type: String, format: 'password', required: true })
	password: string
}

export class ResetPasswordWithAuthDto {
	@IsString()
	@IsNotEmpty()
	@ApiProperty({ description: 'Старый пароль', type: String, format: 'password', required: true })
	oldPassword: string
	@IsString()
	@IsNotEmpty()
	@ApiProperty({ description: 'Новый пароль', type: String, format: 'password', required: true })
	newPassword: string
}

export class ChangePasswordDto {
	@IsEmail()
	@ApiProperty({ description: 'Почта', type: String, required: true })
	email: string
	@IsString()
	@IsNotEmpty()
	@ApiProperty({ description: 'Старый пароль', type: String, format: 'password', required: true })
	oldPassword: string
	@IsString()
	@IsNotEmpty()
	@ApiProperty({ description: 'Новый пароль', type: String, format: 'password', required: true })
	newPassword: string
}


export class ConfirmResetPasswordDto {
	@IsString()
	@IsNotEmpty()
	@MinLength(6)
	@MaxLength(6)
	@ApiProperty({ description: 'Код подтверждения', type: String, required: true })
	confirmCode: string

	@IsEmail()
	@ApiProperty({ description: 'Почта', type: String, required: true })
	email: string
}
