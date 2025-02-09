import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common'

import { PrismaService } from '@/modules/prisma/prisma.service'

import { CreateUserDto } from './dto/create-user.dto'

import * as argon2 from 'argon2'
import { format, parseISO } from 'date-fns'

@Injectable()
export class UsersService {
	constructor(private readonly prismaService: PrismaService) {}

	async create(createUserDto: CreateUserDto) {
		const userExists = await this.prismaService.user.findFirst({
			where: {
				OR: [
					{
						firstName: createUserDto.firstName,
						lastName: createUserDto.lastName,
						surname: createUserDto.surname,
					},
					{
						email: createUserDto.email,
					},
				],
			},
		})

		if (userExists) throw new BadRequestException('Такой пользователь уже существует')

		const userDate = format(createUserDto.dateOfBirth, 'yyyy-MM-dd')

		return await this.prismaService.user.create({
			data: {
				...createUserDto,
				password: await argon2.hash(createUserDto.password),
				dateOfBirth: userDate,
			},
			select: {
				id: true,
				email: true,
				firstName: true,
				lastName: true,
			},
		})
	}

	async findByEmail(email: string) {
		const user = await this.prismaService.user.findUnique({
			where: { email },
			select: {
				id: true,
				email: true,
				firstName: true,
				lastName: true,
				role: true,
				password: true,
				emailConfirmed: true,
			},
		})

		return user
	}

	async findByData(data: string) {
		const user = await this.prismaService.user.findFirst({
			where: {
				OR: [
					{
						phone: data,
					},
					{
						email: data,
					},
				],
			},
			select: {
				id: true,
				email: true,
				firstName: true,
				lastName: true,
				role: true,
				password: true,
				emailConfirmed: true,
				isTwoFactorMailEnabled: true,
			},
		})

		return user
	}

	async findByPhone(phone: string) {
		const user = await this.prismaService.user.findUnique({
			where: { phone },
			select: {
				id: true,
				email: true,
				firstName: true,
				lastName: true,
				role: true,
				password: true,
				phone: true,
				emailConfirmed: true,
			},
		})

		return user
	}

	async findById(id: string) {
		const user = await this.prismaService.user.findUnique({
			where: { id },
		})

		return user
	}

	async findByFullName(firstName: string, lastName: string, surname?: string) {
		const user = await this.prismaService.user.findFirst({
			where: {
				firstName,
				lastName,
				surname,
			},
		})

		return user
	}

	async findAllWithPagination(page: number, perPage: number) {
		const users = await this.prismaService.user.findMany({
			skip: (page - 1) * perPage,
			take: perPage,
			omit: {
				password: true,
			},
		})

		if (!users) throw new NotFoundException('Пользователи не найдены')

		return {
			status: 200,
			message: 'Пользователи успешно получены',
			data: users,
			total: await this.prismaService.user.count(),
			page,
			perPage,
		}
	}
}
