// if profitCalculationType = MARGIN
export const marginCalculation = (validBuilderCost: number, validGrossProfitPercentage: number) => {
    return validBuilderCost / (1 - validGrossProfitPercentage / 100);
}

// if profitCalculationType = MARKUP
export const markupCalculation = (validBuilderCost: number, validGrossProfitPercentage: number) => {
    return (1 + (validGrossProfitPercentage / 100)) * validBuilderCost;
}

export enum ProfitCalculationTypeEnum {
    MARKUP = "MARKUP",
    MARGIN = "MARGIN"
}