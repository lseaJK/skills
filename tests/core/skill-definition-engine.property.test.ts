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

  describe('Property 2: Skill Information Completeness', () => {
    /**
     * **Feature: universal-skills-architecture, Property 2: 技能信息完整性**
     * **Validates: Requirements 1.2, 3.2**
     * 
     * Property: For any skill definition or query, the system should ensure it contains 
     * invocation specifications, extension interfaces, and all required metadata
     */
    it('should ensure all skill definitions contain complete invocation specifications and extension interfaces', () => {
      fc.assert(
        fc.property(
          // Generate valid layer (1, 2, or 3)
          fc.constantFrom(1 as const, 2 as const, 3 as const),
          // Generate skill template options with various completeness levels
          fc.record({
            id: fc.option(fc.string({ minLength: 1, maxLength: 50 }).filter(s => /^[a-zA-Z0-9_-]+$/.test(s)), { nil: undefined }),
            name: fc.option(fc.string({ minLength: 0, maxLength: 100 }), { nil: undefined }),
            version: fc.option(fc.string().filter(v => /^\d+\.\d+\.\d+(-[a-zA-Z0-9.-]+)?(\+[a-zA-Z0-9.-]+)?$/.test(v) || v === ''), { nil: undefined }),
            description: fc.option(fc.string({ minLength: 0, maxLength: 500 }), { nil: undefined }),
            author: fc.option(fc.string({ minLength: 0, maxLength: 100 }), { nil: undefined }),
            tags: fc.option(fc.array(fc.string({ minLength: 1, maxLength: 50 }), { maxLength: 10 }), { nil: undefined }),
            category: fc.option(fc.string({ minLength: 1, maxLength: 50 }), { nil: undefined })
          }, { withDeletedKeys: true }),
          (layer: 1 | 2 | 3, options: Partial<SkillTemplateOptions>) => {
            // Act: Create skill definition
            const skillDefinition = engine.createSkillTemplate(layer, options);

            // Assert: Verify skill information completeness
            assertSkillInformationCompleteness(skillDefinition);
          }
        ),
        { numRuns: 100 }
      );
    });

    /**
     * **Feature: universal-skills-architecture, Property 2: 技能信息完整性**
     * **Validates: Requirements 1.2, 3.2**
     * 
     * Property: For any skill definition with added parameters and examples, 
     * the invocation specification should remain complete and detailed
     */
    it('should maintain complete invocation specifications when adding parameters and examples', () => {
      fc.assert(
        fc.property(
          // Generate valid layer
          fc.constantFrom(1 as const, 2 as const, 3 as const),
          // Generate parameters to add
          fc.array(
            fc.record({
              name: fc.string({ minLength: 1, maxLength: 30 }).filter(s => /^[a-zA-Z][a-zA-Z0-9_]*$/.test(s)),
              type: fc.constantFrom('string', 'number', 'boolean', 'object', 'array'),
              description: fc.string({ minLength: 1, maxLength: 200 }),
              required: fc.boolean(),
              defaultValue: fc.option(fc.oneof(
                fc.string(),
                fc.integer(),
                fc.boolean(),
                fc.constant(null)
              ), { nil: undefined })
            }),
            { minLength: 1, maxLength: 5 }
          ),
          // Generate examples to add
          fc.array(
            fc.record({
              name: fc.string({ minLength: 1, maxLength: 50 }),
              description: fc.string({ minLength: 1, maxLength: 200 }),
              input: fc.object(),
              expectedOutput: fc.object()
            }),
            { minLength: 1, maxLength: 3 }
          ),
          (layer: 1 | 2 | 3, parameters: any[], examples: any[]) => {
            // Arrange: Create base skill definition
            let skillDefinition = engine.createSkillTemplate(layer);

            // Act: Add parameters and examples
            for (const param of parameters) {
              skillDefinition = engine.addParameter(skillDefinition, param);
            }
            for (const example of examples) {
              skillDefinition = engine.addExample(skillDefinition, example);
            }

            // Assert: Verify skill information completeness is maintained
            assertSkillInformationCompleteness(skillDefinition);
            
            // Additional assertions for added content
            expect(skillDefinition.invocationSpec.parameters).toHaveLength(parameters.length);
            expect(skillDefinition.invocationSpec.examples).toHaveLength(examples.length);
            
            // Verify parameters are properly integrated into input schema
            parameters.forEach(param => {
              expect(skillDefinition.invocationSpec.inputSchema.properties).toHaveProperty(param.name);
              if (param.required) {
                expect(skillDefinition.invocationSpec.inputSchema.required).toContain(param.name);
              }
            });
          }
        ),
        { numRuns: 100 }
      );
    });

    /**
     * **Feature: universal-skills-architecture, Property 2: 技能信息完整性**
     * **Validates: Requirements 1.2, 3.2**
     * 
     * Property: For any skill definition created through the builder pattern,
     * the resulting skill should contain complete information
     */
    it('should ensure builder-created skills contain complete information', () => {
      fc.assert(
        fc.property(
          // Generate valid layer
          fc.constantFrom(1 as const, 2 as const, 3 as const),
          // Generate builder configuration
          fc.record({
            name: fc.string({ minLength: 1, maxLength: 100 }),
            description: fc.string({ minLength: 1, maxLength: 500 }),
            author: fc.string({ minLength: 1, maxLength: 100 }),
            tags: fc.array(fc.string({ minLength: 1, maxLength: 50 }), { minLength: 1, maxLength: 5 }),
            category: fc.string({ minLength: 1, maxLength: 50 }),
            timeout: fc.integer({ min: 1000, max: 300000 }),
            sandboxed: fc.boolean()
          }),
          (layer: 1 | 2 | 3, config: any) => {
            // Act: Create skill using builder pattern
            const skillDefinition = engine.createBuilder(layer)
              .withName(config.name)
              .withDescription(config.description)
              .withAuthor(config.author)
              .withTags(...config.tags)
              .withCategory(config.category)
              .withTimeout(config.timeout)
              .withSandbox(config.sandboxed)
              .build();

            // Assert: Verify skill information completeness
            assertSkillInformationCompleteness(skillDefinition);
            
            // Verify builder-specific properties
            expect(skillDefinition.name).toBe(config.name);
            expect(skillDefinition.description).toBe(config.description);
            expect(skillDefinition.metadata.author).toBe(config.author);
            expect(skillDefinition.metadata.tags).toEqual(expect.arrayContaining(config.tags));
            expect(skillDefinition.metadata.category).toBe(config.category);
            expect(skillDefinition.invocationSpec.executionContext.timeout).toBe(config.timeout);
            expect(skillDefinition.invocationSpec.executionContext.security?.sandboxed).toBe(config.sandboxed);
          }
        ),
        { numRuns: 100 }
      );
    });
  });
});

/**
 * Helper function to assert skill information completeness
 * Validates Requirements 1.2 and 3.2: invocation specifications, extension interfaces, and required metadata
 */
function assertSkillInformationCompleteness(skillDefinition: SkillDefinition): void {
  // 1. Verify invocation specification completeness (Requirement 1.2, 3.2)
  expect(skillDefinition.invocationSpec).toBeDefined();
  
  // 1.1 Input schema must be complete and detailed
  expect(skillDefinition.invocationSpec.inputSchema).toBeDefined();
  expect(skillDefinition.invocationSpec.inputSchema).toHaveProperty('type');
  expect(skillDefinition.invocationSpec.inputSchema).toHaveProperty('properties');
  expect(skillDefinition.invocationSpec.inputSchema).toHaveProperty('required');
  expect(Array.isArray(skillDefinition.invocationSpec.inputSchema.required)).toBe(true);

  // 1.2 Output schema must be complete and detailed
  expect(skillDefinition.invocationSpec.outputSchema).toBeDefined();
  expect(skillDefinition.invocationSpec.outputSchema).toHaveProperty('type');
  expect(skillDefinition.invocationSpec.outputSchema).toHaveProperty('properties');
  expect(skillDefinition.invocationSpec.outputSchema).toHaveProperty('required');
  expect(skillDefinition.invocationSpec.outputSchema.properties).toHaveProperty('result');

  // 1.3 Execution context must be complete with all necessary details
  expect(skillDefinition.invocationSpec.executionContext).toBeDefined();
  expect(skillDefinition.invocationSpec.executionContext).toHaveProperty('environment');
  expect(skillDefinition.invocationSpec.executionContext).toHaveProperty('timeout');
  expect(skillDefinition.invocationSpec.executionContext).toHaveProperty('resources');
  expect(skillDefinition.invocationSpec.executionContext).toHaveProperty('security');
  
  // 1.4 Resources specification must be complete
  const resources = skillDefinition.invocationSpec.executionContext.resources;
  expect(resources).toBeDefined();
  expect(resources).toHaveProperty('maxMemory');
  expect(resources).toHaveProperty('maxCpu');
  expect(resources).toHaveProperty('maxDuration');
  expect(resources).toHaveProperty('maxFileSize');
  expect(typeof resources!.maxMemory).toBe('number');
  expect(typeof resources!.maxCpu).toBe('number');

  // 1.5 Security context must be complete
  const security = skillDefinition.invocationSpec.executionContext.security;
  expect(security).toBeDefined();
  expect(security).toHaveProperty('sandboxed');
  expect(typeof security!.sandboxed).toBe('boolean');
  expect(security).toHaveProperty('allowedPaths');
  expect(security).toHaveProperty('allowedNetworkHosts');
  expect(security).toHaveProperty('allowedCommands');
  expect(Array.isArray(security!.allowedPaths)).toBe(true);
  expect(Array.isArray(security!.allowedNetworkHosts)).toBe(true);
  expect(Array.isArray(security!.allowedCommands)).toBe(true);

  // 1.6 Parameters array must be present (even if empty)
  expect(skillDefinition.invocationSpec.parameters).toBeDefined();
  expect(Array.isArray(skillDefinition.invocationSpec.parameters)).toBe(true);
  
  // 1.7 Each parameter must have complete information
  skillDefinition.invocationSpec.parameters.forEach((param, index) => {
    expect(param).toHaveProperty('name');
    expect(param).toHaveProperty('type');
    expect(param).toHaveProperty('description');
    expect(param).toHaveProperty('required');
    expect(typeof param.name).toBe('string');
    expect(param.name.length).toBeGreaterThan(0);
    expect(typeof param.type).toBe('string');
    expect(param.type.length).toBeGreaterThan(0);
    expect(typeof param.description).toBe('string');
    expect(param.description.length).toBeGreaterThan(0);
    expect(typeof param.required).toBe('boolean');
  });

  // 1.8 Examples array must be present (even if empty)
  expect(skillDefinition.invocationSpec.examples).toBeDefined();
  expect(Array.isArray(skillDefinition.invocationSpec.examples)).toBe(true);
  
  // 1.9 Each example must have complete information
  skillDefinition.invocationSpec.examples.forEach((example, index) => {
    expect(example).toHaveProperty('name');
    expect(example).toHaveProperty('description');
    expect(example).toHaveProperty('input');
    expect(example).toHaveProperty('expectedOutput');
    expect(typeof example.name).toBe('string');
    expect(example.name.length).toBeGreaterThan(0);
    expect(typeof example.description).toBe('string');
    expect(example.description.length).toBeGreaterThan(0);
    expect(example.input).toBeDefined();
    expect(example.expectedOutput).toBeDefined();
  });

  // 2. Verify extension interfaces completeness (Requirement 1.2)
  expect(skillDefinition.extensionPoints).toBeDefined();
  expect(Array.isArray(skillDefinition.extensionPoints)).toBe(true);
  expect(skillDefinition.extensionPoints.length).toBeGreaterThan(0); // Must have at least some extension points
  
  // 2.1 Each extension point must have complete interface information
  skillDefinition.extensionPoints.forEach((extensionPoint, index) => {
    expect(extensionPoint).toHaveProperty('id');
    expect(extensionPoint).toHaveProperty('name');
    expect(extensionPoint).toHaveProperty('description');
    expect(extensionPoint).toHaveProperty('type');
    expect(extensionPoint).toHaveProperty('interface');
    expect(extensionPoint).toHaveProperty('required');
    
    expect(typeof extensionPoint.id).toBe('string');
    expect(extensionPoint.id.length).toBeGreaterThan(0);
    expect(typeof extensionPoint.name).toBe('string');
    expect(extensionPoint.name.length).toBeGreaterThan(0);
    expect(typeof extensionPoint.description).toBe('string');
    expect(extensionPoint.description.length).toBeGreaterThan(0);
    expect(typeof extensionPoint.type).toBe('string');
    expect(['override', 'compose', 'decorate', 'hook']).toContain(extensionPoint.type);
    expect(typeof extensionPoint.required).toBe('boolean');
    
    // Interface must be a valid JSON schema object
    expect(extensionPoint.interface).toBeDefined();
    expect(typeof extensionPoint.interface).toBe('object');
    expect(extensionPoint.interface).toHaveProperty('type');
  });

  // 3. Verify required metadata completeness (Requirements 1.2, 3.2)
  expect(skillDefinition.metadata).toBeDefined();
  expect(skillDefinition.metadata).toHaveProperty('author');
  expect(skillDefinition.metadata).toHaveProperty('created');
  expect(skillDefinition.metadata).toHaveProperty('updated');
  expect(skillDefinition.metadata).toHaveProperty('tags');
  expect(skillDefinition.metadata).toHaveProperty('category');
  
  // 3.1 Metadata fields must have appropriate types
  expect(typeof skillDefinition.metadata.author).toBe('string');
  expect(skillDefinition.metadata.created).toBeInstanceOf(Date);
  expect(skillDefinition.metadata.updated).toBeInstanceOf(Date);
  expect(Array.isArray(skillDefinition.metadata.tags)).toBe(true);
  expect(typeof skillDefinition.metadata.category).toBe('string');
  expect(skillDefinition.metadata.category.length).toBeGreaterThan(0);

  // 4. Verify core skill definition fields are complete
  expect(skillDefinition).toHaveProperty('id');
  expect(skillDefinition).toHaveProperty('name');
  expect(skillDefinition).toHaveProperty('version');
  expect(skillDefinition).toHaveProperty('layer');
  expect(skillDefinition).toHaveProperty('description');
  expect(skillDefinition).toHaveProperty('dependencies');
  
  // 4.1 Core fields must have appropriate types and values
  expect(typeof skillDefinition.id).toBe('string');
  expect(skillDefinition.id.length).toBeGreaterThan(0);
  expect(typeof skillDefinition.name).toBe('string');
  expect(typeof skillDefinition.version).toBe('string');
  expect(skillDefinition.version).toMatch(/^\d+\.\d+\.\d+(-[a-zA-Z0-9.-]+)?(\+[a-zA-Z0-9.-]+)?$/);
  expect([1, 2, 3]).toContain(skillDefinition.layer);
  expect(typeof skillDefinition.description).toBe('string');
  expect(Array.isArray(skillDefinition.dependencies)).toBe(true);
  
  // 4.2 Dependencies must have complete information
  skillDefinition.dependencies.forEach((dependency, index) => {
    expect(dependency).toHaveProperty('id');
    expect(dependency).toHaveProperty('name');
    expect(dependency).toHaveProperty('version');
    expect(dependency).toHaveProperty('type');
    expect(dependency).toHaveProperty('optional');
    
    expect(typeof dependency.id).toBe('string');
    expect(dependency.id.length).toBeGreaterThan(0);
    expect(typeof dependency.name).toBe('string');
    expect(dependency.name.length).toBeGreaterThan(0);
    expect(typeof dependency.version).toBe('string');
    expect(dependency.version.length).toBeGreaterThan(0);
    expect(['skill', 'library', 'tool', 'service']).toContain(dependency.type);
    expect(typeof dependency.optional).toBe('boolean');
  });
}

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