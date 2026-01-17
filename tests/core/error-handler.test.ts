import { UnifiedErrorHandler, ErrorHandlingResult } from '../../src/core/error-handler';
import { SystemError, ErrorType, ErrorSeverity } from '../../src/types/error';

describe('UnifiedErrorHandler', () => {
  let errorHandler: UnifiedErrorHandler;

  beforeEach(() => {
    errorHandler = new UnifiedErrorHandler();
  });

  describe('handleError', () => {
    it('should handle a regular Error and convert to SystemError', async () => {
      const error = new Error('Test error message');
      
      const result = await errorHandler.handleError(error);
      
      expect(result).toBeDefined();
      expect(result.originalError).toBeInstanceOf(SystemError);
      expect(result.originalError.message).toBe('Test error message');
      expect(result.classification).toBeDefined();
      expect(result.suggestions).toBeDefined();
      expect(Array.isArray(result.suggestions)).toBe(true);
    });

    it('should handle a SystemError directly', async () => {
      const systemError = new SystemError(
        ErrorType.VALIDATION_ERROR,
        'Validation failed',
        ErrorSeverity.ERROR,
        { skillId: 'test-skill' }
      );
      
      const result = await errorHandler.handleError(systemError);
      
      expect(result.originalError).toBe(systemError);
      expect(result.originalError.type).toBe(ErrorType.VALIDATION_ERROR);
      expect(result.originalError.context.skillId).toBe('test-skill');
    });

    it('should classify errors correctly', async () => {
      const executionError = new SystemError(
        ErrorType.EXECUTION_ERROR,
        'Execution failed',
        ErrorSeverity.ERROR
      );
      
      const result = await errorHandler.handleError(executionError);
      
      expect(result.classification.category).toBe('runtime');
      expect(result.classification.recoverable).toBe(true);
    });

    it('should attempt recovery for recoverable errors', async () => {
      const registryError = new SystemError(
        ErrorType.REGISTRY_ERROR,
        'Registry error',
        ErrorSeverity.ERROR
      );
      
      const result = await errorHandler.handleError(registryError);
      
      expect(result.recoveryAttempted).toBe(true);
      // Recovery might succeed or fail, but it should be attempted
    });

    it('should not attempt recovery for critical errors', async () => {
      const criticalError = new SystemError(
        ErrorType.EXECUTION_ERROR,
        'Critical system failure',
        ErrorSeverity.CRITICAL
      );
      
      const result = await errorHandler.handleError(criticalError);
      
      expect(result.classification.recoverable).toBe(false);
    });

    it('should generate appropriate suggestions', async () => {
      const validationError = new SystemError(
        ErrorType.VALIDATION_ERROR,
        'Invalid parameters',
        ErrorSeverity.ERROR
      );
      
      const result = await errorHandler.handleError(validationError);
      
      expect(result.suggestions.length).toBeGreaterThan(0);
      // Check for any validation-related or fix-related suggestions
      const hasValidationSuggestion = result.suggestions.some(s => 
        s.action.includes('validation') || 
        s.action.includes('fix') || 
        s.action.includes('check') ||
        s.description.toLowerCase().includes('validation')
      );
      expect(hasValidationSuggestion).toBe(true);
    });
  });

  describe('createError', () => {
    it('should create a SystemError with proper context', () => {
      const error = errorHandler.createError(
        ErrorType.SKILL_DEFINITION_ERROR,
        'Invalid skill definition',
        ErrorSeverity.WARNING,
        { skillId: 'test-skill', operation: 'validation' }
      );
      
      expect(error).toBeInstanceOf(SystemError);
      expect(error.type).toBe(ErrorType.SKILL_DEFINITION_ERROR);
      expect(error.message).toBe('Invalid skill definition');
      expect(error.severity).toBe(ErrorSeverity.WARNING);
      expect(error.context.skillId).toBe('test-skill');
      expect(error.context.operation).toBe('validation');
      expect(error.context.timestamp).toBeInstanceOf(Date);
    });

    it('should generate basic suggestions based on error type', () => {
      const error = errorHandler.createError(
        ErrorType.EXECUTION_ERROR,
        'Execution failed'
      );
      
      expect(error.suggestions.length).toBeGreaterThan(0);
      expect(error.suggestions.some(s => s.action === 'check_parameters')).toBe(true);
    });
  });

  describe('error classification', () => {
    it('should classify skill definition errors correctly', async () => {
      const error = new SystemError(
        ErrorType.SKILL_DEFINITION_ERROR,
        'Invalid skill',
        ErrorSeverity.ERROR
      );
      
      const result = await errorHandler.handleError(error);
      
      expect(result.classification.category).toBe('definition');
      expect(result.classification.userActionRequired).toBe(true);
    });

    it('should classify registry errors as recoverable', async () => {
      const error = new SystemError(
        ErrorType.REGISTRY_ERROR,
        'Registry unavailable',
        ErrorSeverity.ERROR
      );
      
      const result = await errorHandler.handleError(error);
      
      expect(result.classification.category).toBe('registry');
      expect(result.classification.recoverable).toBe(true);
      expect(result.classification.systemActionRequired).toBe(true);
    });
  });

  describe('error listeners', () => {
    it('should notify error listeners when errors are processed', async () => {
      const mockListener = {
        onError: jest.fn()
      };
      
      errorHandler.registerErrorListener(mockListener);
      
      const error = new Error('Test error');
      await errorHandler.handleError(error);
      
      expect(mockListener.onError).toHaveBeenCalledTimes(1);
      expect(mockListener.onError).toHaveBeenCalledWith(expect.any(SystemError));
    });
  });
});