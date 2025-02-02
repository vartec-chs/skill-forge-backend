import { SetMetadata, UseGuards, applyDecorators } from '@nestjs/common'

import { Role } from '@prisma/client'

import { AuthGuard } from '../guards/auth.guard'
import { RolesGuard } from '../guards/roles.guard'

export const Roles = (...roles: Role[]) =>
	applyDecorators(SetMetadata('roles', roles), UseGuards(RolesGuard))
