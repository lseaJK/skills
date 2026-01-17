/**
 * End-to-end workflow tests
 * Tests complete user workflows from start to finish
 */

import * as fs from 'fs/promises';
import * as path from 'path';
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
  MigrationStrategy,
  IssueType,
  IssueSeverity
} from '../../src/types';

describe('End-to-End Workflow Tests', () => {
  let skillRegistry: InMemorySkillRegistry;
  let executionEngine: LayeredExecutionEngine;
  let extensionManager: ExtensionManager;
  let migrationManager: MigrationManager;
  let tempDir: string;

  beforeEach(async () => {
    skillRegistry = new InMemorySkillRegistry();
    executionEngine = new LayeredExecutionEngine(skillRegistry);
    extensionManager = new ExtensionManager(skillRegistry);
    migrationManager = new MigrationManager(skillRegistry);
    
    // Create temporary directory for testing
    tempDir = path.join(__dirname, '../../temp-test-' + Date.now());
    await fs.mkdir(tempDir, { recursive: true });
  });

  afterEach(async () => {
    // Cleanup temporary directory
    try {
      await fs.rmdir(tempDir, { recursive: true });
    } catch (error) {
      console.warn('Failed to cleanup temp directory:', error);
    }
  });

  describe('Developer Workflow: Create and Deploy Skills', () => {
    test('should complete developer workflow: design -> implement -> test -> deploy', async () => {
      // Step 1: Design - Create skill definition
      const skillDefinition: SkillDefinition = {
        id: 'file-processor',
        name: 'File Processor',
        version: '1.0.0',
        layer: 2,
        description: 'Processes files using command-line tools',
        invocationSpec: {
          inputSchema: {
            type: 'object',
            properties: {
              filePath: { type: 'string' },
              operation: { type: 'string', enum: ['count-lines', 'word-count', 'checksum'] }
            },
            required: ['filePath', 'operation']
          },
          outputSchema: {
            type: 'object',
            properties: {
              result: { type: 'string' },
              metadata: { type: 'object' }
            }
          },
          executionContext: {
            environment: { LANG: 'en_US.UTF-8' },
            timeout: 30000,
            security: {
              sandboxed: true,
              allowedCommands: ['wc', 'md5sum', 'sha256sum'],
              allowedPaths: ['/tmp', '/var/tmp']
            }
          },
          parameters: [
            {
              name: 'filePath',
              type: 'string',
              required: true,
              description: 'Path to the file to process'
            },
            {
              name: 'operation',
              type: 'string',
              required: true,
              description: 'Operation to perform on the file'
            }
          ],
          examples: [
            {
              name: 'Count lines',
              description: 'Count lines in a text file',
              input: { filePath: '/tmp/test.txt', operation: 'count-lines' },
              expectedOutput: { result: '42', metadata: { command: 'wc -l' } }
            }
          ]
        },
        extensionPoints: [
          {
            id: 'pre-processing',
            name: 'Pre-processing Hook',
            description: 'Hook for pre-processing files',
            type: SkillExtensionType.OVERRIDE,
            required: false,
            interface: {
              type: 'object',
              properties: {
                preProcess: { type: 'string' }
              }
            }
          }
        ],
        dependencies: [
          {
            id: 'file-utils',
            name: 'File Utilities',
            version: '1.0.0',
            type: SkillDependencyType.LIBRARY,
            optional: false
          }
        ],
        metadata: {
          author: 'Developer',
          created: new Date(),
          updated: new Date(),
          tags: ['file-processing', 'utilities'],
          category: 'system'
        }
      };

      // Step 2: Implement - Register skill
      await skillRegistry.register(skillDefinition);
      
      // Verify skill is registered
      const registeredSkill = await skillRegistry.resolve('file-processor');
      expect(registeredSkill.id).toBe('file-processor');

      // Step 3: Test - Execute skill with test data
      const testResult = await executionEngine.execute('file-processor', {
        filePath: '/tmp/test-file.txt',
        operation: 'count-lines'
      });

      expect(testResult.success).toBe(true);
      expect(testResult.metadata.skillId).toBe('file-processor');
      expect(testResult.metadata.layer).toBe(2);

      // Step 4: Deploy - Export for deployment
      const skillPackage = await migrationManager.export(tempDir);
      expect(skillPackage.skills).toHaveLength(1);
      expect(skillPackage.skills[0].id).toBe('file-processor');

      // Verify package can be imported elsewhere
      const importResult = await migrationManager.import(skillPackage, path.join(tempDir, 'deployment'));
      expect(importResult.success).toBe(true);
      expect(importResult.migratedSkills).toContain('file-processor');
    });

    test('should handle skill versioning and updates', async () => {
      // Create initial version
      const skillV1 = createVersionedSkill('data-transformer', '1.0.0', 1);
      await skillRegistry.register(skillV1);

      // Execute v1
      const v1Result = await executionEngine.execute('data-transformer', { input: 'test data' });
      expect(v1Result.success).toBe(true);

      // Create updated version
      const skillV2 = createVersionedSkill('data-transformer-v2', '2.0.0', 1);
      skillV2.description = 'Enhanced data transformer with new features';
      skillV2.metadata.tags.push('enhanced');
      
      await skillRegistry.register(skillV2);

      // Both versions should be available
      const allSkills = await skillRegistry.list();
      expect(allSkills).toHaveLength(2);

      // Execute v2
      const v2Result = await executionEngine.execute('data-transformer-v2', { input: 'test data' });
      expect(v2Result.success).toBe(true);
    });
  });

  describe('Team Collaboration Workflow', () => {
    test('should support team skill sharing and collaboration', async () => {
      // Developer A creates a base skill
      const baseSkill = createTeamSkill('team-base-skill', 'Developer A');
      await skillRegistry.register(baseSkill);

      // Developer B extends the skill
      const extensionB: SkillExtension = {
        id: 'team-skill-extension-b',
        baseSkillId: 'team-base-skill',
        name: 'Developer B Enhancement',
        version: '1.0.0',
        type: ExtensionType.COMPOSE,
        priority: 10,
        implementation: {
          additionalFeatures: ['logging', 'metrics'],
          author: 'Developer B'
        },
        dependencies: []
      };

      await extensionManager.extend('team-base-skill', extensionB);

      // Developer C creates another extension
      const extensionC: SkillExtension = {
        id: 'team-skill-extension-c',
        baseSkillId: 'team-base-skill',
        name: 'Developer C Enhancement',
        version: '1.0.0',
        type: ExtensionType.DECORATE,
        priority: 5,
        implementation: {
          additionalFeatures: ['caching', 'validation'],
          author: 'Developer C'
        },
        dependencies: []
      };

      await extensionManager.extend('team-base-skill', extensionC);

      // Verify both extensions are registered
      const extensions = await extensionManager.listExtensions('team-base-skill');
      expect(extensions).toHaveLength(2);

      // Verify highest priority extension is routed
      const routedExtension = extensionManager.getRoutedExtension('team-base-skill');
      expect(routedExtension?.id).toBe('team-skill-extension-b'); // Higher priority

      // Team lead exports the collaborative skill package
      const teamPackage = await migrationManager.export(tempDir);
      expect(teamPackage.skills).toHaveLength(1);
      expect(teamPackage.metadata.author).toBeDefined();
    });

    test('should handle skill conflicts in team environment', async () => {
      // Create conflicting skills from different developers
      const skillA = createTeamSkill('conflict-skill', 'Developer A');
      const skillB = createTeamSkill('conflict-skill', 'Developer B'); // Same ID, different author

      // Register first skill
      await skillRegistry.register(skillA);

      // Attempt to register conflicting skill should fail
      await expect(skillRegistry.register(skillB)).rejects.toThrow();

      // Verify original skill is still registered
      const resolvedSkill = await skillRegistry.resolve('conflict-skill');
      expect(resolvedSkill.metadata.author).toBe('Developer A');

      // Check for conflicts
      const conflicts = await skillRegistry.checkConflicts(skillB);
      expect(conflicts).toHaveLength(1);
      expect(conflicts[0]).toContain('already exists');
    });
  });

  describe('Production Deployment Workflow', () => {
    test('should handle production deployment with validation', async () => {
      // Create production-ready skills
      const productionSkills = [
        createProductionSkill('auth-service', 3),
        createProductionSkill('data-processor', 2),
        createProductionSkill('utility-functions', 1)
      ];

      // Register all skills
      for (const skill of productionSkills) {
        await skillRegistry.register(skill);
      }

      // Validate all skills before deployment
      for (const skill of productionSkills) {
        const validation = skillRegistry.validate(skill);
        expect(validation.valid).toBe(true);
        expect(validation.errors).toHaveLength(0);
      }

      // Create production package with conservative migration strategy
      const productionPackage = await migrationManager.export(tempDir);
      productionPackage.configuration.migrationSettings.migrationStrategy = MigrationStrategy.CONSERVATIVE;
      productionPackage.configuration.migrationSettings.validateAfterMigration = true;
      productionPackage.configuration.migrationSettings.backupBeforeMigration = true;

      // Deploy to production environment
      const deploymentPath = path.join(tempDir, 'production');
      const deploymentResult = await migrationManager.import(productionPackage, deploymentPath);

      expect(deploymentResult.success).toBe(true);
      expect(deploymentResult.migratedSkills).toHaveLength(3);
      expect(deploymentResult.warnings).toBeDefined();

      // Verify all skills are functional in production
      for (const skillId of deploymentResult.migratedSkills) {
        const skill = await skillRegistry.resolve(skillId);
        const testResult = await executionEngine.execute(skillId, getTestParams(skill.layer));
        expect(testResult.success).toBe(true);
      }
    });

    test('should handle rollback on deployment failure', async () => {
      // Create a skill that will cause deployment issues
      const problematicSkill = createProductionSkill('problematic-skill', 2);
      problematicSkill.dependencies.push({
        id: 'non-existent-dependency',
        name: 'Non-existent Dependency',
        version: '1.0.0',
        type: SkillDependencyType.LIBRARY,
        optional: false
      });

      await skillRegistry.register(problematicSkill);

      // Create package
      const skillPackage = await migrationManager.export(tempDir);
      
      // Attempt deployment (should handle gracefully)
      const deploymentPath = path.join(tempDir, 'failed-deployment');
      const deploymentResult = await migrationManager.import(skillPackage, deploymentPath);

      // Deployment might succeed but with warnings about missing dependencies
      if (!deploymentResult.success) {
        expect(deploymentResult.failedSkills).toHaveLength(1);
        expect(deploymentResult.failedSkills[0].reason).toContain('dependency');
      } else {
        expect(deploymentResult.warnings.length).toBeGreaterThan(0);
      }
    });
  });

  describe('Cross-Platform Migration Workflow', () => {
    test('should handle cross-platform skill migration', async () => {
      // Create platform-specific skills
      const windowsSkill = createPlatformSkill('windows-specific', 'win32');
      const linuxSkill = createPlatformSkill('linux-specific', 'linux');
      const crossPlatformSkill = createPlatformSkill('cross-platform', 'any');

      await skillRegistry.register(windowsSkill);
      await skillRegistry.register(linuxSkill);
      await skillRegistry.register(crossPlatformSkill);

      // Export package
      const skillPackage = await migrationManager.export(tempDir);
      
      // Simulate migration to different platform
      const targetEnvironment = {
        platform: 'darwin', // macOS
        runtime: 'node',
        version: '18.0.0',
        capabilities: ['file-system', 'network', 'process-execution'],
        constraints: [{
          maxMemory: 1024 * 1024 * 1024,
          maxCpu: 10000,
          maxDuration: 300000,
          maxFileSize: 100 * 1024 * 1024
        }]
      };

      // Check compatibility
      const compatibility = await migrationManager.validateCompatibility(skillPackage, targetEnvironment);
      expect(compatibility).toBeDefined();
      
      // Some skills may have compatibility issues
      const platformIssues = compatibility.issues.filter(issue => 
        issue.type === IssueType.PLATFORM_INCOMPATIBILITY
      );
      
      // Cross-platform skill should be compatible
      expect(compatibility.compatible || compatibility.issues.every(i => i.severity !== IssueSeverity.CRITICAL)).toBe(true);

      // Perform migration with adaptations
      const migrationResult = await migrationManager.import(skillPackage, path.join(tempDir, 'cross-platform'));
      
      // At least the cross-platform skill should migrate successfully
      expect(migrationResult.migratedSkills).toContain('cross-platform');
    });
  });

  describe('Performance and Scalability Workflows', () => {
    test('should handle high-volume skill operations', async () => {
      const skillCount = 100;
      const skills = Array.from({ length: skillCount }, (_, i) => 
        createPerformanceTestSkill(`perf-skill-${i}`, ((i % 3) + 1) as 1 | 2 | 3)
      );

      // Measure bulk registration performance
      const registrationStart = Date.now();
      
      const registrationPromises = skills.map(skill => skillRegistry.register(skill));
      await Promise.all(registrationPromises);
      
      const registrationTime = Date.now() - registrationStart;
      console.log(`Registered ${skillCount} skills in ${registrationTime}ms`);
      expect(registrationTime).toBeLessThan(5000); // Should complete within 5 seconds

      // Measure bulk execution performance
      const executionStart = Date.now();
      
      const executionPromises = skills.slice(0, 20).map(skill => // Test subset for execution
        executionEngine.execute(skill.id, getTestParams(skill.layer))
      );
      
      const results = await Promise.all(executionPromises);
      const executionTime = Date.now() - executionStart;
      
      console.log(`Executed 20 skills in ${executionTime}ms`);
      expect(results.every(r => r.success)).toBe(true);

      // Measure discovery performance
      const discoveryStart = Date.now();
      const discoveredSkills = await skillRegistry.discover({ limit: skillCount });
      const discoveryTime = Date.now() - discoveryStart;
      
      console.log(`Discovered ${discoveredSkills.length} skills in ${discoveryTime}ms`);
      expect(discoveredSkills).toHaveLength(skillCount);
      expect(discoveryTime).toBeLessThan(1000); // Should complete within 1 second
    });

    test('should handle concurrent operations safely', async () => {
      const concurrentOperations = 50;
      
      // Create operations that modify the registry concurrently
      const operations = Array.from({ length: concurrentOperations }, (_, i) => async () => {
        const skill = createConcurrencyTestSkill(`concurrent-skill-${i}`);
        await skillRegistry.register(skill);
        
        // Perform some operations
        await skillRegistry.resolve(skill.id);
        const validation = skillRegistry.validate(skill);
        expect(validation.valid).toBe(true);
        
        return skill.id;
      });

      // Execute all operations concurrently
      const results = await Promise.all(operations.map(op => op()));
      
      // Verify all operations completed successfully
      expect(results).toHaveLength(concurrentOperations);
      expect(new Set(results).size).toBe(concurrentOperations); // All unique

      // Verify registry state is consistent
      const allSkills = await skillRegistry.list();
      expect(allSkills).toHaveLength(concurrentOperations);
    });
  });

  // Helper functions for creating test skills
  function createVersionedSkill(id: string, version: string, layer: 1 | 2 | 3): SkillDefinition {
    return {
      id,
      name: `Versioned Skill ${id}`,
      version,
      layer,
      description: `Test skill version ${version}`,
      invocationSpec: {
        inputSchema: { type: 'object', properties: { input: { type: 'string' } } },
        outputSchema: { type: 'object', properties: { result: { type: 'string' } } },
        executionContext: { environment: {}, timeout: 30000 },
        parameters: [{ name: 'input', type: 'string', required: true, description: 'Input' }],
        examples: [{ name: 'Example', description: 'Test', input: { input: 'test' }, expectedOutput: { result: 'test' } }]
      },
      extensionPoints: [],
      dependencies: [],
      metadata: {
        author: 'Test',
        created: new Date(),
        updated: new Date(),
        tags: ['versioned', `v${version}`],
        category: 'testing'
      }
    };
  }

  function createTeamSkill(id: string, author: string): SkillDefinition {
    return {
      id,
      name: `Team Skill ${id}`,
      version: '1.0.0',
      layer: 1,
      description: `Collaborative skill by ${author}`,
      invocationSpec: {
        inputSchema: { type: 'object', properties: { input: { type: 'string' } } },
        outputSchema: { type: 'object', properties: { result: { type: 'string' } } },
        executionContext: { environment: {}, timeout: 30000 },
        parameters: [{ name: 'input', type: 'string', required: true, description: 'Input' }],
        examples: [{ name: 'Example', description: 'Test', input: { input: 'test' }, expectedOutput: { result: 'test' } }]
      },
      extensionPoints: [{
        id: 'team-extension-point',
        name: 'Team Extension Point',
        description: 'Extension point for team collaboration',
        type: SkillExtensionType.OVERRIDE,
        required: false,
        interface: {
          type: 'object',
          properties: {
            collaborate: { type: 'string' }
          }
        }
      }],
      dependencies: [],
      metadata: {
        author,
        created: new Date(),
        updated: new Date(),
        tags: ['team', 'collaborative'],
        category: 'collaboration'
      }
    };
  }

  function createProductionSkill(id: string, layer: 1 | 2 | 3): SkillDefinition {
    return {
      id,
      name: `Production Skill ${id}`,
      version: '1.0.0',
      layer,
      description: `Production-ready skill for layer ${layer}`,
      invocationSpec: {
        inputSchema: { 
          type: 'object', 
          properties: { 
            input: { type: 'string' },
            config: { type: 'object' }
          },
          required: ['input']
        },
        outputSchema: { 
          type: 'object', 
          properties: { 
            result: { type: 'string' },
            metadata: { type: 'object' }
          }
        },
        executionContext: { 
          environment: { NODE_ENV: 'production' }, 
          timeout: 60000,
          security: { sandboxed: true }
        },
        parameters: [
          { name: 'input', type: 'string', required: true, description: 'Input data' },
          { name: 'config', type: 'object', required: false, description: 'Configuration' }
        ],
        examples: [{ 
          name: 'Production Example', 
          description: 'Production usage', 
          input: { input: 'prod-data', config: {} }, 
          expectedOutput: { result: 'processed', metadata: {} } 
        }]
      },
      extensionPoints: [],
      dependencies: [{
        id: 'production-utils',
        name: 'Production Utilities',
        version: '1.0.0',
        type: SkillDependencyType.LIBRARY,
        optional: true
      }],
      metadata: {
        author: 'Production Team',
        created: new Date(),
        updated: new Date(),
        tags: ['production', 'stable', `layer-${layer}`],
        category: 'production'
      }
    };
  }

  function createPlatformSkill(id: string, platform: string): SkillDefinition {
    return {
      id,
      name: `Platform Skill ${id}`,
      version: '1.0.0',
      layer: 2,
      description: `Platform-specific skill for ${platform}`,
      invocationSpec: {
        inputSchema: { type: 'object', properties: { input: { type: 'string' } } },
        outputSchema: { type: 'object', properties: { result: { type: 'string' } } },
        executionContext: { 
          environment: { PLATFORM: platform }, 
          timeout: 30000,
          security: { 
            allowedCommands: platform === 'win32' ? ['dir', 'type'] : ['ls', 'cat'],
            sandboxed: true
          }
        },
        parameters: [{ name: 'input', type: 'string', required: true, description: 'Input' }],
        examples: [{ name: 'Example', description: 'Test', input: { input: 'test' }, expectedOutput: { result: 'test' } }]
      },
      extensionPoints: [],
      dependencies: [],
      metadata: {
        author: 'Platform Team',
        created: new Date(),
        updated: new Date(),
        tags: ['platform', platform],
        category: 'platform'
      }
    };
  }

  function createPerformanceTestSkill(id: string, layer: 1 | 2 | 3): SkillDefinition {
    return {
      id,
      name: `Performance Test Skill ${id}`,
      version: '1.0.0',
      layer,
      description: `Performance test skill for layer ${layer}`,
      invocationSpec: {
        inputSchema: { type: 'object', properties: { input: { type: 'string' } } },
        outputSchema: { type: 'object', properties: { result: { type: 'string' } } },
        executionContext: { environment: {}, timeout: 10000 }, // Shorter timeout for performance tests
        parameters: [{ name: 'input', type: 'string', required: true, description: 'Input' }],
        examples: [{ name: 'Example', description: 'Test', input: { input: 'test' }, expectedOutput: { result: 'test' } }]
      },
      extensionPoints: [],
      dependencies: [],
      metadata: {
        author: 'Performance Test',
        created: new Date(),
        updated: new Date(),
        tags: ['performance', 'test'],
        category: 'testing'
      }
    };
  }

  function createConcurrencyTestSkill(id: string): SkillDefinition {
    return {
      id,
      name: `Concurrency Test Skill ${id}`,
      version: '1.0.0',
      layer: 1,
      description: `Concurrency test skill ${id}`,
      invocationSpec: {
        inputSchema: { type: 'object', properties: { input: { type: 'string' } } },
        outputSchema: { type: 'object', properties: { result: { type: 'string' } } },
        executionContext: { environment: {}, timeout: 5000 },
        parameters: [{ name: 'input', type: 'string', required: true, description: 'Input' }],
        examples: [{ name: 'Example', description: 'Test', input: { input: 'test' }, expectedOutput: { result: 'test' } }]
      },
      extensionPoints: [],
      dependencies: [],
      metadata: {
        author: 'Concurrency Test',
        created: new Date(),
        updated: new Date(),
        tags: ['concurrency', 'test'],
        category: 'testing'
      }
    };
  }

  function getTestParams(layer: number): any {
    switch (layer) {
      case 1:
        return { input: 'test data' };
      case 2:
        return { command: 'echo', args: ['test'] };
      case 3:
        return { apiName: 'test-api', endpoint: 'test' };
      default:
        return { input: 'test' };
    }
  }
});
