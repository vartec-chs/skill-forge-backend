import { Body, Heading, Link, Tailwind, Text } from "@react-email/components"
import { Html } from "@react-email/html"
import * as React from 'react'

interface ConfirmationTemplateProps {
	confirmLink: string
}

export function ConfirmationTemplate({
	confirmLink ,
}: ConfirmationTemplateProps) {
	

	return (
		<Tailwind>
			<Html>
				<Body className='text-black'>
					<Heading>Подтверждение почты</Heading>
					<Text>
						Привет! Чтобы подтвердить свой адрес электронной почты, пожалуйста, перейдите по следующей ссылке:
					</Text>
					<Link href={confirmLink}>Подтвердить почту</Link>
					<Text>
						Эта ссылка действительна в течение 15 минут. Если вы не запрашивали подтверждение, просто проигнорируйте это сообщение.
					</Text>
				</Body>
			</Html>
		</Tailwind>
	)
}
