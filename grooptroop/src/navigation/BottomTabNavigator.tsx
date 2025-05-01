import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';

import ItineraryScreen from '../screens/itineraryScreen';
import MapScreen from '../screens/mapScreen';
import PaymentsScreen from '../screens/paymentsScreen';
import ChatScreen from '../screens/chatScreen';
import ProfileScreen from '../screens/profileScreen';

const Tab = createBottomTabNavigator();

export default function BottomTabNavigator() {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarIcon: ({ color, size }) => {
          let iconName: keyof typeof Ionicons.glyphMap = 'home';
          switch (route.name) {
            case 'Itinerary': iconName = 'calendar'; break;
            case 'Map':       iconName = 'map'; break;
            case 'Payments':  iconName = 'card'; break;
            case 'Chat':      iconName = 'chatbubbles'; break;
            case 'Profile':   iconName = 'person'; break;
          }
          return <Ionicons name={iconName} size={size} color={color} />;
        },
        tabBarActiveTintColor: '#7C3AED',
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
    >
      <Tab.Screen name="Itinerary" component={ItineraryScreen} />
      <Tab.Screen name="Map"       component={MapScreen} />
      <Tab.Screen name="Payments"  component={PaymentsScreen} />
      <Tab.Screen name="Chat"      component={ChatScreen} />
      <Tab.Screen name="Profile"   component={ProfileScreen} />
    </Tab.Navigator>
  );
}