import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common'
import { Reflector } from '@nestjs/core'

import { Role } from '@prisma/client'

@Injectable()
export class RolesGuard implements CanActivate {
	constructor(private readonly reflector: Reflector) {}

	canActivate(context: ExecutionContext): boolean {
		const roles = this.reflector.get<Role[]>('roles', context.getHandler())

		if (!roles) return false

		const request = context.switchToHttp().getRequest()
		const user = request.user ?? null

		if (!user) return false

		return roles.some((role) => user.roles.includes(role))
	}
}
