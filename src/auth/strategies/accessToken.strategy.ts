import {
	BadRequestException,
	Injectable,
	NotFoundException,
	UnauthorizedException,
} from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { PassportStrategy } from '@nestjs/passport'

import { PrismaService } from '@/prisma/prisma.service'

import { Role } from '@prisma/client'

import { AccessTokenPayload } from '../types'

import { Request } from 'express'
import { ExtractJwt, Strategy } from 'passport-jwt'

@Injectable()
export class AccessTokenStrategy extends PassportStrategy(Strategy, 'jwt') {
	constructor(
		private readonly prismaService: PrismaService,
		private readonly configService: ConfigService,
	) {
		super({
			jwtFromRequest: ExtractJwt.fromExtractors([(req: Request) => req?.cookies?.['accessToken']]),
			secretOrKey: configService.getOrThrow('JWT_ACCESS_TOKEN_SECRET'),
			ignoreExpiration: false,
		})
	}

	async validate(payload: AccessTokenPayload) {
		const user = await this.prismaService.user.findUnique({
			where: { id: payload.userId },
			select: {
				id: true,
				email: true,
				role: true,
			},
		})
		if (!user) throw new NotFoundException('Пользователь не найден')

		if (JSON.stringify(user.role) !== JSON.stringify(payload.roles))
			throw new UnauthorizedException('Устаревшие роли')

		return {
			userId: payload.userId,
			roles: payload.roles,
		}
	}
}
