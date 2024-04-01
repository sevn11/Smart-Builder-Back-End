import { IsBoolean, IsNotEmpty } from "class-validator"

export class PermissionSetDTO {


    @IsBoolean()
    @IsNotEmpty()
    fullaccess: boolean

    @IsBoolean()
    @IsNotEmpty()
    specifications: boolean

    @IsBoolean()
    @IsNotEmpty()
    selection: boolean

    @IsBoolean()
    @IsNotEmpty()
    schedule: boolean

    @IsBoolean()
    @IsNotEmpty()
    view_only: boolean

}