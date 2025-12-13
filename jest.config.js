module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/src'],
  testMatch: ['**/__tests__/**/*.ts', '**/?(*.)+(spec|test).ts'],
  testPathIgnorePatterns: ['/node_modules/', '/__tests__/e2e/', '/__tests__/setup.ts'],
  transform: {
    '^.+\\.ts$': 'ts-jest',
  },
  // Transform ESM modules that Jest can't handle
  transformIgnorePatterns: [
    'node_modules/(?!(uuid)/)',
  ],
  moduleNameMapper: {
    '^uuid$': require.resolve('uuid'),
  },
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
      branches: 40,
      functions: 50,
      lines: 50,
      statements: 50,
    },
  },
};
