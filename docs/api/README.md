# Universal Skills Architecture - API Documentation

## Overview

The Universal Skills Architecture provides a comprehensive API for managing and executing skills across three architectural layers. This documentation covers all public interfaces, classes, and methods available in the system.

## Table of Contents

- [Core Interfaces](#core-interfaces)
- [Skill Registry API](#skill-registry-api)
- [Execution Engine API](#execution-engine-api)
- [Extension Manager API](#extension-manager-api)
- [Migration Manager API](#migration-manager-api)
- [Performance and Caching](#performance-and-caching)
- [Error Handling](#error-handling)
- [VS Code Extension API](#vs-code-extension-api)

## Core Interfaces

### SkillDefinition

The fundamental interface for defining skills in the system.

```typescript
interface SkillDefinition {
  id: string;                           // Unique skill identifier
  name: string;                         // Human-readable skill name
  version: string;                      // Semantic version (e.g., "1.0.0")
  layer: 1 | 2 | 3;                   // Architecture layer
  description: string;                  // Detailed description
  invocationSpec: InvocationSpecification;
  extensionPoints: ExtensionPoint[];
  dependencies: Dependency[];
  metadata: SkillMetadata;
}
```

### InvocationSpecification

Defines how a skill can be invoked and what it expects.

```typescript
interface InvocationSpecification {
  inputSchema: JSONSchema;              // JSON schema for input validation
  outputSchema: JSONSchema;             // JSON schema for output validation
  executionContext: ExecutionContext;   // Runtime execution requirements
  parameters: Parameter[];              // Structured parameter definitions
  examples: Example[];                  // Usage examples and test cases
}
```

### SkillQuery

Interface for querying and discovering skills.

```typescript
interface SkillQuery {
  name?: string;                        // Filter by skill name (partial match)
  layer?: number;                       // Filter by architecture layer
  category?: string;                    // Filter by category
  tags?: string[];                      // Filter by tags (any match)
  author?: string;                      // Filter by author
  description?: string;                 // Filter by description (partial match)
  limit?: number;                       // Maximum results (default: 100)
  offset?: number;                      // Pagination offset (default: 0)
}
```

## Skill Registry API

### InMemorySkillRegistry

The main implementation of the skill registry with performance optimizations.

#### Constructor

```typescript
constructor()
```

Creates a new skill registry with default caching configuration.

#### Methods

##### register(skill: SkillDefinition): Promise<void>

Registers a new skill in the registry.

```typescript
const registry = new InMemorySkillRegistry();
await registry.register({
  id: 'file-reader-v1',
  name: 'File Reader',
  version: '1.0.0',
  layer: 1,
  description: 'Reads file contents',
  // ... other properties
});
```

**Throws:**
- `Error` if skill validation fails
- `Error` if skill ID already exists
- `Error` if skill name conflicts within the same layer

##### discover(query: SkillQuery): Promise<SkillDefinition[]>

Discovers skills based on query criteria with caching support.

```typescript
// Find all Layer 1 skills
const layer1Skills = await registry.discover({ layer: 1 });

// Find skills by category and tags
const fileSkills = await registry.discover({
  category: 'file-operations',
  tags: ['io', 'utility']
});

// Paginated search
const results = await registry.discover({
  name: 'reader',
  limit: 10,
  offset: 20
});
```

##### resolve(skillId: string): Promise<SkillDefinition>

Resolves a specific skill by ID with caching.

```typescript
const skill = await registry.resolve('file-reader-v1');
```

**Throws:**
- `Error` if skill not found

##### validate(skill: SkillDefinition): ValidationResult

Validates a skill definition with caching support.

```typescript
const validation = registry.validate(skill);
if (!validation.valid) {
  console.log('Errors:', validation.errors);
  console.log('Warnings:', validation.warnings);
}
```

##### getByLayer(layer: number): Promise<SkillDefinition[]>

Gets all skills in a specific layer.

```typescript
const layer2Skills = await registry.getByLayer(2);
```

##### Performance Methods

```typescript
// Get performance metrics
const metrics = registry.getPerformanceMetrics();
console.log('Cache hit rate:', metrics.cacheHitRate);
console.log('Average query time:', metrics.averageQueryTime);

// Clear caches
registry.clearCache();

// Optimize performance
registry.optimize();

// Preload frequently used skills
await registry.preloadSkills(['skill1', 'skill2', 'skill3']);
```

## Execution Engine API

### LayeredExecutionEngine

Enhanced execution engine with performance monitoring and resource management.

#### Constructor

```typescript
constructor(registry: SkillRegistry, errorLoggingService?: ErrorLoggingService)
```

#### Methods

##### execute(skillId: string, params: any, context?: Partial<RuntimeExecutionContext>): Promise<ExecutionResult>

Executes a skill with comprehensive error handling and performance monitoring.

```typescript
const engine = new LayeredExecutionEngine(registry);

// Basic execution
const result = await engine.execute('file-reader-v1', {
  filePath: './README.md',
  encoding: 'utf8'
});

// Execution with context
const result = await engine.execute('file-reader-v1', params, {
  userId: 'user123',
  timeout: 10000,
  resourceLimits: {
    maxMemory: 256 * 1024 * 1024, // 256MB
    maxDuration: 5000              // 5 seconds
  }
});

if (result.success) {
  console.log('Output:', result.output);
  console.log('Duration:', result.metadata.duration);
} else {
  console.error('Error:', result.error);
}
```

##### Layer-Specific Execution

```typescript
// Layer 1: Function calls
const layer1Result = await engine.executeLayer1(skill, params, context);

// Layer 2: Sandboxed commands
const layer2Result = await engine.executeLayer2(skill, params, context);

// Layer 3: API wrappers and workflows
const layer3Result = await engine.executeLayer3(skill, params, context);
```

##### createSandbox(config?: SandboxConfig): Promise<SandboxEnvironment>

Creates a sandboxed execution environment for Layer 2 skills.

```typescript
const sandbox = await engine.createSandbox({
  workingDirectory: '/tmp/skill-execution',
  allowedCommands: ['ls', 'cat', 'grep'],
  resourceLimits: {
    maxMemory: 128 * 1024 * 1024,
    maxDuration: 30000
  }
});

// Use sandbox...
await sandbox.cleanup();
```

##### Performance and Monitoring

```typescript
// Get active executions
const activeExecutions = engine.getActiveExecutions();

// Cancel execution
const cancelled = await engine.cancelExecution('exec_123');

// Get execution statistics
const stats = engine.getExecutionStats();

// Get system health
const health = engine.getSystemHealth();

// Get performance metrics
const metrics = engine.getPerformanceMetrics('skill-id');
```

## Extension Manager API

### ExtensionManager

Manages skill extensions, inheritance, and composition.

```typescript
interface ExtensionManager {
  extend(baseSkillId: string, extension: SkillExtension): Promise<string>;
  compose(skillIds: string[]): Promise<SkillDefinition>;
  resolveConflicts(conflicts: ExtensionConflict[]): Promise<Resolution>;
  validateExtension(extension: SkillExtension): ValidationResult;
}
```

#### Usage Examples

```typescript
const extensionManager = new ExtensionManager(registry);

// Extend a skill
const extendedSkillId = await extensionManager.extend('base-skill', {
  id: 'extended-skill',
  type: 'override',
  implementation: newImplementation,
  priority: 10
});

// Compose multiple skills
const composedSkill = await extensionManager.compose([
  'skill1', 'skill2', 'skill3'
]);

// Validate extension
const validation = extensionManager.validateExtension(extension);
```

## Migration Manager API

### MigrationManager

Handles skill package export, import, and environment adaptation.

```typescript
interface MigrationManager {
  export(projectPath: string): Promise<SkillPackage>;
  import(package: SkillPackage, targetPath: string): Promise<MigrationResult>;
  validateCompatibility(package: SkillPackage, environment: Environment): Promise<CompatibilityReport>;
  adaptConfiguration(config: SkillConfig, environment: Environment): Promise<SkillConfig>;
}
```

#### Usage Examples

```typescript
const migrationManager = new MigrationManager();

// Export skills from project
const skillPackage = await migrationManager.export('./my-project');

// Import to new environment
const result = await migrationManager.import(skillPackage, './new-project');

// Check compatibility
const compatibility = await migrationManager.validateCompatibility(
  skillPackage, 
  targetEnvironment
);
```

## Performance and Caching

### PerformanceCache

Generic LRU cache with TTL support for performance optimization.

```typescript
const cache = new PerformanceCache<string, any>({
  maxSize: 1000,
  defaultTtl: 5 * 60 * 1000,      // 5 minutes
  cleanupInterval: 60 * 1000,      // 1 minute
  enableStats: true
});

// Basic operations
cache.set('key', value, 10000);    // Custom TTL
const value = cache.get('key');
const exists = cache.has('key');
cache.delete('key');

// Statistics
const stats = cache.getStats();
console.log('Hit rate:', stats.hitRate);
console.log('Size:', stats.size);
```

### SkillCache

Specialized cache for skill-related data.

```typescript
const skillCache = new SkillCache(1000, 5 * 60 * 1000);

// Cache operations
skillCache.cacheSkill('skill-id', skill);
skillCache.cacheQuery('query-key', results);
skillCache.cacheValidation('skill-id', validation);

// Retrieval
const validation = skillCache.getCachedValidation('skill-id');
```

### ResourceTracker

Performance monitoring and resource usage tracking.

```typescript
const tracker = new ResourceTracker();

tracker.checkpoint('operation-start');
// ... perform operations
tracker.checkpoint('operation-complete');

const report = tracker.getReport();
console.log('Total duration:', report.totalDuration);
console.log('Memory delta:', report.memoryDelta);
console.log('Checkpoints:', report.checkpoints);
```

## Error Handling

### Error Types and Interfaces

```typescript
enum ExecutionErrorType {
  VALIDATION_ERROR = 'validation_error',
  TIMEOUT_ERROR = 'timeout_error',
  RESOURCE_ERROR = 'resource_error',
  PERMISSION_ERROR = 'permission_error',
  DEPENDENCY_ERROR = 'dependency_error',
  RUNTIME_ERROR = 'runtime_error'
}

interface ExecutionError {
  type: ExecutionErrorType;
  message: string;
  code?: string;
  details?: any;
  stack?: string;
  suggestions?: string[];
}
```

### Error Logging Service

```typescript
const errorService = new ErrorLoggingService();

// Handle errors
const errorResult = await errorService.handleError(error, {
  skillId: 'skill-id',
  operation: 'execution',
  additionalData: { params }
});

// Get error metrics
const metrics = errorService.getErrorMetrics();

// Get system health
const health = errorService.getSystemHealth();
```

## VS Code Extension API

### Configuration

```typescript
interface ExtensionConfig {
  enabled: boolean;
  skillsPath: string;
  autoSave: boolean;
  autoValidate: boolean;
  showPreview: boolean;
  enabledLayers: number[];
  debugMode: boolean;
}
```

### Commands

Available VS Code commands:

- `skillsArchitecture.showSkillsPanel` - Show skills explorer
- `skillsArchitecture.createSkill` - Create new skill
- `skillsArchitecture.refreshSkills` - Refresh skills list
- `skillsArchitecture.importSkill` - Import skill from file
- `skillsArchitecture.exportSkill` - Export skill to file
- `skillsArchitecture.openSettings` - Open extension settings

### Providers

#### SkillsTreeDataProvider

```typescript
class SkillsTreeDataProvider implements vscode.TreeDataProvider<SkillTreeItem> {
  refresh(): void;
  getTreeItem(element: SkillTreeItem): vscode.TreeItem;
  getChildren(element?: SkillTreeItem): Thenable<SkillTreeItem[]>;
}
```

#### SkillEditorProvider

```typescript
class SkillEditorProvider implements vscode.CustomTextEditorProvider {
  resolveCustomTextEditor(
    document: vscode.TextDocument,
    webviewPanel: vscode.WebviewPanel,
    token: vscode.CancellationToken
  ): void | Thenable<void>;
}
```

## Best Practices

### Performance Optimization

1. **Use Caching**: Enable caching for frequently accessed skills and queries
2. **Batch Operations**: Group multiple operations when possible
3. **Resource Limits**: Set appropriate resource limits for skill execution
4. **Cleanup**: Regularly cleanup expired cache entries and unused resources

### Error Handling

1. **Validate Early**: Validate skill definitions and parameters before execution
2. **Provide Context**: Include relevant context in error messages
3. **Handle Gracefully**: Implement proper error recovery mechanisms
4. **Log Appropriately**: Use structured logging for debugging and monitoring

### Security

1. **Sandbox Execution**: Use sandboxed environments for Layer 2 skills
2. **Validate Inputs**: Always validate user inputs and skill parameters
3. **Limit Resources**: Set appropriate resource limits to prevent abuse
4. **Audit Access**: Log and monitor skill access and execution

### Development

1. **Follow Patterns**: Use established patterns for skill development
2. **Test Thoroughly**: Write comprehensive tests for all skill functionality
3. **Document Well**: Provide clear documentation and examples
4. **Version Properly**: Use semantic versioning for skill releases

## Examples and Tutorials

See the [examples directory](../examples/) for complete working examples and tutorials covering:

- Basic skill creation and registration
- Advanced skill composition and extension
- Performance optimization techniques
- VS Code extension development
- Migration and deployment strategies