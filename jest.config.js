module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/src'],
  testMatch: ['**/__tests__/**/*.ts', '**/?(*.)+(spec|test).ts'],
  testPathIgnorePatterns: ['/node_modules/', '/__tests__/e2e/', '/__tests__/setup.ts'],
  transform: {
    '^.+\\.ts$': 'ts-jest',
  },
  // Setup file to mock ESM modules like uuid
  setupFilesAfterEnv: ['<rootDir>/src/__tests__/setup.ts'],
  collectCoverageFrom: [
    'src/**/*.ts',
    '!src/**/*.d.ts',
    '!src/**/*.test.ts',
    '!src/**/*.spec.ts',
    '!src/__tests__/**',
    '!src/migrations/**',
    '!src/grpc/**',
    '!src/messaging/**',
    '!src/server.ts',
    '!src/config/database.ts',
    '!src/config/ormconfig.ts',
    '!src/scripts/**',
    '!src/types/grpc.types.ts',
    '!src/utils/logger.ts',
  ],
  coverageThreshold: {
    global: {
      branches: 20,
      functions: 25,
      lines: 20,
      statements: 20,
    },
  },
};
