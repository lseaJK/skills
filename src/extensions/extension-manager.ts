import { 
  SkillDefinition, 
  SkillExtension, 
  ExtensionConflict, 
  Resolution, 
  ValidationResult,
  ValidationError,
  ValidationWarning,
  ValidationSeverity,
  SkillDependencyType,
  ExtensionManager as IExtensionManager
} from '../types';

/**
 * Extension manager implementation
 */
export class ExtensionManager implements IExtensionManager {
  private extensions: Map<string, SkillExtension> = new Map();
  private baseSkillExtensions: Map<string, string[]> = new Map();

  async extend(baseSkillId: string, extension: SkillExtension): Promise<string> {
    // Validate extension
    const validation = this.validateExtension(extension);
    if (!validation.valid) {
      throw new Error(`Extension validation failed: ${validation.errors.map(e => e.message).join(', ')}`);
    }

    // Check for conflicts
    const conflicts = await this.checkConflicts(baseSkillId, extension);
    if (conflicts.length > 0) {
      throw new Error(`Extension conflicts detected: ${conflicts.map(c => c.description).join(', ')}`);
    }

    // Register extension
    this.extensions.set(extension.id, extension);
    
    // Update base skill extensions mapping
    const existingExtensions = this.baseSkillExtensions.get(baseSkillId) || [];
    existingExtensions.push(extension.id);
    this.baseSkillExtensions.set(baseSkillId, existingExtensions);

    return extension.id;
  }

  async compose(skillIds: string[]): Promise<SkillDefinition> {
    if (skillIds.length === 0) {
      throw new Error('At least one skill ID is required for composition');
    }

    // For now, create a basic composed skill
    // In real implementation, this would merge skill definitions
    const composedSkill: SkillDefinition = {
      id: this.generateComposedSkillId(skillIds),
      name: `Composed Skill (${skillIds.join(', ')})`,
      version: '1.0.0',
      layer: 3, // Composed skills are typically layer 3
      description: `Composition of skills: ${skillIds.join(', ')}`,
      invocationSpec: {
        inputSchema: { type: 'object', properties: {} },
        outputSchema: { type: 'object', properties: {} },
        executionContext: {
          environment: {},
          timeout: 60000,
          security: { sandboxed: true }
        },
        parameters: [],
        examples: []
      },
      extensionPoints: [],
      dependencies: skillIds.map(id => ({
        id,
        name: id,
        version: '*',
        type: SkillDependencyType.SKILL,
        optional: false
      })),
      metadata: {
        author: 'System',
        created: new Date(),
        updated: new Date(),
        tags: ['composed'],
        category: 'composition'
      }
    };

    return composedSkill;
  }

  async resolveConflicts(conflicts: ExtensionConflict[]): Promise<Resolution> {
    // Simple conflict resolution strategy
    // In real implementation, this would be more sophisticated
    
    if (conflicts.length === 0) {
      return {
        conflictId: 'no-conflicts',
        strategy: 'automatic' as any,
        selectedExtensions: [],
        reasoning: 'No conflicts to resolve'
      };
    }

    // For now, use priority-based resolution
    const conflict = conflicts[0];
    const sortedExtensions = conflict.extensions.sort((a, b) => b.priority - a.priority);
    
    return {
      conflictId: `conflict_${Date.now()}`,
      strategy: 'priority_based' as any,
      selectedExtensions: [sortedExtensions[0].id],
      reasoning: `Selected extension with highest priority: ${sortedExtensions[0].priority}`
    };
  }

  validateExtension(extension: SkillExtension): ValidationResult {
    const errors: ValidationError[] = [];
    const warnings: ValidationWarning[] = [];

    // Basic validation
    if (!extension.id) {
      errors.push({
        code: 'MISSING_ID',
        message: 'Extension ID is required',
        severity: ValidationSeverity.ERROR
      });
    }

    if (!extension.baseSkillId) {
      errors.push({
        code: 'MISSING_BASE_SKILL_ID',
        message: 'Base skill ID is required',
        severity: ValidationSeverity.ERROR
      });
    }

    if (!extension.name) {
      errors.push({
        code: 'MISSING_NAME',
        message: 'Extension name is required',
        severity: ValidationSeverity.ERROR
      });
    }

    if (!extension.version) {
      errors.push({
        code: 'MISSING_VERSION',
        message: 'Extension version is required',
        severity: ValidationSeverity.ERROR
      });
    }

    if (typeof extension.priority !== 'number') {
      errors.push({
        code: 'INVALID_PRIORITY',
        message: 'Extension priority must be a number',
        severity: ValidationSeverity.ERROR
      });
    }

    // Type-specific validation
    if (!['override', 'compose', 'decorate'].includes(extension.type)) {
      errors.push({
        code: 'INVALID_TYPE',
        message: 'Extension type must be override, compose, or decorate',
        severity: ValidationSeverity.ERROR
      });
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings
    };
  }

  async listExtensions(baseSkillId?: string): Promise<SkillExtension[]> {
    if (baseSkillId) {
      const extensionIds = this.baseSkillExtensions.get(baseSkillId) || [];
      return extensionIds.map(id => this.extensions.get(id)!).filter(ext => ext);
    }
    
    return Array.from(this.extensions.values());
  }

  async removeExtension(extensionId: string): Promise<void> {
    const extension = this.extensions.get(extensionId);
    if (!extension) {
      throw new Error(`Extension not found: ${extensionId}`);
    }

    // Remove from extensions map
    this.extensions.delete(extensionId);

    // Remove from base skill extensions mapping
    const extensionIds = this.baseSkillExtensions.get(extension.baseSkillId) || [];
    const updatedIds = extensionIds.filter(id => id !== extensionId);
    
    if (updatedIds.length === 0) {
      this.baseSkillExtensions.delete(extension.baseSkillId);
    } else {
      this.baseSkillExtensions.set(extension.baseSkillId, updatedIds);
    }
  }

  async getConflicts(): Promise<ExtensionConflict[]> {
    const conflicts: ExtensionConflict[] = [];

    // Check for priority conflicts within each base skill
    for (const [baseSkillId, extensionIds] of this.baseSkillExtensions.entries()) {
      const extensions = extensionIds.map(id => this.extensions.get(id)!).filter(ext => ext);
      
      // Group by priority
      const priorityGroups = new Map<number, SkillExtension[]>();
      for (const extension of extensions) {
        const group = priorityGroups.get(extension.priority) || [];
        group.push(extension);
        priorityGroups.set(extension.priority, group);
      }

      // Check for conflicts in same priority groups
      for (const [priority, group] of priorityGroups.entries()) {
        if (group.length > 1) {
          conflicts.push({
            type: 'priority_conflict' as any,
            extensions: group,
            description: `Multiple extensions with same priority ${priority} for skill ${baseSkillId}`,
            severity: 'medium' as any
          });
        }
      }
    }

    return conflicts;
  }

  private async checkConflicts(baseSkillId: string, newExtension: SkillExtension): Promise<ExtensionConflict[]> {
    const conflicts: ExtensionConflict[] = [];
    const existingExtensionIds = this.baseSkillExtensions.get(baseSkillId) || [];
    const existingExtensions = existingExtensionIds.map(id => this.extensions.get(id)!).filter(ext => ext);

    // Check for priority conflicts
    const conflictingExtensions = existingExtensions.filter(ext => 
      ext.priority === newExtension.priority && ext.type === newExtension.type
    );

    if (conflictingExtensions.length > 0) {
      conflicts.push({
        type: 'priority_conflict' as any,
        extensions: [...conflictingExtensions, newExtension],
        description: `Priority conflict: Multiple extensions with priority ${newExtension.priority}`,
        severity: 'medium' as any
      });
    }

    return conflicts;
  }

  private generateComposedSkillId(skillIds: string[]): string {
    const hash = skillIds.sort().join('_');
    return `composed_${hash}_${Date.now()}`;
  }
}