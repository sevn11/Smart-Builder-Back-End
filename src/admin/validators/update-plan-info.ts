import { IsBoolean, IsNotEmpty, IsNumber, IsOptional, IsString, ValidateNested } from "class-validator";
import { Type } from "class-transformer";
import { BuilderPlanTypes } from "src/core/utils/builder-plan-types";

class PlanInfo {

    @IsNumber()
    @IsOptional()
    yearlyPlanAmount: number;

    @IsNumber()
    @IsOptional()
    monthlyPlanAmount: number;

    @IsNumber()
    @IsOptional()
    additionalEmployeeFee: number;
}

export class UpdateBuilderPlanInfoDTO {
    @ValidateNested({ each: true })
    @Type(() => PlanInfo)
    plans: PlanInfo[];

    @IsBoolean()
    @IsOptional()
    applyToCurrentUsers: boolean;

    @IsBoolean()
    @IsOptional()
    notifyUsers: boolean;
}
