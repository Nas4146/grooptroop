import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { Platform } from 'react-native';
import Constants from 'expo-constants';

// Configure notifications
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

export class NotificationService {
  // Request permission for notifications
  static async requestPermission() {
    console.log('[NOTIFICATION] Requesting permission');
    
    if (!Device.isDevice) {
      console.log('[NOTIFICATION] Must use physical device for notifications');
      return false;
    }
    
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;
    
    if (existingStatus !== 'granted') {
      console.log('[NOTIFICATION] Permission not granted, requesting...');
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }
    
    if (finalStatus !== 'granted') {
      console.log('[NOTIFICATION] Failed to get notification permission');
      return false;
    }
    
    console.log('[NOTIFICATION] Permission granted:', finalStatus);
    return true;
  }
  
  // Set app icon badge number
  static async setBadgeCount(count: number) {
    console.log(`[NOTIFICATION] Setting badge count to ${count}`);
    try {
      const validCount = Math.max(0, Math.round(count));

      await Notifications.setBadgeCountAsync(validCount);

    // Double-check that it worked
    const currentCount = await Notifications.getBadgeCountAsync();
    console.log(`[NOTIFICATION] Badge count set to ${currentCount}`);

    return currentCount === validCount;
  } catch (error) {
    console.error('[NOTIFICATION] Error setting badge count:', error);
    return false;
  }
}
  
  // Get expo push token for device
  static async getExpoPushToken() {
    try {
      console.log('[NOTIFICATION] Getting push token');
      
      if (!Device.isDevice) {
        console.log('[NOTIFICATION] Must use physical device for push tokens');
        return null;
      }
      
      const { status } = await Notifications.getPermissionsAsync();
      if (status !== 'granted') {
        console.log('[NOTIFICATION] No permission for notifications');
        return null;
      }
      
      // Get push token
      const projectId = Constants.expoConfig?.extra?.eas?.projectId;
      if (!projectId) {
        console.log('[NOTIFICATION] No project ID available');
        return null;
      }
      
      const token = await Notifications.getExpoPushTokenAsync({
        projectId: projectId,
      });
      
      console.log('[NOTIFICATION] Push token:', token.data);
      
      // For Android, set notification channel
      if (Platform.OS === 'android') {
        Notifications.setNotificationChannelAsync('default', {
          name: 'Default',
          importance: Notifications.AndroidImportance.HIGH,
          vibrationPattern: [0, 250, 250, 250],
          lightColor: '#78c0e1',
        });
      }
      
      return token.data;
    } catch (error) {
      console.error('[NOTIFICATION] Error getting push token:', error);
      return null;
    }
  }
}