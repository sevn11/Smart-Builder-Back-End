import { IsNotEmpty, IsString } from "class-validator";


export class JobProjectEstimatorHeaderDTO {

    @IsString()
    @IsNotEmpty()
    name: string
}