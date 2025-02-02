import { ExecutionContext, createParamDecorator } from '@nestjs/common'

import { AccessTokenPayload } from '../types'

export const CurrentUser = createParamDecorator(
	(data: keyof AccessTokenPayload | null, context: ExecutionContext) => {
		const request = context.switchToHttp().getRequest()
		return data ? request.user?.[data] : request.user
	},
)
