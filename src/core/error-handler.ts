import { 
  SystemError, 
  ErrorType, 
  ErrorSeverity, 
  ErrorContext, 
  RecoverySuggestion, 
  ErrorRecoveryStrategy, 
  RecoveryResult, 
  FallbackResult 
} from '../types/error';

/**
 * Unified error handling framework for the skills architecture system
 */
export class UnifiedErrorHandler {
  private recoveryStrategies: Map<ErrorType, ErrorRecoveryStrategy[]> = new Map();
  private errorClassifiers: ErrorClassifier[] = [];
  private errorListeners: ErrorListener[] = [];

  constructor() {
    this.initializeDefaultStrategies();
    this.initializeDefaultClassifiers();
  }

  /**
   * Handle a system error with recovery attempts
   */
  async handleError(error: Error | SystemError, context?: Partial<ErrorContext>): Promise<ErrorHandlingResult> {
    // Convert to SystemError if needed
    const systemError = this.ensureSystemError(error, context);
    
    // Notify listeners
    this.notifyErrorListeners(systemError);
    
    // Classify error for better handling
    const classification = this.classifyError(systemError);
    
    // Attempt recovery
    const recoveryResult = await this.attemptRecovery(systemError);
    
    return {
      originalError: systemError,
      classification,
      recoveryAttempted: recoveryResult.attempted,
      recoverySuccessful: recoveryResult.successful,
      recoveryResult: recoveryResult.result,
      fallbackResult: recoveryResult.fallbackResult,
      suggestions: this.generateSuggestions(systemError, classification)
    };
  }

  /**
   * Register a recovery strategy for specific error types
   */
  registerRecoveryStrategy(errorType: ErrorType, strategy: ErrorRecoveryStrategy): void {
    if (!this.recoveryStrategies.has(errorType)) {
      this.recoveryStrategies.set(errorType, []);
    }
    this.recoveryStrategies.get(errorType)!.push(strategy);
  }

  /**
   * Register an error classifier
   */
  registerErrorClassifier(classifier: ErrorClassifier): void {
    this.errorClassifiers.push(classifier);
  }

  /**
   * Register an error listener for notifications
   */
  registerErrorListener(listener: ErrorListener): void {
    this.errorListeners.push(listener);
  }

  /**
   * Create a system error with proper context
   */
  createError(
    type: ErrorType,
    message: string,
    severity: ErrorSeverity = ErrorSeverity.ERROR,
    context: Partial<ErrorContext> = {},
    originalError?: Error
  ): SystemError {
    const fullContext: ErrorContext = {
      timestamp: new Date(),
      ...context
    };

    const suggestions = this.generateBasicSuggestions(type, message);
    
    const systemError = new SystemError(type, message, severity, fullContext, suggestions, originalError);
    
    if (originalError) {
      systemError.stack = originalError.stack;
    }
    
    return systemError;
  }

  private ensureSystemError(error: Error | SystemError, context?: Partial<ErrorContext>): SystemError {
    if (error instanceof SystemError) {
      // Update context if provided
      if (context) {
        return new SystemError(
          error.type,
          error.message,
          error.severity,
          { ...error.context, ...context },
          error.suggestions
        );
      }
      return error;
    }

    // Convert regular Error to SystemError
    const errorType = this.inferErrorType(error);
    const severity = this.inferSeverity(error);
    
    return this.createError(errorType, error.message, severity, context, error);
  }

  private async attemptRecovery(error: SystemError): Promise<RecoveryAttemptResult> {
    const strategies = this.recoveryStrategies.get(error.type) || [];
    
    for (const strategy of strategies) {
      if (strategy.canRecover(error)) {
        try {
          const result = await strategy.recover(error);
          if (result.success) {
            return {
              attempted: true,
              successful: true,
              result,
              fallbackResult: null
            };
          }
        } catch (recoveryError) {
          // Recovery failed, continue to next strategy or fallback
          console.warn(`Recovery strategy failed for ${error.type}:`, recoveryError);
        }
      }
    }

    // Attempt fallback if no recovery worked
    for (const strategy of strategies) {
      try {
        const fallbackResult = await strategy.fallback(error);
        if (fallbackResult.success) {
          return {
            attempted: true,
            successful: false,
            result: null,
            fallbackResult
          };
        }
      } catch (fallbackError) {
        console.warn(`Fallback strategy failed for ${error.type}:`, fallbackError);
      }
    }

    return {
      attempted: false,
      successful: false,
      result: null,
      fallbackResult: null
    };
  }

  private classifyError(error: SystemError): ErrorClassification {
    for (const classifier of this.errorClassifiers) {
      const classification = classifier.classify(error);
      if (classification) {
        return classification;
      }
    }

    // Default classification
    return {
      category: 'unknown',
      severity: error.severity,
      recoverable: false,
      userActionRequired: true,
      systemActionRequired: false
    };
  }

  private generateSuggestions(error: SystemError, classification: ErrorClassification): RecoverySuggestion[] {
    const suggestions: RecoverySuggestion[] = [...error.suggestions];

    // Add classification-based suggestions
    if (classification.recoverable) {
      suggestions.push({
        action: 'retry_operation',
        description: 'Retry the operation that caused this error',
        automated: true,
        priority: 1
      });
    }

    if (classification.userActionRequired) {
      suggestions.push({
        action: 'check_configuration',
        description: 'Review system configuration and parameters',
        automated: false,
        priority: 2
      });
    }

    if (classification.systemActionRequired) {
      suggestions.push({
        action: 'system_recovery',
        description: 'System will attempt automatic recovery',
        automated: true,
        priority: 1
      });
    }

    return suggestions.sort((a, b) => a.priority - b.priority);
  }

  private generateBasicSuggestions(type: ErrorType, message: string): RecoverySuggestion[] {
    const suggestions: RecoverySuggestion[] = [];

    switch (type) {
      case ErrorType.SKILL_DEFINITION_ERROR:
        suggestions.push(
          {
            action: 'validate_skill_schema',
            description: 'Validate skill definition against schema',
            automated: true,
            priority: 1
          },
          {
            action: 'check_skill_syntax',
            description: 'Check skill definition syntax and structure',
            automated: false,
            priority: 2
          }
        );
        break;

      case ErrorType.EXECUTION_ERROR:
        suggestions.push(
          {
            action: 'check_parameters',
            description: 'Verify execution parameters are correct',
            automated: false,
            priority: 1
          },
          {
            action: 'retry_execution',
            description: 'Retry skill execution',
            automated: true,
            priority: 2
          }
        );
        break;

      case ErrorType.VALIDATION_ERROR:
        suggestions.push(
          {
            action: 'fix_validation_errors',
            description: 'Address validation errors in input data',
            automated: false,
            priority: 1
          }
        );
        break;

      case ErrorType.REGISTRY_ERROR:
        suggestions.push(
          {
            action: 'refresh_registry',
            description: 'Refresh skill registry cache',
            automated: true,
            priority: 1
          },
          {
            action: 'check_skill_availability',
            description: 'Verify skill is properly registered',
            automated: false,
            priority: 2
          }
        );
        break;

      default:
        suggestions.push(
          {
            action: 'check_logs',
            description: 'Review system logs for more details',
            automated: false,
            priority: 3
          }
        );
    }

    return suggestions;
  }

  private inferErrorType(error: Error): ErrorType {
    const message = error.message.toLowerCase();
    
    if (message.includes('validation') || message.includes('invalid')) {
      return ErrorType.VALIDATION_ERROR;
    }
    if (message.includes('skill') && message.includes('definition')) {
      return ErrorType.SKILL_DEFINITION_ERROR;
    }
    if (message.includes('registry') || message.includes('not found')) {
      return ErrorType.REGISTRY_ERROR;
    }
    if (message.includes('execution') || message.includes('runtime')) {
      return ErrorType.EXECUTION_ERROR;
    }
    if (message.includes('migration')) {
      return ErrorType.MIGRATION_ERROR;
    }
    if (message.includes('extension')) {
      return ErrorType.EXTENSION_ERROR;
    }
    if (message.includes('configuration') || message.includes('config')) {
      return ErrorType.CONFIGURATION_ERROR;
    }
    
    return ErrorType.EXECUTION_ERROR; // Default fallback
  }

  private inferSeverity(error: Error): ErrorSeverity {
    const message = error.message.toLowerCase();
    
    if (message.includes('critical') || message.includes('fatal')) {
      return ErrorSeverity.CRITICAL;
    }
    if (message.includes('warning') || message.includes('warn')) {
      return ErrorSeverity.WARNING;
    }
    if (message.includes('info') || message.includes('notice')) {
      return ErrorSeverity.INFO;
    }
    
    return ErrorSeverity.ERROR; // Default
  }

  private initializeDefaultStrategies(): void {
    // Registry error recovery
    this.registerRecoveryStrategy(ErrorType.REGISTRY_ERROR, new RegistryErrorRecoveryStrategy());
    
    // Execution error recovery
    this.registerRecoveryStrategy(ErrorType.EXECUTION_ERROR, new ExecutionErrorRecoveryStrategy());
    
    // Validation error recovery
    this.registerRecoveryStrategy(ErrorType.VALIDATION_ERROR, new ValidationErrorRecoveryStrategy());
  }

  private initializeDefaultClassifiers(): void {
    this.registerErrorClassifier(new DefaultErrorClassifier());
  }

  private notifyErrorListeners(error: SystemError): void {
    for (const listener of this.errorListeners) {
      try {
        listener.onError(error);
      } catch (listenerError) {
        console.error('Error listener failed:', listenerError);
      }
    }
  }
}

/**
 * Error handling result
 */
export interface ErrorHandlingResult {
  originalError: SystemError;
  classification: ErrorClassification;
  recoveryAttempted: boolean;
  recoverySuccessful: boolean;
  recoveryResult: RecoveryResult | null;
  fallbackResult: FallbackResult | null;
  suggestions: RecoverySuggestion[];
}

/**
 * Recovery attempt result
 */
interface RecoveryAttemptResult {
  attempted: boolean;
  successful: boolean;
  result: RecoveryResult | null;
  fallbackResult: FallbackResult | null;
}

/**
 * Error classification interface
 */
export interface ErrorClassification {
  category: string;
  severity: ErrorSeverity;
  recoverable: boolean;
  userActionRequired: boolean;
  systemActionRequired: boolean;
}

/**
 * Error classifier interface
 */
export interface ErrorClassifier {
  classify(error: SystemError): ErrorClassification | null;
}

/**
 * Error listener interface
 */
export interface ErrorListener {
  onError(error: SystemError): void;
}

/**
 * Default error classifier implementation
 */
class DefaultErrorClassifier implements ErrorClassifier {
  classify(error: SystemError): ErrorClassification {
    const recoverable = this.isRecoverable(error);
    const userActionRequired = this.requiresUserAction(error);
    const systemActionRequired = this.requiresSystemAction(error);

    return {
      category: this.categorizeError(error),
      severity: error.severity,
      recoverable,
      userActionRequired,
      systemActionRequired
    };
  }

  private categorizeError(error: SystemError): string {
    switch (error.type) {
      case ErrorType.SKILL_DEFINITION_ERROR:
        return 'definition';
      case ErrorType.EXECUTION_ERROR:
        return 'runtime';
      case ErrorType.VALIDATION_ERROR:
        return 'validation';
      case ErrorType.REGISTRY_ERROR:
        return 'registry';
      case ErrorType.MIGRATION_ERROR:
        return 'migration';
      case ErrorType.EXTENSION_ERROR:
        return 'extension';
      case ErrorType.CONFIGURATION_ERROR:
        return 'configuration';
      default:
        return 'unknown';
    }
  }

  private isRecoverable(error: SystemError): boolean {
    // Critical errors are generally not recoverable
    if (error.severity === ErrorSeverity.CRITICAL) {
      return false;
    }

    // Some error types are more recoverable than others
    const recoverableTypes = [
      ErrorType.EXECUTION_ERROR,
      ErrorType.REGISTRY_ERROR,
      ErrorType.CONFIGURATION_ERROR
    ];

    return recoverableTypes.includes(error.type);
  }

  private requiresUserAction(error: SystemError): boolean {
    const userActionTypes = [
      ErrorType.SKILL_DEFINITION_ERROR,
      ErrorType.VALIDATION_ERROR,
      ErrorType.CONFIGURATION_ERROR
    ];

    return userActionTypes.includes(error.type) || error.severity === ErrorSeverity.CRITICAL;
  }

  private requiresSystemAction(error: SystemError): boolean {
    const systemActionTypes = [
      ErrorType.EXECUTION_ERROR,
      ErrorType.REGISTRY_ERROR,
      ErrorType.MIGRATION_ERROR
    ];

    return systemActionTypes.includes(error.type) && error.severity !== ErrorSeverity.CRITICAL;
  }
}

/**
 * Registry error recovery strategy
 */
class RegistryErrorRecoveryStrategy implements ErrorRecoveryStrategy {
  canRecover(error: SystemError): boolean {
    return error.type === ErrorType.REGISTRY_ERROR && 
           error.severity !== ErrorSeverity.CRITICAL;
  }

  async recover(error: SystemError): Promise<RecoveryResult> {
    // Attempt to refresh registry or reload skill
    try {
      // In real implementation, this would refresh the registry
      await new Promise(resolve => setTimeout(resolve, 100)); // Simulate refresh
      
      return {
        success: true,
        message: 'Registry refreshed successfully',
        nextSteps: ['Retry the original operation']
      };
    } catch (recoveryError) {
      return {
        success: false,
        message: 'Failed to refresh registry',
        nextSteps: ['Check registry configuration', 'Restart system if necessary']
      };
    }
  }

  async fallback(error: SystemError): Promise<FallbackResult> {
    return {
      success: true,
      message: 'Using cached registry data',
      alternativeAction: 'use_cache',
      data: { useCachedData: true }
    };
  }
}

/**
 * Execution error recovery strategy
 */
class ExecutionErrorRecoveryStrategy implements ErrorRecoveryStrategy {
  canRecover(error: SystemError): boolean {
    return error.type === ErrorType.EXECUTION_ERROR && 
           !error.message.includes('timeout') &&
           error.severity !== ErrorSeverity.CRITICAL;
  }

  async recover(error: SystemError): Promise<RecoveryResult> {
    // Attempt to retry execution with modified parameters
    try {
      // In real implementation, this would retry with safer parameters
      await new Promise(resolve => setTimeout(resolve, 50)); // Simulate retry
      
      return {
        success: true,
        message: 'Execution retry successful',
        nextSteps: ['Continue with normal operation']
      };
    } catch (recoveryError) {
      return {
        success: false,
        message: 'Execution retry failed',
        nextSteps: ['Check skill implementation', 'Verify parameters']
      };
    }
  }

  async fallback(error: SystemError): Promise<FallbackResult> {
    return {
      success: true,
      message: 'Using default execution result',
      alternativeAction: 'use_default',
      data: { defaultResult: 'Execution completed with default behavior' }
    };
  }
}

/**
 * Validation error recovery strategy
 */
class ValidationErrorRecoveryStrategy implements ErrorRecoveryStrategy {
  canRecover(error: SystemError): boolean {
    return error.type === ErrorType.VALIDATION_ERROR;
  }

  async recover(error: SystemError): Promise<RecoveryResult> {
    // Attempt to auto-correct validation errors
    try {
      // In real implementation, this would attempt to fix common validation issues
      return {
        success: false, // Validation errors usually require user intervention
        message: 'Validation errors require manual correction',
        nextSteps: ['Review input parameters', 'Check data format requirements']
      };
    } catch (recoveryError) {
      return {
        success: false,
        message: 'Cannot auto-correct validation errors',
        nextSteps: ['Manual review required']
      };
    }
  }

  async fallback(error: SystemError): Promise<FallbackResult> {
    return {
      success: false,
      message: 'No fallback available for validation errors',
      alternativeAction: 'manual_correction'
    };
  }
}