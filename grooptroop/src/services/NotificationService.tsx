import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import * as Sentry from '@sentry/react-native';
import logger from '../utils/logger';

// Configure notifications
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

export class NotificationService {
  static async registerForPushNotifications(): Promise<string | null> {
    let token;
    
    // Don't request notifications in development (simulators)
    if (__DEV__) {
      console.log('[NOTIFICATION] Getting push token (development mode)');
      return 'DEVELOPMENT-TOKEN';
    }
    
    if (Device.isDevice) {
      // Check if we have permission first
      const { status: existingStatus } = await Notifications.getPermissionsAsync();
      let finalStatus = existingStatus;
      
      // If no permission, request it
      if (existingStatus !== 'granted') {
        console.log('[NOTIFICATION] Requesting push notification permissions');
        const { status } = await Notifications.requestPermissionsAsync();
        finalStatus = status;
      }
      
      // If no permission, bail out
      if (finalStatus !== 'granted') {
        console.log('[NOTIFICATION] Push notification permission not granted');
        return null;
      }
      
      // Get the token
      try {
        token = (await Notifications.getExpoPushTokenAsync({
          projectId: '1d687a2b-24c6-42c9-9b8f-ab3a14847775' // Replace with your project ID
        })).data;
        
        console.log(`[NOTIFICATION] Got push token: ${token.substring(0, 10)}...`);
      } catch (e) {
        console.error('[NOTIFICATION] Error getting push token:', e);
        Sentry.captureException(e);
      }
    } else {
      console.log('[NOTIFICATION] Must use physical device for Push Notifications');
    }

    // Required for Android
    if (Platform.OS === 'android') {
      Notifications.setNotificationChannelAsync('default', {
        name: 'default',
        importance: Notifications.AndroidImportance.MAX,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#7C3AED', // violet-600
      });
    }

    return token;
  }
  
  // Request notification permissions
  static async requestPermission() {
    if (__DEV__) {
      console.log('[NOTIFICATION] Permission disabled for development');
      return true;
    }
    
    try {
      const { status } = await Notifications.requestPermissionsAsync();
      return status === 'granted';
    } catch (e) {
      console.error('[NOTIFICATION] Error requesting notification permission:', e);
      return false;
    }
  }
  
  // Set badge count on app icon
  static async setBadgeCount(count: number): Promise<boolean> {
    try {
      if (__DEV__) {
        console.log(`[NOTIFICATION] Badge count set to ${count} (development mode)`);
        return true;
      }
      
      await Notifications.setBadgeCountAsync(count);
      console.log(`[NOTIFICATION] Badge count updated`);
      return true;
    } catch (e) {
      console.error('[NOTIFICATION] Failed to set badge count:', e);
      return false;
    }
  }
  
  // Schedule a local notification
  static async scheduleLocalNotification(
    title: string, 
    body: string,
    data: any = {},
    options: { sound?: boolean, badge?: number } = {}
  ): Promise<string | null> {
    try {
      const notificationId = await Notifications.scheduleNotificationAsync({
        content: {
          title,
          body,
          data,
          sound: options.sound !== false,
          badge: options.badge,
        },
        trigger: null, // immediate
      });
      
      console.log(`[NOTIFICATION] Scheduled local notification: ${notificationId}`);
      return notificationId;
    } catch (e) {
      console.error('[NOTIFICATION] Error scheduling notification:', e);
      return null;
    }
  }
  
  // Clear all notifications
  static async clearAllNotifications(): Promise<void> {
    try {
      await Notifications.dismissAllNotificationsAsync();
      console.log('[NOTIFICATION] All notifications cleared');
    } catch (e) {
      console.error('[NOTIFICATION] Error clearing notifications:', e);
    }
  }
  
  // Set up notification listeners
  static setUpNotificationListeners(
    onNotificationReceived: (notification: Notifications.Notification) => void,
    onNotificationResponseReceived: (response: Notifications.NotificationResponse) => void
  ): () => void {
    const receivedSubscription = Notifications.addNotificationReceivedListener(onNotificationReceived);
    const responseSubscription = Notifications.addNotificationResponseReceivedListener(onNotificationResponseReceived);
    
    // Return cleanup function
    return () => {
      receivedSubscription.remove();
      responseSubscription.remove();
    };
  }
}