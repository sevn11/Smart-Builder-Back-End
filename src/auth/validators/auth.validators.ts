import { Optional } from '@nestjs/common';
import { IsEmail, IsNotEmpty, IsString, IsOptional, IsEnum, ValidateIf } from 'class-validator'
import { BuilderPlanTypes } from 'src/core/utils/builder-plan-types';

export class SignUpDTO {

  @IsEmail()
  @IsNotEmpty()
  email: string;

  @IsString()
  @IsNotEmpty()
  password: string;

  @IsString()
  @IsOptional()
  name?: string;

  @IsString()
  @IsNotEmpty()
  companyName: string;

  @IsString()
  @IsNotEmpty()
  address?: string

  @IsString()
  @IsNotEmpty()
  zipcode?: string

  @IsString()
  @IsNotEmpty()
  phoneNumber?: string

  @IsString()
  @IsNotEmpty()
  paymentMethodId?: string

  @IsEnum(BuilderPlanTypes)
  planType: BuilderPlanTypes;

  @ValidateIf((o) => o.signNowPlanType && o.signNowPlanType !== '' && o.signNowPlanType != null)
  @Optional()
  @IsEnum(BuilderPlanTypes)
  signNowPlanType: BuilderPlanTypes;
}


export class SignInDTO {

  @IsEmail()
  @IsNotEmpty()
  email: string;

  @IsString()
  @IsNotEmpty()
  password: string;
}