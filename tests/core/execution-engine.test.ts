import { BasicExecutionEngine } from '../../src/core/execution-engine';
import { SkillDefinition } from '../../src/types';
import { testUtils } from '../setup';

describe('BasicExecutionEngine', () => {
  let engine: BasicExecutionEngine;
  let mockSkill: SkillDefinition;

  beforeEach(() => {
    engine = new BasicExecutionEngine();
    mockSkill = testUtils.createMockSkillDefinition();
    engine.registerSkill(mockSkill);
  });

  describe('execute', () => {
    it('should execute layer 1 skill successfully', async () => {
      const result = await engine.execute(mockSkill.id, { test: 'data' });
      
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
      engine.registerSkill(layer2Skill);

      const result = await engine.execute(layer2Skill.id, { command: 'ls' });
      
      expect(result.success).toBe(true);
      expect(result.output).toBeDefined();
      expect(result.metadata.layer).toBe(2);
    });

    it('should execute layer 3 skill with API wrapper', async () => {
      const layer3Skill = testUtils.createMockSkillDefinition({
        id: 'layer3-skill',
        layer: 3
      });
      engine.registerSkill(layer3Skill);

      const result = await engine.execute(layer3Skill.id, { api: 'test' });
      
      expect(result.success).toBe(true);
      expect(result.output).toBeDefined();
      expect(result.metadata.layer).toBe(3);
    });

    it('should handle execution errors', async () => {
      const result = await engine.execute('non-existent-skill', {});
      
      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
      expect(result.error?.type).toBe('runtime_error');
    });
  });

  describe('createSandbox', () => {
    it('should create sandbox environment', () => {
      const sandbox = engine.createSandbox();
      
      expect(sandbox.id).toBeDefined();
      expect(sandbox.workingDirectory).toBeDefined();
      expect(sandbox.allowedCommands).toContain('ls');
      expect(sandbox.resourceLimits).toBeDefined();
      expect(typeof sandbox.cleanup).toBe('function');
    });
  });

  describe('layer-specific execution', () => {
    it('should execute layer 1 operations', async () => {
      const result = await engine.executeLayer1(mockSkill, { value: 42 });
      
      expect(result).toBeDefined();
      expect(result.result).toContain('Layer 1 execution');
    });

    it('should execute layer 2 operations with sandbox cleanup', async () => {
      const result = await engine.executeLayer2(mockSkill, { command: 'echo test' });
      
      expect(result).toBeDefined();
      expect(result.result).toContain('Layer 2 execution');
      expect(result.sandbox).toBeDefined();
    });

    it('should execute layer 3 operations', async () => {
      const result = await engine.executeLayer3(mockSkill, { workflow: 'test' });
      
      expect(result).toBeDefined();
      expect(result.result).toContain('Layer 3 execution');
    });
  });
});