import { IsNotEmpty, IsNumber, IsString } from "class-validator";

export class CreateJobDTO {

    @IsNumber()
    @IsNotEmpty()
    description: number

    @IsNumber()
    @IsNotEmpty()
    customerId: number

}