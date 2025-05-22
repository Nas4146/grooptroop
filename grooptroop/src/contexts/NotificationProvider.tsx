import React, { createContext, useState, useContext, useEffect, useCallback } from 'react';
import { AppState, Platform } from 'react-native';
import * as Notifications from 'expo-notifications';
import { useAuth } from './AuthProvider';
import { ChatService } from '../services/chatService';
import { NotificationService } from '../services/NotificationService';
import logger from '../utils/logger';

// Keep track of global unread count (for app badge)
let globalUnreadCount = 0;

// Notification context type
interface NotificationContextType {
  unreadCount: number;
  pushToken: string | null;
  resetUnreadCount: () => void;
  refreshUnreadCount: () => Promise<void>;
  sendLocalNotification: (title: string, body: string, data?: any) => Promise<void>;
}

// Create context
const NotificationContext = createContext<NotificationContextType>({
  unreadCount: 0,
  pushToken: null,
  resetUnreadCount: () => {},
  refreshUnreadCount: async () => {},
  sendLocalNotification: async () => {},
});

// Hook for using notification context
export const useNotification = () => useContext(NotificationContext);

// Provider component
export const NotificationProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // State
  const [unreadCount, setUnreadCount] = useState(0);
  const [pushToken, setPushToken] = useState<string | null>(null);
  
  // Get auth context
  const { profile } = useAuth();
  
  // Unsubscribe function for Firestore listener
  const unsubscribeRef = React.useRef<(() => void) | null>(null);
  
  // Logging mount/unmount for debugging
  useEffect(() => {
    console.log('[NOTIFICATION] Provider mounted');
    return () => {
      console.log('[NOTIFICATION] Provider unmounted');
      
      // Clean up listener if exists
      if (unsubscribeRef.current) {
        console.log('[NOTIFICATION] Cleaning up unread messages listener');
        unsubscribeRef.current();
      }
    }
  }, []);
    
  useEffect(() => {
    // Update the global variable whenever unreadCount changes
    globalUnreadCount = unreadCount;
    
    // Update the app icon badge if the app is in the background
    const appState = AppState.currentState;
    if (appState !== 'active') {
      console.log(`[NOTIFICATION] App in background, updating badge to ${unreadCount}`);
      NotificationService.setBadgeCount(unreadCount);
    }
    
    // Existing code to update the badge
    console.log(`[NOTIFICATION] Updating app badge with count: ${unreadCount}`);
    NotificationService.setBadgeCount(unreadCount).then(success => {
      console.log(`[NOTIFICATION] Badge count ${success ? 'updated' : 'update failed'}`);
    });
  }, [unreadCount]);

  // Request notification permissions when provider mounts
  useEffect(() => {
    console.log('[NOTIFICATION] Requesting notification permissions');
    NotificationService.requestPermission();
  }, []);

  // Reset unread count (called when user navigates to chat tab)
  const resetUnreadCount = useCallback(() => {
    console.log('[NOTIFICATION] Resetting unread count to 0');
    setUnreadCount(0);
  }, []);

  // Function to manually refresh the unread count
  const refreshUnreadCount = useCallback(async () => {
    if (!profile?.uid) {
      console.log('[NOTIFICATION] Cannot refresh: No user profile');
      return;
    }
    
    console.log('[NOTIFICATION] Manually refreshing unread count');
    try {
      const count = await ChatService.getTotalUnreadMessagesCount(profile.uid);
      console.log(`[NOTIFICATION] Got ${count} total unread messages`);
      setUnreadCount(count);
    } catch (error) {
      console.error('[NOTIFICATION] Error refreshing unread count:', error);
    }
  }, [profile]);

  // Set up subscription for unread messages
  useEffect(() => {
    if (!profile) {
      console.log('[NOTIFICATION] Skipping unread listener: No user profile');
      return;
    }
    
    console.log('[NOTIFICATION] Setting up unread messages listener');
    
    // Subscribe to unread messages
    try {
      unsubscribeRef.current = ChatService.subscribeToUnreadMessages(
        profile.uid,
        (count: number) => {
          console.log(`[NOTIFICATION] Received update: ${count} total unread messages`);
          setUnreadCount(count);
        }
      );
    } catch (error) {
      console.error('[NOTIFICATION] Error setting up unread listener:', error);
    }
    
    // Clean up on unmount
    return () => {
      if (unsubscribeRef.current) {
        unsubscribeRef.current();
        unsubscribeRef.current = null;
      }
    };
  }, [profile]);
  
  // Register for push notifications
  useEffect(() => {
    if (!profile) return;
    
    const registerForPushNotifications = async () => {
      const token = await NotificationService.registerForPushNotifications();
      setPushToken(token);
    };
    
    registerForPushNotifications();
  }, [profile]);
  
  // Set up notification handlers
  useEffect(() => {
    if (!profile) return;
    
    // Set up notification response handlers
    const cleanup = NotificationService.setUpNotificationListeners(
      (notification) => {
        // Notification received while app is in foreground
        console.log('[NOTIFICATION] Received in foreground:', notification);
        
        // We could play a sound or show an in-app banner here
      },
      (response) => {
        // User interacted with notification
        console.log('[NOTIFICATION] User responded to notification:', response);
        const notificationData = response.notification.request.content.data;
        
        // Handle navigation based on notification data
        if (notificationData.groopId && notificationData.screen === 'chat') {
          // We would handle navigation here in a real app
          console.log(`[NOTIFICATION] Navigating to chat for groop: ${notificationData.groopId}`);
        }
      }
    );
    
    return cleanup;
  }, [profile]);
  
  // Function to send a local notification
  const sendLocalNotification = useCallback(async (title: string, body: string, data = {}) => {
    await NotificationService.scheduleLocalNotification(title, body, data);
  }, []);

  // Context value
  const contextValue = {
    unreadCount,
    pushToken,
    resetUnreadCount,
    refreshUnreadCount,
    sendLocalNotification
  };

  return (
    <NotificationContext.Provider value={contextValue}>
      {children}
    </NotificationContext.Provider>
  );
};