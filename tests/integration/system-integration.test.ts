/**
 * System Integration Tests
 * Tests the integration between all system components and their interactions
 */

import { InMemorySkillRegistry } from '../../src/core/skill-registry';
import { LayeredExecutionEngine } from '../../src/core/execution-engine';
import { ExtensionManager } from '../../src/extensions/extension-manager';
import { MigrationManager } from '../../src/migration/migration-manager';
import { ErrorLoggingService } from '../../src/core/error-logging-service';
import { 
  SkillDefinition, 
  SkillExtension, 
  ExtensionType,
  SkillDependencyType,
  ExecutionResult,
  ValidationResult,
  MigrationResult,
  SkillPackage
} from '../../src/types';

describe('System Integration Tests', () => {
  let skillRegistry: InMemorySkillRegistry;
  let executionEngine: LayeredExecutionEngine;
  let extensionManager: ExtensionManager;
  let migrationManager: MigrationManager;
  let errorLoggingService: ErrorLoggingService;

  beforeEach(() => {
    errorLoggingService = new ErrorLoggingService();
    skillRegistry = new InMemorySkillRegistry();
    executionEngine = new LayeredExecutionEngine(skillRegistry, errorLoggingService);
    extensionManager = new ExtensionManager(skillRegistry);
    migrationManager = new MigrationManager(skillRegistry);
  });

  describe('Component Integration Matrix', () => {
    test('should integrate Registry -> Execution Engine', async () => {
      // Create and register skill
      const skill = createIntegrationTestSkill('registry-execution-test', 1);
      await skillRegistry.register(skill);

      // Verify execution engine can resolve and execute
      const result = await executionEngine.execute(skill.id, { input: 'test data' });
      
      expect(result.success).toBe(true);
      expect(result.metadata.skillId).toBe(skill.id);
    });

    test('should integrate Registry -> Extension Manager', async () => {
      // Register base skill
      const baseSkill = createIntegrationTestSkill('registry-extension-test', 2);
      await skillRegistry.register(baseSkill);

      // Create extension through extension manager
      const extension: SkillExtension = {
        id: 'registry-extension-test-ext',
        baseSkillId: baseSkill.id,
        name: 'Registry Extension Test',
        version: '1.0.0',
        type: ExtensionType.OVERRIDE,
        priority: 10,
        implementation: { enhanced: true },
        dependencies: []
      };

      const extensionId = await extensionManager.extend(baseSkill.id, extension);
      expect(extensionId).toBe(extension.id);

      // Verify extension manager can access registry
      const extensions = await extensionManager.listExtensions(baseSkill.id);
      expect(extensions).toHaveLength(1);
    });

    test('should integrate Registry -> Migration Manager', async () => {
      // Register skills
      const skill1 = createIntegrationTestSkill('migration-test-1', 1);
      const skill2 = createIntegrationTestSkill('migration-test-2', 3);
      
      await skillRegistry.register(skill1);
      await skillRegistry.register(skill2);

      // Export through migration manager
      const skillPackage = await migrationManager.export('./test-project');
      
      expect(skillPackage.skills).toHaveLength(2);
      expect(skillPackage.skills.map(s => s.id)).toContain(skill1.id);
      expect(skillPackage.skills.map(s => s.id)).toContain(skill2.id);
    });

    test('should integrate Execution Engine -> Extension Manager', async () => {
      // Register base skill
      const baseSkill = createIntegrationTestSkill('execution-extension-test', 1);
      await skillRegistry.register(baseSkill);

      // Create extension
      const extension: SkillExtension = {
        id: 'execution-extension-test-ext',
        baseSkillId: baseSkill.id,
        name: 'Execution Extension Test',
        version: '1.0.0',
        type: ExtensionType.DECORATE,
        priority: 5,
        implementation: { logging: true },
        dependencies: []
      };

      await extensionManager.extend(baseSkill.id, extension);

      // Execute skill - should use extension routing
      const result = await executionEngine.execute(baseSkill.id, { input: 'test' });
      expect(result.success).toBe(true);

      // Verify extension is routed correctly
      const routedExtension = extensionManager.getRoutedExtension(baseSkill.id);
      expect(routedExtension?.id).toBe(extension.id);
    });

    test('should integrate Execution Engine -> Migration Manager', async () => {
      // Create and register skill
      const skill = createIntegrationTestSkill('execution-migration-test', 2);
      await skillRegistry.register(skill);

      // Execute skill to generate metrics
      await executionEngine.execute(skill.id, { command: 'echo', args: ['test'] });

      // Export with execution history
      const skillPackage = await migrationManager.export('./test-project');
      expect(skillPackage.skills).toHaveLength(1);

      // Import and verify execution still works
      const importResult = await migrationManager.import(skillPackage, './target-project');
      expect(importResult.success).toBe(true);

      // Execute imported skill
      const postImportResult = await executionEngine.execute(skill.id, { command: 'echo', args: ['test'] });
      expect(postImportResult.success).toBe(true);
    });

    test('should integrate Extension Manager -> Migration Manager', async () => {
      // Create base skill and extension
      const baseSkill = createIntegrationTestSkill('extension-migration-test', 1);
      await skillRegistry.register(baseSkill);

      const extension: SkillExtension = {
        id: 'extension-migration-test-ext',
        baseSkillId: baseSkill.id,
        name: 'Extension Migration Test',
        version: '1.0.0',
        type: ExtensionType.COMPOSE,
        priority: 8,
        implementation: { features: ['caching', 'validation'] },
        dependencies: []
      };

      await extensionManager.extend(baseSkill.id, extension);

      // Export package with extensions
      const skillPackage = await migrationManager.export('./test-project');
      expect(skillPackage.skills).toHaveLength(1);

      // Import and verify extensions are preserved
      const importResult = await migrationManager.import(skillPackage, './target-project');
      expect(importResult.success).toBe(true);

      // Verify extension routing is maintained
      const routedExtension = extensionManager.getRoutedExtension(baseSkill.id);
      expect(routedExtension?.id).toBe(extension.id);
    });
  });

  describe('Multi-Component Workflows', () => {
    test('should handle complete skill lifecycle with all components', async () => {
      // 1. Create and register skill
      const skill = createComplexSkill('lifecycle-test', 3);
      await skillRegistry.register(skill);

      // 2. Validate skill
      const validation = skillRegistry.validate(skill);
      expect(validation.valid).toBe(true);

      // 3. Create extension
      const extension: SkillExtension = {
        id: 'lifecycle-test-ext',
        baseSkillId: skill.id,
        name: 'Lifecycle Extension',
        version: '1.0.0',
        type: ExtensionType.OVERRIDE,
        priority: 15,
        implementation: { 
          enhanced: true,
          features: ['monitoring', 'caching']
        },
        dependencies: []
      };

      await extensionManager.extend(skill.id, extension);

      // 4. Execute skill (with extension)
      const executionResult = await executionEngine.execute(skill.id, {
        apiName: 'lifecycle-api',
        endpoint: 'test',
        params: { data: 'test' }
      });

      expect(executionResult.success).toBe(true);

      // 5. Export for migration
      const skillPackage = await migrationManager.export('./lifecycle-test');
      expect(skillPackage.skills).toHaveLength(1);

      // 6. Import to new environment
      const migrationResult = await migrationManager.import(skillPackage, './lifecycle-target');
      expect(migrationResult.success).toBe(true);

      // 7. Verify post-migration functionality
      const postMigrationResult = await executionEngine.execute(skill.id, {
        apiName: 'lifecycle-api',
        endpoint: 'test',
        params: { data: 'post-migration' }
      });

      expect(postMigrationResult.success).toBe(true);
    });

    test('should handle error propagation across components', async () => {
      // Create skill with dependency issues
      const problematicSkill = createIntegrationTestSkill('error-test', 2);
      problematicSkill.dependencies.push({
        id: 'missing-dependency',
        name: 'Missing Dependency',
        version: '1.0.0',
        type: SkillDependencyType.LIBRARY,
        optional: false
      });

      await skillRegistry.register(problematicSkill);

      // Execution should handle missing dependency gracefully
      const executionResult = await executionEngine.execute(problematicSkill.id, {
        command: 'invalid-command'
      });

      expect(executionResult.success).toBe(false);
      expect(executionResult.error).toBeDefined();

      // Error should be logged
      const errorMetrics = executionEngine.getErrorMetrics();
      expect(errorMetrics.totalErrors).toBeGreaterThan(0);

      // Migration should detect compatibility issues
      const skillPackage = await migrationManager.export('./error-test');
      const currentEnv = await (migrationManager as any).getCurrentEnvironment();
      const compatibility = await migrationManager.validateCompatibility(skillPackage, currentEnv);
      
      // Should have warnings about missing dependencies
      expect(compatibility.issues.length).toBeGreaterThan(0);
    });

    test('should handle concurrent operations across components', async () => {
      const skillCount = 20;
      const skills = Array.from({ length: skillCount }, (_, i) => 
        createIntegrationTestSkill(`concurrent-test-${i}`, (i % 3) + 1)
      );

      // Concurrent registration
      const registrationPromises = skills.map(skill => skillRegistry.register(skill));
      await Promise.all(registrationPromises);

      // Concurrent extension creation
      const extensionPromises = skills.slice(0, 10).map(async (skill, i) => {
        const extension: SkillExtension = {
          id: `concurrent-ext-${i}`,
          baseSkillId: skill.id,
          name: `Concurrent Extension ${i}`,
          version: '1.0.0',
          type: ExtensionType.DECORATE,
          priority: i,
          implementation: { concurrent: true },
          dependencies: []
        };
        return extensionManager.extend(skill.id, extension);
      });

      await Promise.all(extensionPromises);

      // Concurrent execution
      const executionPromises = skills.slice(0, 15).map(skill => 
        executionEngine.execute(skill.id, getTestParams(skill.layer))
      );

      const results = await Promise.all(executionPromises);
      expect(results.every(r => r.success)).toBe(true);

      // Verify system consistency
      const allSkills = await skillRegistry.list();
      expect(allSkills).toHaveLength(skillCount);

      const allExtensions = await Promise.all(
        skills.slice(0, 10).map(skill => extensionManager.listExtensions(skill.id))
      );
      expect(allExtensions.every(exts => exts.length === 1)).toBe(true);
    });
  });

  describe('Data Flow Integration', () => {
    test('should maintain data consistency across component boundaries', async () => {
      // Create interconnected skills
      const baseSkill = createIntegrationTestSkill('data-flow-base', 1);
      const dependentSkill = createIntegrationTestSkill('data-flow-dependent', 2);
      
      dependentSkill.dependencies.push({
        id: baseSkill.id,
        name: baseSkill.name,
        version: baseSkill.version,
        type: SkillDependencyType.SKILL,
        optional: false
      });

      await skillRegistry.register(baseSkill);
      await skillRegistry.register(dependentSkill);

      // Create extensions for both
      const baseExtension: SkillExtension = {
        id: 'data-flow-base-ext',
        baseSkillId: baseSkill.id,
        name: 'Base Extension',
        version: '1.0.0',
        type: ExtensionType.COMPOSE,
        priority: 10,
        implementation: { dataProcessor: true },
        dependencies: []
      };

      const dependentExtension: SkillExtension = {
        id: 'data-flow-dependent-ext',
        baseSkillId: dependentSkill.id,
        name: 'Dependent Extension',
        version: '1.0.0',
        type: ExtensionType.OVERRIDE,
        priority: 5,
        implementation: { dependsOn: baseSkill.id },
        dependencies: [baseSkill.id]
      };

      await extensionManager.extend(baseSkill.id, baseExtension);
      await extensionManager.extend(dependentSkill.id, dependentExtension);

      // Execute dependent skill (should work with base skill)
      const result = await executionEngine.execute(dependentSkill.id, {
        command: 'process-with-dependency',
        baseSkillData: 'data from base skill'
      });

      expect(result.success).toBe(true);

      // Export and import to verify data consistency
      const skillPackage = await migrationManager.export('./data-flow-test');
      expect(skillPackage.skills).toHaveLength(2);

      const migrationResult = await migrationManager.import(skillPackage, './data-flow-target');
      expect(migrationResult.success).toBe(true);

      // Verify dependencies are maintained
      const importedDependentSkill = await skillRegistry.resolve(dependentSkill.id);
      expect(importedDependentSkill.dependencies).toHaveLength(2); // Original + base skill
    });

    test('should handle complex dependency graphs', async () => {
      // Create a complex dependency graph: A -> B -> C, A -> C
      const skillA = createIntegrationTestSkill('graph-skill-a', 1);
      const skillB = createIntegrationTestSkill('graph-skill-b', 2);
      const skillC = createIntegrationTestSkill('graph-skill-c', 3);

      // B depends on A
      skillB.dependencies.push({
        id: skillA.id,
        name: skillA.name,
        version: skillA.version,
        type: SkillDependencyType.SKILL,
        optional: false
      });

      // C depends on B
      skillC.dependencies.push({
        id: skillB.id,
        name: skillB.name,
        version: skillB.version,
        type: SkillDependencyType.SKILL,
        optional: false
      });

      // A also depends on C (creating a cycle for testing)
      skillA.dependencies.push({
        id: skillC.id,
        name: skillC.name,
        version: skillC.version,
        type: SkillDependencyType.SKILL,
        optional: true // Make it optional to avoid hard cycle
      });

      // Register in dependency order
      await skillRegistry.register(skillA);
      await skillRegistry.register(skillB);
      await skillRegistry.register(skillC);

      // Create extensions that respect dependencies
      const extensionA: SkillExtension = {
        id: 'graph-ext-a',
        baseSkillId: skillA.id,
        name: 'Graph Extension A',
        version: '1.0.0',
        type: ExtensionType.DECORATE,
        priority: 1,
        implementation: { graphNode: 'A' },
        dependencies: []
      };

      const extensionB: SkillExtension = {
        id: 'graph-ext-b',
        baseSkillId: skillB.id,
        name: 'Graph Extension B',
        version: '1.0.0',
        type: ExtensionType.COMPOSE,
        priority: 2,
        implementation: { graphNode: 'B' },
        dependencies: [skillA.id]
      };

      await extensionManager.extend(skillA.id, extensionA);
      await extensionManager.extend(skillB.id, extensionB);

      // Check for extension conflicts
      const conflicts = await extensionManager.getConflicts();
      expect(conflicts).toBeDefined();

      // Execute skills in dependency order
      const resultA = await executionEngine.execute(skillA.id, { input: 'test-a' });
      const resultB = await executionEngine.execute(skillB.id, { command: 'test-b' });
      const resultC = await executionEngine.execute(skillC.id, { apiName: 'test-c' });

      expect(resultA.success).toBe(true);
      expect(resultB.success).toBe(true);
      expect(resultC.success).toBe(true);

      // Export complex graph
      const skillPackage = await migrationManager.export('./graph-test');
      expect(skillPackage.skills).toHaveLength(3);

      // Verify dependency resolution in package
      const packageDependencies = skillPackage.dependencies;
      expect(packageDependencies.length).toBeGreaterThan(0);
    });
  });

  describe('Performance Integration', () => {
    test('should maintain performance across integrated components', async () => {
      const skillCount = 50;
      const skills = Array.from({ length: skillCount }, (_, i) => 
        createIntegrationTestSkill(`perf-integration-${i}`, (i % 3) + 1)
      );

      // Measure integrated operation performance
      const startTime = Date.now();

      // Register all skills
      for (const skill of skills) {
        await skillRegistry.register(skill);
      }

      // Create extensions for subset
      const extensionPromises = skills.slice(0, 25).map(async (skill, i) => {
        const extension: SkillExtension = {
          id: `perf-ext-${i}`,
          baseSkillId: skill.id,
          name: `Performance Extension ${i}`,
          version: '1.0.0',
          type: ExtensionType.DECORATE,
          priority: i % 10,
          implementation: { performance: true },
          dependencies: []
        };
        return extensionManager.extend(skill.id, extension);
      });

      await Promise.all(extensionPromises);

      // Execute subset of skills
      const executionPromises = skills.slice(0, 30).map(skill => 
        executionEngine.execute(skill.id, getTestParams(skill.layer))
      );

      const results = await Promise.all(executionPromises);

      const totalTime = Date.now() - startTime;
      console.log(`Integrated operations completed in ${totalTime}ms`);

      // Verify all operations succeeded
      expect(results.every(r => r.success)).toBe(true);
      expect(totalTime).toBeLessThan(10000); // Should complete within 10 seconds

      // Check system health
      const systemHealth = executionEngine.getSystemHealth();
      expect(systemHealth).toBeDefined();
    });

    test('should handle memory usage efficiently across components', async () => {
      const initialMemory = process.memoryUsage();

      // Create memory-intensive operations
      const largeSkillCount = 100;
      const skills = Array.from({ length: largeSkillCount }, (_, i) => {
        const skill = createIntegrationTestSkill(`memory-test-${i}`, (i % 3) + 1);
        // Add large metadata to test memory handling
        skill.metadata.tags = Array.from({ length: 100 }, (_, j) => `tag-${i}-${j}`);
        return skill;
      });

      // Register all skills
      for (const skill of skills) {
        await skillRegistry.register(skill);
      }

      // Create many extensions
      const extensionPromises = skills.map(async (skill, i) => {
        const extension: SkillExtension = {
          id: `memory-ext-${i}`,
          baseSkillId: skill.id,
          name: `Memory Extension ${i}`,
          version: '1.0.0',
          type: ExtensionType.DECORATE,
          priority: i % 20,
          implementation: { 
            memoryTest: true,
            largeData: Array.from({ length: 1000 }, (_, j) => `data-${i}-${j}`)
          },
          dependencies: []
        };
        return extensionManager.extend(skill.id, extension);
      });

      await Promise.all(extensionPromises);

      const finalMemory = process.memoryUsage();
      const memoryIncrease = finalMemory.heapUsed - initialMemory.heapUsed;
      
      console.log(`Memory increase: ${memoryIncrease / 1024 / 1024} MB`);
      
      // Memory increase should be reasonable (less than 100MB for this test)
      expect(memoryIncrease).toBeLessThan(100 * 1024 * 1024);

      // Verify system is still responsive
      const testResult = await executionEngine.execute(skills[0].id, getTestParams(skills[0].layer));
      expect(testResult.success).toBe(true);
    });
  });

  // Helper functions
  function createIntegrationTestSkill(id: string, layer: 1 | 2 | 3): SkillDefinition {
    return {
      id,
      name: `Integration Test Skill ${id}`,
      version: '1.0.0',
      layer,
      description: `Integration test skill for layer ${layer}`,
      invocationSpec: {
        inputSchema: {
          type: 'object',
          properties: {
            input: { type: 'string' }
          }
        },
        outputSchema: {
          type: 'object',
          properties: {
            result: { type: 'string' }
          }
        },
        executionContext: {
          environment: {},
          timeout: 30000
        },
        parameters: [{
          name: 'input',
          type: 'string',
          required: true,
          description: 'Input parameter'
        }],
        examples: [{
          name: 'Example',
          description: 'Test example',
          input: { input: 'test' },
          output: { result: 'test result' }
        }]
      },
      extensionPoints: [{
        id: `${id}-ext-point`,
        name: 'Extension Point',
        description: 'Test extension point',
        interface: {
          methods: ['execute'],
          events: []
        }
      }],
      dependencies: [{
        id: 'base-dependency',
        name: 'Base Dependency',
        version: '1.0.0',
        type: SkillDependencyType.LIBRARY,
        optional: true
      }],
      metadata: {
        author: 'Integration Test',
        created: new Date(),
        updated: new Date(),
        tags: ['integration', 'test', `layer-${layer}`],
        category: 'testing'
      }
    };
  }

  function createComplexSkill(id: string, layer: 1 | 2 | 3): SkillDefinition {
    const skill = createIntegrationTestSkill(id, layer);
    
    // Add complexity
    skill.extensionPoints.push({
      id: `${id}-complex-ext-point`,
      name: 'Complex Extension Point',
      description: 'Complex extension point with multiple interfaces',
      interface: {
        methods: ['execute', 'validate', 'transform'],
        events: ['beforeExecute', 'afterExecute', 'onError']
      }
    });

    skill.dependencies.push({
      id: 'complex-dependency',
      name: 'Complex Dependency',
      version: '2.0.0',
      type: SkillDependencyType.SERVICE,
      optional: false
    });

    skill.metadata.tags.push('complex', 'advanced');
    
    return skill;
  }

  function getTestParams(layer: number): any {
    switch (layer) {
      case 1:
        return { input: 'integration test data' };
      case 2:
        return { command: 'echo', args: ['integration test'] };
      case 3:
        return { apiName: 'integration-api', endpoint: 'test', params: { data: 'test' } };
      default:
        return { input: 'test' };
    }
  }
});