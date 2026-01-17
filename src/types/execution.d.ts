/**
 * Result of skill execution
 */
export interface ExecutionResult {
    success: boolean;
    output?: any;
    error?: ExecutionError;
    metadata: ExecutionMetadata;
}
/**
 * Execution metadata
 */
export interface ExecutionMetadata {
    skillId: string;
    executionId: string;
    startTime: Date;
    endTime: Date;
    duration: number;
    layer: number;
    resourceUsage?: ResourceUsage;
}
/**
 * Resource usage statistics
 */
export interface ResourceUsage {
    memoryUsed: number;
    cpuTime: number;
    networkRequests?: number;
    filesAccessed?: string[];
}
/**
 * Execution error details
 */
export interface ExecutionError {
    type: ExecutionErrorType;
    message: string;
    code?: string;
    details?: any;
    stack?: string;
    suggestions?: string[];
}
/**
 * Types of execution errors
 */
export declare enum ExecutionErrorType {
    VALIDATION_ERROR = "validation_error",
    RUNTIME_ERROR = "runtime_error",
    TIMEOUT_ERROR = "timeout_error",
    RESOURCE_ERROR = "resource_error",
    PERMISSION_ERROR = "permission_error",
    DEPENDENCY_ERROR = "dependency_error"
}
/**
 * Sandbox environment for layer 2 execution
 */
export interface SandboxEnvironment {
    id: string;
    workingDirectory: string;
    environmentVariables: Record<string, string>;
    allowedCommands: string[];
    resourceLimits: ExecutionResourceConstraint;
    cleanup(): Promise<void>;
}
/**
 * Resource constraint interface for execution
 */
export interface ExecutionResourceConstraint {
    maxMemory?: number;
    maxCpu?: number;
    maxDuration?: number;
    maxFileSize?: number;
}
/**
 * Test result for skill validation
 */
export interface TestResult {
    passed: boolean;
    results: TestCaseResult[];
    coverage?: TestCoverage;
    performance?: PerformanceMetrics;
}
/**
 * Individual test case result
 */
export interface TestCaseResult {
    name: string;
    passed: boolean;
    duration: number;
    error?: string;
    output?: any;
}
/**
 * Test coverage information
 */
export interface TestCoverage {
    lines: number;
    functions: number;
    branches: number;
    statements: number;
}
/**
 * Performance metrics
 */
export interface PerformanceMetrics {
    averageExecutionTime: number;
    memoryUsage: number;
    throughput?: number;
}
//# sourceMappingURL=execution.d.ts.map