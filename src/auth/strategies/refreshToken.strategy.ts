import { Injectable } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { PassportStrategy } from '@nestjs/passport'

import { RefreshTokenPayload } from '../types'

import { Request } from 'express'
import { ExtractJwt, Strategy } from 'passport-jwt'

@Injectable()
export class RefreshTokenStrategy extends PassportStrategy(Strategy, 'jwt-refresh') {
	constructor(private readonly configService: ConfigService) {
		super({
			jwtFromRequest: ExtractJwt.fromExtractors([(req: Request) => req?.cookies?.['refreshToken']]),
			secretOrKey: configService.getOrThrow('JWT_REFRESH_TOKEN_SECRET'),
			passReqToCallback: true,
		})
	}

	validate(req: Request, payload: RefreshTokenPayload) {
		const refreshToken = req.cookies['refreshToken']
		return { ...payload, refreshToken }
	}
}
