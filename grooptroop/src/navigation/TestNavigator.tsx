import React from 'react';
import { View, Text } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

// Define the screen components inline to avoid any import issues
const Screen1 = () => (
  <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#fff' }}>
    <Text style={{ fontSize: 20 }}>Screen 1</Text>
    <Text style={{ marginTop: 10 }}>This is a test screen</Text>
  </View>
);

const Screen2 = () => (
  <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#fff' }}>
    <Text style={{ fontSize: 20 }}>Screen 2</Text>
    <Text style={{ marginTop: 10 }}>This is another test screen</Text>
  </View>
);

// Create stack with type safety
const Stack = createNativeStackNavigator();

// Export the component
export default function TestNavigator() {
  return (
    <NavigationContainer>
      <Stack.Navigator initialRouteName="Screen1">
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
    </NavigationContainer>
  );
}