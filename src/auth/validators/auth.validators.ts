import { Optional } from '@nestjs/common';
import { IsEmail, IsNotEmpty, IsString } from 'class-validator'

export class SignUpDTO {

  @IsEmail()
  @IsNotEmpty()
  email: string;

  @IsString()
  @IsNotEmpty()
  password: string;

  @IsString()
  @Optional()
  name?: string;

  @IsString()
  @IsNotEmpty()
  companyName: string;
}


export class SignInDTO {

  @IsEmail()
  @IsNotEmpty()
  email: string;

  @IsString()
  @IsNotEmpty()
  password: string;
}