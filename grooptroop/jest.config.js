module.exports = {
  preset: 'jest-expo',
  transformIgnorePatterns: [
    'node_modules/(?!(jest-)?react-native|@react-native|@react-native/.*|expo-.*|@expo/.*|react-navigation|@react-navigation/.*|@unimodules/.*|unimodules|native-base|react-native-svg)'
  ],
  setupFilesAfterEnv: [
    './tests/setupTests.js'
  ],
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json', 'node'],
  testPathIgnorePatterns: [
    '/node_modules/'
  ],
  collectCoverageFrom: [
    'src/**/*.{js,jsx,ts,tsx}',
    '!**/node_modules/**'
  ],
  transform: {
    '^.+\\.(js|jsx|ts|tsx)$': [
      'babel-jest',
      {
        presets: ['babel-preset-expo'],
        plugins: ['@babel/plugin-transform-flow-strip-types']
      }
    ]
  },
  moduleNameMapper: {
    // Explicitly mock the problematic modules
    '@react-native/js-polyfills/error-guard': '<rootDir>/tests/__mocks__/errorGuardMock.js'
  }
};