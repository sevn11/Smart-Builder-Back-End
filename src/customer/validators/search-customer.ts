import { IsNotEmpty, IsString } from "class-validator";

export class SearchCustomerDTO {
    @IsString()
    @IsNotEmpty()
    name: string
}