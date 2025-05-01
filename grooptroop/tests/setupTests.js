import 'react-native-gesture-handler/jestSetup';

jest.mock('@react-native/js-polyfills/error-guard', () => ({
  // Simple mock implementation
  ErrorUtils: {
    setGlobalHandler: jest.fn(),
    reportError: jest.fn(),
    reportFatalError: jest.fn(),
  }
}));

// Mock the native modules that might cause issues in tests
jest.mock('react-native/Libraries/Animated/NativeAnimatedHelper');

// Mock the navigation hooks
jest.mock('@react-navigation/native', () => {
  const actualNav = jest.requireActual('@react-navigation/native');
  return {
    ...actualNav,
    useNavigation: () => ({
      navigate: jest.fn(),
      goBack: jest.fn(),
    }),
    useRoute: () => ({
      params: {},
    }),
  };
});

// Mock Ionicons
jest.mock('@expo/vector-icons', () => {
  const { View } = require('react-native');
  return {
    Ionicons: function MockIonicons(props) {
      return <View testID={`icon-${props.name}`} />;
    },
  };
});

// Global fetch mock
global.fetch = jest.fn(() =>
  Promise.resolve({
    json: () => Promise.resolve({}),
  })
);