import React from 'react';
import { View, Text } from 'react-native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

// Define a super simple screen component directly in the file
const SimpleLoginScreen = () => (
  <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#f0f0f0' }}>
    <Text style={{ fontSize: 24, fontWeight: 'bold', marginBottom: 10 }}>Simple Login Screen</Text>
    <Text>This is a test login component</Text>
  </View>
);

const Stack = createNativeStackNavigator();

const SimpleAuthNavigator = () => {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="Login" component={SimpleLoginScreen} />
    </Stack.Navigator>
  );
};

export default SimpleAuthNavigator;