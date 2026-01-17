import { SkillDefinition, SkillQuery, SkillRegistry, ValidationResult, ValidationError, ValidationWarning, ValidationSeverity } from '../types';

/**
 * In-memory implementation of the skill registry
 */
export class InMemorySkillRegistry implements SkillRegistry {
  private skills: Map<string, SkillDefinition> = new Map();

  async register(skill: SkillDefinition): Promise<void> {
    // Validate skill before registration
    const validation = this.validate(skill);
    if (!validation.valid) {
      throw new Error(`Skill validation failed: ${validation.errors.map(e => e.message).join(', ')}`);
    }

    this.skills.set(skill.id, skill);
  }

  async discover(query: SkillQuery): Promise<SkillDefinition[]> {
    const allSkills = Array.from(this.skills.values());
    
    return allSkills.filter(skill => {
      if (query.name && !skill.name.toLowerCase().includes(query.name.toLowerCase())) {
        return false;
      }
      if (query.layer && skill.layer !== query.layer) {
        return false;
      }
      if (query.category && skill.metadata.category !== query.category) {
        return false;
      }
      if (query.tags && !query.tags.some(tag => skill.metadata.tags.includes(tag))) {
        return false;
      }
      if (query.author && skill.metadata.author !== query.author) {
        return false;
      }
      if (query.description && !skill.description.toLowerCase().includes(query.description.toLowerCase())) {
        return false;
      }
      return true;
    }).slice(query.offset || 0, (query.offset || 0) + (query.limit || 100));
  }

  async resolve(skillId: string): Promise<SkillDefinition> {
    const skill = this.skills.get(skillId);
    if (!skill) {
      throw new Error(`Skill not found: ${skillId}`);
    }
    return skill;
  }

  validate(skill: SkillDefinition): ValidationResult {
    const errors: ValidationError[] = [];
    const warnings: ValidationWarning[] = [];

    // Basic validation
    if (!skill.id) {
      errors.push({
        code: 'MISSING_ID',
        message: 'Skill ID is required',
        severity: ValidationSeverity.ERROR
      });
    }

    if (!skill.name) {
      errors.push({
        code: 'MISSING_NAME',
        message: 'Skill name is required',
        severity: ValidationSeverity.ERROR
      });
    }

    if (!skill.version) {
      errors.push({
        code: 'MISSING_VERSION',
        message: 'Skill version is required',
        severity: ValidationSeverity.ERROR
      });
    }

    if (![1, 2, 3].includes(skill.layer)) {
      errors.push({
        code: 'INVALID_LAYER',
        message: 'Skill layer must be 1, 2, or 3',
        severity: ValidationSeverity.ERROR
      });
    }

    if (!skill.invocationSpec) {
      errors.push({
        code: 'MISSING_INVOCATION_SPEC',
        message: 'Invocation specification is required',
        severity: ValidationSeverity.ERROR
      });
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings
    };
  }

  async getByLayer(layer: number): Promise<SkillDefinition[]> {
    return Array.from(this.skills.values()).filter(skill => skill.layer === layer);
  }

  async unregister(skillId: string): Promise<void> {
    if (!this.skills.has(skillId)) {
      throw new Error(`Skill not found: ${skillId}`);
    }
    this.skills.delete(skillId);
  }

  async update(skillId: string, skill: SkillDefinition): Promise<void> {
    if (!this.skills.has(skillId)) {
      throw new Error(`Skill not found: ${skillId}`);
    }
    
    const validation = this.validate(skill);
    if (!validation.valid) {
      throw new Error(`Skill validation failed: ${validation.errors.map(e => e.message).join(', ')}`);
    }

    this.skills.set(skillId, skill);
  }

  async list(): Promise<SkillDefinition[]> {
    return Array.from(this.skills.values());
  }

  async search(searchTerm: string): Promise<SkillDefinition[]> {
    const term = searchTerm.toLowerCase();
    return Array.from(this.skills.values()).filter(skill =>
      skill.name.toLowerCase().includes(term) ||
      skill.description.toLowerCase().includes(term) ||
      skill.metadata.tags.some(tag => tag.toLowerCase().includes(term))
    );
  }
}