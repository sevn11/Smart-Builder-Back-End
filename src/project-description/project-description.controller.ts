import { Body, Controller, Delete, Get, HttpCode, HttpStatus, Param, ParseIntPipe, Patch, Post, UseGuards } from '@nestjs/common';
import { JwtGuard } from 'src/core/guards';
import { ProjectDescriptionService } from './project-description.service';
import { GetUser } from 'src/core/decorators';
import { User } from '@prisma/client';
import { ProjectDescriptionDTO } from './validators/create-update-project-description';


@UseGuards(JwtGuard)
@Controller('companies/:companyId/:customerId/project-description')
export class ProjectDescriptionController {

    constructor(private projectDescriptionService: ProjectDescriptionService) {

    }

    @Get()
    @HttpCode(HttpStatus.OK)
    getProjectDescriptions(@GetUser() user: User, @Param('companyId', ParseIntPipe) companyId: number, @Param('customerId', ParseIntPipe) customerId: number) {
        return this.projectDescriptionService.getProjectDescriptions(user, companyId, customerId);
    }

    @Post()
    @HttpCode(HttpStatus.OK)
    createProjectDescription(@GetUser() user: User, @Param('companyId', ParseIntPipe) companyId: number, @Param('customerId', ParseIntPipe) customerId: number, @Body() body: ProjectDescriptionDTO) {
        return this.projectDescriptionService.createProjectDescription(user, companyId, customerId, body);
    }

    @Patch('/:descriptionId')
    @HttpCode(HttpStatus.OK)
    updateProjectDescription(@GetUser() user: User, @Param('companyId', ParseIntPipe) companyId: number, @Param('customerId', ParseIntPipe) customerId: number, @Param('descriptionId', ParseIntPipe) descriptionId: number, @Body() body: ProjectDescriptionDTO) {
        return this.projectDescriptionService.updateProjectDescription(user, companyId, customerId, descriptionId, body);
    }

    @Delete('/:descriptionId')
    @HttpCode(HttpStatus.OK)
    deleteProjectDescription(@GetUser() user: User, @Param('companyId', ParseIntPipe) companyId: number, @Param('customerId', ParseIntPipe) customerId: number, @Param('descriptionId', ParseIntPipe) descriptionId: number) {
        return this.projectDescriptionService.deleteProjectDescription(user, companyId, customerId, descriptionId);
    }

}
