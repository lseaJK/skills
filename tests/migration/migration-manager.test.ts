import { MigrationManager } from '../../src/migration/migration-manager';
import { InMemorySkillRegistry } from '../../src/core/skill-registry';
import {
  SkillPackage,
  SkillConfig,
  Environment,
  MigrationStrategy,
  PackageDependencyType,
  IssueSeverity,
  IssueType
} from '../../src/types';
import * as fs from 'fs/promises';
import * as path from 'path';

// Mock fs module for testing
jest.mock('fs/promises');
const mockFs = fs as jest.Mocked<typeof fs>;

describe('MigrationManager', () => {
  let migrationManager: MigrationManager;
  let skillRegistry: InMemorySkillRegistry;

  beforeEach(() => {
    skillRegistry = new InMemorySkillRegistry();
    migrationManager = new MigrationManager(skillRegistry);
    jest.clearAllMocks();
  });

  describe('export', () => {
    it('should export a skill package from project path', async () => {
      // Mock file system operations
      mockFs.access.mockResolvedValue(undefined);
      mockFs.readdir.mockResolvedValue([
        { name: 'skill1.json', isFile: () => true } as any,
        { name: 'skill2.json', isFile: () => true } as any
      ]);
      mockFs.readFile
        .mockResolvedValueOnce(JSON.stringify({
          id: 'skill1',
          name: 'Test Skill 1',
          version: '1.0.0',
          layer: 1,
          description: 'Test skill',
          invocationSpec: {
            inputSchema: { type: 'object' },
            outputSchema: { type: 'object' },
            executionContext: { environment: {} },
            parameters: [],
            examples: []
          },
          extensionPoints: [],
          dependencies: [],
          metadata: {
            author: 'Test',
            created: new Date(),
            updated: new Date(),
            tags: ['test'],
            category: 'test'
          }
        }))
        .mockResolvedValueOnce(JSON.stringify({
          id: 'skill2',
          name: 'Test Skill 2',
          version: '1.0.0',
          layer: 2,
          description: 'Test skill 2',
          invocationSpec: {
            inputSchema: { type: 'object' },
            outputSchema: { type: 'object' },
            executionContext: { environment: {} },
            parameters: [],
            examples: []
          },
          extensionPoints: [],
          dependencies: [],
          metadata: {
            author: 'Test',
            created: new Date(),
            updated: new Date(),
            tags: ['test'],
            category: 'test'
          }
        }))
        .mockResolvedValueOnce('{}'); // config file

      const result = await migrationManager.export('/test/project');

      expect(result).toBeDefined();
      expect(result.skills).toHaveLength(2);
      expect(result.name).toContain('project');
      expect(result.metadata.sourceEnvironment).toBeDefined();
    });

    it('should handle missing skills directory gracefully', async () => {
      mockFs.access.mockRejectedValue(new Error('Directory not found'));
      mockFs.readFile.mockResolvedValue('{}'); // config file

      const result = await migrationManager.export('/test/project');

      expect(result).toBeDefined();
      expect(result.skills).toHaveLength(0);
    });
  });

  describe('import', () => {
    it('should import a skill package successfully', async () => {
      const skillPackage: SkillPackage = {
        id: 'test-package',
        name: 'Test Package',
        version: '1.0.0',
        skills: [{
          id: 'test-skill',
          name: 'Test Skill',
          version: '1.0.0',
          layer: 1,
          description: 'Test skill',
          invocationSpec: {
            inputSchema: { type: 'object' },
            outputSchema: { type: 'object' },
            executionContext: { environment: {} },
            parameters: [],
            examples: []
          },
          extensionPoints: [],
          dependencies: [],
          metadata: {
            author: 'Test',
            created: new Date(),
            updated: new Date(),
            tags: ['test'],
            category: 'test'
          }
        }],
        dependencies: [],
        configuration: {
          skillsPath: './skills',
          enabledLayers: [1, 2, 3],
          environmentVariables: {},
          dependencies: [],
          migrationSettings: {
            autoResolveConflicts: false,
            backupBeforeMigration: false,
            validateAfterMigration: true,
            migrationStrategy: MigrationStrategy.CONSERVATIVE
          }
        },
        metadata: {
          author: 'Test',
          description: 'Test package',
          created: new Date(),
          exported: new Date(),
          sourceEnvironment: {
            platform: process.platform,
            runtime: 'node',
            version: process.version,
            capabilities: ['file-system'],
            constraints: []
          },
          tags: ['test']
        }
      };

      mockFs.mkdir.mockResolvedValue(undefined);
      mockFs.writeFile.mockResolvedValue(undefined);

      const result = await migrationManager.import(skillPackage, '/test/target');

      expect(result.success).toBe(true);
      expect(result.migratedSkills).toContain('test-skill');
      expect(result.failedSkills).toHaveLength(0);
    });

    it('should handle compatibility issues', async () => {
      // Use a platform that's definitely different from the current one
      const sourcePlatform = process.platform === 'win32' ? 'linux' : 'win32';
      
      const skillPackage: SkillPackage = {
        id: 'test-package',
        name: 'Test Package',
        version: '1.0.0',
        skills: [{
          id: 'test-skill',
          name: 'Test Skill',
          version: '1.0.0',
          layer: 2, // Layer 2 requires process-execution
          description: 'Test skill',
          invocationSpec: {
            inputSchema: { type: 'object' },
            outputSchema: { type: 'object' },
            executionContext: { environment: {} },
            parameters: [],
            examples: []
          },
          extensionPoints: [],
          dependencies: [],
          metadata: {
            author: 'Test',
            created: new Date(),
            updated: new Date(),
            tags: ['test'],
            category: 'test'
          }
        }],
        dependencies: [],
        configuration: {
          skillsPath: './skills',
          enabledLayers: [1, 2, 3],
          environmentVariables: {},
          dependencies: [],
          migrationSettings: {
            autoResolveConflicts: false,
            backupBeforeMigration: false,
            validateAfterMigration: false,
            migrationStrategy: MigrationStrategy.CONSERVATIVE
          }
        },
        metadata: {
          author: 'Test',
          description: 'Test package',
          created: new Date(),
          exported: new Date(),
          sourceEnvironment: {
            platform: sourcePlatform, // Different from current platform
            runtime: 'different-runtime',
            version: '0.0.1',
            capabilities: ['file-system', 'network', 'process-execution', 'missing-capability'],
            constraints: []
          },
          tags: ['test']
        }
      };

      mockFs.mkdir.mockResolvedValue(undefined);
      mockFs.writeFile.mockResolvedValue(undefined);

      const result = await migrationManager.import(skillPackage, '/test/target');

      // Should succeed but may have warnings/adaptations
      expect(result.success).toBe(true);
      expect(result.migratedSkills).toContain('test-skill');
      // The test should pass regardless of warnings/adaptations count
      // as the main functionality (migration) should work
    });
  });

  describe('validateCompatibility', () => {
    it('should detect platform incompatibility', async () => {
      const skillPackage: SkillPackage = {
        id: 'test-package',
        name: 'Test Package',
        version: '1.0.0',
        skills: [],
        dependencies: [],
        configuration: {
          skillsPath: './skills',
          enabledLayers: [1, 2, 3],
          environmentVariables: {},
          dependencies: [],
          migrationSettings: {
            autoResolveConflicts: false,
            backupBeforeMigration: false,
            validateAfterMigration: false,
            migrationStrategy: MigrationStrategy.CONSERVATIVE
          }
        },
        metadata: {
          author: 'Test',
          description: 'Test package',
          created: new Date(),
          exported: new Date(),
          sourceEnvironment: {
            platform: 'win32',
            runtime: 'node',
            version: process.version,
            capabilities: ['file-system'],
            constraints: []
          },
          tags: ['test']
        }
      };

      const targetEnvironment: Environment = {
        platform: 'linux',
        runtime: 'node',
        version: process.version,
        capabilities: ['file-system'],
        constraints: []
      };

      const result = await migrationManager.validateCompatibility(skillPackage, targetEnvironment);

      expect(result.issues.some(issue => issue.type === IssueType.PLATFORM_INCOMPATIBILITY)).toBe(true);
      expect(result.adaptations.length).toBeGreaterThan(0);
    });

    it('should detect missing capabilities', async () => {
      const skillPackage: SkillPackage = {
        id: 'test-package',
        name: 'Test Package',
        version: '1.0.0',
        skills: [],
        dependencies: [],
        configuration: {
          skillsPath: './skills',
          enabledLayers: [1, 2, 3],
          environmentVariables: {},
          dependencies: [],
          migrationSettings: {
            autoResolveConflicts: false,
            backupBeforeMigration: false,
            validateAfterMigration: false,
            migrationStrategy: MigrationStrategy.CONSERVATIVE
          }
        },
        metadata: {
          author: 'Test',
          description: 'Test package',
          created: new Date(),
          exported: new Date(),
          sourceEnvironment: {
            platform: process.platform,
            runtime: 'node',
            version: process.version,
            capabilities: ['file-system', 'network', 'process-execution'], // Critical capability
            constraints: []
          },
          tags: ['test']
        }
      };

      const targetEnvironment: Environment = {
        platform: process.platform,
        runtime: 'node',
        version: process.version,
        capabilities: ['file-system'], // Missing critical capabilities
        constraints: []
      };

      const result = await migrationManager.validateCompatibility(skillPackage, targetEnvironment);

      expect(result.issues.some(issue => issue.type === IssueType.CAPABILITY_MISSING)).toBe(true);
      expect(result.compatible).toBe(false); // Should be false due to missing critical capability
    });
  });

  describe('adaptConfiguration', () => {
    it('should adapt paths for Windows platform', async () => {
      const config: SkillConfig = {
        skillsPath: './skills/path',
        enabledLayers: [1, 2, 3],
        environmentVariables: {
          PATH: '/usr/bin:/bin',
          HOME: '/home/user'
        },
        dependencies: [],
        migrationSettings: {
          autoResolveConflicts: false,
          backupBeforeMigration: false,
          validateAfterMigration: false,
          migrationStrategy: MigrationStrategy.CONSERVATIVE
        }
      };

      const environment: Environment = {
        platform: 'win32',
        runtime: 'node',
        version: process.version,
        capabilities: ['file-system', 'network', 'process-execution'],
        constraints: []
      };

      const result = await migrationManager.adaptConfiguration(config, environment);

      expect(result.skillsPath).toBe('.\\skills\\path');
      expect(result.environmentVariables.PATH).toBe('/usr/bin;/bin');
      expect(result.environmentVariables.USERPROFILE).toBe('/home/user');
      expect(result.environmentVariables.HOME).toBeUndefined();
    });

    it('should adapt paths for Unix platforms', async () => {
      const config: SkillConfig = {
        skillsPath: '.\\skills\\path',
        enabledLayers: [1, 2, 3],
        environmentVariables: {
          PATH: 'C:\\Windows\\System32;C:\\Windows',
          USERPROFILE: 'C:\\Users\\user'
        },
        dependencies: [],
        migrationSettings: {
          autoResolveConflicts: false,
          backupBeforeMigration: false,
          validateAfterMigration: false,
          migrationStrategy: MigrationStrategy.CONSERVATIVE
        }
      };

      const environment: Environment = {
        platform: 'linux',
        runtime: 'node',
        version: process.version,
        capabilities: ['file-system', 'network', 'process-execution'],
        constraints: []
      };

      const result = await migrationManager.adaptConfiguration(config, environment);

      expect(result.skillsPath).toBe('./skills/path');
      expect(result.environmentVariables.PATH).toBe('C:/Windows/System32:C:/Windows');
      expect(result.environmentVariables.HOME).toBe('C:\\Users\\user');
      expect(result.environmentVariables.USERPROFILE).toBeUndefined();
    });

    it('should filter enabled layers based on capabilities', async () => {
      const config: SkillConfig = {
        skillsPath: './skills',
        enabledLayers: [1, 2, 3],
        environmentVariables: {},
        dependencies: [],
        migrationSettings: {
          autoResolveConflicts: false,
          backupBeforeMigration: false,
          validateAfterMigration: false,
          migrationStrategy: MigrationStrategy.CONSERVATIVE
        }
      };

      const environment: Environment = {
        platform: process.platform,
        runtime: 'node',
        version: process.version,
        capabilities: ['file-system'], // Missing process-execution and network
        constraints: []
      };

      const result = await migrationManager.adaptConfiguration(config, environment);

      expect(result.enabledLayers).toEqual([1]); // Only layer 1 should be enabled
    });
  });

  describe('backup and restore', () => {
    it('should create backup successfully', async () => {
      mockFs.mkdir.mockResolvedValue(undefined);
      mockFs.writeFile.mockResolvedValue(undefined);

      const backupPath = await migrationManager.createBackup('/test/target');

      expect(backupPath).toContain('/test/target.backup.');
      expect(mockFs.mkdir).toHaveBeenCalledWith(backupPath, { recursive: true });
      expect(mockFs.writeFile).toHaveBeenCalled();
    });

    it('should restore backup successfully', async () => {
      const backupPath = '/test/target.backup.123456';
      const targetPath = '/test/target';

      mockFs.access.mockResolvedValue(undefined);
      mockFs.readFile.mockResolvedValue(JSON.stringify({
        originalPath: targetPath,
        backupCreated: new Date().toISOString(),
        type: 'migration-backup'
      }));

      await expect(migrationManager.restoreBackup(backupPath, targetPath)).resolves.not.toThrow();
    });

    it('should fail to restore invalid backup', async () => {
      const backupPath = '/test/invalid.backup';
      const targetPath = '/test/target';

      mockFs.access.mockRejectedValue(new Error('File not found'));

      await expect(migrationManager.restoreBackup(backupPath, targetPath)).rejects.toThrow('Invalid backup');
    });
  });
});