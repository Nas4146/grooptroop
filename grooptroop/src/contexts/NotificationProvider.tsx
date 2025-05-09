import React, { createContext, useState, useContext, useEffect } from 'react';
import { useAuth } from './AuthProvider';
import { ChatService } from '../services/chatService';
import { NotificationService } from '../services/NotificationService';
import { AppState } from 'react-native';

// Define the context type
type NotificationContextType = {
  unreadCount: number;
  resetUnreadCount: () => void;
  refreshUnreadCount: () => Promise<void>;
};

// Create context with default values
const NotificationContext = createContext<NotificationContextType>({
  unreadCount: 0,
  resetUnreadCount: () => {},
  refreshUnreadCount: async () => {},
});


let globalUnreadCount = 0;

// Export a function to access this value from anywhere
export function getUnreadCount() {
  return globalUnreadCount;
}
  
// Provider component
export const NotificationProvider: React.FC<{children: React.ReactNode}> = ({ children }): JSX.Element => {
  const [unreadCount, setUnreadCount] = useState(0);
  const { profile } = useAuth();

  // Logging mount/unmount for debugging
  useEffect(() => {
    console.log('[NOTIFICATION] Provider mounted');
    return () => console.log('[NOTIFICATION] Provider unmounted');
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
  const resetUnreadCount = () => {
    console.log('[NOTIFICATION] Resetting unread count to 0');
    setUnreadCount(0);
  };

  

  // Function to manually refresh the unread count
  const refreshUnreadCount = async () => {
    if (!profile?.uid) {
      console.log('[NOTIFICATION] Cannot refresh: No user profile');
      return;
    }
    
    console.log('[NOTIFICATION] Manually refreshing unread count');
    try {
      // This function needs to be implemented in ChatService
      const count = await ChatService.getTotalUnreadMessagesCount(profile.uid);
      console.log(`[NOTIFICATION] Got ${count} total unread messages`);
      setUnreadCount(count);
    } catch (error) {
      console.error('[NOTIFICATION] Error refreshing unread count:', error);
    }
  };

  // Set up subscription for unread messages
  useEffect(() => {
    if (!profile?.uid) {
      console.log('[NOTIFICATION] Skipping unread listener: No user profile');
      return;
    }

    console.log('[NOTIFICATION] Setting up unread messages listener');
    
    // Listen for unread message count changes
    const unsubscribe = ChatService.subscribeToUnreadMessages(profile.uid, (count) => {
      console.log(`[NOTIFICATION] Received update: ${count} total unread messages`);
      setUnreadCount(count);
    });

    return () => {
      console.log('[NOTIFICATION] Cleaning up unread messages listener');
      unsubscribe();
    };
  }, [profile]);

  return (
    <NotificationContext.Provider value={{ 
      unreadCount, 
      resetUnreadCount, 
      refreshUnreadCount 
    }}>
      {children}
    </NotificationContext.Provider>
  );
};

// Custom hook to use the notification context
export const useNotification = () => useContext(NotificationContext);