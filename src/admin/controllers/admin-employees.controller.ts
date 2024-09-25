import { Body, Controller, Delete, Get, HttpCode, HttpStatus, Param, ParseIntPipe, Patch, Post, Query } from '@nestjs/common';
import { AdminEmployeeService } from '../services/admin-employees.service';
import { GetEmployeeListDTO } from '../validators/get-emloyee-list';
import { CreateUpdateExtraFeeDTO } from '../validators/create-update-extra-fee';

@Controller('admin/employees')
export class AdminEmployeesController {

    constructor(private adminEmployeeService: AdminEmployeeService) {

    }

    @Get('')
    @HttpCode(HttpStatus.OK)
    getEmployeeList(@Query() query: GetEmployeeListDTO) {
        return this.adminEmployeeService.getEmployeeList(query);
    }

    @Delete('/:employeeId')
    @HttpCode(HttpStatus.OK)
    deleteEmployee(@Param('employeeId', ParseIntPipe) employeeId: number) {
        return this.adminEmployeeService.deleteEmployee(employeeId);
    }

    @Post('/extra-fee')
    @HttpCode(HttpStatus.OK)
    addUpdateExtraFee(@Body() body: CreateUpdateExtraFeeDTO) {
        return this.adminEmployeeService.addUpdateExtraFee(body);
    }

    @Get('/extra-fee/:userId')
    @HttpCode(HttpStatus.OK)
    getExtraFee(@Param('userId', ParseIntPipe) userId: number) {
        return this.adminEmployeeService.getExtraFee(userId);
    }

}
