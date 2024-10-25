import { IsNotEmpty, IsString } from "class-validator";

export class ProjectDescriptionDTO {

    @IsString()
    @IsNotEmpty()
    name: string
}