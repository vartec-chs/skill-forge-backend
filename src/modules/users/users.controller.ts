import { Body, Controller, Get, NotFoundException, Post, Query } from '@nestjs/common'
import { ApiBody, ApiOperation, ApiQuery, ApiTags } from '@nestjs/swagger'

import { CreateUserDto } from './dto/create-user.dto'
import { UsersService } from './users.service'

@ApiTags('Users')
@Controller({ version: '1', path: 'users' })
export class UsersController {
	constructor(private readonly usersService: UsersService) {}

	@Post()
	@ApiOperation({ summary: 'Создание пользователя' })
	@ApiBody({ type: CreateUserDto })
	async create(@Body() createUserDto: CreateUserDto) {
		return await this.usersService.create(createUserDto)
	}

	@Get()
	@ApiOperation({ summary: 'Получение списка пользователей с пагинацией' })
	@ApiQuery({ name: 'page', type: Number, required: false, default: 1 })
	@ApiQuery({ name: 'perPage', type: Number, required: false, default: 10 })
	async findAll(@Query('page') page: number = 1, @Query('perPage') perPage: number = 10) {
		try {
			return await this.usersService.findAllWithPagination(Number(page), Number(perPage))
		} catch (error) {
			throw new Error(error)
		}
	}
}
