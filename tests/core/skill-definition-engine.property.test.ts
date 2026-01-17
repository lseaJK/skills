import { SkillDefinitionEngine, SkillTemplateOptions } from '../../src/core/skill-definition-engine';
import { SkillDefinition, SkillDependencyType } from '../../src/types';
import * as fc from 'fast-check';

/**
 * Property-based tests for SkillDefinitionEngine
 * **Feature: universal-skills-architecture, Property 1: 技能定义模板一致性**
 */
describe('SkillDefinitionEngine Property Tests', () => {
  let engine: SkillDefinitionEngine;

  beforeEach(() => {
    engine = new SkillDefinitionEngine();
  });

  describe('Property 1: Skill Definition Template Consistency', () => {
    /**
     * **Feature: universal-skills-architecture, Property 1: 技能定义模板一致性**
     * **Validates: Requirements 1.1**
     * 
     * Property: For any developer's skill creation request, the system should return 
     * skill definition templates that conform to standardized format
     */
    it('should create standardized skill templates for any valid layer and options', () => {
      fc.assert(
        fc.property(
          // Generate valid layer (1, 2, or 3)
          fc.constantFrom(1 as const, 2 as const, 3 as const),
          // Generate optional skill template options
          fc.record({
            id: fc.option(fc.string({ minLength: 1, maxLength: 50 }).filter(s => /^[a-zA-Z0-9_-]+$/.test(s)), { nil: undefined }),
            name: fc.option(fc.string({ minLength: 0, maxLength: 100 }), { nil: undefined }),
            version: fc.option(fc.string().filter(v => /^\d+\.\d+\.\d+(-[a-zA-Z0-9.-]+)?(\+[a-zA-Z0-9.-]+)?$/.test(v) || v === ''), { nil: undefined }),
            description: fc.option(fc.string({ minLength: 0, maxLength: 500 }), { nil: undefined }),
            author: fc.option(fc.string({ minLength: 0, maxLength: 100 }), { nil: undefined }),
            tags: fc.option(fc.array(fc.string({ minLength: 1, maxLength: 50 }), { maxLength: 10 }), { nil: undefined }),
            category: fc.option(fc.string({ minLength: 1, maxLength: 50 }), { nil: undefined }),
            license: fc.option(fc.string({ minLength: 0, maxLength: 50 }), { nil: undefined }),
            documentation: fc.option(fc.string({ minLength: 0, maxLength: 200 }), { nil: undefined }),
            repository: fc.option(fc.string({ minLength: 0, maxLength: 200 }), { nil: undefined }),
            dependencies: fc.option(fc.array(
              fc.record({
                id: fc.string({ minLength: 1, maxLength: 50 }),
                name: fc.string({ minLength: 1, maxLength: 100 }),
                version: fc.string({ minLength: 1, maxLength: 20 }),
                type: fc.constantFrom(
                  SkillDependencyType.SKILL,
                  SkillDependencyType.LIBRARY,
                  SkillDependencyType.TOOL,
                  SkillDependencyType.SERVICE
                ),
                optional: fc.boolean(),
                source: fc.option(fc.string({ minLength: 0, maxLength: 200 }), { nil: undefined })
              }),
              { maxLength: 5 }
            ), { nil: undefined })
          }, { withDeletedKeys: true }),
          (layer: 1 | 2 | 3, options: Partial<SkillTemplateOptions>) => {
            // Act: Create skill template
            const skillTemplate = engine.createSkillTemplate(layer, options);

            // Assert: Verify standardized format compliance
            assertStandardizedSkillTemplate(skillTemplate, layer, options);
          }
        ),
        { numRuns: 100 }
      );
    });

    /**
     * **Feature: universal-skills-architecture, Property 1: 技能定义模板一致性**
     * **Validates: Requirements 1.1**
     * 
     * Property: Multiple skill templates created for different layers should all conform 
     * to standardized format
     */
    it('should create standardized templates for multiple layers', () => {
      fc.assert(
        fc.property(
          // Generate array of layers (1-3 elements, unique values)
          fc.shuffledSubarray([1, 2, 3] as const, { minLength: 1, maxLength: 3 }),
          // Generate base options
          fc.record({
            name: fc.option(fc.string({ minLength: 0, maxLength: 100 }), { nil: undefined }),
            author: fc.option(fc.string({ minLength: 0, maxLength: 100 }), { nil: undefined }),
            tags: fc.option(fc.array(fc.string({ minLength: 1, maxLength: 50 }), { maxLength: 5 }), { nil: undefined }),
            description: fc.option(fc.string({ minLength: 0, maxLength: 500 }), { nil: undefined })
          }, { withDeletedKeys: true }),
          (layers: readonly (1 | 2 | 3)[], baseOptions: Partial<SkillTemplateOptions>) => {
            // Act: Create multiple skill templates
            const skillTemplates = engine.createSkillTemplates(layers as (1 | 2 | 3)[], baseOptions);

            // Assert: Verify all templates conform to standardized format
            expect(skillTemplates).toHaveLength(layers.length);
            
            skillTemplates.forEach((template, index) => {
              const expectedLayer = layers[index];
              assertStandardizedSkillTemplate(template, expectedLayer, baseOptions, true);
              
              // Verify layer-specific naming convention
              if (baseOptions.name) {
                expect(template.name).toBe(`${baseOptions.name} (Layer ${expectedLayer})`);
              } else {
                expect(template.name).toBe(`Layer ${expectedLayer} Skill`);
              }
            });
          }
        ),
        { numRuns: 100 }
      );
    });
  });
});

/**
 * Helper function to assert that a skill template conforms to standardized format
 */
function assertStandardizedSkillTemplate(
  skillTemplate: SkillDefinition, 
  expectedLayer: 1 | 2 | 3, 
  options?: Partial<SkillTemplateOptions>,
  isMultipleTemplateTest: boolean = false
): void {
  // 1. Basic structure compliance
  expect(skillTemplate).toBeDefined();
  expect(typeof skillTemplate.id).toBe('string');
  expect(skillTemplate.id.length).toBeGreaterThan(0);
  expect(skillTemplate.layer).toBe(expectedLayer);
  expect(skillTemplate.version).toMatch(/^\d+\.\d+\.\d+(-[a-zA-Z0-9.-]+)?(\+[a-zA-Z0-9.-]+)?$/);

  // 2. Required fields presence
  expect(skillTemplate).toHaveProperty('name');
  expect(skillTemplate).toHaveProperty('description');
  expect(skillTemplate).toHaveProperty('invocationSpec');
  expect(skillTemplate).toHaveProperty('extensionPoints');
  expect(skillTemplate).toHaveProperty('dependencies');
  expect(skillTemplate).toHaveProperty('metadata');

  // 3. InvocationSpec standardized structure
  const invocationSpec = skillTemplate.invocationSpec;
  expect(invocationSpec).toHaveProperty('inputSchema');
  expect(invocationSpec).toHaveProperty('outputSchema');
  expect(invocationSpec).toHaveProperty('executionContext');
  expect(invocationSpec).toHaveProperty('parameters');
  expect(invocationSpec).toHaveProperty('examples');

  // 4. ExecutionContext standardized structure
  const executionContext = invocationSpec.executionContext;
  expect(executionContext).toHaveProperty('environment');
  expect(executionContext).toHaveProperty('timeout');
  expect(executionContext).toHaveProperty('resources');
  expect(executionContext).toHaveProperty('security');

  // 5. Layer-specific standardized configurations
  switch (expectedLayer) {
    case 1:
      // Layer 1: Atomic operations, no sandboxing
      expect(executionContext.security?.sandboxed).toBe(false);
      expect(skillTemplate.metadata.category).toBe(options?.category || 'atomic-operations');
      break;
    case 2:
      // Layer 2: Command tools, sandboxed with allowed commands
      expect(executionContext.security?.sandboxed).toBe(true);
      expect(executionContext.security?.allowedCommands).toBeDefined();
      expect(Array.isArray(executionContext.security?.allowedCommands)).toBe(true);
      expect(skillTemplate.metadata.category).toBe(options?.category || 'command-tools');
      break;
    case 3:
      // Layer 3: API wrappers, longer timeout, more resources
      expect(executionContext.timeout).toBe(60000);
      expect(executionContext.resources?.maxMemory).toBe(1024 * 1024 * 1024);
      expect(skillTemplate.metadata.category).toBe(options?.category || 'api-wrappers');
      break;
  }

  // 6. Metadata standardized structure
  const metadata = skillTemplate.metadata;
  expect(metadata).toHaveProperty('author');
  expect(metadata).toHaveProperty('created');
  expect(metadata).toHaveProperty('updated');
  expect(metadata).toHaveProperty('tags');
  expect(metadata).toHaveProperty('category');
  expect(metadata.created).toBeInstanceOf(Date);
  expect(metadata.updated).toBeInstanceOf(Date);
  expect(Array.isArray(metadata.tags)).toBe(true);

  // 7. Extension points standardized structure
  expect(Array.isArray(skillTemplate.extensionPoints)).toBe(true);
  skillTemplate.extensionPoints.forEach(extensionPoint => {
    expect(extensionPoint).toHaveProperty('id');
    expect(extensionPoint).toHaveProperty('name');
    expect(extensionPoint).toHaveProperty('description');
    expect(extensionPoint).toHaveProperty('type');
    expect(extensionPoint).toHaveProperty('interface');
    expect(extensionPoint).toHaveProperty('required');
    expect(typeof extensionPoint.required).toBe('boolean');
  });

  // 8. Dependencies standardized structure
  expect(Array.isArray(skillTemplate.dependencies)).toBe(true);
  skillTemplate.dependencies.forEach(dependency => {
    expect(dependency).toHaveProperty('id');
    expect(dependency).toHaveProperty('name');
    expect(dependency).toHaveProperty('version');
    expect(dependency).toHaveProperty('type');
    expect(dependency).toHaveProperty('optional');
    expect(typeof dependency.optional).toBe('boolean');
  });

  // 9. Schema structure validation
  expect(invocationSpec.inputSchema).toHaveProperty('type');
  expect(invocationSpec.outputSchema).toHaveProperty('type');
  expect(invocationSpec.outputSchema.properties).toHaveProperty('result');

  // 10. Options integration verification
  if (options?.name !== undefined) {
    if (isMultipleTemplateTest) {
      // For multiple templates, name gets transformed to include layer info
      if (options.name) {
        expect(skillTemplate.name).toBe(`${options.name} (Layer ${expectedLayer})`);
      } else {
        expect(skillTemplate.name).toBe(`Layer ${expectedLayer} Skill`);
      }
    } else {
      // For single template, name should be preserved as-is
      expect(skillTemplate.name).toBe(options.name);
    }
  }
  if (options?.author !== undefined) {
    expect(metadata.author).toBe(options.author);
  }
  if (options?.tags !== undefined) {
    expect(metadata.tags).toEqual(options.tags);
  }
  if (options?.dependencies !== undefined) {
    expect(skillTemplate.dependencies).toEqual(options.dependencies);
  }
}