import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';

import ItineraryScreen from '../screens/intineraryScreen';
import MapScreen from '../screens/MapScreen';
import PaymentsScreen from '../screens/PaymentsScreen';
import ChatScreen from '../screens/ChatScreen';
import ProfileScreen from '../screens/ProfileScreen';

const Tab = createBottomTabNavigator();

export default function BottomTabNavigator() {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarIcon: ({ color, size }) => {
          let iconName: keyof typeof Ionicons.glyphMap = 'home';
          switch (route.name) {
            case 'Itinerary': iconName = 'list'; break;
            case 'Map':       iconName = 'map'; break;
            case 'Payments':  iconName = 'card'; break;
            case 'Chat':      iconName = 'chatbubbles'; break;
            case 'Profile':   iconName = 'person'; break;
          }
          return <Ionicons name={iconName} size={size} color={color} />;
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