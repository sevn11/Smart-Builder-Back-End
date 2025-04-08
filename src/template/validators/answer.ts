import { IsArray, IsNotEmpty, IsNumber, IsOptional } from "class-validator";

export class QuestionAnswerDTO {

    @IsNotEmpty()
    questionId: number;

    @IsOptional()
    isLinkToQuestionnaire: boolean;

    @IsArray()
    @IsOptional()
    answerIds: string[];

    @IsOptional()
    answerText: string;

    @IsNumber()
    @IsNotEmpty()
    jobId: number;
}