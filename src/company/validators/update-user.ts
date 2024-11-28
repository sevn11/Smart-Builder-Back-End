import { IsNotEmpty, IsString, ValidateNested, IsObject, IsEmail } from "class-validator";
import { PermissionSetDTO } from "./permission-set";
import { Type } from "class-transformer";

export class UpdateUserDTO {

    @IsString()
    @IsNotEmpty()
    name: string

    @IsEmail()
    @IsString()
    @IsNotEmpty()
    email: string

    @ValidateNested()
    @IsObject()
    @IsNotEmpty()
    @Type(() => PermissionSetDTO)
    PermissionSet: PermissionSetDTO
}