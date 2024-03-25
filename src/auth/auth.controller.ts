import { Body, Controller, Post } from '@nestjs/common';
import { SignupDTO } from './validators';
import { AuthService } from './auth.service';

@Controller('auth')
export class AuthController {
  constructor(private authService: AuthService){

  }

  @Post('signup')
  signup(@Body() body: SignupDTO) {
    return this.authService.signup(body);
    }

}
