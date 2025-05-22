import React, { useEffect, useCallback } from 'react';
import { View, Platform } from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNotification } from '../contexts/NotificationProvider';
import NotificationBadge from '../components/common/NotificationBadge';
import tw from '../utils/tw';

// Import screens
import ChatScreen from '../screens/chatScreen';
import ItineraryScreen from '../screens/itineraryScreen';
import PaymentsScreen from '../screens/paymentsScreen';
import ProfileScreen from '../screens/profileScreen';

// Define tab navigator type
const Tab = createBottomTabNavigator();

const TabNavigator = () => {
  const { unreadCount } = useNotification();
  const insets = useSafeAreaInsets();
  
  // Log component lifecycle for performance tracking
  useEffect(() => {
    console.log('[NAVIGATION] TabNavigator mounted');
    
    return () => {
      console.log('[NAVIGATION] TabNavigator unmounted');
    };
  }, []);
  
  // Memoized tab bar icon function to prevent unnecessary re-renders
  const getTabBarIcon = useCallback(({ focused, color, size, name }) => {
    return <Ionicons name={name} size={size} color={color} />;
  }, []);
  
  return (
    <Tab.Navigator
      screenOptions={{
        tabBarActiveTintColor: '#7C3AED', // violet-600
        tabBarInactiveTintColor: '#6B7280', // gray-500
        tabBarStyle: {
          height: 60 + (Platform.OS === 'ios' ? Math.max(insets.bottom, 10) : 0),
          paddingBottom: Platform.OS === 'ios' ? Math.max(insets.bottom - 5, 5) : 10,
          paddingTop: 10,
          backgroundColor: '#FFFFFF',
          borderTopWidth: 1,
          borderTopColor: '#F3F4F6' // gray-100
        },
        tabBarLabelStyle: {
          fontSize: 12,
          fontWeight: '500'
        },
        headerShown: false
      }}
    >
      
      <Tab.Screen 
        name="ItineraryTab" 
        component={ItineraryScreen}
        options={{
          title: 'Itinerary',
          tabBarIcon: ({ focused, color, size }) => 
            getTabBarIcon({ focused, color, size, name: focused ? 'calendar' : 'calendar-outline' })
        }}
      />
      
      <Tab.Screen 
        name="ChatTab" 
        component={ChatScreen}
        options={{
          title: 'Chat',
          tabBarIcon: ({ focused, color, size }) => (
            <View>
              {getTabBarIcon({ focused, color, size, name: focused ? 'chatbubble' : 'chatbubble-outline' })}
              <NotificationBadge count={unreadCount} />
            </View>
          )
        }}
      />
      
      <Tab.Screen 
        name="PaymentsTab" 
        component={PaymentsScreen}
        options={{
          title: 'Payments',
          tabBarIcon: ({ focused, color, size }) => 
            getTabBarIcon({ focused, color, size, name: focused ? 'wallet' : 'wallet-outline' })
        }}
      />
      
      <Tab.Screen 
        name="ProfileTab" 
        component={ProfileScreen}
        options={{
          title: 'Profile',
          tabBarIcon: ({ focused, color, size }) => 
            getTabBarIcon({ focused, color, size, name: focused ? 'person' : 'person-outline' })
        }}
      />
    </Tab.Navigator>
  );
};

export default TabNavigator;