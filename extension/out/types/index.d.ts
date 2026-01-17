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
export interface InvocationSpecification {
    inputSchema: JSONSchema;
    outputSchema: JSONSchema;
    executionContext: ExecutionContext;
    parameters: Parameter[];
    examples: Example[];
}
export interface ExtensionPoint {
    name: string;
    description: string;
    type: string;
    schema?: JSONSchema;
}
export interface Dependency {
    id: string;
    type: 'skill' | 'library' | 'service';
    version?: string;
    optional: boolean;
}
export interface SkillMetadata {
    author: string;
    created: string;
    updated: string;
    tags: string[];
    category: string;
    license?: string;
    repository?: string;
}
export interface JSONSchema {
    type: string;
    properties?: Record<string, any>;
    required?: string[];
    [key: string]: any;
}
export interface ExecutionContext {
    environment: Record<string, string>;
    security: SecurityContext;
    resources?: ResourceConstraints;
}
export interface SecurityContext {
    sandboxed: boolean;
    permissions?: string[];
}
export interface ResourceConstraints {
    maxMemory?: number;
    maxCpu?: number;
    timeout?: number;
}
export interface Parameter {
    name: string;
    type: string;
    description: string;
    required: boolean;
    default?: any;
}
export interface Example {
    name: string;
    description: string;
    input: any;
    output: any;
}
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
export interface ValidationResult {
    valid: boolean;
    errors: ValidationError[];
    warnings: ValidationWarning[];
}
export interface ValidationError {
    code: string;
    message: string;
    severity: ValidationSeverity;
}
export interface ValidationWarning {
    code: string;
    message: string;
}
export declare enum ValidationSeverity {
    ERROR = "error",
    WARNING = "warning",
    INFO = "info"
}
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
    checkConflicts(skill: SkillDefinition): Promise<string[]>;
    getDependentSkills(skillId: string): Promise<SkillDefinition[]>;
}
export * from './sync';
//# sourceMappingURL=index.d.ts.map