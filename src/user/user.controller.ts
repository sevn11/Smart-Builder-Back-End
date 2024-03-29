import { Body, Controller, Get, HttpCode, HttpStatus, Post, UseGuards } from '@nestjs/common';
import { JwtGuard } from 'src/core/utils/guards';
import { UserService } from './user.service';
import { GetUser } from 'src/core/decorators';
import { User } from '@prisma/client';
import { ChangePasswordDTO } from './validators/change-password';

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
}
