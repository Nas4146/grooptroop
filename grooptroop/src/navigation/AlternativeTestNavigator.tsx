import React from 'react';
import { View, Text } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

// Define screen types
type TestStackParamList = {
  Home: undefined;
  Details: undefined;
};

// Create screens using functional components - fully defined
function HomeScreen() {
  return (
    <View style={{flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: 'white'}}>
      <Text style={{fontSize: 24, fontWeight: 'bold'}}>Home Screen</Text>
      <Text>This is the home screen</Text>
    </View>
  );
}

function DetailsScreen() {
  return (
    <View style={{flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: 'white'}}>
      <Text style={{fontSize: 24, fontWeight: 'bold'}}>Details Screen</Text>
      <Text>This is the details screen</Text>
    </View>
  );
}

// Create typed stack - explicitly typed
const Stack = createNativeStackNavigator<TestStackParamList>();

// Export as default - fully defined
export default function AlternativeTestNavigator() {
  return (
    <NavigationContainer>
      <Stack.Navigator initialRouteName="Home">
        <Stack.Screen name="Home" component={HomeScreen} />
        <Stack.Screen name="Details" component={DetailsScreen} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}