import { Body, Controller, Delete, Get, HttpCode, HttpStatus, Param, ParseIntPipe, Patch, Post, Query } from '@nestjs/common';
import { AdminUsersService } from '../services';
import { ChangeBuilderAccessDTO, GetBuilderListDTO } from '../validators';
import { CreateUpdateExtraFeeDTO } from '../validators/create-update-extra-fee';
import { UpdateBuilderPlanInfoDTO, UpdateBuilderSignNowPlanInfoDTO } from '../validators/update-plan-info';
import { UpdateBuilderPlanAmountDTO } from '../validators/update-builder-plan';
import { DemoUserDTO } from '../validators/add-demo-user';

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

    @Get('builders/plan-info')
    @HttpCode(HttpStatus.OK)
    getBuilderPlanInfo() {
        return this.adminUserService.getBuilderPlanInfo();
    }

    @Post('builders/update-plan-info')
    @HttpCode(HttpStatus.OK)
    updateBuilderPlanInfo(@Body() body: UpdateBuilderPlanInfoDTO) {
        return this.adminUserService.updateBuilderPlanInfo(body);
    }

    @Post('builders/update-signnow-plan-info')
    @HttpCode(HttpStatus.OK)
    updateBuilderSignNowPlanInfo(@Body() body: UpdateBuilderSignNowPlanInfoDTO) {
        return this.adminUserService.updateBuilderSignNowPlanInfo(body);
    }

    @Post('/plan-amount')
    @HttpCode(HttpStatus.OK)
    changeBuilderPlanAmount(@Body() body: UpdateBuilderPlanAmountDTO) {
        return this.adminUserService.changeBuilderPlanAmount(body);
    }

    @Post('builders/update-global-employee-fee')
    @HttpCode(HttpStatus.OK)
    updateGlobalEmployeeFee(@Body() body: { employeeFee: number }) {
        return this.adminUserService.updateGlobalEmployeeFee(body);
    }


    @Post('demo-user')
    addDemoUser(@Body() body: DemoUserDTO) {
        return this.adminUserService.addDemoUser(body);
    }
}
