// Test setup file for Jest
import 'jest';
import { SkillDefinition } from '../src/types';

// Global test configuration
beforeEach(() => {
  // Reset any global state before each test
});

afterEach(() => {
  // Cleanup after each test
});

// Test utilities
export const testUtils = {
  createMockSkillDefinition: (overrides: Partial<SkillDefinition> = {}): SkillDefinition => ({
    id: 'test-skill-id',
    name: 'Test Skill',
    version: '1.0.0',
    layer: 1,
    description: 'A test skill',
    invocationSpec: {
      inputSchema: { type: 'object', properties: {} },
      outputSchema: { type: 'object', properties: {} },
      executionContext: {
        environment: {},
        timeout: 30000
      },
      parameters: [],
      examples: []
    },
    extensionPoints: [],
    dependencies: [],
    metadata: {
      author: 'Test Author',
      created: new Date('2024-01-01'),
      updated: new Date('2024-01-01'),
      tags: ['test'],
      category: 'test'
    },
    ...overrides
  })
};