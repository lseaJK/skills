import { SkillDefinition, SkillQuery, SkillRegistry, ValidationResult, ValidationError, ValidationWarning, ValidationSeverity } from '../types';
import { SkillCache, ResourceTracker } from './performance-cache';

/**
 * In-memory implementation of the skill registry with performance optimizations
 */
export class InMemorySkillRegistry implements SkillRegistry {
  private skills: Map<string, SkillDefinition> = new Map();
  private cache: SkillCache;
  private performanceMetrics: {
    queryCount: number;
    averageQueryTime: number;
    cacheHitRate: number;
  } = {
    queryCount: 0,
    averageQueryTime: 0,
    cacheHitRate: 0
  };

  constructor() {
    this.cache = new SkillCache(1000, 5 * 60 * 1000); // 1000 entries, 5 minutes TTL
  }

  async register(skill: SkillDefinition): Promise<void> {
    // Validate skill before registration
    const validation = this.validate(skill);
    if (!validation.valid) {
      throw new Error(`Skill validation failed: ${validation.errors.map(e => e.message).join(', ')}`);
    }

    // Check for conflicts (duplicate ID)
    if (this.skills.has(skill.id)) {
      throw new Error(`Skill with ID '${skill.id}' already exists. Use update() to modify existing skills.`);
    }

    // Check for name conflicts within the same layer
    const existingSkillsInLayer = await this.getByLayer(skill.layer);
    const nameConflict = existingSkillsInLayer.find(existing => 
      existing.name.toLowerCase() === skill.name.toLowerCase()
    );
    
    if (nameConflict) {
      throw new Error(`Skill with name '${skill.name}' already exists in layer ${skill.layer}. Skill names must be unique within each layer.`);
    }

    this.skills.set(skill.id, skill);
    
    // Cache the skill and invalidate related caches
    this.cache.cacheSkill(skill.id, skill);
    this.invalidateQueryCaches();
  }

  async discover(query: SkillQuery): Promise<SkillDefinition[]> {
    const tracker = new ResourceTracker();
    const startTime = Date.now();
    
    // Generate cache key for this query
    const cacheKey = SkillCache.generateQueryKey(query);
    
    // Check cache first
    const cachedResult = this.cache.get(cacheKey);
    if (cachedResult) {
      this.updatePerformanceMetrics(Date.now() - startTime, true);
      return cachedResult;
    }
    
    tracker.checkpoint('cache-miss');
    
    const allSkills = Array.from(this.skills.values());
    
    tracker.checkpoint('skills-loaded');
    
    const results = allSkills.filter(skill => {
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
    
    tracker.checkpoint('filtering-complete');
    
    // Cache the results
    this.cache.cacheQuery(cacheKey, results);
    
    const duration = Date.now() - startTime;
    this.updatePerformanceMetrics(duration, false);
    
    return results;
  }

  async resolve(skillId: string): Promise<SkillDefinition> {
    // Check cache first
    const cached = this.cache.get(skillId);
    if (cached) {
      return cached;
    }
    
    const skill = this.skills.get(skillId);
    if (!skill) {
      throw new Error(`Skill not found: ${skillId}`);
    }
    
    // Cache the skill
    this.cache.cacheSkill(skillId, skill);
    return skill;
  }

  validate(skill: SkillDefinition): ValidationResult {
    // Check cache for validation result
    const cached = this.cache.getCachedValidation(skill.id);
    if (cached) {
      return cached;
    }
    
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
    } else {
      // Validate invocation spec
      if (!skill.invocationSpec.inputSchema) {
        errors.push({
          code: 'MISSING_INPUT_SCHEMA',
          message: 'Input schema is required in invocation specification',
          severity: ValidationSeverity.ERROR
        });
      }

      if (!skill.invocationSpec.outputSchema) {
        errors.push({
          code: 'MISSING_OUTPUT_SCHEMA',
          message: 'Output schema is required in invocation specification',
          severity: ValidationSeverity.ERROR
        });
      }

      if (!skill.invocationSpec.executionContext) {
        errors.push({
          code: 'MISSING_EXECUTION_CONTEXT',
          message: 'Execution context is required in invocation specification',
          severity: ValidationSeverity.ERROR
        });
      }
    }

    // Validate metadata
    if (!skill.metadata) {
      errors.push({
        code: 'MISSING_METADATA',
        message: 'Skill metadata is required',
        severity: ValidationSeverity.ERROR
      });
    } else {
      if (!skill.metadata.author) {
        warnings.push({
          code: 'MISSING_AUTHOR',
          message: 'Author information is recommended'
        });
      }

      if (!skill.metadata.category) {
        warnings.push({
          code: 'MISSING_CATEGORY',
          message: 'Category information is recommended'
        });
      }

      if (!skill.metadata.tags || skill.metadata.tags.length === 0) {
        warnings.push({
          code: 'MISSING_TAGS',
          message: 'Tags are recommended for better discoverability'
        });
      }
    }

    // Validate version format (basic semver check)
    if (skill.version && !/^\d+\.\d+\.\d+/.test(skill.version)) {
      warnings.push({
        code: 'INVALID_VERSION_FORMAT',
        message: 'Version should follow semantic versioning (e.g., 1.0.0)'
      });
    }

    const result = {
      valid: errors.length === 0,
      errors,
      warnings
    };
    
    // Cache the validation result
    this.cache.cacheValidation(skill.id, result);
    
    return result;
  }

  async getByLayer(layer: number): Promise<SkillDefinition[]> {
    return Array.from(this.skills.values()).filter(skill => skill.layer === layer);
  }

  async unregister(skillId: string): Promise<void> {
    if (!this.skills.has(skillId)) {
      throw new Error(`Skill not found: ${skillId}`);
    }
    this.skills.delete(skillId);
    
    // Invalidate caches
    this.cache.delete(skillId);
    this.invalidateQueryCaches();
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
    
    // Update caches
    this.cache.cacheSkill(skillId, skill);
    this.invalidateQueryCaches();
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

  /**
   * Check for potential conflicts when registering a skill
   */
  async checkConflicts(skill: SkillDefinition): Promise<string[]> {
    const conflicts: string[] = [];

    // Check for ID conflicts
    if (this.skills.has(skill.id)) {
      conflicts.push(`Skill ID '${skill.id}' already exists`);
    }

    // Check for name conflicts within the same layer
    const existingSkillsInLayer = await this.getByLayer(skill.layer);
    const nameConflict = existingSkillsInLayer.find(existing => 
      existing.name.toLowerCase() === skill.name.toLowerCase()
    );
    
    if (nameConflict) {
      conflicts.push(`Skill name '${skill.name}' already exists in layer ${skill.layer}`);
    }

    // Check for dependency conflicts
    for (const dependency of skill.dependencies) {
      if (dependency.type === 'skill') {
        const dependentSkill = this.skills.get(dependency.id);
        if (!dependentSkill && !dependency.optional) {
          conflicts.push(`Required skill dependency '${dependency.id}' not found`);
        }
      }
    }

    return conflicts;
  }

  /**
   * Get skills that depend on a specific skill
   */
  async getDependentSkills(skillId: string): Promise<SkillDefinition[]> {
    return Array.from(this.skills.values()).filter(skill =>
      skill.dependencies.some(dep => dep.id === skillId)
    );
  }

  /**
   * Get performance metrics
   */
  getPerformanceMetrics() {
    const cacheStats = this.cache.getStats();
    return {
      ...this.performanceMetrics,
      cache: cacheStats,
      totalSkills: this.skills.size
    };
  }

  /**
   * Clear all caches
   */
  clearCache(): void {
    this.cache.clear();
  }

  /**
   * Optimize registry performance
   */
  optimize(): void {
    // Cleanup expired cache entries
    this.cache.cleanup();
    
    // Reset performance metrics
    this.performanceMetrics = {
      queryCount: 0,
      averageQueryTime: 0,
      cacheHitRate: 0
    };
  }

  /**
   * Preload frequently accessed skills
   */
  async preloadSkills(skillIds: string[]): Promise<void> {
    for (const skillId of skillIds) {
      const skill = this.skills.get(skillId);
      if (skill) {
        this.cache.cacheSkill(skillId, skill);
      }
    }
  }

  private updatePerformanceMetrics(duration: number, cacheHit: boolean): void {
    this.performanceMetrics.queryCount++;
    
    // Update average query time
    const totalTime = this.performanceMetrics.averageQueryTime * (this.performanceMetrics.queryCount - 1) + duration;
    this.performanceMetrics.averageQueryTime = totalTime / this.performanceMetrics.queryCount;
    
    // Update cache hit rate
    const cacheStats = this.cache.getStats();
    this.performanceMetrics.cacheHitRate = cacheStats.hitRate;
  }

  private invalidateQueryCaches(): void {
    // Remove all cached query results
    const keys = this.cache.keys();
    for (const key of keys) {
      if (typeof key === 'string' && key.startsWith('query:')) {
        this.cache.delete(key);
      }
    }
  }
}