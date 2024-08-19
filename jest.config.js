module.exports = {
  testEnvironment: 'jsdom',
  transform: {
    '^.+.tsx?$': 'ts-jest',
    '^.+\\.js$': 'babel-jest',
  },
  transformIgnorePatterns: ['node_modules/(?!web-serial-polyfill)/'],
  runner: 'jest-serial-runner',
};

