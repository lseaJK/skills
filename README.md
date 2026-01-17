# Universal Skills Architecture

A portable, layered skill management platform for AI agents and any project requiring standardized skill invocation and extension mechanisms.

## Overview

The Universal Skills Architecture system provides a three-layer architecture for organizing and executing skills:

- **Layer 1**: Atomic Operations - Direct function calls for basic operations
- **Layer 2**: Sandboxed Tools - Command-line programs and tools in isolated environments  
- **Layer 3**: API Wrappers - High-level API integrations and complex workflows

## Features

- 🏗️ **Layered Architecture**: Three distinct layers for different abstraction levels
- 🔧 **Skill Management**: Create, register, discover, and execute skills
- 🔌 **Extension System**: Extend and compose existing skills
- 📦 **Migration Support**: Export and import skill packages across environments
- 🎯 **VS Code Integration**: Rich UI for skill management and editing
- ✅ **Property-Based Testing**: Comprehensive correctness validation
- 🛡️ **Security**: Sandboxed execution for safe skill operation

## Project Structure

```
src/
├── types/           # Core type definitions
├── core/            # Core implementations (registry, execution engine)
├── layers/          # Layer-specific implementations
├── extensions/      # Extension management
├── migration/       # Migration and portability
└── vscode-extension/ # VS Code integration interfaces

tests/               # Test suite with property-based tests
```

## Getting Started

### Installation

```bash
npm install
```

### Build

```bash
npm run build
```

### Testing

```bash
# Run all tests
npm test

# Run tests with coverage
npm run test:coverage

# Run tests in watch mode
npm run test:watch
```

### Development

```bash
# Start development mode with auto-compilation
npm run dev

# Lint code
npm run lint
```

## Core Concepts

### Skill Definition

Skills are defined using a standardized format that includes:

- **Invocation Specification**: How the skill can be called
- **Extension Points**: Where the skill can be extended
- **Dependencies**: What the skill requires to function
- **Metadata**: Author, version, tags, etc.

### Three-Layer Architecture

1. **Layer 1 - Atomic Operations**: Direct function calls for basic operations like file I/O, data processing, and calculations.

2. **Layer 2 - Sandboxed Tools**: Command-line programs and external tools executed in secure, isolated environments.

3. **Layer 3 - API Wrappers**: High-level API integrations, complex workflows, and intelligent decision-making systems.

### Extension System

Skills can be extended through:
- **Override**: Replace specific functionality
- **Compose**: Combine multiple skills
- **Decorate**: Add behavior around existing functionality

## Usage Examples

### Creating a Skill

```typescript
import { SkillDefinitionEngine } from './src/core';

const engine = new SkillDefinitionEngine();
const skill = engine.createSkillTemplate(1); // Layer 1 skill

skill.name = 'File Reader';
skill.description = 'Reads file contents';
// ... configure skill
```

### Registering and Executing Skills

```typescript
import { InMemorySkillRegistry, BasicExecutionEngine } from './src/core';

const registry = new InMemorySkillRegistry();
const executor = new BasicExecutionEngine();

await registry.register(skill);
const result = await executor.execute(skill.id, { filename: 'test.txt' });
```

### Managing Skills with VS Code Extension

The system includes interfaces for VS Code integration, providing:
- Skill tree view and management
- Visual skill editor with validation
- Testing and debugging capabilities
- Import/export functionality

## Testing Strategy

The project uses a dual testing approach:

- **Unit Tests**: Specific examples and edge cases using Jest
- **Property-Based Tests**: Universal properties using fast-check

Property-based tests validate correctness properties like:
- Skill definition template consistency
- Registration/query round-trip behavior
- Layer interface characteristics
- Extension mechanism support

## Contributing

1. Fork the repository
2. Create a feature branch
3. Add tests for new functionality
4. Ensure all tests pass
5. Submit a pull request

## License

MIT License - see LICENSE file for details.