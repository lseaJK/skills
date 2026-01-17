/**
 * Base system error class
 */
export declare class SystemError extends Error {
    readonly type: ErrorType;
    readonly severity: ErrorSeverity;
    readonly context: ErrorContext;
    readonly suggestions: RecoverySuggestion[];
    readonly cause?: Error;
    constructor(type: ErrorType, message: string, severity?: ErrorSeverity, context?: ErrorContext, suggestions?: RecoverySuggestion[], cause?: Error);
}
/**
 * Types of system errors
 */
export declare enum ErrorType {
    SKILL_DEFINITION_ERROR = "skill_definition_error",
    EXECUTION_ERROR = "execution_error",
    MIGRATION_ERROR = "migration_error",
    EXTENSION_ERROR = "extension_error",
    VALIDATION_ERROR = "validation_error",
    REGISTRY_ERROR = "registry_error",
    CONFIGURATION_ERROR = "configuration_error"
}
/**
 * Error severity levels
 */
export declare enum ErrorSeverity {
    INFO = "info",
    WARNING = "warning",
    ERROR = "error",
    CRITICAL = "critical"
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
//# sourceMappingURL=error.d.ts.map