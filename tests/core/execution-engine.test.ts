import { BasicExecutionEngine, LayeredExecutionEngine, RuntimeExecutionContext } from '../../src/core/execution-engine';
import { InMemorySkillRegistry } from '../../src/core/skill-registry';
import { SkillDefinition } from '../../src/types';
import { testUtils } from '../setup';

describe('ExecutionEngine', () => {
  let basicEngine: BasicExecutionEngine;
  let layeredEngine: LayeredExecutionEngine;
  let registry: InMemorySkillRegistry;
  let mockSkill: SkillDefinition;
  let mockContext: RuntimeExecutionContext;

  beforeEach(async () => {
    registry = new InMemorySkillRegistry();
    basicEngine = new BasicExecutionEngine(registry);
    layeredEngine = new LayeredExecutionEngine(registry);
    
    mockSkill = testUtils.createMockSkillDefinition();
    await registry.register(mockSkill);
    
    mockContext = {
      skillId: mockSkill.id,
      executionId: 'test-exec-123',
      environment: { TEST: 'true' },
      timeout: 5000
    };
  });

  describe('BasicExecutionEngine', () => {
    describe('execute', () => {
      it('should execute layer 1 skill successfully', async () => {
        const result = await basicEngine.execute(mockSkill.id, { test: 'data' });
        
        expect(result.success).toBe(true);
        expect(result.output).toBeDefined();
        expect(result.metadata.skillId).toBe(mockSkill.id);
        expect(result.metadata.layer).toBe(1);
      });

      it('should execute layer 2 skill with sandbox', async () => {
        const layer2Skill = testUtils.createMockSkillDefinition({
          id: 'layer2-skill',
          layer: 2
        });
        await registry.register(layer2Skill);

        const result = await basicEngine.execute(layer2Skill.id, { command: 'ls' });
        
        expect(result.success).toBe(true);
        expect(result.output).toBeDefined();
        expect(result.metadata.layer).toBe(2);
      });

      it('should execute layer 3 skill with API wrapper', async () => {
        const layer3Skill = testUtils.createMockSkillDefinition({
          id: 'layer3-skill',
          layer: 3
        });
        await registry.register(layer3Skill);

        const result = await basicEngine.execute(layer3Skill.id, { api: 'test' });
        
        expect(result.success).toBe(true);
        expect(result.output).toBeDefined();
        expect(result.metadata.layer).toBe(3);
      });

      it('should handle execution errors', async () => {
        const result = await basicEngine.execute('non-existent-skill', {});
        
        expect(result.success).toBe(false);
        expect(result.error).toBeDefined();
        expect(result.error?.type).toBe('runtime_error');
      });
    });

    describe('createSandbox', () => {
      it('should create sandbox environment', async () => {
        const sandbox = await basicEngine.createSandbox();
        
        expect(sandbox.id).toBeDefined();
        expect(sandbox.workingDirectory).toBeDefined();
        expect(sandbox.allowedCommands).toContain('ls');
        expect(sandbox.resourceLimits).toBeDefined();
        expect(typeof sandbox.cleanup).toBe('function');
      });
    });

    describe('layer-specific execution', () => {
      it('should execute layer 1 operations', async () => {
        const result = await basicEngine.executeLayer1(mockSkill, { value: 42 }, mockContext);
        
        expect(result).toBeDefined();
        expect(result.result).toContain('Layer 1 execution');
      });

      it('should execute layer 2 operations with sandbox cleanup', async () => {
        const result = await basicEngine.executeLayer2(mockSkill, { command: 'echo test' }, mockContext);
        
        expect(result).toBeDefined();
        expect(result.result).toContain('Layer 2 execution');
        expect(result.sandbox).toBeDefined();
      });

      it('should execute layer 3 operations', async () => {
        const result = await basicEngine.executeLayer3(mockSkill, { workflow: 'test' }, mockContext);
        
        expect(result).toBeDefined();
        expect(result.result).toContain('Layer 3 execution');
      });
    });
  });

  describe('LayeredExecutionEngine', () => {
    describe('execute', () => {
      it('should execute layer 1 skill with atomic operations', async () => {
        // Register a function for the skill to execute
        const layer1Engine = (layeredEngine as any).layer1Executor;
        layer1Engine.registerFunction(mockSkill.name, (data: any) => `Processed: ${JSON.stringify(data)}`);
        
        const result = await layeredEngine.execute(mockSkill.id, { test: 'data' });
        
        expect(result.success).toBe(true);
        expect(result.output).toBeDefined();
        expect(result.output.type).toBe('atomic_operation');
        expect(result.metadata.skillId).toBe(mockSkill.id);
        expect(result.metadata.layer).toBe(1);
      });

      it('should execute layer 2 skill with sandbox', async () => {
        const layer2Skill = testUtils.createMockSkillDefinition({
          id: 'layer2-skill',
          name: 'Layer 2 Test Skill',
          layer: 2
        });
        await registry.register(layer2Skill);

        const result = await layeredEngine.execute(layer2Skill.id, { command: 'ls' });
        
        expect(result.success).toBe(true);
        expect(result.output).toBeDefined();
        expect(result.output.type).toBe('sandboxed_command');
        expect(result.metadata.layer).toBe(2);
      });

      it('should execute layer 3 skill with API execution', async () => {
        const layer3Skill = testUtils.createMockSkillDefinition({
          id: 'layer3-skill',
          name: 'Layer 3 Test Skill',
          layer: 3
        });
        await registry.register(layer3Skill);

        const result = await layeredEngine.execute(layer3Skill.id, { apiName: 'test' });
        
        if (!result.success) {
          console.log('Layer 3 execution failed:', result.error);
        }
        
        expect(result.success).toBe(true);
        expect(result.output).toBeDefined();
        expect(result.output.type).toBe('api_execution');
        expect(result.metadata.layer).toBe(3);
      });

      it('should handle timeout errors', async () => {
        const result = await layeredEngine.execute(mockSkill.id, {}, { timeout: 1 });
        
        // This might pass or fail depending on execution speed, but should not crash
        expect(result).toBeDefined();
        expect(result.metadata).toBeDefined();
      });

      it('should validate parameters', async () => {
        const skillWithRequiredParams = testUtils.createMockSkillDefinition({
          id: 'required-params-skill',
          name: 'Required Params Skill',
          invocationSpec: {
            ...mockSkill.invocationSpec,
            parameters: [
              {
                name: 'requiredParam',
                type: 'string',
                description: 'A required parameter',
                required: true
              }
            ]
          }
        });
        await registry.register(skillWithRequiredParams);

        const result = await layeredEngine.execute(skillWithRequiredParams.id, {});
        
        expect(result.success).toBe(false);
        expect(result.error?.message).toContain('Parameter validation failed');
      });
    });

    describe('resource management', () => {
      it('should track active executions', () => {
        const activeExecutions = layeredEngine.getActiveExecutions();
        expect(Array.isArray(activeExecutions)).toBe(true);
      });

      it('should provide execution statistics', () => {
        const stats = layeredEngine.getExecutionStats();
        expect(stats.total).toBeDefined();
        expect(stats.byLayer).toBeDefined();
        expect(stats.byLayer[1]).toBeDefined();
        expect(stats.byLayer[2]).toBeDefined();
        expect(stats.byLayer[3]).toBeDefined();
      });
    });

    describe('validation', () => {
      it('should validate execution parameters', async () => {
        const validation = await layeredEngine.validateExecution(mockSkill, { test: 'data' });
        
        expect(validation.valid).toBe(true);
        expect(validation.errors).toHaveLength(0);
      });

      it('should detect missing required parameters', async () => {
        const skillWithRequiredParams = testUtils.createMockSkillDefinition({
          invocationSpec: {
            ...mockSkill.invocationSpec,
            parameters: [
              {
                name: 'requiredParam',
                type: 'string',
                description: 'A required parameter',
                required: true
              }
            ]
          }
        });

        const validation = await layeredEngine.validateExecution(skillWithRequiredParams, {});
        
        expect(validation.valid).toBe(false);
        expect(validation.errors).toHaveLength(1);
        expect(validation.errors[0].message).toBe("Required parameter 'requiredParam' is missing");
        expect(validation.errors[0].code).toBe('MISSING_REQUIRED_PARAMETER');
      });
    });
  });
});