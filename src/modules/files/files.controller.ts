import { Controller, Get, Param, Res } from '@nestjs/common'
import { ApiOperation, ApiTags } from '@nestjs/swagger'

import { FilesService } from './files.service'

import { Public } from '../auth/decorators/public.decorator'

import { Response } from 'express'
import path from 'path'

@ApiTags('Files')
@Controller('files')
export class FilesController {
	constructor(private readonly filesService: FilesService) {}

	@Get(':fileName')
	@Public()
	@ApiOperation({ summary: 'Get file' })
	async getFile(@Param('fileName') fileName: string, @Res() res: Response) {
		const filePath = path.join(process.cwd(), 'uploads', fileName)
		return res.sendFile(filePath)
	}
}
