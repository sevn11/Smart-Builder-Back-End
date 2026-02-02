import { BadRequestException } from '@nestjs/common';

export interface CSVColumnValidationResult {
    isValid: boolean;
    missingColumns: string[];
    missingColumnsReadable: string[];
    extraColumns?: string[];
}

export interface CSVValidationConfig {
    requiredColumns: string[];
    optionalColumns?: string[];
    strictMode?: boolean; // If true, reject CSV with extra columns
    numericColumns?: string[]; // Columns that must be non-negative numbers
}

export class CSVValidator {
    /**
     * Validate CSV columns against required and optional columns
     */
    static validateColumns(
        parsedData: any[],
        config: CSVValidationConfig
    ): CSVColumnValidationResult {
        if (!parsedData || parsedData.length === 0) {
            throw new BadRequestException('CSV file is empty');
        }

        const { requiredColumns, optionalColumns = [], strictMode = false } = config;

        // Get columns from the first row
        const csvColumns = Object.keys(parsedData[0] || {});

        // Find missing required columns
        const missingColumns = requiredColumns.filter(col => !csvColumns.includes(col));

        // Find extra columns (if in strict mode)
        const allowedColumns = [...requiredColumns, ...optionalColumns];
        const extraColumns = strictMode 
            ? csvColumns.filter(col => !allowedColumns.includes(col))
            : [];

        // Convert snake_case to readable format
        const missingColumnsReadable = missingColumns.map(col =>
            this.snakeToReadable(col)
        );

        return {
            isValid: missingColumns.length === 0 && (strictMode ? extraColumns.length === 0 : true),
            missingColumns,
            missingColumnsReadable,
            extraColumns: strictMode ? extraColumns : undefined
        };
    }

    /**
     * Validate numeric columns for negative values
     */
    static validateNumericColumns(
        parsedData: any[],
        numericColumns: string[]
    ): { isValid: boolean; errors: string[] } {
        const errors: string[] = [];

        parsedData.forEach((row, index) => {
            numericColumns.forEach(column => {
                const value = row[column];
                
                // Check if value exists and is a number
                if (value !== undefined && value !== null && value !== '') {
                    const numValue = Number(value);
                    
                    // Check if it's a valid number and not negative
                    if (isNaN(numValue)) {
                        errors.push(
                            `Row ${index + 1}: '${this.snakeToReadable(column)}' must be a number (found: '${value}')`
                        );
                    } else if (numValue < 0) {
                        errors.push(
                            `Row ${index + 1}: '${this.snakeToReadable(column)}' cannot be negative (found: ${numValue})`
                        );
                    }
                }
            });
        });

        return {
            isValid: errors.length === 0,
            errors
        };
    }

    /**
     * Validate and throw error if validation fails
     */
    static validateColumnsOrThrow(
        parsedData: any[],
        config: CSVValidationConfig
    ): void {
        // First validate column presence
        const validation = this.validateColumns(parsedData, config);

        if (!validation.isValid) {
            const errorMessages: string[] = [];

            if (validation.missingColumns.length > 0) {
                errorMessages.push(
                    `Missing required columns: ${validation.missingColumnsReadable.join(', ')}`
                );
            }

            if (validation.extraColumns && validation.extraColumns.length > 0) {
                errorMessages.push(
                    `Unexpected columns found: ${validation.extraColumns.join(', ')}`
                );
            }

            throw new BadRequestException({
                message: 'CSV validation failed',
                errors: errorMessages,
                missingColumns: validation.missingColumns,
                missingColumnsReadable: validation.missingColumnsReadable,
                extraColumns: validation.extraColumns,
                help: validation.missingColumns.length > 0
                    ? `Please add the following columns to your CSV file: ${validation.missingColumnsReadable.join(', ')}`
                    : undefined
            });
        }

        // Then validate numeric columns if specified
        if (config.numericColumns && config.numericColumns.length > 0) {
            const numericValidation = this.validateNumericColumns(parsedData, config.numericColumns);
            
            if (!numericValidation.isValid) {
                throw new BadRequestException({
                    message: 'CSV validation failed',
                    errors: numericValidation.errors,
                    help: 'Please ensure all order values are non-negative numbers'
                });
            }
        }
    }

    /**
     * Convert snake_case to Readable Format
     */
    private static snakeToReadable(str: string): string {
        return str
            .split('_')
            .map(word => word.charAt(0).toUpperCase() + word.slice(1))
            .join(' ');
    }

    /**
     * Get sample CSV header row based on required and optional columns
     */
    static getSampleHeader(config: CSVValidationConfig): string {
        const { requiredColumns, optionalColumns = [] } = config;
        const allColumns = [...requiredColumns, ...optionalColumns];
        return allColumns.join(',');
    }
}

// Column Definitions - Add your CSV types here
export const CSV_COLUMN_DEFINITIONS = {
    QUESTIONNAIRE: {
        requiredColumns: [
            // Category required fields
            'category',
            'category_order',
            'company_category',
            'category_linked_to_final_selection',
            'category_linked_to_paint_selection',
            'category_linked_to_phase',
            'initial_order',
            'paint_order',
            
            // Question required fields
            'question',
            'question_type',
            'question_order',
            'question_linked_to_questionnaire',
            'question_linked_to_final_selection',
            'question_linked_to_paint_selection',
            'question_linked_to_phase',
            'question_paint_order',
            'question_initial_order'
        ],
        optionalColumns: [
            'initial_question_order',
            'paint_question_order',
            'multiple_options',
        ],
        // Columns that must be non-negative numbers
        numericColumns: [
            'initial_order',
            'paint_order',
            'question_order',
            'question_paint_order',
            'question_initial_order'
        ]
    },
    
};