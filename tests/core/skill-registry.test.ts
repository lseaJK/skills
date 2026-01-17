import { InMemorySkillRegistry } from '../../src/core/skill-registry';
import { SkillDefinition } from '../../src/types';
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
});