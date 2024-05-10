import { IsBoolean, IsNotEmpty } from "class-validator";

export class ChangeBuilderAccessDTO {

    @IsBoolean()
    @IsNotEmpty()
    isActive: boolean

}