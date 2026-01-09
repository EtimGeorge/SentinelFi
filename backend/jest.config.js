module.exports = {
  moduleFileExtensions: ['js', 'json', 'ts'],
  rootDir: 'src',
  testRegex: '.*\.spec\.ts$',
  transform: {
    '^.+\.(t|j)s$': 'ts-jest',
  },
  collectCoverageFrom: ['**/*.(t|j)s'],
  coverageDirectory: '../coverage',
  testEnvironment: 'node',
  moduleNameMapper: {
    '^src/(.*)$': '<rootDir>/$1',
    '^@app/(.*)$': '<rootDir>/$1',
    '^@common/(.*)$': '<rootDir>/common/$1',
    '^@auth/(.*)$': '<rootDir>/auth/$1',
    '^@tenants/(.*)$': '<rootDir>/tenants/$1',
    '^@wbs/(.*)$': '<rootDir>/wbs/$1',
    '^@shared/(.*)$': '<rootDir>/../../shared/$1',
  },
};