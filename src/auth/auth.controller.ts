import { Body, Controller, NotFoundException, Post } from '@nestjs/common';
import { AuthDTO } from './validators';
import { AuthService } from './auth.service';


@Controller('auth')
export class AuthController {
  constructor(private authService: AuthService){

  }

  @Post('signup')
  signup(@Body() body: AuthDTO) {
    return this.authService.signup(body);
    }

  @Post('login')
  async login(@Body() body: AuthDTO){
    return await this.authService.login(body);
  }

}
