import { IsEmail, IsNotEmpty, IsObject, IsString, ValidateNested } from "class-validator";
import { PermissionSetDTO } from "./permission-set";
import { Type } from "class-transformer";

export class AddUserDTO {

    @IsString()
    @IsNotEmpty()
    name: string

    @IsEmail()
    @IsNotEmpty()
    email: string

    @ValidateNested()
    @IsObject()
    @IsNotEmpty()
    @Type(() => PermissionSetDTO)
    permissionSet: PermissionSetDTO

}