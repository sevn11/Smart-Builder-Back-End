import { Body, Controller, Get, HttpCode, HttpStatus, Param, ParseIntPipe, Patch, Post, UseGuards } from '@nestjs/common';
import { JwtGuard } from 'src/core/guards';
import { UserService } from './user.service';
import { GetUser } from 'src/core/decorators';
import { User } from '@prisma/client';
import { UpdateMyProfileDTO, ChangePasswordDTO } from './validators';

@UseGuards(JwtGuard)
@Controller('users')
export class UserController {
    constructor(private userService: UserService) {

    }

    @HttpCode(HttpStatus.OK)
    @Get('/me')
    me(@GetUser() user: User) {
        return this.userService.me(user);
    }

    @HttpCode(HttpStatus.OK)
    @Post('/me/changepassword')
    changePassword(@GetUser() user: User, @Body() body: ChangePasswordDTO) {
        return this.userService.changePassword(user, body);
    }

    @HttpCode(HttpStatus.OK)
    @Patch('/me/profile')
    updateMyProfile(@GetUser() user: User, @Body() body: UpdateMyProfileDTO) {
        return this.userService.updateMyProfile(user, body)
    }

    @HttpCode(HttpStatus.OK)
    @Get('/me/tos')
    tos(@GetUser() user: User) {
        return this.userService.tos(user);
    }

    @HttpCode(HttpStatus.OK)
    @Get('/me/sign-now-plan-status')
    getSignNowPlanStatus(@GetUser() user: User) {
        return this.userService.getSignNowPlanStatus(user);
    }

    @HttpCode(HttpStatus.OK)
    @Get('/me/check-job-access/:jobId')
    checkProjectAccess(@GetUser() user: User, @Param('jobId', ParseIntPipe) jobId: number,) {
        return this.userService.checkProjectAccess(user, jobId);
    }
}
