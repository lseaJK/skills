module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/src', '<rootDir>/tests'],
  testMatch: [
    '**/__tests__/**/*.ts',
    '**/?(*.)+(spec|test).ts'
  ],
  transform: {
    '^.+\\.ts$': 'ts-jest',
  },
  collectCoverageFrom: [
    'src/**/*.ts',
    '!src/**/*.d.ts',
    '!src/**/index.ts'
  ],
  coverageDirectory: 'coverage',
  coverageReporters: ['text', 'lcov', 'html'],
  setupFilesAfterEnv: ['<rootDir>/tests/setup.ts'],
  testTimeout: 30000, // Increased timeout for integration tests
  projects: [
    {
      displayName: 'unit',
      testMatch: ['<rootDir>/tests/core/**/*.test.ts', '<rootDir>/tests/extensions/**/*.test.ts', '<rootDir>/tests/migration/**/*.test.ts'],
      testTimeout: 10000
    },
    {
      displayName: 'integration',
      testMatch: ['<rootDir>/tests/integration/**/*.test.ts'],
      testTimeout: 60000, // Longer timeout for integration tests
      setupFilesAfterEnv: ['<rootDir>/tests/setup.ts']
    }
  ]
};