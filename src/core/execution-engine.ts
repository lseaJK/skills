import { SkillDefinition, ExecutionResult, SandboxEnvironment, ExecutionError, ExecutionErrorType } from '../types';

/**
 * Execution engine interface
 */
export interface ExecutionEngine {
  execute(skillId: string, params: any): Promise<ExecutionResult>;
  executeLayer1(skill: SkillDefinition, params: any): Promise<any>;
  executeLayer2(skill: SkillDefinition, params: any): Promise<any>;
  executeLayer3(skill: SkillDefinition, params: any): Promise<any>;
  createSandbox(): SandboxEnvironment;
}

/**
 * Basic implementation of the execution engine
 */
export class BasicExecutionEngine implements ExecutionEngine {
  private skillRegistry: Map<string, SkillDefinition> = new Map();

  constructor(private registry?: any) {
    // Registry will be injected in real implementation
  }

  async execute(skillId: string, params: any): Promise<ExecutionResult> {
    const startTime = new Date();
    const executionId = this.generateExecutionId();

    try {
      // Resolve skill from registry
      const skill = await this.resolveSkill(skillId);
      
      // Validate parameters against input schema
      this.validateParameters(skill, params);

      // Execute based on layer
      let output: any;
      switch (skill.layer) {
        case 1:
          output = await this.executeLayer1(skill, params);
          break;
        case 2:
          output = await this.executeLayer2(skill, params);
          break;
        case 3:
          output = await this.executeLayer3(skill, params);
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

  async executeLayer1(skill: SkillDefinition, params: any): Promise<any> {
    // Layer 1: Direct function calls (atomic operations)
    // This would contain the actual implementation logic
    // For now, return a placeholder
    return {
      result: `Layer 1 execution of ${skill.name}`,
      params,
      timestamp: new Date()
    };
  }

  async executeLayer2(skill: SkillDefinition, params: any): Promise<any> {
    // Layer 2: Sandboxed command execution
    const sandbox = this.createSandbox();
    
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

  async executeLayer3(skill: SkillDefinition, params: any): Promise<any> {
    // Layer 3: High-level API wrappers and programming execution
    return {
      result: `Layer 3 execution of ${skill.name}`,
      params,
      apiCalls: [],
      timestamp: new Date()
    };
  }

  createSandbox(): SandboxEnvironment {
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

  private async resolveSkill(skillId: string): Promise<SkillDefinition> {
    // In real implementation, this would use the registry
    const skill = this.skillRegistry.get(skillId);
    if (!skill) {
      throw new Error(`Skill not found: ${skillId}`);
    }
    return skill;
  }

  private validateParameters(skill: SkillDefinition, params: any): void {
    // Basic parameter validation
    // In real implementation, this would use JSON Schema validation
    if (!params && skill.invocationSpec.parameters.some(p => p.required)) {
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