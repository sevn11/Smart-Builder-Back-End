import { IsNotEmpty, IsNumber, IsString } from "class-validator";

export class CreateJobDTO {

    @IsString()
    @IsNotEmpty()
    description: string

    @IsNumber()
    @IsNotEmpty()
    customerId: number

}