import { IsNotEmpty, IsString } from "class-validator";

export class ProjectEstimatorTemplateNameDTO {
    @IsString()
    @IsNotEmpty()
    name: string
}