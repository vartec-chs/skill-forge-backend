import { ApiProperty } from '@nestjs/swagger'

import { Gender } from '@prisma/client'

import {
	IsDateString,
	IsEmail,
	IsEnum,
	IsNotEmpty,
	IsOptional,
	IsPhoneNumber,
	IsString,
	MinLength,
} from 'class-validator'

// enum Gender {
// 	Male = 'male',
// 	Female = 'female',
// }

export class CreateUserDto {
	@ApiProperty({ description: 'Почта', type: String, format: 'email', required: true })
	@IsString()
	@IsEmail()
	email: string

	@ApiProperty({ description: 'Пароль', type: String, format: 'password', required: true })
	@MinLength(8)
	@IsString()
	@IsNotEmpty()
	password: string

	@ApiProperty({ description: 'Имя', type: String, required: false })
	@IsString()
	@IsNotEmpty()
	firstName: string

	@ApiProperty({ description: 'Фамилия', type: String, required: false })
	@IsString()
	@IsNotEmpty()
	lastName: string

	@ApiProperty({ description: 'Отчество', type: String, required: false })
	@IsString()
	@IsOptional()
	surname?: string

	@ApiProperty({ description: 'Номер телефона', type: String, format: 'phone', required: false })
	@IsPhoneNumber()
	@IsOptional()
	phone?: string

	@ApiProperty({ description: 'Дата рождения', type: String, format: 'date', required: false })
	@IsDateString()
	@IsOptional()
	dateOfBirth?: string

	@ApiProperty({ enum: Gender, enumName: 'Gender', description: 'Пол', required: false })
	@IsEnum(Gender)
	@IsOptional()
	gender?: Gender
}
