import { Role } from '@prisma/client'

export type AccessTokenPayload = {
	userId: string
	roles: Role[]
}

export type RefreshTokenPayload = {
	userId: string
}
