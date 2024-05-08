import { Transform, Type } from "class-transformer";
import { IsOptional, IsBoolean, IsNumber, IsString } from "class-validator";

export class GetJobListDTO {

    @IsBoolean()
    @IsOptional()
    @Transform(({ value }) => { return value === 'true' })
    closed?: boolean

    @IsNumber()
    @Type(() => Number)
    @IsOptional()
    page?: number = 0;

    @IsNumber()
    @Type(() => Number)
    @IsOptional()
    limit?: number = 10;

    @IsString()
    @IsOptional()
    search?: string


}