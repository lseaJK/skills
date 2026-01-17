# Universal Skills Architecture - User Guide

## Table of Contents

1. [Getting Started](#getting-started)
2. [Understanding the Three-Layer Architecture](#understanding-the-three-layer-architecture)
3. [Creating Your First Skill](#creating-your-first-skill)
4. [Using the VS Code Extension](#using-the-vs-code-extension)
5. [Skill Management](#skill-management)
6. [Advanced Features](#advanced-features)
7. [Performance Optimization](#performance-optimization)
8. [Troubleshooting](#troubleshooting)

## Getting Started

### Installation

1. **Install the Core System**
   ```bash
   npm install universal-skills-architecture
   ```

2. **Install VS Code Extension**
   - Open VS Code
   - Go to Extensions (Ctrl+Shift+X)
   - Search for "Universal Skills Architecture"
   - Click Install

3. **Initialize a Project**
   ```bash
   mkdir my-skills-project
   cd my-skills-project
   npm init -y
   npm install universal-skills-architecture
   ```

### Basic Setup

Create a basic setup file:

```typescript
// setup.ts
import { InMemorySkillRegistry, LayeredExecutionEngine } from 'universal-skills-architecture';

// Initialize the skill registry
const registry = new InMemorySkillRegistry();

// Initialize the execution engine
const engine = new LayeredExecutionEngine(registry);

export { registry, engine };
```

## Understanding the Three-Layer Architecture

The Universal Skills Architecture organizes skills into three distinct layers, each serving different purposes and abstraction levels.

### Layer 1: Function Calls (Atomic Operations)

**Purpose**: Direct, fast, deterministic operations
**Use Cases**: File I/O, data processing, mathematical calculations
**Characteristics**:
- Synchronous or asynchronous function calls
- Minimal overhead
- Direct parameter passing
- Immediate results

**Example Use Cases**:
- Reading/writing files
- String manipulation
- Data validation
- Simple calculations

### Layer 2: Sandbox Tools (Command Line Programs)

**Purpose**: Safe execution of external tools and commands
**Use Cases**: Shell commands, external tool integration, script execution
**Characteristics**:
- Isolated execution environment
- Process management
- Resource limitations
- Security boundaries

**Example Use Cases**:
- Running shell commands
- Executing scripts
- Using external tools (git, docker, etc.)
- File system operations

### Layer 3: Wrapper APIs (Programming and Execution Code)

**Purpose**: High-level abstractions and complex workflows
**Use Cases**: API integrations, multi-step processes, intelligent decision making
**Characteristics**:
- Complex business logic
- Multi-step workflows
- Context awareness
- API compositions

**Example Use Cases**:
- REST API integrations
- Multi-step data processing pipelines
- Workflow orchestration
- AI/ML model integrations

## Creating Your First Skill

### Step 1: Define the Skill Structure

```typescript
import { SkillDefinition } from 'universal-skills-architecture';

const fileReaderSkill: SkillDefinition = {
  id: 'file-reader-v1',
  name: 'File Reader',
  version: '1.0.0',
  layer: 1, // Layer 1 for direct file operations
  description: 'Reads content from files with various encoding options',
  
  invocationSpec: {
    inputSchema: {
      type: 'object',
      properties: {
        filePath: {
          type: 'string',
          description: 'Path to the file to read'
        },
        encoding: {
          type: 'string',
          enum: ['utf8', 'ascii', 'base64'],
          default: 'utf8'
        }
      },
      required: ['filePath']
    },
    
    outputSchema: {
      type: 'object',
      properties: {
        content: {
          type: 'string',
          description: 'File content'
        },
        size: {
          type: 'number',
          description: 'File size in bytes'
        }
      }
    },
    
    executionContext: {
      environment: {},
      security: {
        allowedPaths: ['/tmp', './data'],
        sandboxed: true
      }
    },
    
    parameters: [
      {
        name: 'filePath',
        type: 'string',
        description: 'Path to the file to read',
        required: true
      },
      {
        name: 'encoding',
        type: 'string',
        description: 'File encoding (utf8, ascii, base64)',
        required: false,
        defaultValue: 'utf8'
      }
    ],
    
    examples: [
      {
        name: 'Read text file',
        description: 'Read a simple text file',
        input: {
          filePath: './README.md',
          encoding: 'utf8'
        },
        expectedOutput: {
          content: '# My Project\n\nThis is a sample project...',
          size: 1024
        }
      }
    ]
  },
  
  extensionPoints: [],
  dependencies: [],
  
  metadata: {
    author: 'Your Name',
    created: new Date().toISOString(),
    updated: new Date().toISOString(),
    tags: ['file', 'io', 'utility'],
    category: 'file-operations'
  }
};
```

### Step 2: Register the Skill

```typescript
import { registry } from './setup';

async function registerSkill() {
  try {
    await registry.register(fileReaderSkill);
    console.log('Skill registered successfully!');
  } catch (error) {
    console.error('Failed to register skill:', error.message);
  }
}

registerSkill();
```

### Step 3: Execute the Skill

```typescript
import { engine } from './setup';

async function executeSkill() {
  try {
    const result = await engine.execute('file-reader-v1', {
      filePath: './package.json',
      encoding: 'utf8'
    });
    
    if (result.success) {
      console.log('File content:', result.output.content);
      console.log('Execution time:', result.metadata.duration, 'ms');
    } else {
      console.error('Execution failed:', result.error.message);
    }
  } catch (error) {
    console.error('Unexpected error:', error.message);
  }
}

executeSkill();
```

## Using the VS Code Extension

### Opening the Skills Explorer

1. Open VS Code in your project directory
2. The Skills Explorer should appear in the sidebar
3. If not visible, use Ctrl+Shift+P and search for "Skills Architecture: Show Skills Panel"

### Creating Skills Visually

1. **Click the "+" button** in the Skills Explorer
2. **Enter a skill name** when prompted
3. **Select the appropriate layer** (1, 2, or 3)
4. **The skill editor opens automatically**

### Using the Skill Editor

The visual skill editor provides a comprehensive interface for creating and editing skills:

#### Basic Information Section
- **Name**: Enter a descriptive skill name
- **Version**: Use semantic versioning (e.g., 1.0.0)
- **Layer**: Select the appropriate architecture layer
- **Description**: Provide a detailed description

#### Invocation Specification Section
- **Input Schema**: Define expected input structure using JSON Schema
- **Output Schema**: Define expected output structure
- **Parameters**: Add structured parameter definitions
- **Examples**: Create test cases with input/output pairs

#### Metadata Section
- **Author**: Your name or organization
- **Category**: Skill category for organization
- **Tags**: Comma-separated tags for searchability

#### Toolbar Actions
- **Validate**: Check skill definition for errors
- **Test**: Run all examples and show results
- **Preview**: Simulate skill execution
- **Register**: Add skill to the registry
- **Save**: Save changes to file

### Working with Skill Files

Skills are stored as `.skill.json` files in your project. The extension automatically:
- Associates `.skill.json` files with the skill editor
- Provides syntax highlighting and validation
- Offers auto-completion for common fields
- Monitors file changes and updates the explorer

## Skill Management

### Discovering Skills

```typescript
// Find all skills in Layer 1
const layer1Skills = await registry.discover({ layer: 1 });

// Search by category and tags
const fileSkills = await registry.discover({
  category: 'file-operations',
  tags: ['io', 'utility']
});

// Text search across names and descriptions
const searchResults = await registry.discover({
  name: 'reader',
  description: 'file'
});

// Paginated results
const pagedResults = await registry.discover({
  limit: 10,
  offset: 20
});
```

### Skill Validation

```typescript
const validation = registry.validate(skill);

if (!validation.valid) {
  console.log('Validation Errors:');
  validation.errors.forEach(error => {
    console.log(`- ${error.code}: ${error.message}`);
  });
}

if (validation.warnings.length > 0) {
  console.log('Validation Warnings:');
  validation.warnings.forEach(warning => {
    console.log(`- ${warning.code}: ${warning.message}`);
  });
}
```

### Updating Skills

```typescript
// Modify skill definition
const updatedSkill = { ...existingSkill };
updatedSkill.version = '1.1.0';
updatedSkill.description = 'Updated description';

// Update in registry
await registry.update(skill.id, updatedSkill);
```

### Removing Skills

```typescript
await registry.unregister('skill-id');
```

## Advanced Features

### Skill Extensions

#### Creating Extensions

```typescript
import { ExtensionManager } from 'universal-skills-architecture';

const extensionManager = new ExtensionManager(registry);

// Extend an existing skill
const extendedSkillId = await extensionManager.extend('base-file-reader', {
  id: 'enhanced-file-reader',
  type: 'override',
  implementation: {
    // Enhanced implementation
    supportedEncodings: ['utf8', 'ascii', 'base64', 'binary'],
    compressionSupport: true
  },
  priority: 10
});
```

#### Skill Composition

```typescript
// Compose multiple skills into one
const composedSkill = await extensionManager.compose([
  'file-reader-v1',
  'data-validator-v1',
  'format-converter-v1'
]);
```

### Migration and Portability

#### Exporting Skills

```typescript
import { MigrationManager } from 'universal-skills-architecture';

const migrationManager = new MigrationManager();

// Export all skills from current project
const skillPackage = await migrationManager.export('./');

// Save to file
fs.writeFileSync('skills-package.json', JSON.stringify(skillPackage, null, 2));
```

#### Importing Skills

```typescript
// Load skill package
const skillPackage = JSON.parse(fs.readFileSync('skills-package.json', 'utf8'));

// Import to new environment
const result = await migrationManager.import(skillPackage, './new-project');

if (result.success) {
  console.log('Imported skills:', result.importedSkills);
} else {
  console.log('Import issues:', result.issues);
}
```

#### Environment Compatibility

```typescript
// Check compatibility before import
const compatibility = await migrationManager.validateCompatibility(
  skillPackage,
  targetEnvironment
);

if (!compatibility.compatible) {
  console.log('Compatibility issues:', compatibility.issues);
  
  // Adapt configuration
  const adaptedConfig = await migrationManager.adaptConfiguration(
    skillPackage.configuration,
    targetEnvironment
  );
}
```

### Workflow Integration

#### Layer 3 Workflows

```typescript
const workflowSkill: SkillDefinition = {
  id: 'data-processing-workflow',
  name: 'Data Processing Workflow',
  layer: 3,
  // ... other properties
  
  invocationSpec: {
    // ... schemas
    executionContext: {
      workflow: {
        steps: [
          {
            id: 'read-data',
            skillId: 'file-reader-v1',
            parameters: { filePath: '${input.dataFile}' }
          },
          {
            id: 'validate-data',
            skillId: 'data-validator-v1',
            parameters: { data: '${steps.read-data.output.content}' }
          },
          {
            id: 'process-data',
            skillId: 'data-processor-v1',
            parameters: { 
              data: '${steps.validate-data.output.validData}',
              options: '${input.processingOptions}'
            }
          }
        ],
        errorHandling: {
          retryPolicy: {
            maxRetries: 3,
            backoffStrategy: 'exponential'
          }
        }
      }
    }
  }
};
```

## Performance Optimization

### Caching Configuration

```typescript
// Configure registry caching
const registry = new InMemorySkillRegistry();

// Get performance metrics
const metrics = registry.getPerformanceMetrics();
console.log('Cache hit rate:', metrics.cache.hitRate);
console.log('Average query time:', metrics.averageQueryTime);

// Optimize performance
registry.optimize(); // Cleanup expired entries

// Preload frequently used skills
await registry.preloadSkills(['skill1', 'skill2', 'skill3']);
```

### Execution Optimization

```typescript
// Set resource limits for execution
const result = await engine.execute('skill-id', params, {
  resourceLimits: {
    maxMemory: 256 * 1024 * 1024, // 256MB
    maxDuration: 10000,           // 10 seconds
    maxNetworkRequests: 50
  },
  timeout: 15000 // 15 seconds total timeout
});

// Monitor active executions
const activeExecutions = engine.getActiveExecutions();
console.log('Currently running:', activeExecutions.length);

// Get execution statistics
const stats = engine.getExecutionStats();
console.log('Total executions:', stats.total);
console.log('By layer:', stats.byLayer);
```

### Performance Monitoring

```typescript
import { ResourceTracker } from 'universal-skills-architecture';

const tracker = new ResourceTracker();

tracker.checkpoint('start-operation');
// ... perform operations
tracker.checkpoint('data-loaded');
// ... more operations
tracker.checkpoint('processing-complete');

const report = tracker.getReport();
console.log('Performance Report:');
console.log('Total duration:', report.totalDuration, 'ms');
console.log('Memory delta:', report.memoryDelta, 'bytes');

report.checkpoints.forEach(checkpoint => {
  console.log(`${checkpoint.name}: ${checkpoint.duration}ms, ${checkpoint.memoryDelta} bytes`);
});
```

## Troubleshooting

### Common Issues

#### Skill Registration Failures

**Problem**: Skill fails to register with validation errors

**Solutions**:
1. Check required fields (id, name, version, layer)
2. Ensure JSON schemas are valid
3. Verify layer is 1, 2, or 3
4. Check for ID conflicts

```typescript
// Debug validation issues
const validation = registry.validate(skill);
if (!validation.valid) {
  validation.errors.forEach(error => {
    console.log(`Error: ${error.code} - ${error.message}`);
    if (error.suggestions) {
      error.suggestions.forEach(suggestion => {
        console.log(`  Suggestion: ${suggestion}`);
      });
    }
  });
}
```

#### Execution Failures

**Problem**: Skill execution fails or times out

**Solutions**:
1. Check parameter validation
2. Verify resource limits
3. Review execution context
4. Check dependencies

```typescript
// Debug execution issues
try {
  const result = await engine.execute('skill-id', params);
} catch (error) {
  console.error('Execution error:', error.message);
  
  // Get detailed error information
  const errorMetrics = engine.getErrorMetrics();
  console.log('Recent errors:', errorMetrics.recentErrors);
}
```

#### Performance Issues

**Problem**: Slow skill discovery or execution

**Solutions**:
1. Enable caching
2. Optimize queries
3. Set appropriate resource limits
4. Monitor performance metrics

```typescript
// Monitor performance
const metrics = registry.getPerformanceMetrics();
if (metrics.cache.hitRate < 0.8) {
  console.log('Low cache hit rate, consider preloading skills');
}

if (metrics.averageQueryTime > 100) {
  console.log('Slow queries detected, optimize query patterns');
}
```

### VS Code Extension Issues

#### Extension Not Loading

**Solutions**:
1. Restart VS Code
2. Check extension is enabled
3. Verify workspace has skills files
4. Check output panel for errors

#### Skill Editor Not Opening

**Solutions**:
1. Ensure file has `.skill.json` extension
2. Right-click and select "Open with Skill Editor"
3. Check file is valid JSON
4. Restart extension

### Getting Help

1. **Documentation**: Check the [API documentation](../api/README.md)
2. **Examples**: Review [example skills](../examples/)
3. **Issues**: Report bugs on GitHub
4. **Community**: Join discussions in GitHub Discussions

### Debug Mode

Enable debug mode for detailed logging:

```typescript
// In VS Code settings.json
{
  "skillsArchitecture.debugMode": true
}
```

Or programmatically:

```typescript
import { Logger } from 'universal-skills-architecture';

Logger.setLevel('debug');
Logger.enableConsoleOutput(true);
```

This will provide detailed logs for troubleshooting issues with skill registration, execution, and extension behavior.