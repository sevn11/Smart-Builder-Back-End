import { Body, Controller, Get, HttpCode, HttpStatus, Param, ParseIntPipe, Post, UseGuards } from '@nestjs/common';
import { JwtGuard } from 'src/core/guards';
import { GoogleCalendarService } from './google-calendar.service';
import { GetUser } from 'src/core/decorators';
import { User } from '@prisma/client';
import { GoogleService } from 'src/core/services/google.service';

@UseGuards(JwtGuard)
@Controller('google-calendar')
export class GoogleCalendarController {
    constructor(
        private googleCalendarService: GoogleCalendarService,
        private googleService: GoogleService
    ) {}

    @Get('/:companyId/check-auth-status')
    @HttpCode(HttpStatus.OK)
    getAllContractors(@GetUser() user: User, @Param('companyId', ParseIntPipe) companyId: number) {
        return this.googleCalendarService.checkAuthStatus(user, companyId);
    }

    @Post('/:companyId/auth/save-token')
    @HttpCode(HttpStatus.OK)
    handleAuthenticationResponse(@GetUser() user: User, @Param('companyId', ParseIntPipe) companyId: number, @Body() body: any) {
        return this.googleService.handleGoogleAuthentication(user, companyId, body);
    }

    @Get('/:companyId/get-authenticated-user')
    @HttpCode(HttpStatus.OK)
    getAuthenticatedUser(@GetUser() user: User, @Param('companyId', ParseIntPipe) companyId: number) {
        if(user.googleAccessToken) {
            return this.googleService.getAuthenticatedUserEmail(user);
        } else {
            return null;
        }
    }

    @Post('/:companyId/sync-to-google/:jobId')
    @HttpCode(HttpStatus.OK)
    syncJobToGoogle(@GetUser() user: User, @Param('companyId', ParseIntPipe) companyId: number, @Param('jobId', ParseIntPipe) jobId: number) {
        return this.googleCalendarService.syncJobToGoogle(user, companyId, jobId);
    }

    @Post('/:companyId/sync-all-job-to-google')
    @HttpCode(HttpStatus.OK)
    syncAllJobsToGoogle(@GetUser() user: User, @Param('companyId', ParseIntPipe) companyId: number) {
        return this.googleCalendarService.syncAllJobsToGoogle(user, companyId);
    }

}
