import { Body, Controller, Delete, Get, HttpCode, HttpStatus, Param, ParseIntPipe, Patch, Post, Query } from '@nestjs/common';
import { AdminEmployeeService } from '../services/admin-employees.service';
import { GetEmployeeListDTO } from '../validators/get-emloyee-list';

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

}
