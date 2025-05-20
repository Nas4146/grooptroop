import 'react-native-gesture-handler';
import { AppRegistry } from 'react-native';
import * as Sentry from '@sentry/react-native';

// Initialize Sentry first - before any other imports
console.log('[SENTRY] Initializing Sentry in index.ts');
try {
  Sentry.init({
    dsn: 'https://4c10d218343709c4a2b2ebac9da0f21e@o4509352771452928.ingest.us.sentry.io/4509352775122944',
    tracesSampleRate: __DEV__ ? 1.0 : 0.2,   // Keep it small in production
    attachStacktrace: true,
    environment: __DEV__ ? 'development' : 'production',
    debug: __DEV__,
    // Keep this empty for 6.10.0
    integrations: []
  });
} catch (error) {
  console.error('[SENTRY] Error during initialization:', error);
}

// Import your app only after Sentry is initialized
import App from './App';

// Register app component
AppRegistry.registerComponent('main', () => App);

// Export the app for Expo purposes
export default App;
