import { 
  UnifiedLogger, 
  ExecutionPerformanceMonitor, 
  LogLevel, 
  ConsoleLogAppender,
  createLogger,
  createPerformanceMonitor
} from '../../src/core/logger';
import { SystemError, ErrorType, ErrorSeverity } from '../../src/types/error';

describe('UnifiedLogger', () => {
  let logger: UnifiedLogger;
  let mockAppender: any;

  beforeEach(() => {
    logger = new UnifiedLogger(LogLevel.DEBUG);
    mockAppender = {
      append: jest.fn().mockResolvedValue(undefined)
    };
    logger.addAppender(mockAppender);
  });

  describe('logging methods', () => {
    it('should log debug messages', () => {
      logger.debug('Debug message', { skillId: 'test' }, { extra: 'data' });
      
      expect(mockAppender.append).toHaveBeenCalledWith(
        expect.objectContaining({
          level: LogLevel.DEBUG,
          message: 'Debug message',
          context: expect.objectContaining({ skillId: 'test' }),
          metadata: { extra: 'data' }
        })
      );
    });

    it('should log info messages', () => {
      logger.info('Info message');
      
      expect(mockAppender.append).toHaveBeenCalledWith(
        expect.objectContaining({
          level: LogLevel.INFO,
          message: 'Info message'
        })
      );
    });

    it('should log warning messages', () => {
      logger.warn('Warning message');
      
      expect(mockAppender.append).toHaveBeenCalledWith(
        expect.objectContaining({
          level: LogLevel.WARN,
          message: 'Warning message'
        })
      );
    });

    it('should log error messages with error objects', () => {
      const error = new Error('Test error');
      logger.error('Error occurred', error, { skillId: 'test' });
      
      expect(mockAppender.append).toHaveBeenCalledWith(
        expect.objectContaining({
          level: LogLevel.ERROR,
          message: 'Error occurred',
          error: error,
          context: expect.objectContaining({ skillId: 'test' })
        })
      );
    });

    it('should log critical messages', () => {
      const systemError = new SystemError(
        ErrorType.EXECUTION_ERROR,
        'Critical failure',
        ErrorSeverity.CRITICAL
      );
      
      logger.critical('Critical error', systemError);
      
      expect(mockAppender.append).toHaveBeenCalledWith(
        expect.objectContaining({
          level: LogLevel.CRITICAL,
          message: 'Critical error',
          error: systemError
        })
      );
    });
  });

  describe('log level filtering', () => {
    beforeEach(() => {
      logger.setLogLevel(LogLevel.WARN);
      mockAppender.append.mockClear();
    });

    it('should filter out messages below minimum level', () => {
      logger.debug('Debug message');
      logger.info('Info message');
      
      expect(mockAppender.append).not.toHaveBeenCalled();
    });

    it('should allow messages at or above minimum level', () => {
      logger.warn('Warning message');
      logger.error('Error message');
      
      expect(mockAppender.append).toHaveBeenCalledTimes(2);
    });
  });

  describe('context management', () => {
    it('should set and use global context', () => {
      logger.setContext({ userId: 'user123', sessionId: 'session456' });
      logger.info('Test message');
      
      expect(mockAppender.append).toHaveBeenCalledWith(
        expect.objectContaining({
          context: expect.objectContaining({
            userId: 'user123',
            sessionId: 'session456'
          })
        })
      );
    });

    it('should merge local context with global context', () => {
      logger.setContext({ userId: 'user123' });
      logger.info('Test message', { skillId: 'skill456' });
      
      expect(mockAppender.append).toHaveBeenCalledWith(
        expect.objectContaining({
          context: expect.objectContaining({
            userId: 'user123',
            skillId: 'skill456'
          })
        })
      );
    });

    it('should clear context', () => {
      logger.setContext({ userId: 'user123' });
      logger.clearContext();
      logger.info('Test message');
      
      expect(mockAppender.append).toHaveBeenCalledWith(
        expect.objectContaining({
          context: {}
        })
      );
    });
  });

  describe('execution logging', () => {
    it('should log execution start', () => {
      logger.logExecutionStart('skill123', 'exec456', { param: 'value' });
      
      expect(mockAppender.append).toHaveBeenCalledWith(
        expect.objectContaining({
          level: LogLevel.INFO,
          message: 'Execution started',
          context: expect.objectContaining({
            skillId: 'skill123',
            executionId: 'exec456',
            operation: 'execution_start'
          }),
          metadata: { parameters: { param: 'value' } }
        })
      );
    });

    it('should log successful execution end', () => {
      logger.logExecutionEnd('skill123', 'exec456', true, 1000, { result: 'success' });
      
      expect(mockAppender.append).toHaveBeenCalledWith(
        expect.objectContaining({
          level: LogLevel.INFO,
          message: 'Execution completed successfully',
          context: expect.objectContaining({
            skillId: 'skill123',
            executionId: 'exec456',
            operation: 'execution_end'
          }),
          metadata: expect.objectContaining({
            success: true,
            duration: 1000,
            result: { result: 'success' }
          })
        })
      );
    });

    it('should log failed execution end', () => {
      const error = new Error('Execution failed');
      logger.logExecutionEnd('skill123', 'exec456', false, 500, undefined, error);
      
      expect(mockAppender.append).toHaveBeenCalledWith(
        expect.objectContaining({
          level: LogLevel.ERROR,
          message: 'Execution failed',
          error: error,
          metadata: expect.objectContaining({
            success: false,
            duration: 500
          })
        })
      );
    });
  });
});

describe('ExecutionPerformanceMonitor', () => {
  let monitor: ExecutionPerformanceMonitor;
  let logger: UnifiedLogger;

  beforeEach(() => {
    logger = createLogger(LogLevel.DEBUG);
    monitor = createPerformanceMonitor(logger);
  });

  describe('execution monitoring', () => {
    it('should start and end execution monitoring', async () => {
      monitor.startExecution('skill123', 'exec456', { layer: 1 });
      
      const metrics = monitor.getMetrics('exec456');
      expect(metrics).toBeDefined();
      expect(metrics!.skillId).toBe('skill123');
      expect(metrics!.executionId).toBe('exec456');
      expect(metrics!.layer).toBe(1);
      expect(metrics!.startTime).toBeInstanceOf(Date);
      
      // Add a small delay to ensure duration > 0
      await new Promise(resolve => setTimeout(resolve, 1));
      
      const endMetrics = monitor.endExecution('exec456', true);
      expect(endMetrics.endTime).toBeInstanceOf(Date);
      expect(endMetrics.duration).toBeGreaterThanOrEqual(0);
      expect(endMetrics.success).toBe(true);
    });

    it('should record metrics during execution', () => {
      monitor.startExecution('skill123', 'exec456');
      
      monitor.recordMetric('exec456', 'network_request', 1);
      monitor.recordMetric('exec456', 'error', 1);
      
      const metrics = monitor.getMetrics('exec456');
      expect(metrics!.networkRequests).toBe(1);
      expect(metrics!.errors).toBe(1);
    });

    it('should handle execution with errors', () => {
      monitor.startExecution('skill123', 'exec456');
      
      const error = new Error('Test error');
      const endMetrics = monitor.endExecution('exec456', false, error);
      
      expect(endMetrics.success).toBe(false);
      expect(endMetrics.errors).toBe(1);
    });
  });

  describe('aggregated metrics', () => {
    beforeEach(() => {
      // Create some test executions
      monitor.startExecution('skill1', 'exec1', { layer: 1 });
      monitor.endExecution('exec1', true);
      
      monitor.startExecution('skill1', 'exec2', { layer: 1 });
      monitor.endExecution('exec2', false, new Error('Test error'));
      
      monitor.startExecution('skill2', 'exec3', { layer: 2 });
      monitor.endExecution('exec3', true);
    });

    it('should calculate overall aggregated metrics', () => {
      const metrics = monitor.getAggregatedMetrics();
      
      expect(metrics.totalExecutions).toBe(3);
      expect(metrics.successfulExecutions).toBe(2);
      expect(metrics.failedExecutions).toBe(1);
      expect(metrics.averageDuration).toBeGreaterThanOrEqual(0);
    });

    it('should calculate skill-specific metrics', () => {
      const metrics = monitor.getAggregatedMetrics('skill1');
      
      expect(metrics.totalExecutions).toBe(2);
      expect(metrics.successfulExecutions).toBe(1);
      expect(metrics.failedExecutions).toBe(1);
    });

    it('should calculate layer-specific metrics', () => {
      const metrics = monitor.getAggregatedMetrics();
      
      expect(metrics.byLayer[1]).toBeDefined();
      expect(metrics.byLayer[1].executions).toBe(2);
      expect(metrics.byLayer[2]).toBeDefined();
      expect(metrics.byLayer[2].executions).toBe(1);
    });

    it('should calculate skill-specific metrics in bySkill', () => {
      const metrics = monitor.getAggregatedMetrics();
      
      expect(metrics.bySkill['skill1']).toBeDefined();
      expect(metrics.bySkill['skill1'].executions).toBe(2);
      expect(metrics.bySkill['skill2']).toBeDefined();
      expect(metrics.bySkill['skill2'].executions).toBe(1);
    });
  });

  describe('cleanup', () => {
    it('should clean up old completed executions', () => {
      monitor.startExecution('skill123', 'exec456');
      const endMetrics = monitor.endExecution('exec456', true);
      
      // Verify the execution exists
      let metrics = monitor.getMetrics('exec456');
      expect(metrics).toBeDefined();
      
      // Cleanup with 0 max age should remove all completed executions
      monitor.cleanup(0);
      
      // After cleanup, the metrics should be null
      metrics = monitor.getMetrics('exec456');
      expect(metrics).toBeNull();
    });
  });
});

describe('ConsoleLogAppender', () => {
  let appender: ConsoleLogAppender;
  let consoleSpy: jest.SpyInstance;

  beforeEach(() => {
    appender = new ConsoleLogAppender();
    consoleSpy = jest.spyOn(console, 'info').mockImplementation();
  });

  afterEach(() => {
    consoleSpy.mockRestore();
  });

  it('should format and output log entries', async () => {
    const entry = {
      timestamp: new Date('2023-01-01T12:00:00Z'),
      level: LogLevel.INFO,
      message: 'Test message',
      context: { skillId: 'test-skill', executionId: 'exec123' },
      metadata: { extra: 'data' }
    };

    await appender.append(entry);

    expect(consoleSpy).toHaveBeenCalledWith(
      expect.stringContaining('INFO')
    );
    expect(consoleSpy).toHaveBeenCalledWith(
      expect.stringContaining('Test message')
    );
    expect(consoleSpy).toHaveBeenCalledWith(
      expect.stringContaining('skill:test-skill')
    );
  });
});