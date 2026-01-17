import { SkillDefinition } from './skill-definition';
import { ValidationResult } from './validation';

/**
 * Skill query interface for discovering skills
 */
export interface SkillQuery {
  name?: string;
  layer?: number;
  category?: string;
  tags?: string[];
  author?: string;
  description?: string;
  limit?: number;
  offset?: number;
}

/**
 * Skill registry interface
 */
export interface SkillRegistry {
  register(skill: SkillDefinition): Promise<void>;
  discover(query: SkillQuery): Promise<SkillDefinition[]>;
  resolve(skillId: string): Promise<SkillDefinition>;
  validate(skill: SkillDefinition): ValidationResult;
  getByLayer(layer: number): Promise<SkillDefinition[]>;
  unregister(skillId: string): Promise<void>;
  update(skillId: string, skill: SkillDefinition): Promise<void>;
  list(): Promise<SkillDefinition[]>;
  search(searchTerm: string): Promise<SkillDefinition[]>;
}

/**
 * Usage statistics for skills
 */
export interface UsageStatistics {
  skillId: string;
  totalExecutions: number;
  successfulExecutions: number;
  failedExecutions: number;
  averageExecutionTime: number;
  lastExecuted?: Date;
  popularityScore: number;
}

/**
 * Skill relationship types
 */
export interface SkillRelationship {
  type: RelationshipType;
  sourceSkillId: string;
  targetSkillId: string;
  description?: string;
  metadata?: Record<string, any>;
}

/**
 * Types of relationships between skills
 */
export enum RelationshipType {
  DEPENDS_ON = 'depends_on',
  EXTENDS = 'extends',
  COMPOSES = 'composes',
  REPLACES = 'replaces',
  SIMILAR_TO = 'similar_to'
}