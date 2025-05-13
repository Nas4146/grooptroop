import React from 'react';
import { View, Text } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

// Super simple screen components
const Screen1 = () => (
  <SafeAreaView style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#f0f0f0' }}>
    <Text style={{ fontSize: 24 }}>Screen 1</Text>
    <Text style={{ marginTop: 10 }}>This is a test screen</Text>
  </SafeAreaView>
);

const Screen2 = () => (
  <SafeAreaView style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#f0f0f0' }}>
    <Text style={{ fontSize: 24 }}>Screen 2</Text>
    <Text style={{ marginTop: 10 }}>This is another test screen</Text>
  </SafeAreaView>
);

// Create a simple stack
const Stack = createNativeStackNavigator();

// Main app with absolutely minimal complexity
export default function App() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <NavigationContainer>
          <Stack.Navigator>
            <Stack.Screen name="Screen1" component={Screen1} />
            <Stack.Screen name="Screen2" component={Screen2} />
          </Stack.Navigator>
        </NavigationContainer>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}