import { Body, Controller, Delete, Get, HttpCode, HttpStatus, Param, ParseIntPipe, Patch, Post, UseGuards } from '@nestjs/common';
import { CalendarTemplateService } from './calendar-template.service';
import { JwtGuard } from 'src/core/guards';
import { GetUser } from 'src/core/decorators';
import { User } from '@prisma/client';
import { TemplateDTO } from './validators/template';
import { EventDTO } from './validators/event';
import { ContractorAssignmentDTO } from './validators/contractor-assignment';
import { EventUpdateDTO } from './validators/update-event';

@UseGuards(JwtGuard)
@Controller('companies/:companyId/calendar-template')
export class CalendarTemplateController {
  constructor(private readonly calendarTemplateService: CalendarTemplateService) { }

  // Create calendar template
  @HttpCode(HttpStatus.CREATED)
  @Post('create')
  createTemplate(@GetUser() user: User, @Param('companyId', ParseIntPipe) companyId: number, @Body() body: TemplateDTO) {
    return this.calendarTemplateService.createTemplate(user, companyId, body);
  }

  // Update calendar template
  @HttpCode(HttpStatus.OK)
  @Patch(':templateId/update')
  updateTemplate(@GetUser() user: User, @Param('companyId', ParseIntPipe) companyId: number, @Param('templateId', ParseIntPipe) templateId: number, @Body() body: TemplateDTO) {
    return this.calendarTemplateService.updateTemplate(user, companyId, templateId, body);
  }

  // Delete template
  @HttpCode(HttpStatus.OK)
  @Delete(':templateId')
  deleteTemplate(@GetUser() user: User, @Param('companyId', ParseIntPipe) companyId: number, @Param('templateId', ParseIntPipe) templateId: number) {
    return this.calendarTemplateService.deleteTemplate(user, companyId, templateId)
  }

  // Get the calendar templates.
  @HttpCode(HttpStatus.OK)
  @Get()
  getTemplate(@GetUser() user: User, @Param('companyId', ParseIntPipe) companyId: number) {
    return this.calendarTemplateService.getTemplate(user, companyId)
  }

  // Get the calendar template data
  @HttpCode(HttpStatus.OK)
  @Get(':templateId/data')
  getTemplateData(@GetUser() user: User, @Param('companyId', ParseIntPipe) companyId: number, @Param('templateId', ParseIntPipe) templateId: number) {
    return this.calendarTemplateService.getTemplateData(user, companyId, templateId);
  }

  // Create event
  @HttpCode(HttpStatus.OK)
  @Post(':templateId/create/event')
  createEvent(@GetUser() user: User, @Param('companyId', ParseIntPipe) companyId: number, @Param('templateId', ParseIntPipe) templateId: number, @Body() body: EventDTO) {
    return this.calendarTemplateService.createEvent(user, companyId, templateId, body);
  }

  // Delete calendar event
  @HttpCode(HttpStatus.OK)
  @Delete(':templateId/event/:eventId')
  deleteEvent(@GetUser() user: User, @Param('companyId', ParseIntPipe) companyId: number, @Param('templateId', ParseIntPipe) templateId: number, @Param('eventId', ParseIntPipe) eventId: number) {
    return this.calendarTemplateService.deleteEvent(user, companyId, templateId, eventId);
  }

  // Update calendar event
  @HttpCode(HttpStatus.OK)
  @Patch(':templateId/update/:eventId/event')
  updateEvent(@GetUser() user: User, @Param('companyId', ParseIntPipe) companyId: number, @Param('templateId', ParseIntPipe) templateId: number, @Param('eventId', ParseIntPipe) eventId: number, @Body() body: EventUpdateDTO) {
    return this.calendarTemplateService.updateEvent(user, companyId, templateId, eventId, body);
  }

  // Get the calendar template data grouped acc to phase id
  @HttpCode(HttpStatus.OK)
  @Get(':templateId/data/group')
  getTemplateDataGrouped(@GetUser() user: User, @Param('companyId', ParseIntPipe) companyId: number, @Param('templateId', ParseIntPipe) templateId: number) {
    return this.calendarTemplateService.getTemplateDataGrouped(user, companyId, templateId)
  }

  // Apply the calendar event selected
  @HttpCode(HttpStatus.OK)
  @Post(':templateId/job/:jobId/apply')
  applyCalendarTemplate(@GetUser() user: User, @Param('companyId', ParseIntPipe) companyId: number, @Param('templateId', ParseIntPipe) templateId: number, @Param('jobId', ParseIntPipe) jobId: number, @Body() body: ContractorAssignmentDTO) {
    return this.calendarTemplateService.applyCalendarTemplate(user, companyId, templateId, jobId, body);
  }

  @HttpCode(HttpStatus.OK)
  @Get('contractors')
  getContractors(@GetUser() user: User, @Param('companyId', ParseIntPipe) companyId: number) {
    return this.calendarTemplateService.getContractors(user, companyId);
  }
}
