import { Body, Controller, HttpCode, HttpStatus, NotFoundException, Post } from '@nestjs/common';
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

  @HttpCode(HttpStatus.OK)
  @Post('login')
  async login(@Body() body: SignInDTO){
    return await this.authService.login(body);
  }

}
