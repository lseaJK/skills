import { ExtensionManager } from '../../src/extensions/extension-manager';
import { InMemorySkillRegistry } from '../../src/core/skill-registry';
import { 
  SkillDefinition, 
  SkillExtension, 
  ExtensionType, 
  ConflictType, 
  ConflictSeverity,
  ResolutionStrategy,
  SkillDependencyType 
} from '../../src/types';

describe('ExtensionManager', () => {
  let extensionManager: ExtensionManager;
  let skillRegistry: InMemorySkillRegistry;
  let baseSkill: SkillDefinition;
  let sampleExtension: SkillExtension;

  beforeEach(() => {
    skillRegistry = new InMemorySkillRegistry();
    extensionManager = new ExtensionManager(skillRegistry);

    baseSkill = {
      id: 'test-skill',
      name: 'Test Skill',
      version: '1.0.0',
      layer: 1,
      description: 'A test skill',
      invocationSpec: {
        inputSchema: { type: 'object', properties: { input: { type: 'string' } } },
        outputSchema: { type: 'object', properties: { output: { type: 'string' } } },
        executionContext: {
          environment: {},
          timeout: 30000,
          security: { sandboxed: true }
        },
        parameters: [{ name: 'input', type: 'string', description: 'Input parameter', required: true }],
        examples: []
      },
      extensionPoints: [{
        id: 'main',
        name: 'Main Extension Point',
        description: 'Main extension point',
        type: 'override' as any,
        interface: { type: 'object' },
        required: false
      }],
      dependencies: [],
      metadata: {
        author: 'Test Author',
        created: new Date(),
        updated: new Date(),
        tags: ['test'],
        category: 'testing'
      }
    };

    sampleExtension = {
      id: 'test-extension',
      baseSkillId: 'test-skill',
      name: 'Test Extension',
      version: '1.0.0',
      type: ExtensionType.OVERRIDE,
      implementation: { code: 'console.log("extended")' },
      priority: 10,
      description: 'A test extension'
    };
  });

  describe('extend', () => {
    it('should successfully extend a skill', async () => {
      await skillRegistry.register(baseSkill);
      
      const extensionId = await extensionManager.extend('test-skill', sampleExtension);
      
      expect(extensionId).toBe('test-extension');
      
      const extensions = await extensionManager.listExtensions('test-skill');
      expect(extensions).toHaveLength(1);
      expect(extensions[0].id).toBe('test-extension');
    });

    it('should validate extension before extending', async () => {
      await skillRegistry.register(baseSkill);
      
      const invalidExtension = { ...sampleExtension, id: '' };
      
      await expect(extensionManager.extend('test-skill', invalidExtension))
        .rejects.toThrow('Extension validation failed');
    });

    it('should check if base skill exists', async () => {
      await expect(extensionManager.extend('non-existent-skill', sampleExtension))
        .rejects.toThrow('Base skill not found');
    });

    it('should handle priority conflicts', async () => {
      await skillRegistry.register(baseSkill);
      
      const extension1 = { ...sampleExtension, id: 'ext1' };
      const extension2 = { ...sampleExtension, id: 'ext2', priority: 10 };
      
      await extensionManager.extend('test-skill', extension1);
      
      // Should auto-resolve conflict by disabling conflicting extensions
      const extensionId = await extensionManager.extend('test-skill', extension2);
      expect(extensionId).toBe('ext2');
    });

    it('should update extension routing', async () => {
      await skillRegistry.register(baseSkill);
      
      await extensionManager.extend('test-skill', sampleExtension);
      
      const routedExtension = extensionManager.getRoutedExtension('test-skill');
      expect(routedExtension?.id).toBe('test-extension');
    });
  });

  describe('compose', () => {
    it('should compose multiple skills', async () => {
      const skill1 = { ...baseSkill, id: 'skill1', name: 'Skill 1' };
      const skill2 = { ...baseSkill, id: 'skill2', name: 'Skill 2', layer: 2 as const };
      
      await skillRegistry.register(skill1);
      await skillRegistry.register(skill2);
      
      const composedSkill = await extensionManager.compose(['skill1', 'skill2']);
      
      expect(composedSkill.name).toContain('Skill 1 + Skill 2');
      expect(composedSkill.layer).toBe(2); // Should use highest layer
      expect(composedSkill.dependencies).toHaveLength(2);
      expect(composedSkill.metadata.tags).toContain('composed');
    });

    it('should validate composition compatibility', async () => {
      const skill1 = { ...baseSkill, id: 'skill1', layer: 1 as const };
      const skill2 = { ...baseSkill, id: 'skill2', layer: 3 as const }; // Non-adjacent layer
      
      await skillRegistry.register(skill1);
      await skillRegistry.register(skill2);
      
      await expect(extensionManager.compose(['skill1', 'skill2']))
        .rejects.toThrow('Cannot compose skills from non-adjacent layers');
    });

    it('should require at least one skill for composition', async () => {
      await expect(extensionManager.compose([]))
        .rejects.toThrow('At least one skill ID is required');
    });

    it('should handle missing skills in composition', async () => {
      await expect(extensionManager.compose(['non-existent']))
        .rejects.toThrow('Cannot compose: skill not found');
    });
  });

  describe('resolveConflicts', () => {
    it('should return no conflicts when none exist', async () => {
      const resolution = await extensionManager.resolveConflicts([]);
      
      expect(resolution.strategy).toBe(ResolutionStrategy.AUTOMATIC);
      expect(resolution.selectedExtensions).toHaveLength(0);
    });

    it('should use priority-based resolution for priority conflicts', async () => {
      const ext1 = { ...sampleExtension, id: 'ext1', priority: 5 };
      const ext2 = { ...sampleExtension, id: 'ext2', priority: 10 };
      
      const conflict = {
        type: ConflictType.PRIORITY_CONFLICT,
        extensions: [ext1, ext2],
        description: 'Priority conflict',
        severity: ConflictSeverity.MEDIUM
      };
      
      const resolution = await extensionManager.resolveConflicts([conflict]);
      
      expect(resolution.strategy).toBe(ResolutionStrategy.PRIORITY_BASED);
      expect(resolution.selectedExtensions).toContain('ext2'); // Higher priority
    });

    it('should require user choice for critical conflicts', async () => {
      const conflict = {
        type: ConflictType.INTERFACE_CONFLICT,
        extensions: [sampleExtension],
        description: 'Critical conflict',
        severity: ConflictSeverity.CRITICAL
      };
      
      const resolution = await extensionManager.resolveConflicts([conflict]);
      
      expect(resolution.strategy).toBe(ResolutionStrategy.USER_CHOICE);
    });
  });

  describe('validateExtension', () => {
    it('should validate a correct extension', () => {
      const result = extensionManager.validateExtension(sampleExtension);
      
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should detect missing required fields', () => {
      const invalidExtension = { ...sampleExtension, id: '', name: '' };
      
      const result = extensionManager.validateExtension(invalidExtension);
      
      expect(result.valid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
      expect(result.errors.some(e => e.code === 'MISSING_ID')).toBe(true);
      expect(result.errors.some(e => e.code === 'MISSING_NAME')).toBe(true);
    });

    it('should validate extension type', () => {
      const invalidExtension = { ...sampleExtension, type: 'invalid' as any };
      
      const result = extensionManager.validateExtension(invalidExtension);
      
      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.code === 'INVALID_TYPE')).toBe(true);
    });

    it('should validate priority range', () => {
      const extensionWithHighPriority = { ...sampleExtension, priority: 150 };
      
      const result = extensionManager.validateExtension(extensionWithHighPriority);
      
      expect(result.valid).toBe(true); // Still valid but with warning
      expect(result.warnings.some(w => w.code === 'PRIORITY_OUT_OF_RANGE')).toBe(true);
    });

    it('should validate version format', () => {
      const extensionWithInvalidVersion = { ...sampleExtension, version: 'invalid-version' };
      
      const result = extensionManager.validateExtension(extensionWithInvalidVersion);
      
      expect(result.valid).toBe(true); // Still valid but with warning
      expect(result.warnings.some(w => w.code === 'INVALID_VERSION_FORMAT')).toBe(true);
    });
  });

  describe('listExtensions', () => {
    it('should list extensions for a specific skill', async () => {
      await skillRegistry.register(baseSkill);
      await extensionManager.extend('test-skill', sampleExtension);
      
      const extensions = await extensionManager.listExtensions('test-skill');
      
      expect(extensions).toHaveLength(1);
      expect(extensions[0].id).toBe('test-extension');
    });

    it('should list all extensions when no skill specified', async () => {
      await skillRegistry.register(baseSkill);
      await extensionManager.extend('test-skill', sampleExtension);
      
      const allExtensions = await extensionManager.listExtensions();
      
      expect(allExtensions).toHaveLength(1);
      expect(allExtensions[0].id).toBe('test-extension');
    });

    it('should return empty array for skill with no extensions', async () => {
      const extensions = await extensionManager.listExtensions('non-existent-skill');
      
      expect(extensions).toHaveLength(0);
    });
  });

  describe('removeExtension', () => {
    it('should remove an extension', async () => {
      await skillRegistry.register(baseSkill);
      await extensionManager.extend('test-skill', sampleExtension);
      
      await extensionManager.removeExtension('test-extension');
      
      const extensions = await extensionManager.listExtensions('test-skill');
      expect(extensions).toHaveLength(0);
    });

    it('should update routing when removing routed extension', async () => {
      await skillRegistry.register(baseSkill);
      
      const ext1 = { ...sampleExtension, id: 'ext1', priority: 5 };
      const ext2 = { ...sampleExtension, id: 'ext2', priority: 10 };
      
      await extensionManager.extend('test-skill', ext1);
      await extensionManager.extend('test-skill', ext2);
      
      // ext2 should be routed (higher priority)
      expect(extensionManager.getRoutedExtension('test-skill')?.id).toBe('ext2');
      
      await extensionManager.removeExtension('ext2');
      
      // Should route to ext1 now
      expect(extensionManager.getRoutedExtension('test-skill')?.id).toBe('ext1');
    });

    it('should throw error when removing non-existent extension', async () => {
      await expect(extensionManager.removeExtension('non-existent'))
        .rejects.toThrow('Extension not found');
    });
  });

  describe('getConflicts', () => {
    it('should detect priority conflicts', async () => {
      await skillRegistry.register(baseSkill);
      
      const ext1 = { ...sampleExtension, id: 'ext1', priority: 10 };
      const ext2 = { ...sampleExtension, id: 'ext2', priority: 10 }; // Same priority and type
      
      await extensionManager.extend('test-skill', ext1);
      await extensionManager.extend('test-skill', ext2);
      
      const conflicts = await extensionManager.getConflicts();
      
      expect(conflicts.length).toBeGreaterThan(0);
      expect(conflicts.some(c => c.type === ConflictType.PRIORITY_CONFLICT)).toBe(true);
    });

    it('should detect interface conflicts', async () => {
      await skillRegistry.register(baseSkill);
      
      const ext1 = { ...sampleExtension, id: 'ext1', type: ExtensionType.OVERRIDE };
      const ext2 = { ...sampleExtension, id: 'ext2', type: ExtensionType.OVERRIDE, priority: 20 };
      
      await extensionManager.extend('test-skill', ext1);
      await extensionManager.extend('test-skill', ext2);
      
      const conflicts = await extensionManager.getConflicts();
      
      expect(conflicts.some(c => c.type === ConflictType.INTERFACE_CONFLICT)).toBe(true);
    });

    it('should return empty array when no conflicts exist', async () => {
      const conflicts = await extensionManager.getConflicts();
      
      expect(conflicts).toHaveLength(0);
    });
  });

  describe('getRoutedExtension', () => {
    it('should return the highest priority extension', async () => {
      await skillRegistry.register(baseSkill);
      
      const ext1 = { ...sampleExtension, id: 'ext1', priority: 5 };
      const ext2 = { ...sampleExtension, id: 'ext2', priority: 10 };
      
      await extensionManager.extend('test-skill', ext1);
      await extensionManager.extend('test-skill', ext2);
      
      const routedExtension = extensionManager.getRoutedExtension('test-skill');
      
      expect(routedExtension?.id).toBe('ext2');
      expect(routedExtension?.priority).toBe(10);
    });

    it('should return null for skill with no extensions', () => {
      const routedExtension = extensionManager.getRoutedExtension('non-existent-skill');
      
      expect(routedExtension).toBeNull();
    });
  });
});