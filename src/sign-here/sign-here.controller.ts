import { Controller, UseGuards, Post, UseInterceptors, Param, Body, UploadedFile, ParseIntPipe, Get, HttpCode, HttpStatus, Res, Req, Ip, Headers } from '@nestjs/common';
import { JwtGuard } from 'src/core/guards';
import { SignHereService } from './sign-here.service';
import { FileInterceptor } from '@nestjs/platform-express';
import { User } from '@prisma/client';
import { GetUser } from 'src/core/decorators';
import { Response } from 'express';

@Controller('sign-here')
export class SignHereController {

    constructor(private readonly SignHereService: SignHereService) { }
    @UseGuards(JwtGuard)
    @Post(':companyId/jobs/:jobId/sign-now-documents/type/:Type')
    @UseInterceptors(FileInterceptor('file'))
    signDocument(
        @Param('companyId', ParseIntPipe) companyId: number,
        @Param('jobId', ParseIntPipe) jobId: number,
        @Param('Type') Type: string,
        @UploadedFile() file: Express.Multer.File,
        @Body() body: any,
        @GetUser() user: User
    ) {
        return this.SignHereService.signDocument(companyId, jobId, Type, file, body, user);
    }

    @Get(':token/info')
    async getSignerInfo(@Param('token') token: string) {
        return this.SignHereService.getSignerInfo(token);
    }

    @Post(':token/submit')
    @HttpCode(HttpStatus.OK)
    @UseInterceptors(FileInterceptor('signedPdf'))
    async submitSignedDocument(
        @Param('token') token: string,
        @UploadedFile() file: Express.Multer.File,
        @Body('markers') markers: string,
        @Ip() ipAddress: string,
        @Headers('user-agent') userAgent: string,
    ) {
        return this.SignHereService.submitSignedDocument(
            token,
            file,
            markers,
            ipAddress || '',
            userAgent || '',
        );
    }

    // NEW: Get document status
    @Get(':token/status')
    async getDocumentStatus(@Param('token') token: string) {
        return this.SignHereService.getDocumentStatus(token);
    }

    // Download signed PDF
@Get(':token/download-signed')
async downloadSignedPdf(
    @Param('token') token: string,
    @Res() res: Response,
) {
    const { buffer, filename } = await this.SignHereService.getSignedPdfByToken(token);

    res.set({
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${filename}"`,
    });
    res.send(buffer);
}

    @Get(':token')
    async getDocumentByToken(
        @Param('token') token: string,
        @Res() res: Response,
    ) {
        const { buffer, filename } = await this.SignHereService.getDocumentByToken(token);

        res.set({
            'Content-Type': 'application/pdf',
            'Content-Disposition': `inline; filename="${filename}"`,
        });
        res.send(buffer);
    }

}
