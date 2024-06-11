import { IsArray, IsNotEmpty, IsNumber } from 'class-validator';

export class JobContractorDTO {
    
    @IsArray()
    @IsNumber({}, { each: true })
    @IsNotEmpty()
    contractorIds: number[];
}
