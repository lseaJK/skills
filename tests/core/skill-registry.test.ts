import { InMemorySkillRegistry } from '../../src/core/skill-registry';
import { SkillDefinition, SkillDependencyType } from '../../src/types';
import { testUtils } from '../setup';

describe('InMemorySkillRegistry', () => {
  let registry: InMemorySkillRegistry;
  let mockSkill: SkillDefinition;

  beforeEach(() => {
    registry = new InMemorySkillRegistry();
    mockSkill = testUtils.createMockSkillDefinition();
  });

  describe('register', () => {
    it('should register a valid skill', async () => {
      await expect(registry.register(mockSkill)).resolves.not.toThrow();
    });

    it('should throw error for invalid skill', async () => {
      const invalidSkill = { ...mockSkill, id: '' };
      await expect(registry.register(invalidSkill)).rejects.toThrow('Skill validation failed');
    });

    it('should throw error for duplicate skill ID', async () => {
      await registry.register(mockSkill);
      const duplicateSkill = { ...mockSkill };
      await expect(registry.register(duplicateSkill)).rejects.toThrow('already exists');
    });

    it('should throw error for duplicate skill name in same layer', async () => {
      await registry.register(mockSkill);
      const duplicateNameSkill = { 
        ...testUtils.createMockSkillDefinition({ 
          id: 'different-id',
          name: mockSkill.name,
          layer: mockSkill.layer
        })
      };
      await expect(registry.register(duplicateNameSkill)).rejects.toThrow('already exists in layer');
    });

    it('should allow same name in different layers', async () => {
      await registry.register(mockSkill);
      const sameNameDifferentLayer = { 
        ...testUtils.createMockSkillDefinition({ 
          id: 'different-id',
          name: mockSkill.name,
          layer: 2 as any
        })
      };
      await expect(registry.register(sameNameDifferentLayer)).resolves.not.toThrow();
    });
  });

  describe('resolve', () => {
    it('should resolve registered skill', async () => {
      await registry.register(mockSkill);
      const resolved = await registry.resolve(mockSkill.id);
      expect(resolved).toEqual(mockSkill);
    });

    it('should throw error for non-existent skill', async () => {
      await expect(registry.resolve('non-existent')).rejects.toThrow('Skill not found');
    });
  });

  describe('discover', () => {
    beforeEach(async () => {
      await registry.register(mockSkill);
      await registry.register(testUtils.createMockSkillDefinition({
        id: 'skill-2',
        name: 'Another Skill',
        layer: 2,
        metadata: { ...mockSkill.metadata, category: 'different' }
      }));
    });

    it('should discover all skills with empty query', async () => {
      const skills = await registry.discover({});
      expect(skills).toHaveLength(2);
    });

    it('should filter by layer', async () => {
      const skills = await registry.discover({ layer: 1 });
      expect(skills).toHaveLength(1);
      expect(skills[0].layer).toBe(1);
    });

    it('should filter by name', async () => {
      const skills = await registry.discover({ name: 'Test' });
      expect(skills).toHaveLength(1);
      expect(skills[0].name).toBe('Test Skill');
    });
  });

  describe('validate', () => {
    it('should validate correct skill', () => {
      const result = registry.validate(mockSkill);
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should detect missing required fields', () => {
      const invalidSkill = { ...mockSkill, name: '' };
      const result = registry.validate(invalidSkill);
      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.code === 'MISSING_NAME')).toBe(true);
    });

    it('should detect invalid layer', () => {
      const invalidSkill = { ...mockSkill, layer: 4 as any };
      const result = registry.validate(invalidSkill);
      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.code === 'INVALID_LAYER')).toBe(true);
    });
  });

  describe('getByLayer', () => {
    beforeEach(async () => {
      await registry.register(mockSkill);
      await registry.register(testUtils.createMockSkillDefinition({
        id: 'skill-2',
        layer: 2
      }));
    });

    it('should return skills for specific layer', async () => {
      const layer1Skills = await registry.getByLayer(1);
      expect(layer1Skills).toHaveLength(1);
      expect(layer1Skills[0].layer).toBe(1);

      const layer2Skills = await registry.getByLayer(2);
      expect(layer2Skills).toHaveLength(1);
      expect(layer2Skills[0].layer).toBe(2);
    });
  });

  describe('checkConflicts', () => {
    beforeEach(async () => {
      await registry.register(mockSkill);
    });

    it('should detect ID conflicts', async () => {
      const duplicateSkill = { ...mockSkill };
      const conflicts = await registry.checkConflicts(duplicateSkill);
      expect(conflicts).toContain(`Skill ID '${mockSkill.id}' already exists`);
    });

    it('should detect name conflicts in same layer', async () => {
      const sameNameSkill = testUtils.createMockSkillDefinition({
        id: 'different-id',
        name: mockSkill.name,
        layer: mockSkill.layer
      });
      const conflicts = await registry.checkConflicts(sameNameSkill);
      expect(conflicts).toContain(`Skill name '${mockSkill.name}' already exists in layer ${mockSkill.layer}`);
    });

    it('should detect missing dependencies', async () => {
      const skillWithDependency = testUtils.createMockSkillDefinition({
        id: 'skill-with-dep',
        dependencies: [{
          id: 'non-existent-skill',
          name: 'Non-existent Skill',
          version: '1.0.0',
          type: SkillDependencyType.SKILL,
          optional: false
        }]
      });
      const conflicts = await registry.checkConflicts(skillWithDependency);
      expect(conflicts).toContain(`Required skill dependency 'non-existent-skill' not found`);
    });

    it('should not report conflicts for valid skill', async () => {
      const validSkill = testUtils.createMockSkillDefinition({
        id: 'valid-skill',
        name: 'Valid Skill'
      });
      const conflicts = await registry.checkConflicts(validSkill);
      expect(conflicts).toHaveLength(0);
    });
  });

  describe('getDependentSkills', () => {
    beforeEach(async () => {
      await registry.register(mockSkill);
      await registry.register(testUtils.createMockSkillDefinition({
        id: 'dependent-skill',
        name: 'Dependent Skill',
        dependencies: [{
          id: mockSkill.id,
          name: mockSkill.name,
          version: mockSkill.version,
          type: SkillDependencyType.SKILL,
          optional: false
        }]
      }));
    });

    it('should return skills that depend on a specific skill', async () => {
      const dependents = await registry.getDependentSkills(mockSkill.id);
      expect(dependents).toHaveLength(1);
      expect(dependents[0].id).toBe('dependent-skill');
    });

    it('should return empty array for skill with no dependents', async () => {
      const dependents = await registry.getDependentSkills('non-existent-skill');
      expect(dependents).toHaveLength(0);
    });
  });
});