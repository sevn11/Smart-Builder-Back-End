import { Body, Controller, NotFoundException, Post } from '@nestjs/common';
import { SignUpDTO, SignInDTO } from './validators';
import { AuthService } from './auth.service';


@Controller('auth')
export class AuthController {
  constructor(private authService: AuthService){

  }

  @Post('signup')
  signup(@Body() body: SignUpDTO) {
    return this.authService.signup(body);
    }

  @Post('login')
  async login(@Body() body: SignInDTO){
    return await this.authService.login(body);
  }

}
