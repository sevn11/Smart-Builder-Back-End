import { Body, Controller, Get, UseGuards } from '@nestjs/common';
import { JwtGuard } from 'src/auth/guards';
import { UserService } from './user.service';
import { GetUser } from 'src/auth/decorators';
import { User } from '@prisma/client';

@UseGuards(JwtGuard)
@Controller('users')
export class UserController {
    constructor(private userService: UserService) {

    }

    @Get('/me')
    me(@GetUser() user: User) {
        return this.userService.me(user);
    }
}
