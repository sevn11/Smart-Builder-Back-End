import { Controller, Get, HttpCode } from '@nestjs/common';
import { ResponseMessages } from 'src/core/utils';

@Controller('devops')
export class DevopsController {

    @Get('health')
    @HttpCode(200)
    healthcheck() {
        return { "message": ResponseMessages.SUCCESSFUL }
    }

}
