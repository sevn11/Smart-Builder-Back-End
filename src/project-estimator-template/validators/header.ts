import { IsNotEmpty, IsNumber, IsString } from "class-validator";

export class ProjectEstimatorTemplateHeaderDTO {
    @IsString()
    @IsNotEmpty()
    name: string

    @IsNumber()
    @IsNotEmpty()
    projectEstimatorTemplateId: number
}