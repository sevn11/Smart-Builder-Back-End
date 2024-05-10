import { Body, Controller, Get, HttpCode, HttpStatus, Param, ParseIntPipe, Patch, Query } from '@nestjs/common';
import { AdminUsersService } from '../services';
import { ChangeBuilderAccessDTO, GetBuilderListDTO } from '../validators';

@Controller('admin/users')
export class AdminUsersController {

    constructor(private adminUserService: AdminUsersService) {

    }

    @Get('builders/')
    @HttpCode(HttpStatus.OK)
    getBuilderList(@Query() query: GetBuilderListDTO) {
        return this.adminUserService.getBuilders(query);
    }
    @Patch('builders/:builderId/activate')
    @HttpCode(HttpStatus.OK)
    changeBuilderAccess(@Param('builderId', ParseIntPipe) builderId: number, @Body() body: ChangeBuilderAccessDTO) {
        return this.adminUserService.changeBuilderAccess(builderId, body)
    }


}
