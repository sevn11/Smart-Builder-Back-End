import { IsNotEmpty, IsNumber } from 'class-validator';

export class UpdateJobContractorDTO {
    @IsNumber()
    @IsNotEmpty()
    contractorId: number;
}
