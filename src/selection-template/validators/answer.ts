import { IsArray, IsNotEmpty, IsOptional } from "class-validator";

export class AnswerDTO {

    @IsNotEmpty()
    questionId: number;

    @IsArray()
    @IsOptional()
    answerIds: string[];

    @IsOptional()
    answerText: string;
}