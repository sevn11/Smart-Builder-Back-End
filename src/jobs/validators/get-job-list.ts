import { Transform } from "class-transformer";
import { IsOptional, IsBooleanString, IsBoolean } from "class-validator";

export class GetJobListDTO {

    @IsBoolean()
    @IsOptional()
    @Transform(({ value }) => { return value === 'true' })
    closed?: boolean

}