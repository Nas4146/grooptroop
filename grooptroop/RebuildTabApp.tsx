import React, { useEffect } from 'react';
import { View, Text, Button } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import { NavigationContainer, useNavigationContainerRef } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';

// Enhanced logging function
const log = (message: string, data?: any) => {
  if (data) {
    console.log(`[REBUILD] ${message}`, data);
  } else {
    console.log(`[REBUILD] ${message}`);
  }
};

// Tab screen components with logging
const HomeScreen = ({ navigation }) => {
  useEffect(() => {
    log('HomeScreen mounted');
    return () => log('HomeScreen unmounted');
  }, []);
  
  return (
    <SafeAreaView style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#f0f0f0' }}>
      <Text style={{ fontSize: 24 }}>Home Screen</Text>
      <Text style={{ marginTop: 10 }}>This is the home tab</Text>
      <Button 
        title="Go to Details" 
        onPress={() => {
          log('Navigating to DetailsScreen');
          navigation.navigate('Details');
        }} 
      />
    </SafeAreaView>
  );
};

const DetailsScreen = () => {
  useEffect(() => {
    log('DetailsScreen mounted');
    return () => log('DetailsScreen unmounted');
  }, []);
  
  return (
    <SafeAreaView style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#f0f0f0' }}>
      <Text style={{ fontSize: 24 }}>Details Screen</Text>
      <Text style={{ marginTop: 10 }}>Details content here</Text>
    </SafeAreaView>
  );
};

const ProfileScreen = () => {
  useEffect(() => {
    log('ProfileScreen mounted');
    return () => log('ProfileScreen unmounted');
  }, []);
  
  return (
    <SafeAreaView style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#f0f0f0' }}>
      <Text style={{ fontSize: 24 }}>Profile</Text>
      <Text style={{ marginTop: 10 }}>Your profile information</Text>
    </SafeAreaView>
  );
};

// Create stack navigator for Home tab
const HomeStack = createNativeStackNavigator();

const HomeStackScreen = () => {
  useEffect(() => {
    log('HomeStackScreen mounted');
    return () => log('HomeStackScreen unmounted');
  }, []);
  
  return (
    <HomeStack.Navigator>
      <HomeStack.Screen name="Home" component={HomeScreen} />
      <HomeStack.Screen name="Details" component={DetailsScreen} />
    </HomeStack.Navigator>
  );
};

// Create bottom tab navigator
const Tab = createBottomTabNavigator();

// Navigation container with state change logging
const NavigationLogger = ({ children }) => {
  const navigationRef = useNavigationContainerRef();
  
  return (
    <NavigationContainer
      ref={navigationRef}
      onReady={() => {
        log('Navigation container is ready');
      }}
      onStateChange={(state) => {
        const currentRouteName = navigationRef.getCurrentRoute()?.name;
        log(`Navigation state changed, current route: ${currentRouteName}`, state);
      }}
    >
      {children}
    </NavigationContainer>
  );
};

// Main app with tab navigation
export default function RebuildTabApp() {
  useEffect(() => {
    log('RebuildTabApp mounted');
    return () => log('RebuildTabApp unmounted');
  }, []);

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <NavigationLogger>
          <Tab.Navigator
            screenOptions={({ route }) => ({
              tabBarIcon: ({ focused, color, size }) => {
                let iconName;
                
                if (route.name === 'HomeTab') {
                  iconName = focused ? 'home' : 'home-outline';
                } else if (route.name === 'ProfileTab') {
                  iconName = focused ? 'person' : 'person-outline';
                }
                
                return <Ionicons name={iconName} size={size} color={color} />;
              },
              tabBarActiveTintColor: '#7C3AED',
              tabBarInactiveTintColor: '#6B7280',
            })}
          >
            <Tab.Screen 
              name="HomeTab" 
              component={HomeStackScreen} 
              options={{ 
                headerShown: false,
                title: 'Home'
              }}
            />
            <Tab.Screen 
              name="ProfileTab" 
              component={ProfileScreen} 
              options={{ title: 'Profile' }}
            />
          </Tab.Navigator>
        </NavigationLogger>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}