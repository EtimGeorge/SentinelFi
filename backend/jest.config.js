module.exports = {
  moduleFileExtensions: ['js', 'json', 'ts'],
  rootDir: '.', // Relative to backend package root
  testRegex: '.*\.spec\.ts$',
  transform: {
    '^.+\\.(t|j)s$': ['ts-jest', {
      tsconfig: '<rootDir>/tsconfig.jest.json',
      useTsconfigPaths: true,
      diagnostics: false,
      isolatedModules: true,
    }],
  },
  // Mirrors the `paths` aliases in tsconfig.jest.json. `useTsconfigPaths` alone
  // does not register these with the Jest resolver in ts-jest 29, so any spec
  // that transitively imports an alias (e.g. database.config -> finance-core
  // entities using `@src/...`) failed with "Cannot find module".
  moduleNameMapper: {
    '^@shared/(.*)$': '<rootDir>/../shared/$1',
    '^@src/(.*)$': '<rootDir>/src/$1',
    '^@app/(.*)$': '<rootDir>/src/app/$1',
    '^@auth/(.*)$': '<rootDir>/src/auth/$1',
    '^@common/(.*)$': '<rootDir>/src/common/$1',
    '^@audit/(.*)$': '<rootDir>/src/audit/$1',
    '^@tenants/(.*)$': '<rootDir>/src/tenants/$1',
    '^@wbs/(.*)$': '<rootDir>/src/wbs/$1',
    '^@projects/(.*)$': '<rootDir>/src/projects/$1',
    '^@operational-budgets/(.*)$': '<rootDir>/src/operational-budgets/$1',
    '^@superadmin/(.*)$': '<rootDir>/src/superadmin/$1',
    '^@database/(.*)$': '<rootDir>/src/database/$1',
  },
  collectCoverageFrom: ['**/*.(t|j)s'],
  coverageDirectory: '../coverage',
  coverageThreshold: {
    global: {
      branches: 70,
      functions: 70,
      lines: 70,
      statements: 70,
    },
  },
  testEnvironment: 'node',
  transformIgnorePatterns: ['/node_modules/(?!uuid)/'],
};