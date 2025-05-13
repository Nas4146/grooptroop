import React, { useEffect } from 'react';
import { View, Text, Button } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import { NavigationContainer, useNavigationContainerRef } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

// Enhanced logging function
const log = (message: string, data?: any) => {
  if (data) {
    console.log(`[REBUILD] ${message}`, data);
  } else {
    console.log(`[REBUILD] ${message}`);
  }
};

// Screen components with logging
const Screen1 = ({ navigation }) => {
  useEffect(() => {
    log('Screen1 mounted');
    return () => log('Screen1 unmounted');
  }, []);
  
  return (
    <SafeAreaView style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#f0f0f0' }}>
      <Text style={{ fontSize: 24 }}>Screen 1</Text>
      <Text style={{ marginTop: 10 }}>This is a test screen</Text>
      <Button 
        title="Go to Screen 2" 
        onPress={() => {
          log('Navigating to Screen2');
          navigation.navigate('Screen2');
        }} 
      />
    </SafeAreaView>
  );
};

const Screen2 = ({ navigation }) => {
  useEffect(() => {
    log('Screen2 mounted');
    return () => log('Screen2 unmounted');
  }, []);
  
  return (
    <SafeAreaView style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#f0f0f0' }}>
      <Text style={{ fontSize: 24 }}>Screen 2</Text>
      <Text style={{ marginTop: 10 }}>This is another test screen</Text>
      <Button 
        title="Go back" 
        onPress={() => {
          log('Going back to Screen1');
          navigation.goBack();
        }} 
      />
    </SafeAreaView>
  );
};

// Create stack navigator with logging
const Stack = createNativeStackNavigator();

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

// Main app with enhanced logging
export default function RebuildApp() {
  useEffect(() => {
    log('RebuildApp mounted');
    return () => log('RebuildApp unmounted');
  }, []);

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <NavigationLogger>
          <Stack.Navigator
            screenOptions={{
              headerShown: true,
              headerTitleAlign: 'center'
            }}
          >
            <Stack.Screen 
              name="Screen1" 
              component={Screen1} 
              options={{ title: 'First Screen' }}
            />
            <Stack.Screen 
              name="Screen2" 
              component={Screen2} 
              options={{ title: 'Second Screen' }}
            />
          </Stack.Navigator>
        </NavigationLogger>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}