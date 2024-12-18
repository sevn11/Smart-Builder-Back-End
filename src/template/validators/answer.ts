import { IsArray, IsNotEmpty, IsNumber, IsOptional } from "class-validator";

export class QuestionAnswerDTO {

    @IsNotEmpty()
    questionId: number;

    @IsArray()
    @IsOptional()
    answerIds: string[];

    @IsOptional()
    answerText: string;

    @IsNumber()
    @IsNotEmpty()
    jobId: number;
}