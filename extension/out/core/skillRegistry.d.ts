import { SkillDefinition, SkillQuery, SkillRegistry, ValidationResult } from '../types';
/**
 * In-memory implementation of the skill registry for VS Code extension
 */
export declare class InMemorySkillRegistry implements SkillRegistry {
    private skills;
    register(skill: SkillDefinition): Promise<void>;
    discover(query: SkillQuery): Promise<SkillDefinition[]>;
    resolve(skillId: string): Promise<SkillDefinition>;
    validate(skill: SkillDefinition): ValidationResult;
    getByLayer(layer: number): Promise<SkillDefinition[]>;
    unregister(skillId: string): Promise<void>;
    update(skillId: string, skill: SkillDefinition): Promise<void>;
    list(): Promise<SkillDefinition[]>;
    search(searchTerm: string): Promise<SkillDefinition[]>;
    /**
     * Check for potential conflicts when registering a skill
     */
    checkConflicts(skill: SkillDefinition): Promise<string[]>;
    /**
     * Get skills that depend on a specific skill
     */
    getDependentSkills(skillId: string): Promise<SkillDefinition[]>;
}
//# sourceMappingURL=skillRegistry.d.ts.map