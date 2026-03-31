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
  @IsOptional()
  address?: string

  @IsString()
  @IsNotEmpty()
  zipcode: string

  @IsString()
  @IsOptional()
  phoneNumber?: string

  @IsString()
  @IsOptional()
  paymentMethodId?: string

  @IsEnum(BuilderPlanTypes)
  @IsOptional()
  planType?: BuilderPlanTypes;

  @ValidateIf((o) => o.signNowPlanType && o.signNowPlanType !== '' && o.signNowPlanType != null)
  @IsOptional()
  @IsEnum(BuilderPlanTypes)
  signNowPlanType: BuilderPlanTypes;

  @IsString()
  @IsOptional()
  promoCode: string;
}


export class SignInDTO {

  @IsEmail()
  @IsNotEmpty()
  email: string;

  @IsString()
  @IsNotEmpty()
  password: string;
}