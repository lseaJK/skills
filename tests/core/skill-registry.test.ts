import { InMemorySkillRegistry } from '../../src/core/skill-registry';
import { SkillDefinition, SkillDependencyType, SkillQuery } from '../../src/types';
import { testUtils } from '../setup';
import * as fc from 'fast-check';

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

  describe('Property 4: Registration Query Round-trip', () => {
    /**
     * **Feature: universal-skills-architecture, Property 4: 注册查询往返**
     * **Validates: Requirements 1.4, 1.5**
     * 
     * Property: For any valid skill, after registration, querying should be able to retrieve the same skill definition
     */
    it('should retrieve the same skill definition after registration via resolve', async () => {
      await fc.assert(
        fc.asyncProperty(
          // Generate valid skill definitions
          fc.record({
            id: fc.string({ minLength: 1, maxLength: 50 }).filter(s => /^[a-zA-Z0-9_-]+$/.test(s)),
            name: fc.string({ minLength: 1, maxLength: 100 }),
            version: fc.string().filter(v => /^\d+\.\d+\.\d+(-[a-zA-Z0-9.-]+)?(\+[a-zA-Z0-9.-]+)?$/.test(v)),
            layer: fc.constantFrom(1 as const, 2 as const, 3 as const),
            description: fc.string({ minLength: 1, maxLength: 500 }),
            author: fc.string({ minLength: 1, maxLength: 100 }),
            tags: fc.array(fc.string({ minLength: 1, maxLength: 50 }), { minLength: 1, maxLength: 10 }),
            category: fc.string({ minLength: 1, maxLength: 50 })
          }),
          async (skillData) => {
            // Create a fresh registry for each test
            const testRegistry = new InMemorySkillRegistry();
            
            // Create skill definition with generated data
            const skillDefinition = testUtils.createMockSkillDefinition({
              id: skillData.id,
              name: skillData.name,
              version: skillData.version,
              layer: skillData.layer,
              description: skillData.description,
              metadata: {
                author: skillData.author,
                created: new Date(),
                updated: new Date(),
                tags: skillData.tags,
                category: skillData.category
              }
            });

            // Act: Register the skill
            await testRegistry.register(skillDefinition);

            // Act: Retrieve the skill by ID
            const retrievedSkill = await testRegistry.resolve(skillData.id);

            // Assert: The retrieved skill should be identical to the registered skill
            expect(retrievedSkill).toEqual(skillDefinition);
            expect(retrievedSkill.id).toBe(skillDefinition.id);
            expect(retrievedSkill.name).toBe(skillDefinition.name);
            expect(retrievedSkill.version).toBe(skillDefinition.version);
            expect(retrievedSkill.layer).toBe(skillDefinition.layer);
            expect(retrievedSkill.description).toBe(skillDefinition.description);
            expect(retrievedSkill.metadata.author).toBe(skillDefinition.metadata.author);
            expect(retrievedSkill.metadata.tags).toEqual(skillDefinition.metadata.tags);
            expect(retrievedSkill.metadata.category).toBe(skillDefinition.metadata.category);
          }
        ),
        { numRuns: 100 }
      );
    });

    /**
     * **Feature: universal-skills-architecture, Property 4: 注册查询往返**
     * **Validates: Requirements 1.4, 1.5**
     * 
     * Property: For any valid skill, after registration, discovery queries should be able to find the skill
     */
    it('should find registered skills through discovery queries', async () => {
      await fc.assert(
        fc.asyncProperty(
          // Generate multiple skills with different properties
          fc.array(
            fc.record({
              id: fc.string({ minLength: 1, maxLength: 50 }).filter(s => /^[a-zA-Z0-9_-]+$/.test(s)),
              name: fc.string({ minLength: 1, maxLength: 100 }),
              version: fc.string().filter(v => /^\d+\.\d+\.\d+(-[a-zA-Z0-9.-]+)?(\+[a-zA-Z0-9.-]+)?$/.test(v)),
              layer: fc.constantFrom(1 as const, 2 as const, 3 as const),
              description: fc.string({ minLength: 1, maxLength: 500 }),
              author: fc.string({ minLength: 1, maxLength: 100 }),
              tags: fc.array(fc.string({ minLength: 1, maxLength: 50 }), { minLength: 1, maxLength: 5 }),
              category: fc.string({ minLength: 1, maxLength: 50 })
            }),
            { minLength: 1, maxLength: 5 }
          ).filter(skills => {
            // Ensure unique IDs
            const ids = skills.map(s => s.id);
            return new Set(ids).size === ids.length;
          }),
          async (skillsData) => {
            // Create a fresh registry for each test
            const testRegistry = new InMemorySkillRegistry();
            
            // Create and register all skills
            const skillDefinitions: SkillDefinition[] = [];
            for (const skillData of skillsData) {
              const skillDefinition = testUtils.createMockSkillDefinition({
                id: skillData.id,
                name: skillData.name,
                version: skillData.version,
                layer: skillData.layer,
                description: skillData.description,
                metadata: {
                  author: skillData.author,
                  created: new Date(),
                  updated: new Date(),
                  tags: skillData.tags,
                  category: skillData.category
                }
              });
              skillDefinitions.push(skillDefinition);
              await testRegistry.register(skillDefinition);
            }

            // Test various discovery queries
            for (const skillDefinition of skillDefinitions) {
              // Query by name
              const nameQuery: SkillQuery = { name: skillDefinition.name };
              const nameResults = await testRegistry.discover(nameQuery);
              expect(nameResults.some(s => s.id === skillDefinition.id)).toBe(true);

              // Query by layer
              const layerQuery: SkillQuery = { layer: skillDefinition.layer };
              const layerResults = await testRegistry.discover(layerQuery);
              expect(layerResults.some(s => s.id === skillDefinition.id)).toBe(true);

              // Query by category
              const categoryQuery: SkillQuery = { category: skillDefinition.metadata.category };
              const categoryResults = await testRegistry.discover(categoryQuery);
              expect(categoryResults.some(s => s.id === skillDefinition.id)).toBe(true);

              // Query by author
              const authorQuery: SkillQuery = { author: skillDefinition.metadata.author };
              const authorResults = await testRegistry.discover(authorQuery);
              expect(authorResults.some(s => s.id === skillDefinition.id)).toBe(true);

              // Query by tags (at least one matching tag)
              if (skillDefinition.metadata.tags.length > 0) {
                const tagQuery: SkillQuery = { tags: [skillDefinition.metadata.tags[0]] };
                const tagResults = await testRegistry.discover(tagQuery);
                expect(tagResults.some(s => s.id === skillDefinition.id)).toBe(true);
              }

              // Query by description (partial match)
              const descWords = skillDefinition.description.split(' ');
              if (descWords.length > 0 && descWords[0].length > 2) {
                const descQuery: SkillQuery = { description: descWords[0] };
                const descResults = await testRegistry.discover(descQuery);
                expect(descResults.some(s => s.id === skillDefinition.id)).toBe(true);
              }
            }

            // Test empty query returns all skills
            const allSkills = await testRegistry.discover({});
            expect(allSkills).toHaveLength(skillDefinitions.length);
            for (const skillDefinition of skillDefinitions) {
              expect(allSkills.some(s => s.id === skillDefinition.id)).toBe(true);
            }
          }
        ),
        { numRuns: 100 }
      );
    });

    /**
     * **Feature: universal-skills-architecture, Property 4: 注册查询往返**
     * **Validates: Requirements 1.4, 1.5**
     * 
     * Property: For any valid skill, after registration, getByLayer should include the skill in the correct layer
     */
    it('should include registered skills in correct layer queries', async () => {
      await fc.assert(
        fc.asyncProperty(
          // Generate skills for different layers
          fc.record({
            layer1Skills: fc.array(
              fc.record({
                id: fc.string({ minLength: 1, maxLength: 50 }).filter(s => /^[a-zA-Z0-9_-]+$/.test(s)),
                name: fc.string({ minLength: 1, maxLength: 100 })
              }),
              { minLength: 0, maxLength: 3 }
            ),
            layer2Skills: fc.array(
              fc.record({
                id: fc.string({ minLength: 1, maxLength: 50 }).filter(s => /^[a-zA-Z0-9_-]+$/.test(s)),
                name: fc.string({ minLength: 1, maxLength: 100 })
              }),
              { minLength: 0, maxLength: 3 }
            ),
            layer3Skills: fc.array(
              fc.record({
                id: fc.string({ minLength: 1, maxLength: 50 }).filter(s => /^[a-zA-Z0-9_-]+$/.test(s)),
                name: fc.string({ minLength: 1, maxLength: 100 })
              }),
              { minLength: 0, maxLength: 3 }
            )
          }).filter(data => {
            // Ensure unique IDs across all layers
            const allIds = [
              ...data.layer1Skills.map(s => s.id),
              ...data.layer2Skills.map(s => s.id),
              ...data.layer3Skills.map(s => s.id)
            ];
            return new Set(allIds).size === allIds.length;
          }),
          async (layersData) => {
            // Create a fresh registry for each test
            const testRegistry = new InMemorySkillRegistry();
            
            // Register skills for each layer
            const allSkillDefinitions: SkillDefinition[] = [];
            
            // Layer 1 skills
            for (const skillData of layersData.layer1Skills) {
              const skillDefinition = testUtils.createMockSkillDefinition({
                id: skillData.id,
                name: skillData.name,
                layer: 1
              });
              allSkillDefinitions.push(skillDefinition);
              await testRegistry.register(skillDefinition);
            }
            
            // Layer 2 skills
            for (const skillData of layersData.layer2Skills) {
              const skillDefinition = testUtils.createMockSkillDefinition({
                id: skillData.id,
                name: skillData.name,
                layer: 2
              });
              allSkillDefinitions.push(skillDefinition);
              await testRegistry.register(skillDefinition);
            }
            
            // Layer 3 skills
            for (const skillData of layersData.layer3Skills) {
              const skillDefinition = testUtils.createMockSkillDefinition({
                id: skillData.id,
                name: skillData.name,
                layer: 3
              });
              allSkillDefinitions.push(skillDefinition);
              await testRegistry.register(skillDefinition);
            }

            // Test getByLayer for each layer
            const layer1Results = await testRegistry.getByLayer(1);
            const layer2Results = await testRegistry.getByLayer(2);
            const layer3Results = await testRegistry.getByLayer(3);

            // Verify layer 1 skills
            expect(layer1Results).toHaveLength(layersData.layer1Skills.length);
            for (const skillData of layersData.layer1Skills) {
              expect(layer1Results.some(s => s.id === skillData.id && s.layer === 1)).toBe(true);
            }

            // Verify layer 2 skills
            expect(layer2Results).toHaveLength(layersData.layer2Skills.length);
            for (const skillData of layersData.layer2Skills) {
              expect(layer2Results.some(s => s.id === skillData.id && s.layer === 2)).toBe(true);
            }

            // Verify layer 3 skills
            expect(layer3Results).toHaveLength(layersData.layer3Skills.length);
            for (const skillData of layersData.layer3Skills) {
              expect(layer3Results.some(s => s.id === skillData.id && s.layer === 3)).toBe(true);
            }

            // Verify no cross-layer contamination
            expect(layer1Results.every(s => s.layer === 1)).toBe(true);
            expect(layer2Results.every(s => s.layer === 2)).toBe(true);
            expect(layer3Results.every(s => s.layer === 3)).toBe(true);
          }
        ),
        { numRuns: 100 }
      );
    });
  });
});