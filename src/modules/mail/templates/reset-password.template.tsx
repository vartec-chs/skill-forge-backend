import {
	Body,
	Heading,
	Link,
	Tailwind,
	Text
} from '@react-email/components';
import { Html } from '@react-email/html';
import * as React from 'react';

interface ResetPasswordTemplateProps {
	resetLink: string;
}

export function ResetPasswordTemplate({ resetLink }: ResetPasswordTemplateProps) {


	return (
		<Tailwind>
			<Html>
				<Body className='text-black'>
					<Heading>Сброс пароля</Heading>
					<Text>
						Привет! Вы запросили сброс пароля. Пожалуйста, перейдите по следующей ссылке, чтобы создать новый пароль:
					</Text>
					<Link href={resetLink}>Подтвердить сброс пароля</Link>
					<Text>
						Эта ссылка действительна в течение 5 минут. Если вы не запрашивали сброс пароля, просто проигнорируйте это сообщение.
					</Text>
				</Body>
			</Html>
		</Tailwind>
	);
}