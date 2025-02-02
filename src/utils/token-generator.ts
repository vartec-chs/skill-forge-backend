import * as crypto from 'crypto'

export async function generateConfirmToken() {
	return crypto.randomBytes(32).toString('hex')
}
