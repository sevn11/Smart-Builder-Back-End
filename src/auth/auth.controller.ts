import { Body, Controller, HttpCode, HttpStatus, Param, ParseIntPipe, Patch, Post } from '@nestjs/common';
import { SignUpDTO, SignInDTO, ForgotPasswordDTO, PasswordResetDTO } from './validators';
import { AuthService } from './auth.service';
import { SetPasswordDTO } from './validators/set-password';


@Controller('auth')
export class AuthController {
  constructor(private authService: AuthService) {

  }

  @Post('signup')
  signup(@Body() body: SignUpDTO) {
    return this.authService.signup(body);
  }

  @HttpCode(HttpStatus.OK)
  @Post('login')
  async login(@Body() body: SignInDTO) {
    return this.authService.login(body);
  }


  @HttpCode(HttpStatus.OK)
  @Post('/forgotpassword')
  async forgotMyPassword(@Body() body: ForgotPasswordDTO) {
    return this.authService.forgotMyPassword(body)
  }

  @HttpCode(HttpStatus.OK)
  @Post('/resetpassword/:code')
  async resetMyPassword(@Param('code', ParseIntPipe) code: number, @Body() body: PasswordResetDTO,) {
    return this.authService.resetMyPassword(code, body)
  }

  @HttpCode(HttpStatus.OK)
  @Patch('/users/:token')
  completeUserProfile(@Param('token') token: string, @Body() body: SetPasswordDTO) {
    return this.authService.completeUserProfile(token, body);

  }

}
