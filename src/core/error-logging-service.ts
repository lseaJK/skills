import { UnifiedErrorHandler, ErrorHandlingResult, ErrorListener } from './error-handler';
import { UnifiedLogger, ExecutionPerformanceMonitor, LogLevel, createLogger, createPerformanceMonitor } from './logger';
import { SystemError, ErrorType, ErrorSeverity, ErrorContext } from '../types/error';

/**
 * Integrated error handling and logging service
 * Combines error handling, logging, and performance monitoring
 */
export class ErrorLoggingService implements ErrorListener {
  private errorHandler: UnifiedErrorHandler;
  private logger: UnifiedLogger;
  private performanceMonitor: ExecutionPerformanceMonitor;
  private errorMetrics: ErrorMetrics = {
    totalErrors: 0,
    errorsByType: new Map(),
    errorsBySeverity: new Map(),
    recoveryAttempts: 0,
    successfulRecoveries: 0
  };

  constructor(logLevel: LogLevel = LogLevel.INFO) {
    this.logger = createLogger(logLevel);
    this.performanceMonitor = createPerformanceMonitor(this.logger);
    this.errorHandler = new UnifiedErrorHandler();
    
    // Register this service as an error listener
    this.errorHandler.registerErrorListener(this);
    
    this.logger.info('Error handling and logging service initialized', 
      { component: 'ErrorLoggingService', operation: 'initialization' }
    );
  }

  /**
   * Handle an error with full logging and recovery
   */
  async handleError(
    error: Error | SystemError, 
    context?: Partial<ErrorContext>
  ): Promise<ErrorHandlingResult> {
    const startTime = Date.now();
    
    try {
      // Handle the error
      const result = await this.errorHandler.handleError(error, context);
      
      // Log the error handling process
      this.logErrorHandling(result, Date.now() - startTime);
      
      // Update metrics
      this.updateErrorMetrics(result);
      
      return result;
    } catch (handlingError) {
      // If error handling itself fails, log it as critical
      this.logger.critical('Error handling failed', handlingError as Error, 
        { component: 'ErrorLoggingService', operation: 'error_handling' }
      );
      
      // Return a basic error result
      return {
        originalError: error instanceof SystemError ? error : 
          this.errorHandler.createError(ErrorType.EXECUTION_ERROR, error.message),
        classification: {
          category: 'critical_failure',
          severity: ErrorSeverity.CRITICAL,
          recoverable: false,
          userActionRequired: true,
          systemActionRequired: true
        },
        recoveryAttempted: false,
        recoverySuccessful: false,
        recoveryResult: null,
        fallbackResult: null,
        suggestions: [{
          action: 'system_restart',
          description: 'System restart may be required',
          automated: false,
          priority: 1
        }]
      };
    }
  }

  /**
   * Create and handle a system error
   */
  async createAndHandleError(
    type: ErrorType,
    message: string,
    severity: ErrorSeverity = ErrorSeverity.ERROR,
    context: Partial<ErrorContext> = {},
    originalError?: Error
  ): Promise<ErrorHandlingResult> {
    const systemError = this.errorHandler.createError(type, message, severity, context, originalError);
    return await this.handleError(systemError);
  }

  /**
   * Start execution monitoring
   */
  startExecution(skillId: string, executionId: string, context?: Partial<ErrorContext>): void {
    this.performanceMonitor.startExecution(skillId, executionId, {
      skillId,
      executionId,
      layer: context?.additionalData?.layer,
      operation: 'skill_execution',
      component: 'ExecutionEngine'
    });
    
    this.logger.logExecutionStart(skillId, executionId, context?.additionalData?.parameters);
  }

  /**
   * End execution monitoring
   */
  endExecution(
    skillId: string, 
    executionId: string, 
    success: boolean, 
    result?: any, 
    error?: Error
  ): void {
    const metrics = this.performanceMonitor.endExecution(executionId, success, error);
    
    this.logger.logExecutionEnd(
      skillId, 
      executionId, 
      success, 
      metrics.duration || 0, 
      result, 
      error
    );

    // Log performance warnings if needed
    if (metrics.duration && metrics.duration > 10000) { // 10 seconds
      this.logger.warn('Slow execution detected', 
        { skillId, executionId, operation: 'performance_warning' },
        { duration: metrics.duration, threshold: 10000 }
      );
    }

    if (metrics.memoryUsage && metrics.memoryUsage.heapUsed > 100 * 1024 * 1024) { // 100MB
      this.logger.warn('High memory usage detected',
        { skillId, executionId, operation: 'performance_warning' },
        { memoryUsage: metrics.memoryUsage.heapUsed, threshold: 100 * 1024 * 1024 }
      );
    }
  }

  /**
   * Record a metric during execution
   */
  recordMetric(executionId: string, metric: string, value: number): void {
    this.performanceMonitor.recordMetric(executionId, metric, value);
  }

  /**
   * Get performance metrics for an execution
   */
  getExecutionMetrics(executionId: string) {
    return this.performanceMonitor.getMetrics(executionId);
  }

  /**
   * Get aggregated performance metrics
   */
  getAggregatedMetrics(skillId?: string) {
    return this.performanceMonitor.getAggregatedMetrics(skillId);
  }

  /**
   * Get error metrics
   */
  getErrorMetrics(): ErrorMetrics {
    return { ...this.errorMetrics };
  }

  /**
   * Log skill registration
   */
  logSkillRegistration(skillId: string, success: boolean, error?: Error): void {
    this.logger.logSkillRegistration(skillId, success, error);
    
    if (!success && error) {
      // Handle registration error
      this.handleError(error, {
        skillId,
        operation: 'skill_registration',
        additionalData: { skillId }
      }).catch(err => {
        this.logger.critical('Failed to handle skill registration error', err);
      });
    }
  }

  /**
   * Log layer execution
   */
  logLayerExecution(
    layer: number, 
    skillId: string, 
    executionId: string, 
    operation: string, 
    success: boolean, 
    duration?: number,
    error?: Error
  ): void {
    this.logger.logLayerExecution(layer, skillId, executionId, operation, success, duration);
    
    if (!success && error) {
      // Handle layer execution error
      this.handleError(error, {
        skillId,
        operation: `layer_${layer}_${operation}`,
        layer,
        additionalData: { layer, operation, duration }
      }).catch(err => {
        this.logger.critical('Failed to handle layer execution error', err);
      });
    }
  }

  /**
   * Set log level
   */
  setLogLevel(level: LogLevel): void {
    this.logger.setLogLevel(level);
  }

  /**
   * Set global logging context
   */
  setLoggingContext(context: Partial<ErrorContext>): void {
    this.logger.setContext({
      skillId: context.skillId,
      userId: context.userId,
      sessionId: context.sessionId,
      operation: context.operation
    });
  }

  /**
   * Clear logging context
   */
  clearLoggingContext(): void {
    this.logger.clearContext();
  }

  /**
   * Flush all logs
   */
  async flush(): Promise<void> {
    await this.logger.flush();
  }

  /**
   * Close the service and cleanup resources
   */
  async close(): Promise<void> {
    this.logger.info('Shutting down error handling and logging service',
      { component: 'ErrorLoggingService', operation: 'shutdown' }
    );
    
    await this.logger.close();
  }

  /**
   * Cleanup old performance data
   */
  cleanup(maxAge: number = 24 * 60 * 60 * 1000): void {
    this.performanceMonitor.cleanup(maxAge);
    
    this.logger.debug('Cleaned up old performance data',
      { component: 'ErrorLoggingService', operation: 'cleanup' },
      { maxAge }
    );
  }

  /**
   * Error listener implementation
   */
  onError(error: SystemError): void {
    // This is called whenever an error is processed by the error handler
    // We can use this for additional logging or alerting
    
    if (error.severity === ErrorSeverity.CRITICAL) {
      this.logger.critical('Critical system error detected', error,
        { component: 'ErrorLoggingService', operation: 'error_notification' }
      );
      
      // In a real system, this might trigger alerts, notifications, etc.
    }
  }

  /**
   * Get system health status
   */
  getSystemHealth(): SystemHealthStatus {
    const aggregatedMetrics = this.getAggregatedMetrics();
    const errorMetrics = this.getErrorMetrics();
    
    // Calculate health score based on various factors
    let healthScore = 100;
    
    // Reduce score based on error rate
    const errorRate = aggregatedMetrics.totalExecutions > 0 ? 
      aggregatedMetrics.failedExecutions / aggregatedMetrics.totalExecutions : 0;
    healthScore -= errorRate * 50;
    
    // Reduce score based on average duration (performance)
    if (aggregatedMetrics.averageDuration > 5000) { // 5 seconds
      healthScore -= Math.min(30, (aggregatedMetrics.averageDuration - 5000) / 1000 * 5);
    }
    
    // Reduce score based on critical errors
    const criticalErrors = errorMetrics.errorsBySeverity.get(ErrorSeverity.CRITICAL) || 0;
    healthScore -= criticalErrors * 10;
    
    healthScore = Math.max(0, Math.min(100, healthScore));
    
    let status: 'healthy' | 'warning' | 'critical';
    if (healthScore >= 80) {
      status = 'healthy';
    } else if (healthScore >= 50) {
      status = 'warning';
    } else {
      status = 'critical';
    }
    
    return {
      status,
      healthScore,
      totalExecutions: aggregatedMetrics.totalExecutions,
      successRate: aggregatedMetrics.totalExecutions > 0 ? 
        aggregatedMetrics.successfulExecutions / aggregatedMetrics.totalExecutions : 1,
      averageResponseTime: aggregatedMetrics.averageDuration,
      totalErrors: errorMetrics.totalErrors,
      criticalErrors,
      lastUpdated: new Date()
    };
  }

  private logErrorHandling(result: ErrorHandlingResult, processingTime: number): void {
    const level = result.originalError.severity === ErrorSeverity.CRITICAL ? 
      LogLevel.CRITICAL : LogLevel.ERROR;
    
    const message = result.recoverySuccessful ? 
      'Error handled with successful recovery' : 
      result.recoveryAttempted ? 
        'Error handled with failed recovery' : 
        'Error handled without recovery attempt';
    
    this.logger.error(message,
      result.originalError,
      {
        component: 'ErrorLoggingService',
        operation: 'error_handling',
        ...result.originalError.context
      },
      {
        errorType: result.originalError.type,
        errorSeverity: result.originalError.severity,
        recoveryAttempted: result.recoveryAttempted,
        recoverySuccessful: result.recoverySuccessful,
        processingTime,
        suggestionsCount: result.suggestions.length
      }
    );
  }

  private updateErrorMetrics(result: ErrorHandlingResult): void {
    this.errorMetrics.totalErrors++;
    
    // Update by type
    const typeCount = this.errorMetrics.errorsByType.get(result.originalError.type) || 0;
    this.errorMetrics.errorsByType.set(result.originalError.type, typeCount + 1);
    
    // Update by severity
    const severityCount = this.errorMetrics.errorsBySeverity.get(result.originalError.severity) || 0;
    this.errorMetrics.errorsBySeverity.set(result.originalError.severity, severityCount + 1);
    
    // Update recovery metrics
    if (result.recoveryAttempted) {
      this.errorMetrics.recoveryAttempts++;
      if (result.recoverySuccessful) {
        this.errorMetrics.successfulRecoveries++;
      }
    }
  }
}

/**
 * Error metrics interface
 */
export interface ErrorMetrics {
  totalErrors: number;
  errorsByType: Map<ErrorType, number>;
  errorsBySeverity: Map<ErrorSeverity, number>;
  recoveryAttempts: number;
  successfulRecoveries: number;
}

/**
 * System health status
 */
export interface SystemHealthStatus {
  status: 'healthy' | 'warning' | 'critical';
  healthScore: number;
  totalExecutions: number;
  successRate: number;
  averageResponseTime: number;
  totalErrors: number;
  criticalErrors: number;
  lastUpdated: Date;
}

/**
 * Create a default error logging service instance
 */
export function createErrorLoggingService(logLevel: LogLevel = LogLevel.INFO): ErrorLoggingService {
  return new ErrorLoggingService(logLevel);
}