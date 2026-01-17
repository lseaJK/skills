/**
 * Base system error class
 */
export class SystemError extends Error {
  public readonly type: ErrorType;
  public readonly severity: ErrorSeverity;
  public readonly context: ErrorContext;
  public readonly suggestions: RecoverySuggestion[];
  public readonly cause?: Error;

  constructor(
    type: ErrorType,
    message: string,
    severity: ErrorSeverity = ErrorSeverity.ERROR,
    context: ErrorContext = {},
    suggestions: RecoverySuggestion[] = [],
    cause?: Error
  ) {
    super(message);
    this.name = 'SystemError';
    this.type = type;
    this.severity = severity;
    this.context = context;
    this.suggestions = suggestions;
    this.cause = cause;
  }
}

/**
 * Types of system errors
 */
export enum ErrorType {
  SKILL_DEFINITION_ERROR = 'skill_definition_error',
  EXECUTION_ERROR = 'execution_error',
  MIGRATION_ERROR = 'migration_error',
  EXTENSION_ERROR = 'extension_error',
  VALIDATION_ERROR = 'validation_error',
  REGISTRY_ERROR = 'registry_error',
  CONFIGURATION_ERROR = 'configuration_error'
}

/**
 * Error severity levels
 */
export enum ErrorSeverity {
  INFO = 'info',
  WARNING = 'warning',
  ERROR = 'error',
  CRITICAL = 'critical'
}

/**
 * Error context information
 */
export interface ErrorContext {
  skillId?: string;
  operation?: string;
  layer?: number;
  timestamp?: Date;
  userId?: string;
  sessionId?: string;
  additionalData?: Record<string, any>;
}

/**
 * Recovery suggestion
 */
export interface RecoverySuggestion {
  action: string;
  description: string;
  automated: boolean;
  priority: number;
}

/**
 * Error recovery strategy interface
 */
export interface ErrorRecoveryStrategy {
  canRecover(error: SystemError): boolean;
  recover(error: SystemError): Promise<RecoveryResult>;
  fallback(error: SystemError): Promise<FallbackResult>;
}

/**
 * Recovery result
 */
export interface RecoveryResult {
  success: boolean;
  message: string;
  data?: any;
  nextSteps?: string[];
}

/**
 * Fallback result
 */
export interface FallbackResult {
  success: boolean;
  message: string;
  alternativeAction?: string;
  data?: any;
}