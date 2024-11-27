export enum QuestionTypes {
    TEXT = 'Text',
    DATE = 'Date',
    MCQ = 'Multiple Choice Question',
    CHECKBOX_QUESTION = 'Checkbox Question',
    Allowance = 'Allowance',
}

export const toSnakeCase = (str: string) => {

    return str
        .replace(/([a-z])([A-Z])/g, '$1_$2')  // Handle camelCase or PascalCase to snake_case
        .replace(/\s+/g, '_')                 // Replace spaces with underscores
        .toLowerCase();
};