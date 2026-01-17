import { 
  SkillDefinition, 
  ExecutionResult, 
  SandboxEnvironment, 
  ExecutionError, 
  ExecutionErrorType,
  SkillRegistry,
  ExecutionMetadata,
  ResourceUsage,
  ExecutionContext as SkillExecutionContext,
  ErrorType,
  ErrorSeverity
} from '../types';
import { ErrorLoggingService } from './error-logging-service';
import { FunctionRegistry, AtomicOperations } from '../layers/layer1';
import { SandboxManager, SandboxConfig } from '../layers/layer2';
import { WorkflowEngine, Workflow } from '../layers/layer3';

/**
 * Runtime execution context for skill execution (extends skill definition context)
 */
export interface RuntimeExecutionContext extends SkillExecutionContext {
  skillId: string;
  executionId: string;
  userId?: string;
  sessionId?: string;
  resourceLimits?: ResourceLimits;
}

/**
 * Resource limits for execution
 */
export interface ResourceLimits {
  maxMemory?: number;
  maxCpu?: number;
  maxDuration?: number;
  maxFileSize?: number;
  maxNetworkRequests?: number;
}

/**
 * Execution engine interface
 */
export interface ExecutionEngine {
  execute(skillId: string, params: any, context?: Partial<RuntimeExecutionContext>): Promise<ExecutionResult>;
  executeLayer1(skill: SkillDefinition, params: any, context: RuntimeExecutionContext): Promise<any>;
  executeLayer2(skill: SkillDefinition, params: any, context: RuntimeExecutionContext): Promise<any>;
  executeLayer3(skill: SkillDefinition, params: any, context: RuntimeExecutionContext): Promise<any>;
  createSandbox(config?: SandboxConfig): Promise<SandboxEnvironment>;
  validateExecution(skill: SkillDefinition, params: any): Promise<ValidationResult>;
}

/**
 * Validation result for execution parameters
 */
export interface ValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
}

/**
 * Enhanced implementation of the execution engine with layered architecture
 */
export class LayeredExecutionEngine implements ExecutionEngine {
  private layer1Executor: FunctionRegistry;
  private layer2Executor: SandboxManager;
  private layer3Executor: WorkflowEngine;
  private activeExecutions: Map<string, RuntimeExecutionContext> = new Map();
  private errorLoggingService: ErrorLoggingService;

  constructor(private registry: SkillRegistry, errorLoggingService?: ErrorLoggingService) {
    // Initialize layer executors
    this.layer1Executor = new FunctionRegistry();
    this.layer2Executor = new SandboxManager();
    this.layer3Executor = new WorkflowEngine();

    // Initialize error handling and logging
    this.errorLoggingService = errorLoggingService || new ErrorLoggingService();

    // Register built-in atomic operations
    AtomicOperations.registerBuiltInFunctions(this.layer1Executor);
  }

  async execute(skillId: string, params: any, context?: Partial<RuntimeExecutionContext>): Promise<ExecutionResult> {
    const startTime = new Date();
    const executionId = this.generateExecutionId();
    
    // Create full execution context
    const fullContext: RuntimeExecutionContext = {
      skillId,
      executionId,
      userId: context?.userId,
      sessionId: context?.sessionId,
      environment: context?.environment || {},
      workingDirectory: context?.workingDirectory,
      timeout: context?.timeout || 30000, // 30 seconds default
      resources: context?.resources,
      security: context?.security,
      resourceLimits: context?.resourceLimits || this.getDefaultResourceLimits()
    };

    // Track active execution
    this.activeExecutions.set(executionId, fullContext);

    // Start performance monitoring
    this.errorLoggingService.startExecution(skillId, executionId, {
      userId: fullContext.userId,
      sessionId: fullContext.sessionId,
      operation: 'skill_execution',
      additionalData: { parameters: params }
    });

    try {
      // Resolve skill from registry
      const skill = await this.registry.resolve(skillId);
      
      // Validate execution parameters
      const validation = await this.validateExecution(skill, params);
      if (!validation.valid) {
        const error = await this.errorLoggingService.createAndHandleError(
          ErrorType.VALIDATION_ERROR,
          `Parameter validation failed: ${validation.errors.join(', ')}`,
          ErrorSeverity.ERROR,
          { skillId, operation: 'parameter_validation', additionalData: { executionId } }
        );
        throw error.originalError;
      }

      // Set up timeout
      const timeoutPromise = new Promise<never>((_, reject) => {
        setTimeout(() => {
          reject(new Error(`Execution timeout after ${fullContext.timeout}ms`));
        }, fullContext.timeout);
      });

      // Execute based on layer with timeout
      const executionPromise = this.executeByLayer(skill, params, fullContext);
      const output = await Promise.race([executionPromise, timeoutPromise]);

      const endTime = new Date();
      const duration = endTime.getTime() - startTime.getTime();

      // Calculate resource usage
      const resourceUsage = await this.calculateResourceUsage(executionId, duration);
      
      // End performance monitoring
      this.errorLoggingService.endExecution(skillId, executionId, true, output);
      
      return {
        success: true,
        output,
        metadata: {
          skillId,
          executionId,
          startTime,
          endTime,
          duration,
          layer: skill.layer,
          resourceUsage
        }
      };

    } catch (error) {
      const endTime = new Date();
      const duration = endTime.getTime() - startTime.getTime();
      
      // Handle error through error logging service
      const errorResult = await this.errorLoggingService.handleError(error as Error, {
        skillId,
        operation: 'skill_execution',
        additionalData: { executionId, duration, parameters: params }
      });

      // End performance monitoring with error
      this.errorLoggingService.endExecution(skillId, executionId, false, undefined, error as Error);
      
      return {
        success: false,
        error: this.createExecutionError(errorResult.originalError),
        metadata: {
          skillId,
          executionId,
          startTime,
          endTime,
          duration,
          layer: 0 // Unknown layer if skill resolution failed
        }
      };
    } finally {
      // Clean up active execution tracking
      this.activeExecutions.delete(executionId);
    }
  }

  private async executeByLayer(skill: SkillDefinition, params: any, context: RuntimeExecutionContext): Promise<any> {
    switch (skill.layer) {
      case 1:
        return await this.executeLayer1(skill, params, context);
      case 2:
        return await this.executeLayer2(skill, params, context);
      case 3:
        return await this.executeLayer3(skill, params, context);
      default:
        throw new Error(`Invalid layer: ${skill.layer}`);
    }
  }

  async executeLayer1(skill: SkillDefinition, params: any, context: RuntimeExecutionContext): Promise<any> {
    // Layer 1: Direct function calls (atomic operations)
    const startTime = Date.now();
    
    try {
      // Extract function name from skill implementation
      const functionName = (skill.invocationSpec.executionContext as any).functionName || skill.name;
      
      // Prepare parameters array
      const paramArray = this.prepareLayer1Parameters(skill, params);
      
      // Execute atomic function
      const result = await this.layer1Executor.executeFunction(functionName, paramArray);
      
      const duration = Date.now() - startTime;
      this.errorLoggingService.logLayerExecution(1, skill.id, context.executionId, 'function_call', true, duration);
      
      return {
        type: 'atomic_operation',
        function: functionName,
        input: paramArray,
        output: result,
        executionContext: context.executionId,
        timestamp: new Date()
      };
    } catch (error) {
      const duration = Date.now() - startTime;
      this.errorLoggingService.logLayerExecution(1, skill.id, context.executionId, 'function_call', false, duration, error as Error);
      
      const errorResult = await this.errorLoggingService.createAndHandleError(
        ErrorType.EXECUTION_ERROR,
        `Layer 1 execution failed: ${(error as Error).message}`,
        ErrorSeverity.ERROR,
        { skillId: skill.id, layer: 1, operation: 'function_call', additionalData: { executionId: context.executionId } },
        error as Error
      );
      
      throw errorResult.originalError;
    }
  }

  async executeLayer2(skill: SkillDefinition, params: any, context: RuntimeExecutionContext): Promise<any> {
    // Layer 2: Sandboxed command execution
    const startTime = Date.now();
    
    try {
      // Create sandbox with skill-specific configuration
      const sandboxConfig: SandboxConfig = {
        workingDirectory: params.workingDirectory || context.workingDirectory || '/tmp',
        environmentVariables: {
          ...context.environment,
          SKILL_ID: skill.id,
          EXECUTION_ID: context.executionId
        },
        allowedCommands: skill.invocationSpec.executionContext.security?.allowedCommands || ['ls', 'cat', 'echo'],
        resourceLimits: context.resourceLimits,
        networkAccess: (skill.invocationSpec.executionContext as any).networkAccess || false,
        fileSystemAccess: skill.invocationSpec.executionContext.security?.allowedPaths || ['/tmp']
      };

      const sandbox = await this.layer2Executor.createSandbox(sandboxConfig);
      
      try {
        // Extract command and arguments from skill
        const command = (skill.invocationSpec.executionContext as any).command || params.command;
        const args = (skill.invocationSpec.executionContext as any).args || params.args || [];
        
        // Execute command in sandbox
        const commandResult = await this.layer2Executor.executeCommand(command, args, sandbox);
        
        const duration = Date.now() - startTime;
        this.errorLoggingService.logLayerExecution(2, skill.id, context.executionId, 'sandbox_command', true, duration);
        
        return {
          type: 'sandboxed_command',
          command,
          args,
          sandbox: sandbox.id,
          result: commandResult,
          executionContext: context.executionId,
          timestamp: new Date()
        };
      } finally {
        await sandbox.cleanup();
      }
    } catch (error) {
      const duration = Date.now() - startTime;
      this.errorLoggingService.logLayerExecution(2, skill.id, context.executionId, 'sandbox_command', false, duration, error as Error);
      
      const errorResult = await this.errorLoggingService.createAndHandleError(
        ErrorType.EXECUTION_ERROR,
        `Layer 2 execution failed: ${(error as Error).message}`,
        ErrorSeverity.ERROR,
        { skillId: skill.id, layer: 2, operation: 'sandbox_command', additionalData: { executionId: context.executionId } },
        error as Error
      );
      
      throw errorResult.originalError;
    }
  }

  async executeLayer3(skill: SkillDefinition, params: any, context: RuntimeExecutionContext): Promise<any> {
    // Layer 3: High-level API wrappers and programming execution
    const startTime = Date.now();
    
    try {
      // Check if skill defines a workflow
      if ((skill.invocationSpec.executionContext as any).workflow) {
        const workflow: Workflow = {
          id: `${skill.id}_${context.executionId}`,
          name: skill.name,
          steps: (skill.invocationSpec.executionContext as any).workflow.steps,
          errorHandling: (skill.invocationSpec.executionContext as any).workflow.errorHandling,
          retryPolicy: (skill.invocationSpec.executionContext as any).workflow.retryPolicy
        };

        // Execute workflow
        const workflowResult = await this.layer3Executor.executeWorkflow(workflow);
        
        const duration = Date.now() - startTime;
        this.errorLoggingService.logLayerExecution(3, skill.id, context.executionId, 'workflow', true, duration);
        
        return {
          type: 'workflow_execution',
          workflow: workflow.id,
          result: workflowResult,
          executionContext: context.executionId,
          timestamp: new Date()
        };
      } else {
        // Execute as API composition or single API call
        const apiName = (skill.invocationSpec.executionContext as any).apiName || skill.name;
        const endpoint = params.endpoint || (skill.invocationSpec.executionContext as any).defaultEndpoint;
        
        // Simulate API execution (in real implementation, this would make actual API calls)
        const duration = Date.now() - startTime;
        this.errorLoggingService.logLayerExecution(3, skill.id, context.executionId, 'api_call', true, duration);
        
        return {
          type: 'api_execution',
          api: apiName,
          endpoint,
          params,
          result: `API execution result for ${apiName}.${endpoint}`,
          executionContext: context.executionId,
          timestamp: new Date()
        };
      }
    } catch (error) {
      const duration = Date.now() - startTime;
      const operation = (skill.invocationSpec.executionContext as any).workflow ? 'workflow' : 'api_call';
      this.errorLoggingService.logLayerExecution(3, skill.id, context.executionId, operation, false, duration, error as Error);
      
      const errorResult = await this.errorLoggingService.createAndHandleError(
        ErrorType.EXECUTION_ERROR,
        `Layer 3 execution failed: ${(error as Error).message}`,
        ErrorSeverity.ERROR,
        { skillId: skill.id, layer: 3, operation, additionalData: { executionId: context.executionId } },
        error as Error
      );
      
      throw errorResult.originalError;
    }
  }

  async createSandbox(config?: SandboxConfig): Promise<SandboxEnvironment> {
    return await this.layer2Executor.createSandbox(config);
  }

  async validateExecution(skill: SkillDefinition, params: any): Promise<ValidationResult> {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Validate required parameters
    if (skill.invocationSpec.parameters) {
      for (const param of skill.invocationSpec.parameters) {
        if (param.required && (params[param.name] === undefined || params[param.name] === null)) {
          errors.push(`Required parameter '${param.name}' is missing`);
        }
      }
    }

    // Validate parameter types (basic validation)
    if (skill.invocationSpec.inputSchema && params) {
      // In real implementation, use JSON Schema validation
      if (typeof params !== 'object') {
        errors.push('Parameters must be an object');
      }
    }

    // Layer-specific validation
    const execContext = skill.invocationSpec.executionContext as any;
    switch (skill.layer) {
      case 1:
        // Validate function parameters
        if (!execContext.functionName && !params.functionName) {
          warnings.push('Function name not specified, using skill name as default');
        }
        break;
      
      case 2:
        // Validate command parameters
        if (!execContext.command && !params.command) {
          errors.push('Command is required for Layer 2 execution');
        }
        break;
      
      case 3:
        // Validate API or workflow parameters
        if (!execContext.workflow && !execContext.apiName && !params.apiName) {
          errors.push('API name or workflow is required for Layer 3 execution');
        }
        break;
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings
    };
  }

  private prepareLayer1Parameters(skill: SkillDefinition, params: any): any[] {
    // Convert object parameters to array based on skill parameter definition
    if (Array.isArray(params)) {
      return params;
    }

    if (skill.invocationSpec.parameters) {
      return skill.invocationSpec.parameters.map(param => params[param.name]);
    }

    // Fallback: convert object values to array
    return Object.values(params);
  }

  private async calculateResourceUsage(executionId: string, duration: number): Promise<ResourceUsage> {
    // In real implementation, this would collect actual resource metrics
    return {
      memoryUsed: Math.floor(Math.random() * 100 * 1024 * 1024), // Random memory usage
      cpuTime: duration * 0.7, // Simulate CPU time
      networkRequests: Math.floor(Math.random() * 10),
      filesAccessed: [`/tmp/exec_${executionId}.log`]
    };
  }

  private getDefaultResourceLimits(): ResourceLimits {
    return {
      maxMemory: 512 * 1024 * 1024, // 512MB
      maxCpu: 5000, // 5 seconds
      maxDuration: 30000, // 30 seconds
      maxFileSize: 10 * 1024 * 1024, // 10MB
      maxNetworkRequests: 100
    };
  }

  private createExecutionError(error: any): ExecutionError {
    let errorType = ExecutionErrorType.RUNTIME_ERROR;
    
    if (error.message?.includes('timeout')) {
      errorType = ExecutionErrorType.TIMEOUT_ERROR;
    } else if (error.message?.includes('validation')) {
      errorType = ExecutionErrorType.VALIDATION_ERROR;
    } else if (error.message?.includes('permission')) {
      errorType = ExecutionErrorType.PERMISSION_ERROR;
    } else if (error.message?.includes('dependency')) {
      errorType = ExecutionErrorType.DEPENDENCY_ERROR;
    } else if (error.message?.includes('resource')) {
      errorType = ExecutionErrorType.RESOURCE_ERROR;
    }

    return {
      type: errorType,
      message: error.message || 'Unknown execution error',
      code: error.code,
      details: error,
      stack: error.stack,
      suggestions: error.suggestions || this.generateErrorSuggestions(errorType, error)
    };
  }

  private generateErrorSuggestions(errorType: ExecutionErrorType, error: any): string[] {
    const suggestions: string[] = [];

    switch (errorType) {
      case ExecutionErrorType.VALIDATION_ERROR:
        suggestions.push('Check skill parameter requirements');
        suggestions.push('Verify parameter types and formats');
        break;
      
      case ExecutionErrorType.TIMEOUT_ERROR:
        suggestions.push('Increase execution timeout');
        suggestions.push('Optimize skill implementation');
        suggestions.push('Check for infinite loops or blocking operations');
        break;
      
      case ExecutionErrorType.RESOURCE_ERROR:
        suggestions.push('Reduce resource usage');
        suggestions.push('Increase resource limits');
        suggestions.push('Optimize memory or CPU usage');
        break;
      
      case ExecutionErrorType.PERMISSION_ERROR:
        suggestions.push('Check file system permissions');
        suggestions.push('Verify sandbox configuration');
        suggestions.push('Review allowed commands and paths');
        break;
      
      case ExecutionErrorType.DEPENDENCY_ERROR:
        suggestions.push('Install missing dependencies');
        suggestions.push('Check dependency versions');
        suggestions.push('Verify skill registry');
        break;
      
      default:
        suggestions.push('Check skill implementation');
        suggestions.push('Review execution logs');
        suggestions.push('Verify skill configuration');
    }

    return suggestions;
  }

  private generateExecutionId(): string {
    return `exec_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  // Utility methods for monitoring and management
  getActiveExecutions(): RuntimeExecutionContext[] {
    return Array.from(this.activeExecutions.values());
  }

  async cancelExecution(executionId: string): Promise<boolean> {
    const context = this.activeExecutions.get(executionId);
    if (!context) {
      return false;
    }

    // In real implementation, this would cancel the actual execution
    this.activeExecutions.delete(executionId);
    return true;
  }

  getExecutionStats(): { total: number; byLayer: Record<number, number> } {
    // In real implementation, this would return actual statistics
    return {
      total: 0,
      byLayer: { 1: 0, 2: 0, 3: 0 }
    };
  }

  /**
   * Get the error logging service for external access
   */
  getErrorLoggingService(): ErrorLoggingService {
    return this.errorLoggingService;
  }

  /**
   * Get system health status
   */
  getSystemHealth() {
    return this.errorLoggingService.getSystemHealth();
  }

  /**
   * Get performance metrics
   */
  getPerformanceMetrics(skillId?: string) {
    return this.errorLoggingService.getAggregatedMetrics(skillId);
  }

  /**
   * Get error metrics
   */
  getErrorMetrics() {
    return this.errorLoggingService.getErrorMetrics();
  }
}

/**
 * Legacy basic implementation of the execution engine (for backward compatibility)
 * @deprecated Use LayeredExecutionEngine instead
 */
export class BasicExecutionEngine implements ExecutionEngine {
  private skillRegistry: Map<string, SkillDefinition> = new Map();

  constructor(private registry?: SkillRegistry) {
    // Registry will be injected in real implementation
  }

  async execute(skillId: string, params: any, context?: Partial<RuntimeExecutionContext>): Promise<ExecutionResult> {
    const startTime = new Date();
    const executionId = this.generateExecutionId();

    try {
      // Resolve skill from registry
      const skill = await this.resolveSkill(skillId);
      
      // Validate parameters against input schema
      this.validateParameters(skill, params);

      // Create basic execution context
      const fullContext: RuntimeExecutionContext = {
        skillId,
        executionId,
        environment: context?.environment || {},
        workingDirectory: context?.workingDirectory,
        timeout: context?.timeout || 30000,
        resources: context?.resources,
        security: context?.security,
        resourceLimits: context?.resourceLimits
      };

      // Execute based on layer
      let output: any;
      switch (skill.layer) {
        case 1:
          output = await this.executeLayer1(skill, params, fullContext);
          break;
        case 2:
          output = await this.executeLayer2(skill, params, fullContext);
          break;
        case 3:
          output = await this.executeLayer3(skill, params, fullContext);
          break;
        default:
          throw new Error(`Invalid layer: ${skill.layer}`);
      }

      const endTime = new Date();
      
      return {
        success: true,
        output,
        metadata: {
          skillId,
          executionId,
          startTime,
          endTime,
          duration: endTime.getTime() - startTime.getTime(),
          layer: skill.layer
        }
      };

    } catch (error) {
      const endTime = new Date();
      
      return {
        success: false,
        error: this.createExecutionError(error),
        metadata: {
          skillId,
          executionId,
          startTime,
          endTime,
          duration: endTime.getTime() - startTime.getTime(),
          layer: 0 // Unknown layer if skill resolution failed
        }
      };
    }
  }

  async executeLayer1(skill: SkillDefinition, params: any, context: RuntimeExecutionContext): Promise<any> {
    // Layer 1: Direct function calls (atomic operations)
    return {
      result: `Layer 1 execution of ${skill.name}`,
      params,
      timestamp: new Date()
    };
  }

  async executeLayer2(skill: SkillDefinition, params: any, context: RuntimeExecutionContext): Promise<any> {
    // Layer 2: Sandboxed command execution
    const sandbox = await this.createSandbox();
    
    try {
      // Execute in sandbox environment
      return {
        result: `Layer 2 execution of ${skill.name} in sandbox ${sandbox.id}`,
        params,
        sandbox: sandbox.id,
        timestamp: new Date()
      };
    } finally {
      await sandbox.cleanup();
    }
  }

  async executeLayer3(skill: SkillDefinition, params: any, context: RuntimeExecutionContext): Promise<any> {
    // Layer 3: High-level API wrappers and programming execution
    return {
      result: `Layer 3 execution of ${skill.name}`,
      params,
      apiCalls: [],
      timestamp: new Date()
    };
  }

  async createSandbox(): Promise<SandboxEnvironment> {
    const sandboxId = this.generateSandboxId();
    
    return {
      id: sandboxId,
      workingDirectory: `/tmp/sandbox-${sandboxId}`,
      environmentVariables: {},
      allowedCommands: ['ls', 'cat', 'echo'],
      resourceLimits: {
        maxMemory: 512 * 1024 * 1024, // 512MB
        maxCpu: 1000, // 1 second
        maxDuration: 30000 // 30 seconds
      },
      async cleanup(): Promise<void> {
        // Cleanup sandbox resources
        console.log(`Cleaning up sandbox ${sandboxId}`);
      }
    };
  }

  async validateExecution(skill: SkillDefinition, params: any): Promise<ValidationResult> {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Basic validation
    if (!params && skill.invocationSpec.parameters?.some(p => p.required)) {
      errors.push('Required parameters missing');
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings
    };
  }

  private async resolveSkill(skillId: string): Promise<SkillDefinition> {
    if (this.registry) {
      return await this.registry.resolve(skillId);
    }
    
    // Fallback to internal registry
    const skill = this.skillRegistry.get(skillId);
    if (!skill) {
      throw new Error(`Skill not found: ${skillId}`);
    }
    return skill;
  }

  private validateParameters(skill: SkillDefinition, params: any): void {
    // Basic parameter validation
    if (!params && skill.invocationSpec.parameters?.some(p => p.required)) {
      throw new Error('Required parameters missing');
    }
  }

  private createExecutionError(error: any): ExecutionError {
    return {
      type: ExecutionErrorType.RUNTIME_ERROR,
      message: error.message || 'Unknown execution error',
      code: error.code,
      details: error,
      stack: error.stack,
      suggestions: ['Check skill parameters', 'Verify skill implementation']
    };
  }

  private generateExecutionId(): string {
    return `exec_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private generateSandboxId(): string {
    return `sandbox_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  // Method to register skills for testing
  registerSkill(skill: SkillDefinition): void {
    this.skillRegistry.set(skill.id, skill);
  }
}