import { IsNotEmpty, IsString, ValidateNested, IsObject } from "class-validator";
import { PermissionSetDTO } from "./permission-set";
import { Type } from "class-transformer";

export class UpdateUserDTO {

    @IsString()
    @IsNotEmpty()
    name: string

    @ValidateNested()
    @IsObject()
    @IsNotEmpty()
    @Type(() => PermissionSetDTO)
    PermissionSet: PermissionSetDTO
}