import { IsNotEmpty, IsString } from "class-validator";

export class ContractorPhaseDTO {

    @IsString()
    @IsNotEmpty()
    name: string
}