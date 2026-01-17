import { ErrorSeverity, SystemError } from '../types/error';

/**
 * Log levels for the logging system
 */
export enum LogLevel {
  DEBUG = 0,
  INFO = 1,
  WARN = 2,
  ERROR = 3,
  CRITICAL = 4
}

/**
 * Log entry interface
 */
export interface LogEntry {
  timestamp: Date;
  level: LogLevel;
  message: string;
  context?: LogContext;
  metadata?: Record<string, any>;
  error?: Error | SystemError;
}

/**
 * Log context for execution tracking
 */
export interface LogContext {
  skillId?: string;
  executionId?: string;
  userId?: string;
  sessionId?: string;
  layer?: number;
  operation?: string;
  component?: string;
}

/**
 * Performance metrics interface
 */
export interface PerformanceMetrics {
  executionId: string;
  skillId: string;
  startTime: Date;
  endTime?: Date;
  duration?: number;
  memoryUsage?: MemoryUsage;
  cpuUsage?: number;
  networkRequests?: number;
  filesAccessed?: string[];
  errors?: number;
  warnings?: number;
  layer?: number;
  success?: boolean;
}

/**
 * Memory usage metrics
 */
export interface MemoryUsage {
  heapUsed: number;
  heapTotal: number;
  external: number;
  rss: number;
}

/**
 * Log appender interface for different output destinations
 */
export interface LogAppender {
  append(entry: LogEntry): Promise<void>;
  flush?(): Promise<void>;
  close?(): Promise<void>;
}

/**
 * Performance monitor interface
 */
export interface PerformanceMonitor {
  startExecution(skillId: string, executionId: string, context?: LogContext): void;
  endExecution(executionId: string, success: boolean, error?: Error): PerformanceMetrics;
  recordMetric(executionId: string, metric: string, value: number): void;
  getMetrics(executionId: string): PerformanceMetrics | null;
  getAggregatedMetrics(skillId?: string): AggregatedMetrics;
}

/**
 * Aggregated performance metrics
 */
export interface AggregatedMetrics {
  totalExecutions: number;
  successfulExecutions: number;
  failedExecutions: number;
  averageDuration: number;
  averageMemoryUsage: number;
  totalErrors: number;
  totalWarnings: number;
  byLayer: Record<number, LayerMetrics>;
  bySkill: Record<string, SkillMetrics>;
}

/**
 * Layer-specific metrics
 */
export interface LayerMetrics {
  executions: number;
  averageDuration: number;
  successRate: number;
  errors: number;
}

/**
 * Skill-specific metrics
 */
export interface SkillMetrics {
  executions: number;
  averageDuration: number;
  successRate: number;
  lastExecution: Date;
  errors: number;
}

/**
 * Unified logging system for the skills architecture
 */
export class UnifiedLogger {
  private appenders: LogAppender[] = [];
  private minLogLevel: LogLevel = LogLevel.INFO;
  private context: LogContext = {};

  constructor(minLogLevel: LogLevel = LogLevel.INFO) {
    this.minLogLevel = minLogLevel;
    this.initializeDefaultAppenders();
  }

  /**
   * Set the global log context
   */
  setContext(context: Partial<LogContext>): void {
    this.context = { ...this.context, ...context };
  }

  /**
   * Clear the global log context
   */
  clearContext(): void {
    this.context = {};
  }

  /**
   * Add a log appender
   */
  addAppender(appender: LogAppender): void {
    this.appenders.push(appender);
  }

  /**
   * Set minimum log level
   */
  setLogLevel(level: LogLevel): void {
    this.minLogLevel = level;
  }

  /**
   * Log a debug message
   */
  debug(message: string, context?: Partial<LogContext>, metadata?: Record<string, any>): void {
    this.log(LogLevel.DEBUG, message, context, metadata);
  }

  /**
   * Log an info message
   */
  info(message: string, context?: Partial<LogContext>, metadata?: Record<string, any>): void {
    this.log(LogLevel.INFO, message, context, metadata);
  }

  /**
   * Log a warning message
   */
  warn(message: string, context?: Partial<LogContext>, metadata?: Record<string, any>): void {
    this.log(LogLevel.WARN, message, context, metadata);
  }

  /**
   * Log an error message
   */
  error(message: string, error?: Error | SystemError, context?: Partial<LogContext>, metadata?: Record<string, any>): void {
    this.log(LogLevel.ERROR, message, context, metadata, error);
  }

  /**
   * Log a critical message
   */
  critical(message: string, error?: Error | SystemError, context?: Partial<LogContext>, metadata?: Record<string, any>): void {
    this.log(LogLevel.CRITICAL, message, context, metadata, error);
  }

  /**
   * Log execution start
   */
  logExecutionStart(skillId: string, executionId: string, parameters?: any): void {
    this.info(`Execution started`, 
      { skillId, executionId, operation: 'execution_start' },
      { parameters }
    );
  }

  /**
   * Log execution end
   */
  logExecutionEnd(skillId: string, executionId: string, success: boolean, duration: number, result?: any, error?: Error): void {
    const level = success ? LogLevel.INFO : LogLevel.ERROR;
    const message = success ? 'Execution completed successfully' : 'Execution failed';
    
    this.log(level, message,
      { skillId, executionId, operation: 'execution_end' },
      { success, duration, result: success ? result : undefined },
      error
    );
  }

  /**
   * Log skill registration
   */
  logSkillRegistration(skillId: string, success: boolean, error?: Error): void {
    const level = success ? LogLevel.INFO : LogLevel.ERROR;
    const message = success ? 'Skill registered successfully' : 'Skill registration failed';
    
    this.log(level, message,
      { skillId, operation: 'skill_registration' },
      { success },
      error
    );
  }

  /**
   * Log layer execution
   */
  logLayerExecution(layer: number, skillId: string, executionId: string, operation: string, success: boolean, duration?: number): void {
    const level = success ? LogLevel.DEBUG : LogLevel.WARN;
    const message = `Layer ${layer} ${operation} ${success ? 'completed' : 'failed'}`;
    
    this.log(level, message,
      { skillId, executionId, layer, operation },
      { success, duration }
    );
  }

  /**
   * Core logging method
   */
  private log(
    level: LogLevel, 
    message: string, 
    context?: Partial<LogContext>, 
    metadata?: Record<string, any>,
    error?: Error | SystemError
  ): void {
    if (level < this.minLogLevel) {
      return;
    }

    const entry: LogEntry = {
      timestamp: new Date(),
      level,
      message,
      context: { ...this.context, ...context },
      metadata,
      error
    };

    // Send to all appenders
    this.appenders.forEach(appender => {
      appender.append(entry).catch(err => {
        console.error('Log appender failed:', err);
      });
    });
  }

  /**
   * Flush all appenders
   */
  async flush(): Promise<void> {
    await Promise.all(
      this.appenders
        .filter(appender => appender.flush)
        .map(appender => appender.flush!())
    );
  }

  /**
   * Close all appenders
   */
  async close(): Promise<void> {
    await Promise.all(
      this.appenders
        .filter(appender => appender.close)
        .map(appender => appender.close!())
    );
  }

  private initializeDefaultAppenders(): void {
    // Add console appender by default
    this.addAppender(new ConsoleLogAppender());
  }
}

/**
 * Performance monitoring system
 */
export class ExecutionPerformanceMonitor implements PerformanceMonitor {
  private activeExecutions: Map<string, PerformanceMetrics> = new Map();
  private completedExecutions: Map<string, PerformanceMetrics> = new Map();
  private logger: UnifiedLogger;

  constructor(logger: UnifiedLogger) {
    this.logger = logger;
  }

  startExecution(skillId: string, executionId: string, context?: LogContext): void {
    const metrics: PerformanceMetrics = {
      executionId,
      skillId,
      startTime: new Date(),
      memoryUsage: this.getCurrentMemoryUsage(),
      networkRequests: 0,
      filesAccessed: [],
      errors: 0,
      warnings: 0,
      layer: context?.layer
    };

    this.activeExecutions.set(executionId, metrics);
    
    this.logger.debug(`Performance monitoring started for execution ${executionId}`, 
      { skillId, executionId, operation: 'perf_start' },
      { memoryUsage: metrics.memoryUsage }
    );
  }

  endExecution(executionId: string, success: boolean, error?: Error): PerformanceMetrics {
    const metrics = this.activeExecutions.get(executionId);
    if (!metrics) {
      throw new Error(`No active execution found for ID: ${executionId}`);
    }

    // Complete the metrics
    metrics.endTime = new Date();
    metrics.duration = metrics.endTime.getTime() - metrics.startTime.getTime();
    metrics.success = success;
    
    // Update memory usage
    const currentMemory = this.getCurrentMemoryUsage();
    metrics.memoryUsage = currentMemory;

    if (error) {
      metrics.errors = (metrics.errors || 0) + 1;
    }

    // Move to completed executions
    this.activeExecutions.delete(executionId);
    this.completedExecutions.set(executionId, metrics);

    this.logger.debug(`Performance monitoring completed for execution ${executionId}`, 
      { skillId: metrics.skillId, executionId, operation: 'perf_end' },
      { 
        duration: metrics.duration,
        success,
        memoryUsage: metrics.memoryUsage,
        errors: metrics.errors
      }
    );

    return metrics;
  }

  recordMetric(executionId: string, metric: string, value: number): void {
    const metrics = this.activeExecutions.get(executionId);
    if (!metrics) {
      return;
    }

    switch (metric) {
      case 'network_request':
        metrics.networkRequests = (metrics.networkRequests || 0) + 1;
        break;
      case 'file_access':
        // Value would be the file path in real implementation
        break;
      case 'error':
        metrics.errors = (metrics.errors || 0) + 1;
        break;
      case 'warning':
        metrics.warnings = (metrics.warnings || 0) + 1;
        break;
      case 'cpu_usage':
        metrics.cpuUsage = value;
        break;
    }
  }

  getMetrics(executionId: string): PerformanceMetrics | null {
    return this.activeExecutions.get(executionId) || 
           this.completedExecutions.get(executionId) || 
           null;
  }

  getAggregatedMetrics(skillId?: string): AggregatedMetrics {
    const allMetrics = Array.from(this.completedExecutions.values());
    const filteredMetrics = skillId ? 
      allMetrics.filter(m => m.skillId === skillId) : 
      allMetrics;

    const totalExecutions = filteredMetrics.length;
    const successfulExecutions = filteredMetrics.filter(m => m.success).length;
    const failedExecutions = totalExecutions - successfulExecutions;

    const averageDuration = totalExecutions > 0 ? 
      filteredMetrics.reduce((sum, m) => sum + (m.duration || 0), 0) / totalExecutions : 0;

    const averageMemoryUsage = totalExecutions > 0 ?
      filteredMetrics.reduce((sum, m) => sum + (m.memoryUsage?.heapUsed || 0), 0) / totalExecutions : 0;

    const totalErrors = filteredMetrics.reduce((sum, m) => sum + (m.errors || 0), 0);
    const totalWarnings = filteredMetrics.reduce((sum, m) => sum + (m.warnings || 0), 0);

    // Aggregate by layer
    const byLayer: Record<number, LayerMetrics> = {};
    for (const metrics of filteredMetrics) {
      if (metrics.layer !== undefined) {
        if (!byLayer[metrics.layer]) {
          byLayer[metrics.layer] = {
            executions: 0,
            averageDuration: 0,
            successRate: 0,
            errors: 0
          };
        }
        
        const layerMetrics = byLayer[metrics.layer];
        layerMetrics.executions++;
        layerMetrics.averageDuration = (layerMetrics.averageDuration * (layerMetrics.executions - 1) + (metrics.duration || 0)) / layerMetrics.executions;
        layerMetrics.successRate = layerMetrics.executions > 0 ? 
          filteredMetrics.filter(m => m.layer === metrics.layer && m.success).length / layerMetrics.executions : 0;
        layerMetrics.errors += metrics.errors || 0;
      }
    }

    // Aggregate by skill
    const bySkill: Record<string, SkillMetrics> = {};
    for (const metrics of filteredMetrics) {
      if (!bySkill[metrics.skillId]) {
        bySkill[metrics.skillId] = {
          executions: 0,
          averageDuration: 0,
          successRate: 0,
          lastExecution: metrics.startTime,
          errors: 0
        };
      }
      
      const skillMetrics = bySkill[metrics.skillId];
      skillMetrics.executions++;
      skillMetrics.averageDuration = (skillMetrics.averageDuration * (skillMetrics.executions - 1) + (metrics.duration || 0)) / skillMetrics.executions;
      skillMetrics.successRate = skillMetrics.executions > 0 ?
        filteredMetrics.filter(m => m.skillId === metrics.skillId && m.success).length / skillMetrics.executions : 0;
      skillMetrics.lastExecution = metrics.startTime > skillMetrics.lastExecution ? metrics.startTime : skillMetrics.lastExecution;
      skillMetrics.errors += metrics.errors || 0;
    }

    return {
      totalExecutions,
      successfulExecutions,
      failedExecutions,
      averageDuration,
      averageMemoryUsage,
      totalErrors,
      totalWarnings,
      byLayer,
      bySkill
    };
  }

  private getCurrentMemoryUsage(): MemoryUsage {
    const usage = process.memoryUsage();
    return {
      heapUsed: usage.heapUsed,
      heapTotal: usage.heapTotal,
      external: usage.external,
      rss: usage.rss
    };
  }

  /**
   * Clean up old completed executions to prevent memory leaks
   */
  cleanup(maxAge: number = 24 * 60 * 60 * 1000): void { // Default 24 hours
    const cutoff = new Date(Date.now() - maxAge);
    
    for (const [executionId, metrics] of this.completedExecutions.entries()) {
      if (metrics.startTime < cutoff) {
        this.completedExecutions.delete(executionId);
      }
    }
  }
}

/**
 * Console log appender
 */
export class ConsoleLogAppender implements LogAppender {
  async append(entry: LogEntry): Promise<void> {
    const timestamp = entry.timestamp.toISOString();
    const level = LogLevel[entry.level];
    const context = entry.context ? this.formatContext(entry.context) : '';
    const metadata = entry.metadata ? ` | ${JSON.stringify(entry.metadata)}` : '';
    const error = entry.error ? ` | Error: ${entry.error.message}` : '';

    const logMessage = `[${timestamp}] ${level}${context}: ${entry.message}${metadata}${error}`;

    switch (entry.level) {
      case LogLevel.DEBUG:
        console.debug(logMessage);
        break;
      case LogLevel.INFO:
        console.info(logMessage);
        break;
      case LogLevel.WARN:
        console.warn(logMessage);
        break;
      case LogLevel.ERROR:
      case LogLevel.CRITICAL:
        console.error(logMessage);
        if (entry.error?.stack) {
          console.error(entry.error.stack);
        }
        break;
    }
  }

  private formatContext(context: LogContext): string {
    const parts: string[] = [];
    
    if (context.component) parts.push(`${context.component}`);
    if (context.skillId) parts.push(`skill:${context.skillId}`);
    if (context.executionId) parts.push(`exec:${context.executionId.substring(0, 8)}`);
    if (context.layer) parts.push(`L${context.layer}`);
    if (context.operation) parts.push(`op:${context.operation}`);
    
    return parts.length > 0 ? ` [${parts.join('|')}]` : '';
  }
}

/**
 * File log appender (for production use)
 */
export class FileLogAppender implements LogAppender {
  private filePath: string;
  private writeStream?: NodeJS.WritableStream;

  constructor(filePath: string) {
    this.filePath = filePath;
  }

  async append(entry: LogEntry): Promise<void> {
    if (!this.writeStream) {
      // In real implementation, this would create a file write stream
      // For now, we'll just use console as fallback
      console.log(`[FILE LOG] ${JSON.stringify(entry)}`);
      return;
    }

    const logLine = JSON.stringify(entry) + '\n';
    this.writeStream.write(logLine);
  }

  async flush(): Promise<void> {
    // Flush the write stream
  }

  async close(): Promise<void> {
    if (this.writeStream) {
      this.writeStream.end();
    }
  }
}

/**
 * Create a default logger instance
 */
export function createLogger(logLevel: LogLevel = LogLevel.INFO): UnifiedLogger {
  return new UnifiedLogger(logLevel);
}

/**
 * Create a performance monitor instance
 */
export function createPerformanceMonitor(logger: UnifiedLogger): ExecutionPerformanceMonitor {
  return new ExecutionPerformanceMonitor(logger);
}