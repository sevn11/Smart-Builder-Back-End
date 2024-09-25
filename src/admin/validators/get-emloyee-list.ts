import { Transform, Type } from "class-transformer";
import { IsOptional, IsBoolean, IsNumber, IsString } from "class-validator";

export class GetEmployeeListDTO {

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
    search?: string;

    @IsString()
    @IsOptional()
    userType?: string = "Employee";

    @IsNumber()
    @Type(() => Number)
    @IsOptional()
    companyId?: number;

}
