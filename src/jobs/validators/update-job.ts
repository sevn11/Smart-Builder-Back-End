import { IsNotEmpty, IsNumber, IsString, IsOptional, IsDate, IsBoolean } from "class-validator";

export class UpdateJobDTO {

    @IsString()
    @IsOptional()
    jobDescription: string

    @IsString()
    @IsOptional()
    projectLocation: string

    @IsString()
    @IsOptional()
    projectState: string

    @IsString()
    @IsOptional()
    projectCity: string

    @IsString()
    @IsOptional()
    projectZip: string

    @IsString()
    @IsOptional()
    projectBudget: string

    @IsString()
    @IsOptional()
    lotBudget: string

    @IsString()
    @IsOptional()
    houseBudget: string

    @IsString()
    @IsOptional()
    houseSize: string

    @IsString()
    @IsOptional()
    financing: string

    @IsString()
    @IsOptional()
    timeFrame: string

    @IsString()
    @IsOptional()
    hearAbout: string

    @IsString()
    @IsOptional()
    startDate: Date

    @IsString()
    @IsOptional()
    endDate: Date

    @IsBoolean()
    @IsOptional()
    isGas: boolean

    @IsBoolean()
    @IsOptional()
    isElectric: boolean

    @IsBoolean()
    @IsOptional()
    isWater: boolean

    @IsBoolean()
    @IsOptional()
    isSewer: boolean
}
