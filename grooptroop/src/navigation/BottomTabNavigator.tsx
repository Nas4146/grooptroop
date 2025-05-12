import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import { View, Text } from 'react-native';
import ItineraryScreen from '../screens/itineraryScreen';
import MapScreen from '../screens/mapScreen';
import PaymentsScreen from '../screens/paymentsScreen';
import ChatScreen from '../screens/chatScreen';
import ProfileScreen from '../screens/profileScreen';
import AdminSettingsScreen from '../screens/AdminSettingsScreen';
import { useNotification } from '../contexts/NotificationProvider';
import tw from '../utils/tw';

const Tab = createBottomTabNavigator();

export default function BottomTabNavigator() {
  const { unreadCount, resetUnreadCount } = useNotification();

  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarIcon: ({ color, size }) => {
          let iconName: keyof typeof Ionicons.glyphMap = 'home';
          
          if (route.name === 'Itinerary') iconName = 'calendar';
          else if (route.name === 'Map') iconName = 'map';
          else if (route.name === 'Payments') iconName = 'card';
          else if (route.name === 'Chat') iconName = 'chatbubbles';
          else if (route.name === 'Profile') iconName = 'person';
          else if (route.name === 'AdminSettings') iconName = 'settings';
          
          // Special handling for Chat tab to show badge
          if (route.name === 'Chat' && unreadCount > 0) {
            return (
              <View>
                <Ionicons name={iconName} size={size} color={color} />
                <View style={tw`absolute -top-1 -right-1 bg-red-500 rounded-full min-w-[18px] h-[18px] items-center justify-center`}>
                  <Text style={tw`text-white text-xs font-bold`}>
                    {unreadCount > 99 ? '99+' : unreadCount}
                  </Text>
                </View>
              </View>
            );
          }
          
          return <Ionicons name={iconName} size={size} color={color} />;
        },
        tabBarActiveTintColor: '#78c0e1',
        tabBarInactiveTintColor: '#6B7280',
        tabBarStyle: {
          paddingVertical: 5,
          borderTopWidth: 0,
          elevation: 10,
          shadowOpacity: 0.05,
          height: 60,
        },
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: '500',
          paddingBottom: 4,
        },
      })}
      screenListeners={({ route }) => ({
        tabPress: (e) => {
          // When Chat tab is pressed, reset unread count
          if (route.name === 'Chat') {
            console.log('[NAVIGATION] Chat tab pressed, resetting unread count');
            resetUnreadCount();
          }
        },
      })}
    >
      <Tab.Screen name="Itinerary" component={ItineraryScreen} />
      <Tab.Screen name="Chat"      component={ChatScreen} />
      <Tab.Screen name="Map"       component={MapScreen} />
      <Tab.Screen name="Payments"  component={PaymentsScreen} />
      <Tab.Screen name="Profile"   component={ProfileScreen} />
      <Tab.Screen name="Admin" component={AdminSettingsScreen} />
    </Tab.Navigator>
  );
}