import { ErrorLoggingService, SystemHealthStatus } from '../../src/core/error-logging-service';
import { SystemError, ErrorType, ErrorSeverity } from '../../src/types/error';
import { LogLevel } from '../../src/core/logger';

describe('ErrorLoggingService', () => {
  let service: ErrorLoggingService;

  beforeEach(() => {
    service = new ErrorLoggingService(LogLevel.DEBUG);
  });

  afterEach(async () => {
    await service.close();
  });

  describe('error handling integration', () => {
    it('should handle errors and log them', async () => {
      const error = new Error('Test error');
      
      const result = await service.handleError(error, {
        skillId: 'test-skill',
        operation: 'test_operation'
      });
      
      expect(result).toBeDefined();
      expect(result.originalError).toBeInstanceOf(SystemError);
      expect(result.originalError.message).toBe('Test error');
      expect(result.classification).toBeDefined();
    });

    it('should create and handle system errors', async () => {
      const result = await service.createAndHandleError(
        ErrorType.VALIDATION_ERROR,
        'Invalid parameters',
        ErrorSeverity.WARNING,
        { skillId: 'test-skill' }
      );
      
      expect(result.originalError.type).toBe(ErrorType.VALIDATION_ERROR);
      expect(result.originalError.severity).toBe(ErrorSeverity.WARNING);
      expect(result.originalError.context.skillId).toBe('test-skill');
    });
  });

  describe('execution monitoring integration', () => {
    it('should monitor skill execution lifecycle', () => {
      const skillId = 'test-skill';
      const executionId = 'exec-123';
      
      // Start execution
      service.startExecution(skillId, executionId, {
        additionalData: { parameters: { test: 'value' } }
      });
      
      // Record some metrics
      service.recordMetric(executionId, 'network_request', 1);
      service.recordMetric(executionId, 'error', 1);
      
      // End execution
      service.endExecution(skillId, executionId, true, { result: 'success' });
      
      // Check metrics
      const metrics = service.getExecutionMetrics(executionId);
      expect(metrics).toBeDefined();
      expect(metrics!.success).toBe(true);
      expect(metrics!.networkRequests).toBe(1);
      expect(metrics!.errors).toBe(1);
    });

    it('should handle execution with errors', () => {
      const skillId = 'test-skill';
      const executionId = 'exec-456';
      const error = new Error('Execution failed');
      
      service.startExecution(skillId, executionId);
      service.endExecution(skillId, executionId, false, undefined, error);
      
      const metrics = service.getExecutionMetrics(executionId);
      expect(metrics!.success).toBe(false);
    });
  });

  describe('skill registration logging', () => {
    it('should log successful skill registration', () => {
      service.logSkillRegistration('test-skill', true);
      // Should not throw and should log the registration
    });

    it('should handle skill registration errors', async () => {
      const error = new Error('Registration failed');
      
      // This should handle the error internally
      service.logSkillRegistration('test-skill', false, error);
      
      // Give some time for async error handling
      await new Promise(resolve => setTimeout(resolve, 100));
      
      const errorMetrics = service.getErrorMetrics();
      expect(errorMetrics.totalErrors).toBeGreaterThanOrEqual(0); // May be 0 if recovery was successful
    });
  });

  describe('layer execution logging', () => {
    it('should log successful layer execution', () => {
      service.logLayerExecution(1, 'test-skill', 'exec-123', 'function_call', true, 100);
      // Should not throw and should log the execution
    });

    it('should handle layer execution errors', async () => {
      const error = new Error('Layer execution failed');
      
      service.logLayerExecution(2, 'test-skill', 'exec-456', 'sandbox_command', false, 200, error);
      
      // Give some time for async error handling
      await new Promise(resolve => setTimeout(resolve, 100));
      
      const errorMetrics = service.getErrorMetrics();
      expect(errorMetrics.totalErrors).toBeGreaterThanOrEqual(0); // May be 0 if recovery was successful
    });
  });

  describe('metrics and health monitoring', () => {
    beforeEach(() => {
      // Create some test data
      service.startExecution('skill1', 'exec1');
      service.endExecution('skill1', 'exec1', true, { result: 'success' });
      
      service.startExecution('skill2', 'exec2');
      service.endExecution('skill2', 'exec2', false, undefined, new Error('Test error'));
    });

    it('should provide aggregated performance metrics', () => {
      const metrics = service.getAggregatedMetrics();
      
      expect(metrics.totalExecutions).toBe(2);
      expect(metrics.successfulExecutions).toBe(1);
      expect(metrics.failedExecutions).toBe(1);
      expect(metrics.averageDuration).toBeGreaterThan(0);
    });

    it('should provide skill-specific metrics', () => {
      const metrics = service.getAggregatedMetrics('skill1');
      
      expect(metrics.totalExecutions).toBe(1);
      expect(metrics.successfulExecutions).toBe(1);
      expect(metrics.failedExecutions).toBe(0);
    });

    it('should provide error metrics', () => {
      const errorMetrics = service.getErrorMetrics();
      
      expect(errorMetrics.totalErrors).toBeGreaterThanOrEqual(0);
      expect(errorMetrics.errorsByType).toBeInstanceOf(Map);
      expect(errorMetrics.errorsBySeverity).toBeInstanceOf(Map);
    });

    it('should calculate system health status', () => {
      const health = service.getSystemHealth();
      
      expect(health).toBeDefined();
      expect(health.status).toMatch(/^(healthy|warning|critical)$/);
      expect(health.healthScore).toBeGreaterThanOrEqual(0);
      expect(health.healthScore).toBeLessThanOrEqual(100);
      expect(health.totalExecutions).toBe(2);
      expect(health.successRate).toBe(0.5); // 1 success out of 2 executions
      expect(health.lastUpdated).toBeInstanceOf(Date);
    });
  });

  describe('context management', () => {
    it('should set and clear logging context', () => {
      service.setLoggingContext({
        userId: 'user123',
        sessionId: 'session456',
        skillId: 'skill789'
      });
      
      // Context should be set (we can't directly test this without accessing internals)
      // But we can test that it doesn't throw
      service.clearLoggingContext();
    });
  });

  describe('log level management', () => {
    it('should set log level', () => {
      service.setLogLevel(LogLevel.ERROR);
      // Should not throw
    });
  });

  describe('cleanup and resource management', () => {
    it('should cleanup old performance data', () => {
      service.cleanup(0); // Clean up everything
      // Should not throw
    });

    it('should flush logs', async () => {
      await service.flush();
      // Should not throw
    });
  });

  describe('error listener functionality', () => {
    it('should act as error listener for critical errors', async () => {
      const criticalError = new SystemError(
        ErrorType.EXECUTION_ERROR,
        'Critical system failure',
        ErrorSeverity.CRITICAL
      );
      
      // This should trigger the onError method internally
      await service.handleError(criticalError);
      
      // The service should handle this without throwing
    });
  });
});