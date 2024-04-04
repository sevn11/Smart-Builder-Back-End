import { Body, Controller, HttpCode, HttpStatus, Param, ParseIntPipe, Post } from '@nestjs/common';
import { User } from '@prisma/client';
import { GetUser } from 'src/core/decorators';
import { UpdateCompanyLogoDTO } from './validators';
import { WebhooksService } from './webhooks.service';

@Controller('webhooks')
export class WebhooksController {

    constructor(private webhookService: WebhooksService) {

    }

    @HttpCode(HttpStatus.OK)
    @Post('companies/:id/logo')
    updateLogoUrl(@Param('id', ParseIntPipe) companyId: number, @Body() body: UpdateCompanyLogoDTO) {
        return this.webhookService.updateLogoUrl(companyId, body);
    }

}
