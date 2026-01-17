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
  ExtensionManager as IExtensionManager,
  ExtensionType,
  ConflictType,
  ConflictSeverity,
  ResolutionStrategy,
  SkillRegistry
} from '../types';

/**
 * Enhanced extension manager implementation with inheritance, composition, 
 * conflict detection, and routing capabilities
 */
export class ExtensionManager implements IExtensionManager {
  private extensions: Map<string, SkillExtension> = new Map();
  private baseSkillExtensions: Map<string, string[]> = new Map();
  private extensionRoutes: Map<string, string> = new Map(); // skillId -> extensionId mapping
  private skillRegistry?: SkillRegistry;

  constructor(skillRegistry?: SkillRegistry) {
    this.skillRegistry = skillRegistry;
  }

  async extend(baseSkillId: string, extension: SkillExtension): Promise<string> {
    // Validate extension
    const validation = this.validateExtension(extension);
    if (!validation.valid) {
      throw new Error(`Extension validation failed: ${validation.errors.map(e => e.message).join(', ')}`);
    }

    // Verify base skill exists
    if (this.skillRegistry) {
      try {
        await this.skillRegistry.resolve(baseSkillId);
      } catch (error) {
        throw new Error(`Base skill not found: ${baseSkillId}`);
      }
    }

    // Check for conflicts
    const conflicts = await this.checkConflicts(baseSkillId, extension);
    if (conflicts.length > 0) {
      // Auto-resolve conflicts if possible
      const resolution = await this.resolveConflicts(conflicts);
      if (resolution.strategy === ResolutionStrategy.DISABLE_CONFLICTING) {
        // Disable conflicting extensions
        for (const conflict of conflicts) {
          for (const conflictingExt of conflict.extensions) {
            if (conflictingExt.id !== extension.id) {
              await this.removeExtension(conflictingExt.id);
            }
          }
        }
      } else if (resolution.strategy === ResolutionStrategy.USER_CHOICE) {
        throw new Error(`Extension conflicts require user resolution: ${conflicts.map(c => c.description).join(', ')}`);
      }
    }

    // Register extension
    this.extensions.set(extension.id, extension);
    
    // Update base skill extensions mapping
    const existingExtensions = this.baseSkillExtensions.get(baseSkillId) || [];
    existingExtensions.push(extension.id);
    this.baseSkillExtensions.set(baseSkillId, existingExtensions);

    // Update routing for highest priority extension
    await this.updateExtensionRouting(baseSkillId);

    return extension.id;
  }

  async compose(skillIds: string[]): Promise<SkillDefinition> {
    if (skillIds.length === 0) {
      throw new Error('At least one skill ID is required for composition');
    }

    // Resolve all skills to compose
    const skills: SkillDefinition[] = [];
    if (this.skillRegistry) {
      for (const skillId of skillIds) {
        try {
          const skill = await this.skillRegistry.resolve(skillId);
          skills.push(skill);
        } catch (error) {
          throw new Error(`Cannot compose: skill not found: ${skillId}`);
        }
      }
    }

    // Check for composition compatibility
    this.validateCompositionCompatibility(skills);

    // Create composed skill with merged capabilities
    const composedSkill: SkillDefinition = {
      id: this.generateComposedSkillId(skillIds),
      name: `Composed Skill (${skills.map(s => s.name).join(' + ')})`,
      version: '1.0.0',
      layer: Math.max(...skills.map(s => s.layer)) as 1 | 2 | 3, // Use highest layer
      description: `Composition of skills: ${skills.map(s => s.name).join(', ')}`,
      invocationSpec: this.mergeInvocationSpecs(skills),
      extensionPoints: this.mergeExtensionPoints(skills),
      dependencies: this.mergeDependencies(skills, skillIds),
      metadata: {
        author: 'System (Composed)',
        created: new Date(),
        updated: new Date(),
        tags: ['composed', ...this.mergeUniqueTags(skills)],
        category: 'composition'
      }
    };

    return composedSkill;
  }

  async resolveConflicts(conflicts: ExtensionConflict[]): Promise<Resolution> {
    if (conflicts.length === 0) {
      return {
        conflictId: 'no-conflicts',
        strategy: ResolutionStrategy.AUTOMATIC,
        selectedExtensions: [],
        reasoning: 'No conflicts to resolve'
      };
    }

    // Analyze conflict types and determine resolution strategy
    const criticalConflicts = conflicts.filter(c => c.severity === ConflictSeverity.CRITICAL);
    const highConflicts = conflicts.filter(c => c.severity === ConflictSeverity.HIGH);

    // Critical conflicts require user intervention
    if (criticalConflicts.length > 0) {
      return {
        conflictId: `critical_conflict_${Date.now()}`,
        strategy: ResolutionStrategy.USER_CHOICE,
        selectedExtensions: [],
        reasoning: 'Critical conflicts detected - user intervention required'
      };
    }

    // High severity conflicts use priority-based resolution
    if (highConflicts.length > 0) {
      const conflict = highConflicts[0];
      const sortedExtensions = conflict.extensions.sort((a, b) => b.priority - a.priority);
      
      return {
        conflictId: `high_conflict_${Date.now()}`,
        strategy: ResolutionStrategy.PRIORITY_BASED,
        selectedExtensions: [sortedExtensions[0].id],
        reasoning: `Selected extension with highest priority: ${sortedExtensions[0].name} (priority: ${sortedExtensions[0].priority})`
      };
    }

    // Medium/Low conflicts can be auto-resolved
    const conflict = conflicts[0];
    
    // For priority conflicts, select highest priority
    if (conflict.type === ConflictType.PRIORITY_CONFLICT) {
      const sortedExtensions = conflict.extensions.sort((a, b) => b.priority - a.priority);
      return {
        conflictId: `priority_conflict_${Date.now()}`,
        strategy: ResolutionStrategy.PRIORITY_BASED,
        selectedExtensions: [sortedExtensions[0].id],
        reasoning: `Auto-resolved priority conflict by selecting highest priority extension: ${sortedExtensions[0].name}`
      };
    }

    // For interface conflicts, disable conflicting extensions
    if (conflict.type === ConflictType.INTERFACE_CONFLICT) {
      return {
        conflictId: `interface_conflict_${Date.now()}`,
        strategy: ResolutionStrategy.DISABLE_CONFLICTING,
        selectedExtensions: [conflict.extensions[0].id], // Keep first one
        reasoning: 'Auto-resolved interface conflict by disabling conflicting extensions'
      };
    }

    // Default: use priority-based resolution
    const sortedExtensions = conflict.extensions.sort((a, b) => b.priority - a.priority);
    return {
      conflictId: `default_conflict_${Date.now()}`,
      strategy: ResolutionStrategy.PRIORITY_BASED,
      selectedExtensions: [sortedExtensions[0].id],
      reasoning: `Default resolution: selected extension with highest priority`
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
    } else if (extension.priority < 0 || extension.priority > 100) {
      warnings.push({
        code: 'PRIORITY_OUT_OF_RANGE',
        message: 'Extension priority should be between 0 and 100 for best practices'
      });
    }

    // Type-specific validation
    if (!Object.values(ExtensionType).includes(extension.type)) {
      errors.push({
        code: 'INVALID_TYPE',
        message: `Extension type must be one of: ${Object.values(ExtensionType).join(', ')}`,
        severity: ValidationSeverity.ERROR
      });
    }

    // Implementation validation
    if (!extension.implementation) {
      errors.push({
        code: 'MISSING_IMPLEMENTATION',
        message: 'Extension implementation is required',
        severity: ValidationSeverity.ERROR
      });
    }

    // Version format validation
    if (extension.version && !/^\d+\.\d+\.\d+/.test(extension.version)) {
      warnings.push({
        code: 'INVALID_VERSION_FORMAT',
        message: 'Version should follow semantic versioning (e.g., 1.0.0)'
      });
    }

    // Dependency validation
    if (extension.dependencies) {
      for (const dep of extension.dependencies) {
        if (!dep || typeof dep !== 'string') {
          errors.push({
            code: 'INVALID_DEPENDENCY',
            message: 'Extension dependencies must be valid skill IDs',
            severity: ValidationSeverity.ERROR
          });
        }
      }
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
      // Remove routing if this was the routed extension
      this.extensionRoutes.delete(extension.baseSkillId);
    } else {
      this.baseSkillExtensions.set(extension.baseSkillId, updatedIds);
      // Update routing to next highest priority extension
      await this.updateExtensionRouting(extension.baseSkillId);
    }
  }

  async getConflicts(): Promise<ExtensionConflict[]> {
    const conflicts: ExtensionConflict[] = [];

    // Check for conflicts within each base skill
    for (const [baseSkillId, extensionIds] of this.baseSkillExtensions.entries()) {
      const extensions = extensionIds.map(id => this.extensions.get(id)!).filter(ext => ext);
      
      // Priority conflicts: Multiple extensions with same priority and type
      const priorityGroups = new Map<string, SkillExtension[]>();
      for (const extension of extensions) {
        const key = `${extension.priority}_${extension.type}`;
        const group = priorityGroups.get(key) || [];
        group.push(extension);
        priorityGroups.set(key, group);
      }

      for (const [key, group] of priorityGroups.entries()) {
        if (group.length > 1) {
          const [priority, type] = key.split('_');
          conflicts.push({
            type: ConflictType.PRIORITY_CONFLICT,
            extensions: group,
            description: `Multiple ${type} extensions with same priority ${priority} for skill ${baseSkillId}`,
            severity: ConflictSeverity.MEDIUM
          });
        }
      }

      // Interface conflicts: Extensions that modify the same interface points
      const interfaceConflicts = this.detectInterfaceConflicts(extensions);
      conflicts.push(...interfaceConflicts);

      // Dependency conflicts: Extensions with conflicting dependencies
      const dependencyConflicts = await this.detectDependencyConflicts(extensions);
      conflicts.push(...dependencyConflicts);

      // Version conflicts: Extensions requiring different versions of same dependency
      const versionConflicts = this.detectVersionConflicts(extensions);
      conflicts.push(...versionConflicts);
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
        type: ConflictType.PRIORITY_CONFLICT,
        extensions: [...conflictingExtensions, newExtension],
        description: `Priority conflict: Multiple ${newExtension.type} extensions with priority ${newExtension.priority}`,
        severity: ConflictSeverity.MEDIUM
      });
    }

    // Check for interface conflicts
    const interfaceConflicts = this.detectInterfaceConflicts([...existingExtensions, newExtension]);
    conflicts.push(...interfaceConflicts);

    // Check for dependency conflicts
    const dependencyConflicts = await this.detectDependencyConflicts([...existingExtensions, newExtension]);
    conflicts.push(...dependencyConflicts);

    return conflicts;
  }

  /**
   * Update extension routing to point to the highest priority extension
   */
  private async updateExtensionRouting(baseSkillId: string): Promise<void> {
    const extensionIds = this.baseSkillExtensions.get(baseSkillId) || [];
    const extensions = extensionIds.map(id => this.extensions.get(id)!).filter(ext => ext);

    if (extensions.length === 0) {
      this.extensionRoutes.delete(baseSkillId);
      return;
    }

    // Find highest priority extension
    const sortedExtensions = extensions.sort((a, b) => b.priority - a.priority);
    this.extensionRoutes.set(baseSkillId, sortedExtensions[0].id);
  }

  /**
   * Get the currently routed extension for a skill
   */
  public getRoutedExtension(baseSkillId: string): SkillExtension | null {
    const extensionId = this.extensionRoutes.get(baseSkillId);
    return extensionId ? this.extensions.get(extensionId) || null : null;
  }

  /**
   * Validate composition compatibility between skills
   */
  private validateCompositionCompatibility(skills: SkillDefinition[]): void {
    if (skills.length < 2) return;

    // Check for layer compatibility (can't compose lower layer with higher layer directly)
    const layers = skills.map(s => s.layer);
    const minLayer = Math.min(...layers);
    const maxLayer = Math.max(...layers);
    
    if (maxLayer - minLayer > 1) {
      throw new Error(`Cannot compose skills from non-adjacent layers: ${minLayer} and ${maxLayer}`);
    }

    // Check for conflicting dependencies
    const allDependencies = skills.flatMap(s => s.dependencies);
    const dependencyConflicts = this.findDependencyConflicts(allDependencies);
    
    if (dependencyConflicts.length > 0) {
      throw new Error(`Composition conflicts: ${dependencyConflicts.join(', ')}`);
    }
  }

  /**
   * Merge invocation specifications from multiple skills
   */
  private mergeInvocationSpecs(skills: SkillDefinition[]) {
    const merged = {
      inputSchema: { 
        type: 'object' as const, 
        properties: {} as any,
        required: [] as string[]
      },
      outputSchema: { 
        type: 'object' as const, 
        properties: {} as any 
      },
      executionContext: {
        environment: {} as Record<string, string>,
        timeout: Math.max(...skills.map(s => s.invocationSpec.executionContext.timeout || 30000)),
        security: { sandboxed: true }
      },
      parameters: [] as any[],
      examples: [] as any[]
    };

    // Merge input schemas
    skills.forEach((skill, index) => {
      const inputSchema = skill.invocationSpec.inputSchema;
      if (inputSchema.type === 'object' && inputSchema.properties) {
        Object.keys(inputSchema.properties).forEach(prop => {
          merged.inputSchema.properties[`skill${index}_${prop}`] = inputSchema.properties![prop];
        });
        
        if (inputSchema.required) {
          merged.inputSchema.required.push(...inputSchema.required.map(req => `skill${index}_${req}`));
        }
      }
    });

    // Merge output schemas
    skills.forEach((skill, index) => {
      const outputSchema = skill.invocationSpec.outputSchema;
      if (outputSchema.type === 'object' && outputSchema.properties) {
        Object.keys(outputSchema.properties).forEach(prop => {
          merged.outputSchema.properties[`skill${index}_${prop}`] = outputSchema.properties![prop];
        });
      }
    });

    // Merge parameters
    skills.forEach((skill, index) => {
      skill.invocationSpec.parameters.forEach(param => {
        merged.parameters.push({
          ...param,
          name: `skill${index}_${param.name}`
        });
      });
    });

    // Merge environment variables
    skills.forEach(skill => {
      Object.assign(merged.executionContext.environment, skill.invocationSpec.executionContext.environment);
    });

    return merged;
  }

  /**
   * Merge extension points from multiple skills
   */
  private mergeExtensionPoints(skills: SkillDefinition[]) {
    const merged: any[] = [];
    const seenIds = new Set<string>();

    skills.forEach((skill, index) => {
      skill.extensionPoints.forEach(point => {
        const newId = `skill${index}_${point.id}`;
        if (!seenIds.has(newId)) {
          merged.push({
            ...point,
            id: newId,
            name: `${skill.name} - ${point.name}`
          });
          seenIds.add(newId);
        }
      });
    });

    return merged;
  }

  /**
   * Merge dependencies from multiple skills
   */
  private mergeDependencies(skills: SkillDefinition[], skillIds: string[]) {
    const merged: any[] = [];
    const seenIds = new Set<string>();

    // Add the composed skills as dependencies
    skillIds.forEach(id => {
      if (!seenIds.has(id)) {
        merged.push({
          id,
          name: id,
          version: '*',
          type: SkillDependencyType.SKILL,
          optional: false
        });
        seenIds.add(id);
      }
    });

    // Add unique dependencies from all skills
    skills.forEach(skill => {
      skill.dependencies.forEach(dep => {
        if (!seenIds.has(dep.id)) {
          merged.push(dep);
          seenIds.add(dep.id);
        }
      });
    });

    return merged;
  }

  /**
   * Merge unique tags from multiple skills
   */
  private mergeUniqueTags(skills: SkillDefinition[]): string[] {
    const allTags = skills.flatMap(s => s.metadata.tags);
    return [...new Set(allTags)];
  }

  /**
   * Detect interface conflicts between extensions
   */
  private detectInterfaceConflicts(extensions: SkillExtension[]): ExtensionConflict[] {
    const conflicts: ExtensionConflict[] = [];
    
    // Group extensions by type
    const overrideExtensions = extensions.filter(ext => ext.type === ExtensionType.OVERRIDE);
    
    // Override extensions conflict if they target the same interface points
    if (overrideExtensions.length > 1) {
      // For simplicity, assume all override extensions conflict
      // In a real implementation, this would check specific interface points
      conflicts.push({
        type: ConflictType.INTERFACE_CONFLICT,
        extensions: overrideExtensions,
        description: `Multiple override extensions detected - may conflict on interface modifications`,
        severity: ConflictSeverity.HIGH
      });
    }

    return conflicts;
  }

  /**
   * Detect dependency conflicts between extensions
   */
  private async detectDependencyConflicts(extensions: SkillExtension[]): Promise<ExtensionConflict[]> {
    const conflicts: ExtensionConflict[] = [];
    
    // Check for circular dependencies
    const dependencyGraph = new Map<string, string[]>();
    
    extensions.forEach(ext => {
      dependencyGraph.set(ext.id, ext.dependencies || []);
    });

    // Simple cycle detection (in real implementation, use proper graph algorithms)
    for (const [extId, deps] of dependencyGraph.entries()) {
      for (const dep of deps) {
        const depDeps = dependencyGraph.get(dep) || [];
        if (depDeps.includes(extId)) {
          const conflictingExtensions = extensions.filter(e => e.id === extId || e.id === dep);
          conflicts.push({
            type: ConflictType.DEPENDENCY_CONFLICT,
            extensions: conflictingExtensions,
            description: `Circular dependency detected between ${extId} and ${dep}`,
            severity: ConflictSeverity.HIGH
          });
        }
      }
    }

    return conflicts;
  }

  /**
   * Detect version conflicts between extensions
   */
  private detectVersionConflicts(extensions: SkillExtension[]): ExtensionConflict[] {
    const conflicts: ExtensionConflict[] = [];
    
    // Group extensions by dependency requirements
    const dependencyVersions = new Map<string, Map<string, SkillExtension[]>>();
    
    extensions.forEach(ext => {
      if (ext.dependencies) {
        ext.dependencies.forEach(depId => {
          if (!dependencyVersions.has(depId)) {
            dependencyVersions.set(depId, new Map());
          }
          
          const versionMap = dependencyVersions.get(depId)!;
          const version = ext.version; // Simplified - in real implementation, track dependency versions
          
          if (!versionMap.has(version)) {
            versionMap.set(version, []);
          }
          versionMap.get(version)!.push(ext);
        });
      }
    });

    // Check for version conflicts
    for (const [depId, versionMap] of dependencyVersions.entries()) {
      if (versionMap.size > 1) {
        const allExtensions = Array.from(versionMap.values()).flat();
        conflicts.push({
          type: ConflictType.VERSION_CONFLICT,
          extensions: allExtensions,
          description: `Version conflict for dependency ${depId}: multiple versions required`,
          severity: ConflictSeverity.MEDIUM
        });
      }
    }

    return conflicts;
  }

  /**
   * Find dependency conflicts in a list of dependencies
   */
  private findDependencyConflicts(dependencies: any[]): string[] {
    const conflicts: string[] = [];
    const dependencyMap = new Map<string, Set<string>>();

    dependencies.forEach(dep => {
      if (!dependencyMap.has(dep.id)) {
        dependencyMap.set(dep.id, new Set());
      }
      dependencyMap.get(dep.id)!.add(dep.version);
    });

    for (const [depId, versions] of dependencyMap.entries()) {
      if (versions.size > 1) {
        conflicts.push(`${depId}: ${Array.from(versions).join(' vs ')}`);
      }
    }

    return conflicts;
  }

  private generateComposedSkillId(skillIds: string[]): string {
    const hash = skillIds.sort().join('_');
    return `composed_${hash}_${Date.now()}`;
  }
}