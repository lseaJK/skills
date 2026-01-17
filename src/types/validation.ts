/**
 * Validation result interface
 */
export interface ValidationResult {
  valid: boolean;
  errors: ValidationError[];
  warnings: ValidationWarning[];
}

/**
 * Validation error information
 */
export interface ValidationError {
  code: string;
  message: string;
  path?: string;
  severity: ValidationSeverity;
  suggestions?: string[];
}

/**
 * Validation warning information
 */
export interface ValidationWarning {
  code: string;
  message: string;
  path?: string;
  suggestions?: string[];
}

/**
 * Validation severity levels
 */
export enum ValidationSeverity {
  ERROR = 'error',
  WARNING = 'warning',
  INFO = 'info'
}

/**
 * Validation context
 */
export interface ValidationContext {
  strict: boolean;
  allowUnknownProperties: boolean;
  validateExamples: boolean;
  customValidators?: Record<string, ValidatorFunction>;
}

/**
 * Custom validator function type
 */
export type ValidatorFunction = (value: any, context: ValidationContext) => ValidationResult;