import { Controller, Get, HttpCode, HttpStatus, Query } from '@nestjs/common';
import { AdminUsersService } from '../services';
import { GetBuilderListDTO } from '../validators';

@Controller('admin/users')
export class AdminUsersController {

    constructor(private adminUserService: AdminUsersService) {

    }

    @Get('builders/')
    @HttpCode(HttpStatus.OK)
    getBuilderList(@Query() query: GetBuilderListDTO) {
        return this.adminUserService.getBuilders(query);
    }


}
