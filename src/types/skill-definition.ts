import { JSONSchema7 } from 'json-schema';

/**
 * Core skill definition interface
 */
export interface SkillDefinition {
  id: string;
  name: string;
  version: string;
  layer: 1 | 2 | 3;
  description: string;
  invocationSpec: InvocationSpecification;
  extensionPoints: ExtensionPoint[];
  dependencies: Dependency[];
  metadata: SkillMetadata;
}

/**
 * Specification for how a skill can be invoked
 */
export interface InvocationSpecification {
  inputSchema: JSONSchema7;
  outputSchema: JSONSchema7;
  executionContext: ExecutionContext;
  parameters: Parameter[];
  examples: Example[];
}

/**
 * Extension point definition for skill extensibility
 */
export interface ExtensionPoint {
  id: string;
  name: string;
  description: string;
  type: SkillExtensionType;
  interface: JSONSchema7;
  required: boolean;
}

/**
 * Skill dependency definition
 */
export interface Dependency {
  id: string;
  name: string;
  version: string;
  type: SkillDependencyType;
  optional: boolean;
  source?: string;
}

/**
 * Skill metadata
 */
export interface SkillMetadata {
  author: string;
  created: Date;
  updated: Date;
  tags: string[];
  category: string;
  license?: string;
  documentation?: string;
  repository?: string;
}

/**
 * Execution context for skill invocation
 */
export interface ExecutionContext {
  environment: Record<string, string>;
  workingDirectory?: string;
  timeout?: number;
  resources?: SkillResourceConstraint;
  security?: SecurityContext;
}

/**
 * Parameter definition for skill invocation
 */
export interface Parameter {
  name: string;
  type: string;
  description: string;
  required: boolean;
  defaultValue?: any;
  validation?: JSONSchema7;
}

/**
 * Example usage of a skill
 */
export interface Example {
  name: string;
  description: string;
  input: any;
  expectedOutput: any;
  context?: Partial<ExecutionContext>;
}

/**
 * Resource constraints for execution (skill definition)
 */
export interface SkillResourceConstraint {
  maxMemory?: number;
  maxCpu?: number;
  maxDuration?: number;
  maxFileSize?: number;
}

/**
 * Security context for skill execution
 */
export interface SecurityContext {
  allowedPaths?: string[];
  allowedNetworkHosts?: string[];
  allowedCommands?: string[];
  sandboxed: boolean;
}

/**
 * Extension types for skill definition
 */
export enum SkillExtensionType {
  OVERRIDE = 'override',
  COMPOSE = 'compose',
  DECORATE = 'decorate',
  HOOK = 'hook'
}

/**
 * Dependency types for skill definition
 */
export enum SkillDependencyType {
  SKILL = 'skill',
  LIBRARY = 'library',
  TOOL = 'tool',
  SERVICE = 'service'
}