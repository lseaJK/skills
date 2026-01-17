# Universal Skills Architecture - Examples and Use Cases

This directory contains comprehensive examples demonstrating how to use the Universal Skills Architecture system across all three layers.

## Directory Structure

```
examples/
├── layer1/                 # Layer 1 (Function Calls) Examples
│   ├── file-operations/    # File I/O skills
│   ├── data-processing/    # Data manipulation skills
│   └── utilities/          # Utility functions
├── layer2/                 # Layer 2 (Sandbox Tools) Examples
│   ├── shell-commands/     # Shell command skills
│   ├── external-tools/     # External tool integrations
│   └── scripts/            # Script execution skills
├── layer3/                 # Layer 3 (Wrapper APIs) Examples
│   ├── api-integrations/   # REST API wrappers
│   ├── workflows/          # Multi-step workflows
│   └── ai-ml/              # AI/ML integrations
├── tutorials/              # Step-by-step tutorials
├── use-cases/              # Real-world use case examples
└── performance/            # Performance optimization examples
```

## Quick Start Examples

### Layer 1: Simple File Reader

A basic skill for reading file contents with encoding support.

```json
{
  "id": "simple-file-reader",
  "name": "Simple File Reader",
  "version": "1.0.0",
  "layer": 1,
  "description": "Reads file contents with various encoding options",
  "invocationSpec": {
    "inputSchema": {
      "type": "object",
      "properties": {
        "filePath": { "type": "string" },
        "encoding": { 
          "type": "string", 
          "enum": ["utf8", "ascii", "base64"],
          "default": "utf8"
        }
      },
      "required": ["filePath"]
    },
    "outputSchema": {
      "type": "object",
      "properties": {
        "content": { "type": "string" },
        "size": { "type": "number" }
      }
    },
    "executionContext": {
      "environment": {},
      "security": { "sandboxed": true }
    },
    "parameters": [
      {
        "name": "filePath",
        "type": "string",
        "description": "Path to the file to read",
        "required": true
      }
    ],
    "examples": [
      {
        "name": "Read README",
        "input": { "filePath": "./README.md" },
        "expectedOutput": {
          "content": "# Project Title...",
          "size": 1024
        }
      }
    ]
  },
  "extensionPoints": [],
  "dependencies": [],
  "metadata": {
    "author": "Skills Architecture Team",
    "category": "file-operations",
    "tags": ["file", "io", "utility"]
  }
}
```

### Layer 2: Git Status Checker

A skill that executes git commands in a sandboxed environment.

```json
{
  "id": "git-status-checker",
  "name": "Git Status Checker",
  "version": "1.0.0",
  "layer": 2,
  "description": "Checks git repository status and returns branch information",
  "invocationSpec": {
    "inputSchema": {
      "type": "object",
      "properties": {
        "repositoryPath": { "type": "string" },
        "verbose": { "type": "boolean", "default": false }
      },
      "required": ["repositoryPath"]
    },
    "outputSchema": {
      "type": "object",
      "properties": {
        "branch": { "type": "string" },
        "status": { "type": "string" },
        "changes": { "type": "array" }
      }
    },
    "executionContext": {
      "command": "git",
      "args": ["status", "--porcelain"],
      "workingDirectory": "${input.repositoryPath}",
      "environment": {},
      "security": {
        "allowedCommands": ["git"],
        "allowedPaths": ["${input.repositoryPath}"],
        "networkAccess": false
      }
    },
    "parameters": [
      {
        "name": "repositoryPath",
        "type": "string",
        "description": "Path to git repository",
        "required": true
      }
    ],
    "examples": [
      {
        "name": "Check current repo",
        "input": { "repositoryPath": "./" },
        "expectedOutput": {
          "branch": "main",
          "status": "clean",
          "changes": []
        }
      }
    ]
  },
  "extensionPoints": [],
  "dependencies": [],
  "metadata": {
    "author": "Skills Architecture Team",
    "category": "version-control",
    "tags": ["git", "vcs", "status"]
  }
}
```

### Layer 3: API Data Processor

A workflow skill that fetches data from an API and processes it.

```json
{
  "id": "api-data-processor",
  "name": "API Data Processor",
  "version": "1.0.0",
  "layer": 3,
  "description": "Fetches data from REST API and processes it through multiple steps",
  "invocationSpec": {
    "inputSchema": {
      "type": "object",
      "properties": {
        "apiUrl": { "type": "string" },
        "apiKey": { "type": "string" },
        "processingOptions": { "type": "object" }
      },
      "required": ["apiUrl"]
    },
    "outputSchema": {
      "type": "object",
      "properties": {
        "processedData": { "type": "array" },
        "summary": { "type": "object" },
        "metadata": { "type": "object" }
      }
    },
    "executionContext": {
      "workflow": {
        "steps": [
          {
            "id": "fetch-data",
            "type": "api-call",
            "config": {
              "url": "${input.apiUrl}",
              "headers": {
                "Authorization": "Bearer ${input.apiKey}"
              }
            }
          },
          {
            "id": "validate-data",
            "type": "function-call",
            "skillId": "data-validator",
            "parameters": {
              "data": "${steps.fetch-data.response.body}"
            }
          },
          {
            "id": "process-data",
            "type": "function-call",
            "skillId": "data-processor",
            "parameters": {
              "data": "${steps.validate-data.output}",
              "options": "${input.processingOptions}"
            }
          }
        ],
        "errorHandling": {
          "retryPolicy": {
            "maxRetries": 3,
            "backoffStrategy": "exponential"
          }
        }
      }
    },
    "parameters": [
      {
        "name": "apiUrl",
        "type": "string",
        "description": "REST API endpoint URL",
        "required": true
      }
    ],
    "examples": [
      {
        "name": "Process user data",
        "input": {
          "apiUrl": "https://api.example.com/users",
          "processingOptions": { "format": "summary" }
        },
        "expectedOutput": {
          "processedData": [],
          "summary": { "totalUsers": 100 }
        }
      }
    ]
  },
  "extensionPoints": [],
  "dependencies": [
    { "id": "data-validator", "type": "skill", "optional": false },
    { "id": "data-processor", "type": "skill", "optional": false }
  ],
  "metadata": {
    "author": "Skills Architecture Team",
    "category": "data-processing",
    "tags": ["api", "workflow", "data"]
  }
}
```

## Complete Use Case Examples

### 1. Development Workflow Automation

A comprehensive example showing how to automate common development tasks.

**Skills Involved:**
- `git-status-checker` (Layer 2)
- `test-runner` (Layer 2)
- `build-validator` (Layer 1)
- `deployment-workflow` (Layer 3)

**Workflow:**
1. Check git status and ensure clean working directory
2. Run tests and validate results
3. Build project and validate artifacts
4. Deploy to staging environment
5. Run integration tests
6. Deploy to production (if tests pass)

### 2. Data Pipeline Processing

An example of processing data from multiple sources and formats.

**Skills Involved:**
- `csv-reader` (Layer 1)
- `json-processor` (Layer 1)
- `data-transformer` (Layer 1)
- `database-writer` (Layer 2)
- `pipeline-orchestrator` (Layer 3)

**Workflow:**
1. Read data from CSV and JSON sources
2. Transform and normalize data formats
3. Validate data integrity
4. Write to database
5. Generate processing reports

### 3. Content Management System

An example of managing content across multiple platforms.

**Skills Involved:**
- `markdown-parser` (Layer 1)
- `image-optimizer` (Layer 2)
- `cms-uploader` (Layer 3)
- `seo-analyzer` (Layer 1)
- `content-workflow` (Layer 3)

**Workflow:**
1. Parse markdown content
2. Optimize images and media
3. Upload to CMS platform
4. Analyze SEO metrics
5. Schedule publication

## Performance Examples

### Caching Optimization

```typescript
// Example: Optimizing skill registry performance
import { InMemorySkillRegistry, SkillCache } from 'universal-skills-architecture';

const registry = new InMemorySkillRegistry();

// Preload frequently used skills
await registry.preloadSkills([
  'file-reader-v1',
  'data-validator-v1',
  'json-processor-v1'
]);

// Monitor performance
const metrics = registry.getPerformanceMetrics();
console.log('Cache hit rate:', metrics.cache.hitRate);

// Optimize when hit rate is low
if (metrics.cache.hitRate < 0.8) {
  registry.optimize();
}
```

### Resource Management

```typescript
// Example: Managing execution resources
import { LayeredExecutionEngine } from 'universal-skills-architecture';

const engine = new LayeredExecutionEngine(registry);

// Execute with resource limits
const result = await engine.execute('data-processor', params, {
  resourceLimits: {
    maxMemory: 512 * 1024 * 1024, // 512MB
    maxDuration: 30000,           // 30 seconds
    maxNetworkRequests: 100
  },
  timeout: 45000 // 45 seconds total
});

// Monitor resource usage
const resourceReport = result.metadata.resourceUsage;
console.log('Memory used:', resourceReport.memoryUsed);
console.log('CPU time:', resourceReport.cpuTime);
```

## Extension Examples

### Skill Inheritance

```typescript
// Example: Extending a base file reader with compression support
import { ExtensionManager } from 'universal-skills-architecture';

const extensionManager = new ExtensionManager(registry);

const compressedFileReader = await extensionManager.extend('file-reader-v1', {
  id: 'compressed-file-reader',
  type: 'override',
  implementation: {
    supportedFormats: ['gzip', 'zip', 'tar'],
    autoDecompression: true
  },
  priority: 10
});
```

### Skill Composition

```typescript
// Example: Composing multiple skills into a data processing pipeline
const dataProcessingPipeline = await extensionManager.compose([
  'csv-reader-v1',
  'data-validator-v1',
  'data-transformer-v1',
  'json-writer-v1'
]);
```

## Migration Examples

### Cross-Environment Deployment

```typescript
// Example: Migrating skills between development and production
import { MigrationManager } from 'universal-skills-architecture';

const migrationManager = new MigrationManager();

// Export from development
const devPackage = await migrationManager.export('./dev-environment');

// Validate compatibility with production
const compatibility = await migrationManager.validateCompatibility(
  devPackage,
  productionEnvironment
);

if (compatibility.compatible) {
  // Import to production
  const result = await migrationManager.import(devPackage, './prod-environment');
  console.log('Migration successful:', result.success);
} else {
  // Adapt configuration for production
  const adaptedConfig = await migrationManager.adaptConfiguration(
    devPackage.configuration,
    productionEnvironment
  );
  
  // Import with adapted configuration
  const adaptedPackage = { ...devPackage, configuration: adaptedConfig };
  const result = await migrationManager.import(adaptedPackage, './prod-environment');
}
```

## Testing Examples

### Unit Testing Skills

```typescript
// Example: Unit testing a skill implementation
import { InMemorySkillRegistry, LayeredExecutionEngine } from 'universal-skills-architecture';

describe('File Reader Skill', () => {
  let registry: InMemorySkillRegistry;
  let engine: LayeredExecutionEngine;

  beforeEach(() => {
    registry = new InMemorySkillRegistry();
    engine = new LayeredExecutionEngine(registry);
  });

  test('should read file content correctly', async () => {
    // Register skill
    await registry.register(fileReaderSkill);

    // Execute skill
    const result = await engine.execute('file-reader-v1', {
      filePath: './test-data/sample.txt',
      encoding: 'utf8'
    });

    // Verify results
    expect(result.success).toBe(true);
    expect(result.output.content).toContain('sample content');
    expect(result.output.size).toBeGreaterThan(0);
  });

  test('should handle invalid file paths', async () => {
    await registry.register(fileReaderSkill);

    const result = await engine.execute('file-reader-v1', {
      filePath: './non-existent-file.txt'
    });

    expect(result.success).toBe(false);
    expect(result.error.type).toBe('RUNTIME_ERROR');
  });
});
```

### Integration Testing

```typescript
// Example: Integration testing with multiple skills
describe('Data Processing Workflow', () => {
  test('should process data end-to-end', async () => {
    // Register all required skills
    await registry.register(csvReaderSkill);
    await registry.register(dataValidatorSkill);
    await registry.register(jsonWriterSkill);
    await registry.register(dataProcessingWorkflow);

    // Execute workflow
    const result = await engine.execute('data-processing-workflow', {
      inputFile: './test-data/sample.csv',
      outputFile: './test-output/processed.json',
      validationRules: { required: ['id', 'name'] }
    });

    // Verify workflow completion
    expect(result.success).toBe(true);
    expect(result.output.processedRecords).toBeGreaterThan(0);
    
    // Verify output file exists
    const outputExists = fs.existsSync('./test-output/processed.json');
    expect(outputExists).toBe(true);
  });
});
```

## Best Practices Examples

### Error Handling

```typescript
// Example: Comprehensive error handling
async function executeSkillSafely(skillId: string, params: any) {
  try {
    // Validate skill exists
    const skill = await registry.resolve(skillId);
    
    // Validate parameters
    const validation = await engine.validateExecution(skill, params);
    if (!validation.valid) {
      throw new Error(`Parameter validation failed: ${validation.errors.join(', ')}`);
    }

    // Execute with timeout and resource limits
    const result = await engine.execute(skillId, params, {
      timeout: 30000,
      resourceLimits: {
        maxMemory: 256 * 1024 * 1024,
        maxDuration: 25000
      }
    });

    if (!result.success) {
      // Handle execution errors
      console.error('Execution failed:', result.error.message);
      
      // Provide suggestions if available
      if (result.error.suggestions) {
        console.log('Suggestions:');
        result.error.suggestions.forEach(suggestion => {
          console.log(`- ${suggestion}`);
        });
      }
      
      return null;
    }

    return result.output;
  } catch (error) {
    console.error('Unexpected error:', error.message);
    
    // Log error for debugging
    const errorMetrics = engine.getErrorMetrics();
    console.log('Recent errors:', errorMetrics.recentErrors.length);
    
    return null;
  }
}
```

### Performance Monitoring

```typescript
// Example: Performance monitoring and optimization
import { ResourceTracker } from 'universal-skills-architecture';

async function monitoredExecution(skillId: string, params: any) {
  const tracker = new ResourceTracker();
  
  tracker.checkpoint('execution-start');
  
  try {
    // Pre-execution checks
    const skill = await registry.resolve(skillId);
    tracker.checkpoint('skill-resolved');
    
    // Execute skill
    const result = await engine.execute(skillId, params);
    tracker.checkpoint('execution-complete');
    
    // Generate performance report
    const report = tracker.getReport();
    
    console.log('Performance Report:');
    console.log(`Total duration: ${report.totalDuration}ms`);
    console.log(`Memory delta: ${report.memoryDelta} bytes`);
    
    report.checkpoints.forEach(checkpoint => {
      console.log(`${checkpoint.name}: ${checkpoint.duration}ms`);
    });
    
    // Log slow executions
    if (report.totalDuration > 5000) {
      console.warn('Slow execution detected, consider optimization');
    }
    
    return result;
  } catch (error) {
    tracker.checkpoint('execution-error');
    const report = tracker.getReport();
    
    console.error('Execution failed after', report.totalDuration, 'ms');
    throw error;
  }
}
```

## Getting Started with Examples

1. **Clone the repository**
   ```bash
   git clone https://github.com/universal-skills-architecture/examples
   cd examples
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Run basic examples**
   ```bash
   # Layer 1 examples
   npm run examples:layer1
   
   # Layer 2 examples
   npm run examples:layer2
   
   # Layer 3 examples
   npm run examples:layer3
   
   # All examples
   npm run examples:all
   ```

4. **Run specific use cases**
   ```bash
   npm run examples:dev-workflow
   npm run examples:data-pipeline
   npm run examples:content-management
   ```

5. **Run performance tests**
   ```bash
   npm run examples:performance
   ```

Each example includes detailed comments explaining the concepts and implementation details. Start with the layer-specific examples to understand the architecture, then move on to the complete use cases to see how skills work together in real-world scenarios.