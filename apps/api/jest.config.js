/** @type {import('ts-jest').JestConfigWithTsJest} */
export default {
  testEnvironment: 'node',
  transform: {
    '^.+\\.(t|j)sx?$': ['ts-jest', { tsconfig: 'tsconfig.json' }],
  },
  testMatch: ['**/?(*.)+(jest).(ts|tsx|js)'],
  roots: ['<rootDir>/src', '<rootDir>/test'],
};
