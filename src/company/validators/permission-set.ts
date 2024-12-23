import { IsBoolean, IsNotEmpty } from "class-validator"

export class PermissionSetDTO {


    @IsBoolean()
    @IsNotEmpty()
    fullAccess: boolean

    @IsBoolean()
    @IsNotEmpty()
    accounting: boolean

    @IsBoolean()
    @IsNotEmpty()
    specifications: boolean

    @IsBoolean()
    @IsNotEmpty()
    questionnaire: boolean

    @IsBoolean()
    @IsNotEmpty()
    selection: boolean

    @IsBoolean()
    @IsNotEmpty()
    schedule: boolean

    @IsBoolean()
    @IsNotEmpty()
    proposal: boolean

    @IsBoolean()
    @IsNotEmpty()
    viewOnly: boolean

}