import { SkillDefinition } from './skill-definition';

/**
 * Skill package for migration
 */
export interface SkillPackage {
  id: string;
  name: string;
  version: string;
  skills: SkillDefinition[];
  dependencies: PackageDependency[];
  configuration: SkillConfig;
  metadata: PackageMetadata;
}

/**
 * Package dependency information
 */
export interface PackageDependency {
  name: string;
  version: string;
  type: PackageDependencyType;
  source?: string;
  optional: boolean;
}

/**
 * Dependency types for packages
 */
export enum PackageDependencyType {
  RUNTIME = 'runtime',
  DEVELOPMENT = 'development',
  PEER = 'peer',
  OPTIONAL = 'optional'
}

/**
 * Skill configuration
 */
export interface SkillConfig {
  skillsPath: string;
  enabledLayers: number[];
  environmentVariables: Record<string, string>;
  dependencies: ProjectDependency[];
  migrationSettings: MigrationSettings;
}

/**
 * Project dependency information
 */
export interface ProjectDependency {
  name: string;
  version: string;
  source: string;
  type: PackageDependencyType;
}

/**
 * Migration settings
 */
export interface MigrationSettings {
  autoResolveConflicts: boolean;
  backupBeforeMigration: boolean;
  validateAfterMigration: boolean;
  migrationStrategy: MigrationStrategy;
}

/**
 * Migration strategies
 */
export enum MigrationStrategy {
  CONSERVATIVE = 'conservative',
  AGGRESSIVE = 'aggressive',
  INTERACTIVE = 'interactive'
}

/**
 * Package metadata
 */
export interface PackageMetadata {
  author: string;
  description: string;
  created: Date;
  exported: Date;
  sourceEnvironment: Environment;
  tags: string[];
  license?: string;
}

/**
 * Environment information
 */
export interface Environment {
  platform: string;
  runtime: string;
  version: string;
  capabilities: string[];
  constraints: MigrationResourceConstraint[];
}

/**
 * Resource constraint interface for migration
 */
export interface MigrationResourceConstraint {
  maxMemory?: number;
  maxCpu?: number;
  maxDuration?: number;
  maxFileSize?: number;
}

/**
 * Migration result
 */
export interface MigrationResult {
  success: boolean;
  migratedSkills: string[];
  failedSkills: MigrationFailure[];
  warnings: string[];
  adaptations: ConfigurationAdaptation[];
}

/**
 * Migration failure information
 */
export interface MigrationFailure {
  skillId: string;
  reason: string;
  error?: Error;
  suggestions: string[];
}

/**
 * Configuration adaptation information
 */
export interface ConfigurationAdaptation {
  type: AdaptationType;
  original: any;
  adapted: any;
  reason: string;
}

/**
 * Types of configuration adaptations
 */
export enum AdaptationType {
  ENVIRONMENT_VARIABLE = 'environment_variable',
  PATH_MAPPING = 'path_mapping',
  DEPENDENCY_VERSION = 'dependency_version',
  CAPABILITY_SUBSTITUTION = 'capability_substitution'
}

/**
 * Compatibility report
 */
export interface CompatibilityReport {
  compatible: boolean;
  issues: CompatibilityIssue[];
  recommendations: string[];
  adaptations: ConfigurationAdaptation[];
}

/**
 * Compatibility issue information
 */
export interface CompatibilityIssue {
  type: IssueType;
  severity: IssueSeverity;
  description: string;
  affectedSkills: string[];
  resolution?: string;
}

/**
 * Types of compatibility issues
 */
export enum IssueType {
  MISSING_DEPENDENCY = 'missing_dependency',
  VERSION_MISMATCH = 'version_mismatch',
  PLATFORM_INCOMPATIBILITY = 'platform_incompatibility',
  CAPABILITY_MISSING = 'capability_missing',
  CONFIGURATION_CONFLICT = 'configuration_conflict'
}

/**
 * Severity levels for issues
 */
export enum IssueSeverity {
  INFO = 'info',
  WARNING = 'warning',
  ERROR = 'error',
  CRITICAL = 'critical'
}

/**
 * Migration manager interface
 */
export interface MigrationManager {
  export(projectPath: string): Promise<SkillPackage>;
  import(skillPackage: SkillPackage, targetPath: string): Promise<MigrationResult>;
  validateCompatibility(skillPackage: SkillPackage, environment: Environment): Promise<CompatibilityReport>;
  adaptConfiguration(config: SkillConfig, environment: Environment): Promise<SkillConfig>;
}