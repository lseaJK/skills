import { SkillDefinitionEngine, SkillDefinitionBuilder } from '../../src/core/skill-definition-engine';
import { SkillDependencyType, ValidationSeverity, SkillDefinition } from '../../src/types';
import { testUtils } from '../setup';

describe('SkillDefinitionEngine', () => {
  let engine: SkillDefinitionEngine;

  beforeEach(() => {
    engine = new SkillDefinitionEngine();
  });

  describe('createSkillTemplate', () => {
    it('should create basic skill template for layer 1', () => {
      const skill = engine.createSkillTemplate(1);
      
      expect(skill.layer).toBe(1);
      expect(skill.id).toBeDefined();
      expect(skill.version).toBe('1.0.0');
      expect(skill.metadata.category).toBe('atomic-operations');
      expect(skill.invocationSpec.executionContext.security?.sandboxed).toBe(false);
    });

    it('should create skill template for layer 2 with sandbox', () => {
      const skill = engine.createSkillTemplate(2);
      
      expect(skill.layer).toBe(2);
      expect(skill.metadata.category).toBe('command-tools');
      expect(skill.invocationSpec.executionContext.security?.sandboxed).toBe(true);
      expect(skill.invocationSpec.executionContext.security?.allowedCommands).toContain('ls');
    });

    it('should create skill template for layer 3 with extended timeout', () => {
      const skill = engine.createSkillTemplate(3);
      
      expect(skill.layer).toBe(3);
      expect(skill.metadata.category).toBe('api-wrappers');
      expect(skill.invocationSpec.executionContext.timeout).toBe(60000);
      expect(skill.invocationSpec.executionContext.resources?.maxMemory).toBe(1024 * 1024 * 1024);
    });

    it('should create skill template with custom options', () => {
      const options = {
        name: 'Test Skill',
        author: 'Test Author',
        tags: ['test', 'example'],
        description: 'A test skill'
      };

      const skill = engine.createSkillTemplate(1, options);
      
      expect(skill.name).toBe('Test Skill');
      expect(skill.metadata.author).toBe('Test Author');
      expect(skill.metadata.tags).toEqual(['test', 'example']);
      expect(skill.description).toBe('A test skill');
    });
  });

  describe('createSkillTemplates', () => {
    it('should create multiple templates for different layers', () => {
      const skills = engine.createSkillTemplates([1, 2, 3], {
        name: 'Multi-Layer Skill',
        author: 'Test Author'
      });

      expect(skills).toHaveLength(3);
      expect(skills[0].layer).toBe(1);
      expect(skills[1].layer).toBe(2);
      expect(skills[2].layer).toBe(3);
      expect(skills[0].name).toBe('Multi-Layer Skill (Layer 1)');
      expect(skills[1].name).toBe('Multi-Layer Skill (Layer 2)');
      expect(skills[2].name).toBe('Multi-Layer Skill (Layer 3)');
    });
  });

  describe('cloneSkillTemplate', () => {
    it('should clone existing skill with new options', () => {
      const original = testUtils.createMockSkillDefinition({
        name: 'Original Skill',
        description: 'Original description'
      });

      const cloned = engine.cloneSkillTemplate(original, {
        name: 'Cloned Skill',
        author: 'New Author'
      });

      expect(cloned.name).toBe('Cloned Skill');
      expect(cloned.metadata.author).toBe('New Author');
      expect(cloned.description).toBe('Original description'); // Should keep original
      expect(cloned.id).not.toBe(original.id); // Should have new ID
    });
  });

  describe('validateSkillDefinition', () => {
    it('should validate correct skill definition', () => {
      const skill = testUtils.createMockSkillDefinition({
        name: 'Valid Skill',
        description: 'A valid skill',
        metadata: {
          author: 'Test Author',
          created: new Date(),
          updated: new Date(),
          tags: ['test'],
          category: 'test'
        }
      });

      const result = engine.validateSkillDefinition(skill);
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should detect missing required fields', () => {
      const invalidSkill = testUtils.createMockSkillDefinition({
        name: '', // Invalid empty name
        id: 'invalid-id-with-spaces and special chars!', // Invalid ID format
        metadata: {
          ...testUtils.createMockSkillDefinition().metadata,
          tags: [] // Invalid empty tags array
        }
      });

      const result = engine.validateSkillDefinition(invalidSkill);
      expect(result.valid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
      // Check for ID pattern error
      expect(result.errors.some(e => e.message.includes('pattern'))).toBe(true);
    });

    it('should validate layer-specific requirements', () => {
      const layer2Skill = testUtils.createMockSkillDefinition({
        layer: 2,
        invocationSpec: {
          ...testUtils.createMockSkillDefinition().invocationSpec,
          executionContext: {
            environment: {},
            security: { sandboxed: false } // Invalid for layer 2
          }
        }
      });

      const result = engine.validateSkillDefinition(layer2Skill);
      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.code === 'LAYER2_SANDBOX_REQUIRED')).toBe(true);
    });

    it('should detect duplicate parameter names', () => {
      const skill = testUtils.createMockSkillDefinition({
        invocationSpec: {
          ...testUtils.createMockSkillDefinition().invocationSpec,
          parameters: [
            { name: 'param1', type: 'string', description: 'First param', required: true },
            { name: 'param1', type: 'number', description: 'Duplicate param', required: false }
          ]
        }
      });

      const result = engine.validateSkillDefinition(skill);
      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.code === 'DUPLICATE_PARAMETER_NAME')).toBe(true);
    });
  });

  describe('addParameter', () => {
    it('should add parameter to skill definition', () => {
      const skill = testUtils.createMockSkillDefinition();
      const parameter = {
        name: 'testParam',
        type: 'string',
        description: 'A test parameter',
        required: true
      };

      const updatedSkill = engine.addParameter(skill, parameter);
      
      expect(updatedSkill.invocationSpec.parameters).toHaveLength(1);
      expect(updatedSkill.invocationSpec.parameters[0]).toEqual(parameter);
      expect(updatedSkill.invocationSpec.inputSchema.properties?.testParam).toBeDefined();
      expect(updatedSkill.invocationSpec.inputSchema.required).toContain('testParam');
    });
  });

  describe('addExample', () => {
    it('should add example to skill definition', () => {
      const skill = testUtils.createMockSkillDefinition();
      const example = {
        name: 'Test Example',
        description: 'A test example',
        input: { test: 'value' },
        expectedOutput: { result: 'success' }
      };

      const updatedSkill = engine.addExample(skill, example);
      
      expect(updatedSkill.invocationSpec.examples).toHaveLength(1);
      expect(updatedSkill.invocationSpec.examples[0]).toEqual(example);
    });
  });

  describe('JSON serialization', () => {
    it('should convert skill to JSON and back', () => {
      const original = testUtils.createMockSkillDefinition();
      const json = engine.toJSON(original);
      const restored = engine.fromJSON(json);

      expect(restored.id).toBe(original.id);
      expect(restored.name).toBe(original.name);
      expect(restored.metadata.created).toEqual(original.metadata.created);
    });

    it('should handle invalid JSON', () => {
      expect(() => engine.fromJSON('invalid json')).toThrow('Invalid JSON format');
    });
  });

  describe('mergeSkillDefinitions', () => {
    it('should merge two skill definitions', () => {
      const base = testUtils.createMockSkillDefinition({
        name: 'Base Skill',
        metadata: { ...testUtils.createMockSkillDefinition().metadata, tags: ['base'] }
      });

      const extension: Partial<SkillDefinition> = {
        name: 'Extended Skill',
        metadata: { 
          tags: ['extension'],
          author: 'Test Author',
          created: new Date(),
          updated: new Date(),
          category: 'test'
        },
        invocationSpec: {
          inputSchema: { type: 'object', properties: {} },
          outputSchema: { type: 'object', properties: {} },
          executionContext: { environment: {} },
          parameters: [
            { name: 'newParam', type: 'string', description: 'New parameter', required: false }
          ],
          examples: []
        }
      };

      const merged = engine.mergeSkillDefinitions(base, extension);
      
      expect(merged.name).toBe('Extended Skill');
      expect(merged.metadata.tags).toEqual(['base', 'extension']);
      expect(merged.invocationSpec.parameters).toHaveLength(1);
      expect(merged.invocationSpec.parameters[0].name).toBe('newParam');
    });
  });
});

describe('SkillDefinitionBuilder', () => {
  let engine: SkillDefinitionEngine;
  let builder: SkillDefinitionBuilder;

  beforeEach(() => {
    engine = new SkillDefinitionEngine();
    builder = engine.createBuilder(1);
  });

  describe('fluent API', () => {
    it('should build skill using fluent interface', () => {
      const skill = builder
        .withName('Test Skill')
        .withDescription('A test skill built with fluent API')
        .withAuthor('Test Author')
        .withTags('test', 'fluent')
        .withCategory('testing')
        .withParameter('input', 'string', 'Input parameter', true)
        .withExample('Basic Example', 'Basic usage', { input: 'test' }, { result: 'success' })
        .withTimeout(45000)
        .build();

      expect(skill.name).toBe('Test Skill');
      expect(skill.description).toBe('A test skill built with fluent API');
      expect(skill.metadata.author).toBe('Test Author');
      expect(skill.metadata.tags).toEqual(['test', 'fluent']);
      expect(skill.metadata.category).toBe('testing');
      expect(skill.invocationSpec.parameters).toHaveLength(1);
      expect(skill.invocationSpec.examples).toHaveLength(1);
      expect(skill.invocationSpec.executionContext.timeout).toBe(45000);
    });

    it('should build and validate skill', () => {
      const { skill, validation } = builder
        .withName('Valid Skill')
        .withDescription('A valid skill')
        .withAuthor('Test Author')
        .buildAndValidate();

      expect(skill.name).toBe('Valid Skill');
      expect(validation.valid).toBe(true);
    });

    it('should detect validation errors in built skill', () => {
      const { skill, validation } = builder
        .withId('invalid id with spaces') // Invalid ID format
        .buildAndValidate();

      expect(validation.valid).toBe(false);
      expect(validation.errors.length).toBeGreaterThan(0);
    });
  });

  describe('layer-specific features', () => {
    it('should configure layer 2 skill with commands', () => {
      const layer2Builder = engine.createBuilder(2);
      const skill = layer2Builder
        .withName('Command Skill')
        .withAllowedCommands('ls', 'grep', 'awk')
        .build();

      expect(skill.layer).toBe(2);
      expect(skill.invocationSpec.executionContext.security?.allowedCommands).toContain('ls');
      expect(skill.invocationSpec.executionContext.security?.allowedCommands).toContain('grep');
      expect(skill.invocationSpec.executionContext.security?.allowedCommands).toContain('awk');
    });

    it('should configure dependencies', () => {
      const skill = builder
        .withName('Dependent Skill')
        .withDependency('dep1', 'Dependency 1', '1.0.0', SkillDependencyType.LIBRARY)
        .withDependency('dep2', 'Dependency 2', '2.0.0', SkillDependencyType.SKILL, true)
        .build();

      expect(skill.dependencies).toHaveLength(2);
      expect(skill.dependencies[0].id).toBe('dep1');
      expect(skill.dependencies[0].optional).toBe(false);
      expect(skill.dependencies[1].id).toBe('dep2');
      expect(skill.dependencies[1].optional).toBe(true);
    });
  });
});