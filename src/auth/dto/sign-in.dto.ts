import { ApiProperty } from '@nestjs/swagger'

import { IsEmail, IsNotEmpty, IsPhoneNumber, IsString, MinLength } from 'class-validator'

export class SignInWithEmailDto {
	@IsEmail()
	@ApiProperty({ description: 'Почта', type: String, required: true })
	email: string
	@IsString()
	@IsNotEmpty()
	@MinLength(8)
	@ApiProperty({ description: 'Пароль', type: String, format: 'password', required: true })
	password: string
}

export class SignInWithPhoneDto {
	@IsPhoneNumber()
	@ApiProperty({ description: 'Номер телефона', type: String, format: 'phone', required: true })
	phone: string
	@IsString()
	@IsNotEmpty()
	@MinLength(8)
	@ApiProperty({ description: 'Пароль', type: String, format: 'password', required: true })
	password: string
}
