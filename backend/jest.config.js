module.exports = {
  moduleFileExtensions: ['js', 'json', 'ts'],
  rootDir: '.', // Relative to backend package root
  testRegex: '.*\.spec\.ts$',
  transform: {
    '^.+\.(t|j)s$': ['ts-jest', { tsconfig: '<rootDir>/tsconfig.jest.json', useTsconfigPaths: true }],
  },
  collectCoverageFrom: ['**/*.(t|j)s'],
  coverageDirectory: '../coverage',
  testEnvironment: 'node',
  moduleNameMapper: {
    "^@shared/types/(.*)$": "<rootDir>/../shared/dist/types/$1.js"
  },
  // moduleNameMapper will be removed as tsconfig.jest.json handles paths
};