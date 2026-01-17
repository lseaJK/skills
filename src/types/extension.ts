import { SkillDefinition } from './skill-definition';
import { ValidationResult } from './validation';

/**
 * Skill extension definition
 */
export interface SkillExtension {
  id: string;
  baseSkillId: string;
  name: string;
  version: string;
  type: ExtensionType;
  implementation: any;
  priority: number;
  description?: string;
  author?: string;
  dependencies?: string[];
}

/**
 * Extension types
 */
export enum ExtensionType {
  OVERRIDE = 'override',
  COMPOSE = 'compose',
  DECORATE = 'decorate'
}

/**
 * Extension conflict information
 */
export interface ExtensionConflict {
  type: ConflictType;
  extensions: SkillExtension[];
  description: string;
  severity: ConflictSeverity;
}

/**
 * Types of extension conflicts
 */
export enum ConflictType {
  PRIORITY_CONFLICT = 'priority_conflict',
  INTERFACE_CONFLICT = 'interface_conflict',
  DEPENDENCY_CONFLICT = 'dependency_conflict',
  VERSION_CONFLICT = 'version_conflict'
}

/**
 * Severity levels for conflicts
 */
export enum ConflictSeverity {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  CRITICAL = 'critical'
}

/**
 * Resolution for extension conflicts
 */
export interface Resolution {
  conflictId: string;
  strategy: ResolutionStrategy;
  selectedExtensions: string[];
  reasoning: string;
}

/**
 * Strategies for resolving conflicts
 */
export enum ResolutionStrategy {
  PRIORITY_BASED = 'priority_based',
  USER_CHOICE = 'user_choice',
  AUTOMATIC = 'automatic',
  DISABLE_CONFLICTING = 'disable_conflicting'
}

/**
 * Extension manager interface
 */
export interface ExtensionManager {
  extend(baseSkillId: string, extension: SkillExtension): Promise<string>;
  compose(skillIds: string[]): Promise<SkillDefinition>;
  resolveConflicts(conflicts: ExtensionConflict[]): Promise<Resolution>;
  validateExtension(extension: SkillExtension): ValidationResult;
  listExtensions(baseSkillId?: string): Promise<SkillExtension[]>;
  removeExtension(extensionId: string): Promise<void>;
  getConflicts(): Promise<ExtensionConflict[]>;
}