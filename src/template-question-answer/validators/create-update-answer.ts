import { IsArray, IsNotEmpty, IsOptional } from "class-validator";

export class CreateUpdateAnswerDTO {

    @IsNotEmpty()
    questionId: number;

    @IsArray()
    @IsOptional()
    answerIds: string[];

    @IsOptional()
    answerText: string;
}