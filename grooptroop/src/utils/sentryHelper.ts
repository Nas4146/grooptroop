import * as Sentry from '@sentry/react-native';
import { Alert } from 'react-native';

export const SentryHelper = {
  sendTestError: async () => {
    console.log('[SENTRY] Sending test error to Sentry');
    try {
      // Create a more distinctive error
      const testError = new Error(`Test Error from GroopTroop at ${new Date().toISOString()}`);
      
      // Explicitly flush events after capturing
      Sentry.withScope(scope => {
        // Don't use Sentry.Severity.Error as it might not be available
        scope.setLevel('error'); // Use string 'error' instead of enum
        scope.setTag('manual_test', 'true');
        scope.setExtra('device_time', new Date().toString());
        
        console.log('[SENTRY] Capturing exception with scope');
        Sentry.captureException(testError);
      });
      
      // Force events to be sent immediately - with error handling
      console.log('[SENTRY] Calling flush to send events immediately');
      try {
        await Sentry.flush(5000); // Wait up to 5 seconds
        console.log('[SENTRY] Flush completed');
      } catch (flushError) {
        console.error('[SENTRY] Error during flush:', flushError);
      }
      
      Alert.alert('Sent to Sentry', 'Test error was sent. Check dashboard in a few minutes.');
    } catch (e) {
      console.error('[SENTRY] Error sending test:', e);
      Alert.alert('Error', 'Failed to send test to Sentry');
    }
  },
  
  sendTestMessage: async () => {
    console.log('[SENTRY] Testing direct message capture');
    try {
      // Direct message capture with timestamp for uniqueness
      // Use the string version of severity instead of the enum
      Sentry.captureMessage(
        `Test message from GroopTroop app at ${new Date().toISOString()}`, 
        'error' // Use string 'error' instead of Sentry.Severity.Error
      );
      
      // Flush immediately
      await Sentry.flush(5000);
      Alert.alert('Direct Message Sent', 'Sent a direct message to Sentry');
    } catch (e) {
      console.error('[SENTRY] Error sending message:', e);
      Alert.alert('Error', 'Failed to send message to Sentry');
    }
  },
  
  testNetworkConnectivity: async () => {
    try {
      console.log('[SENTRY] Testing network connectivity');
      const response = await fetch('https://sentry.io/api/');
      const status = response.status;
      Alert.alert('Network Test', `Sentry.io connectivity: ${status === 200 ? 'Good' : 'Status ' + status}`);
    } catch (e) {
      const error = e as Error;
      Alert.alert('Network Error', `Cannot reach Sentry servers: ${error.message}`);
    }
  }
};