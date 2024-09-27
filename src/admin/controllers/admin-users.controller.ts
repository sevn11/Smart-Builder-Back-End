import { Body, Controller, Delete, Get, HttpCode, HttpStatus, Param, ParseIntPipe, Patch, Post, Query } from '@nestjs/common';
import { AdminUsersService } from '../services';
import { ChangeBuilderAccessDTO, GetBuilderListDTO } from '../validators';
import { CreateUpdateExtraFeeDTO } from '../validators/create-update-extra-fee';

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

    @Delete('builders/:builderId')
    @HttpCode(HttpStatus.OK)
    deleteBuilder(@Param('builderId', ParseIntPipe) builderId: number) {
        return this.adminUserService.deleteBuilder(builderId)
    }


    @Post('/extra-fee')
    @HttpCode(HttpStatus.OK)
    addUpdateExtraFee(@Body() body: CreateUpdateExtraFeeDTO) {
        return this.adminUserService.addUpdateExtraFee(body);
    }
}
