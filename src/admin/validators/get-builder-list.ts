import { Transform, Type } from "class-transformer";
import { IsOptional, IsBoolean, IsNumber, IsString } from "class-validator";

export class GetBuilderListDTO {

    @IsBoolean()
    @IsOptional()
    @Transform(({ value }) => { return value === 'true' })
    isActive?: boolean = true

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