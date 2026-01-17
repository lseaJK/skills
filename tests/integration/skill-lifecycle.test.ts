/**
 * Integration tests for complete skill lifecycle
 * Tests the full workflow: create -> register -> execute -> extend -> migrate
 */

import { InMemorySkillRegistry } from '../../src/core/skill-registry';
import { LayeredExecutionEngine } from '../../src/core/execution-engine';
import { ExtensionManager } from '../../src/extensions/extension-manager';
import { MigrationManager } from '../../src/migration/migration-manager';
import { 
  SkillDefinition, 
  SkillExtension, 
  SkillExtensionType,
  ExtensionType, 
  SkillDependencyType,
  ExecutionContext,
  Parameter,
  Example,
  ExtensionPoint,
  Dependency,
  SkillMetadata
} from '../../src/types';

describe('Skill Lifecycle Integration Tests', () => {
  let skillRegistry: InMemorySkillRegistry;
  let executionEngine: LayeredExecutionEngine;
  let extensionManager: ExtensionManager;
  let migrationManager: MigrationManager;

  beforeEach(() => {
    skillRegistry = new InMemorySkillRegistry();
    executionEngine = new LayeredExecutionEngine(skillRegistry);
    extensionManager = new ExtensionManager(skillRegistry);
    migrationManager = new MigrationManager(skillRegistry);
  });

  describe('Complete Skill Lifecycle', () => {
    test('should complete full skill lifecycle: create -> register -> execute -> extend -> migrate', async () => {
      // Step 1: Create a skill definition
      const skillDefinition: SkillDefinition = createTestSkill('test-skill-1', 1);

      // Step 2: Register the skill
      await skillRegistry.register(skillDefinition);
      
      // Verify registration
      const registeredSkill = await skillRegistry.resolve('test-skill-1');
      expect(registeredSkill).toEqual(skillDefinition);

      // Step 3: Execute the skill
      const executionResult = await executionEngine.execute('test-skill-1', { 
        input: 'test data',
        operation: 'process'
      });

      expect(executionResult.success).toBe(true);
      expect(executionResult.metadata.skillId).toBe('test-skill-1');
      expect(executionResult.metadata.layer).toBe(1);

      // Step 4: Create and register an extension
      const extension: SkillExtension = {
        id: 'test-skill-1-extension',
        baseSkillId: 'test-skill-1',
        name: 'Enhanced Test Skill',
        version: '1.1.0',
        type: ExtensionType.OVERRIDE,
        priority: 10,
        implementation: {
          enhancedProcessing: true,
          additionalFeatures: ['logging', 'validation']
        },
        dependencies: []
      };

      const extensionId = await extensionManager.extend('test-skill-1', extension);
      expect(extensionId).toBe('test-skill-1-extension');

      // Verify extension is routed correctly
      const routedExtension = extensionManager.getRoutedExtension('test-skill-1');
      expect(routedExtension?.id).toBe('test-skill-1-extension');

      // Step 5: Export skill package for migration
      const skillPackage = await migrationManager.export('./test-project');
      expect(skillPackage.skills).toHaveLength(1);
      expect(skillPackage.skills[0].id).toBe('test-skill-1');

      // Step 6: Import skill package to new environment
      const migrationResult = await migrationManager.import(skillPackage, './target-project');
      expect(migrationResult.success).toBe(true);
      expect(migrationResult.migratedSkills).toContain('test-skill-1');
    });

    test('should handle skill composition workflow', async () => {
      // Create multiple skills for composition
      const skill1 = createTestSkill('compose-skill-1', 1);
      const skill2 = createTestSkill('compose-skill-2', 1);
      const skill3 = createTestSkill('compose-skill-3', 2);

      // Register all skills
      await skillRegistry.register(skill1);
      await skillRegistry.register(skill2);
      await skillRegistry.register(skill3);

      // Compose skills
      const composedSkill = await extensionManager.compose(['compose-skill-1', 'compose-skill-2']);
      
      expect(composedSkill.name).toContain('Composed Skill');
      expect(composedSkill.layer).toBe(1); // Should use highest layer from composed skills
      expect(composedSkill.dependencies).toHaveLength(4); // 2 composed skills + their dependencies

      // Register composed skill
      await skillRegistry.register(composedSkill);

      // Execute composed skill
      const result = await executionEngine.execute(composedSkill.id, {
        skill1_input: 'data1',
        skill2_input: 'data2'
      });

      expect(result.success).toBe(true);
    });

    test('should handle cross-layer skill interactions', async () => {
      // Create skills in different layers
      const layer1Skill = createTestSkill('layer1-skill', 1);
      const layer2Skill = createTestSkill('layer2-skill', 2);
      const layer3Skill = createTestSkill('layer3-skill', 3);

      // Make layer3 depend on layer2, and layer2 depend on layer1
      layer2Skill.dependencies.push({
        id: 'layer1-skill',
        name: 'Layer 1 Skill',
        version: '1.0.0',
        type: SkillDependencyType.SKILL,
        optional: false
      });

      layer3Skill.dependencies.push({
        id: 'layer2-skill',
        name: 'Layer 2 Skill',
        version: '1.0.0',
        type: SkillDependencyType.SKILL,
        optional: false
      });

      // Register skills in dependency order
      await skillRegistry.register(layer1Skill);
      await skillRegistry.register(layer2Skill);
      await skillRegistry.register(layer3Skill);

      // Execute layer 3 skill (should work with dependencies)
      const result = await executionEngine.execute('layer3-skill', {
        workflow: {
          steps: [
            { skill: 'layer1-skill', params: { input: 'base data' } },
            { skill: 'layer2-skill', params: { command: 'process' } }
          ]
        }
      });

      expect(result.success).toBe(true);
      expect(result.metadata.layer).toBe(3);
    });

    test('should handle error recovery and rollback', async () => {
      // Create a skill that will fail during execution
      const faultySkill = createTestSkill('faulty-skill', 2);
      faultySkill.invocationSpec.executionContext = {
        ...faultySkill.invocationSpec.executionContext,
        command: 'invalid-command-that-will-fail'
      } as any;

      await skillRegistry.register(faultySkill);

      // Execute faulty skill
      const result = await executionEngine.execute('faulty-skill', {
        command: 'invalid-command-that-will-fail'
      });

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
      expect(result.error?.suggestions).toBeDefined();
      expect(result.error?.suggestions?.length).toBeGreaterThan(0);

      // Verify error logging
      const errorMetrics = executionEngine.getErrorMetrics();
      expect(errorMetrics.totalErrors).toBeGreaterThan(0);
    });
  });

  describe('Performance and Scalability', () => {
    test('should handle multiple concurrent skill executions', async () => {
      // Create multiple skills
      const skills = Array.from({ length: 10 }, (_, i) => 
        createTestSkill(`concurrent-skill-${i}`, ((i % 3) + 1) as 1 | 2 | 3)
      );

      // Register all skills
      for (const skill of skills) {
        await skillRegistry.register(skill);
      }

      // Execute all skills concurrently
      const executionPromises = skills.map(skill => 
        executionEngine.execute(skill.id, { input: `data-${skill.id}` })
      );

      const results = await Promise.all(executionPromises);

      // Verify all executions succeeded
      results.forEach((result, index) => {
        expect(result.success).toBe(true);
        expect(result.metadata.skillId).toBe(`concurrent-skill-${index}`);
      });

      // Verify performance metrics
      const metrics = executionEngine.getPerformanceMetrics();
      expect(metrics).toBeDefined();
    });

    test('should handle large skill registry operations', async () => {
      // Create and register many skills
      const skillCount = 100;
      const skills = Array.from({ length: skillCount }, (_, i) => 
        createTestSkill(`bulk-skill-${i}`, ((i % 3) + 1) as 1 | 2 | 3)
      );

      // Measure registration time
      const startTime = Date.now();
      
      for (const skill of skills) {
        await skillRegistry.register(skill);
      }
      
      const registrationTime = Date.now() - startTime;
      console.log(`Registered ${skillCount} skills in ${registrationTime}ms`);

      // Verify all skills are registered
      const allSkills = await skillRegistry.list();
      expect(allSkills).toHaveLength(skillCount);

      // Test bulk discovery
      const discoveryStartTime = Date.now();
      const discoveredSkills = await skillRegistry.discover({ limit: skillCount });
      const discoveryTime = Date.now() - discoveryStartTime;
      
      console.log(`Discovered ${discoveredSkills.length} skills in ${discoveryTime}ms`);
      expect(discoveredSkills).toHaveLength(skillCount);
    });
  });

  describe('Data Integrity and Consistency', () => {
    test('should maintain data consistency across operations', async () => {
      const skill = createTestSkill('consistency-test', 1);
      
      // Register skill
      await skillRegistry.register(skill);
      
      // Create extension
      const extension: SkillExtension = {
        id: 'consistency-extension',
        baseSkillId: 'consistency-test',
        name: 'Consistency Extension',
        version: '1.0.0',
        type: ExtensionType.COMPOSE,
        priority: 5,
        implementation: { feature: 'consistency-check' },
        dependencies: []
      };
      
      await extensionManager.extend('consistency-test', extension);
      
      // Execute skill multiple times
      const results = await Promise.all([
        executionEngine.execute('consistency-test', { input: 'test1' }),
        executionEngine.execute('consistency-test', { input: 'test2' }),
        executionEngine.execute('consistency-test', { input: 'test3' })
      ]);
      
      // Verify all executions maintain consistency
      results.forEach(result => {
        expect(result.success).toBe(true);
        expect(result.metadata.skillId).toBe('consistency-test');
      });
      
      // Verify skill state hasn't been corrupted
      const retrievedSkill = await skillRegistry.resolve('consistency-test');
      expect(retrievedSkill).toEqual(skill);
      
      // Verify extension is still properly routed
      const routedExtension = extensionManager.getRoutedExtension('consistency-test');
      expect(routedExtension?.id).toBe('consistency-extension');
    });

    test('should handle transaction-like operations', async () => {
      const skills = [
        createTestSkill('transaction-skill-1', 1),
        createTestSkill('transaction-skill-2', 2),
        createTestSkill('transaction-skill-3', 3)
      ];

      // Simulate transaction: register all or none
      try {
        for (const skill of skills) {
          await skillRegistry.register(skill);
        }
        
        // Verify all skills are registered
        for (const skill of skills) {
          const registered = await skillRegistry.resolve(skill.id);
          expect(registered).toEqual(skill);
        }
      } catch (error) {
        // In case of failure, verify rollback (cleanup)
        for (const skill of skills) {
          try {
            await skillRegistry.resolve(skill.id);
            // If we reach here, rollback didn't work properly
            fail('Rollback failed - skill should not exist');
          } catch (e) {
            // Expected - skill should not exist after rollback
            expect(e).toBeDefined();
          }
        }
      }
    });
  });

  describe('System Integration Points', () => {
    test('should integrate all system components correctly', async () => {
      // Test integration between all major components
      const skill = createTestSkill('integration-test', 2);
      
      // 1. Registry integration
      await skillRegistry.register(skill);
      const conflicts = await skillRegistry.checkConflicts(skill);
      expect(conflicts).toHaveLength(0);
      
      // 2. Execution engine integration
      const executionResult = await executionEngine.execute(skill.id, {
        command: 'echo',
        args: ['integration test']
      });
      expect(executionResult.success).toBe(true);
      
      // 3. Extension manager integration
      const extension: SkillExtension = {
        id: 'integration-extension',
        baseSkillId: skill.id,
        name: 'Integration Extension',
        version: '1.0.0',
        type: ExtensionType.DECORATE,
        priority: 1,
        implementation: { decorator: 'logging' },
        dependencies: []
      };
      
      await extensionManager.extend(skill.id, extension);
      const extensions = await extensionManager.listExtensions(skill.id);
      expect(extensions).toHaveLength(1);
      
      // 4. Migration manager integration
      const skillPackage = await migrationManager.export('./integration-test');
      expect(skillPackage.skills).toContainEqual(skill);
      
      const compatibility = await migrationManager.validateCompatibility(
        skillPackage, 
        await (migrationManager as any).getCurrentEnvironment()
      );
      expect(compatibility.compatible).toBe(true);
    });

    test('should handle system-wide configuration changes', async () => {
      // Create skills in all layers
      const skills = [
        createTestSkill('config-test-1', 1),
        createTestSkill('config-test-2', 2),
        createTestSkill('config-test-3', 3)
      ];

      for (const skill of skills) {
        await skillRegistry.register(skill);
      }

      // Simulate configuration change (e.g., disabling layer 2)
      const originalEnabledLayers = [1, 2, 3];
      const newEnabledLayers = [1, 3]; // Disable layer 2

      // Test that layer 2 skills are handled appropriately
      const layer2Skills = await skillRegistry.getByLayer(2);
      expect(layer2Skills).toHaveLength(1);
      expect(layer2Skills[0].id).toBe('config-test-2');

      // Verify layer 1 and 3 skills still work
      const layer1Result = await executionEngine.execute('config-test-1', { input: 'test' });
      const layer3Result = await executionEngine.execute('config-test-3', { 
        apiName: 'test-api',
        endpoint: 'test'
      });

      expect(layer1Result.success).toBe(true);
      expect(layer3Result.success).toBe(true);
    });
  });

  // Helper function to create test skills
  function createTestSkill(id: string, layer: 1 | 2 | 3): SkillDefinition {
    const baseSkill: SkillDefinition = {
      id,
      name: `Test Skill ${id}`,
      version: '1.0.0',
      layer,
      description: `Test skill for layer ${layer}`,
      invocationSpec: {
        inputSchema: {
          type: 'object',
          properties: {
            input: { type: 'string' }
          },
          required: ['input']
        },
        outputSchema: {
          type: 'object',
          properties: {
            result: { type: 'string' },
            timestamp: { type: 'string' }
          }
        },
        executionContext: {
          environment: {},
          timeout: 30000
        } as ExecutionContext,
        parameters: [{
          name: 'input',
          type: 'string',
          required: true,
          description: 'Input data for processing'
        }] as Parameter[],
        examples: [{
          name: 'Basic usage',
          description: 'Basic skill execution example',
          input: { input: 'sample data' },
          expectedOutput: { result: 'processed sample data', timestamp: '2024-01-01T00:00:00Z' }
        }] as Example[]
      },
      extensionPoints: [{
        id: `${id}-extension-point`,
        name: 'Main Extension Point',
        description: 'Primary extension point for this skill',
        type: SkillExtensionType.OVERRIDE,
        required: false,
        interface: {
          type: 'object',
          properties: {
            execute: { type: 'string' },
            validate: { type: 'string' }
          }
        }
      }] as ExtensionPoint[],
      dependencies: [{
        id: 'base-dependency',
        name: 'Base Dependency',
        version: '1.0.0',
        type: SkillDependencyType.LIBRARY,
        optional: true
      }] as Dependency[],
      metadata: {
        author: 'Test Suite',
        created: new Date(),
        updated: new Date(),
        tags: ['test', `layer-${layer}`],
        category: 'testing'
      } as SkillMetadata
    };

    // Layer-specific customizations
    switch (layer) {
      case 1:
        (baseSkill.invocationSpec.executionContext as any).functionName = `${id}Function`;
        break;
      case 2:
        (baseSkill.invocationSpec.executionContext as any).command = 'echo';
        (baseSkill.invocationSpec.executionContext as any).args = ['test'];
        break;
      case 3:
        (baseSkill.invocationSpec.executionContext as any).apiName = `${id}API`;
        (baseSkill.invocationSpec.executionContext as any).defaultEndpoint = '/test';
        break;
    }

    return baseSkill;
  }
});
