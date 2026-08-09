/** @type {import('jest').Config} */
const config = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/lib'],
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/',
  },
};
module.exports = config;
