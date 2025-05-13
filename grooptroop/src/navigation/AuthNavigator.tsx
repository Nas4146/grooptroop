import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { View, Text } from 'react-native';
import { AuthStackParamList } from './types';
// Import the SimpleLoginScreen that exists in your project
import SimpleLoginScreen from '../screens/SimpleLoginScreen';

// Create extremely simple test components for fallback
const TestSignIn = () => {
  console.log('[DEBUG] TestSignIn component rendering');
  return (
    <View style={{flex:1, alignItems:'center', justifyContent:'center', backgroundColor: '#fff'}}>
      <Text>Sign In Test Screen</Text>
    </View>
  );
};

const TestSignUp = () => (
  <View style={{flex:1, alignItems:'center', justifyContent:'center', backgroundColor: '#fff'}}>
    <Text>Sign Up Test Screen</Text>
  </View>
);

const TestForgotPassword = () => (
  <View style={{flex:1, alignItems:'center', justifyContent:'center', backgroundColor: '#fff'}}>
    <Text>Forgot Password Test Screen</Text>
  </View>
);

// Create the navigator
const Stack = createNativeStackNavigator<AuthStackParamList>();

// Define a plain component without any hooks or complex logic
const AuthNavigator = () => (
  <Stack.Navigator
    initialRouteName="SignIn"
    screenOptions={{
      headerShown: false,
      contentStyle: { backgroundColor: '#fff' }
    }}
  >
    {/* First try using your test component directly */}
    <Stack.Screen name="SignIn" component={TestSignIn} />
    <Stack.Screen name="SignUp" component={TestSignUp} />
    <Stack.Screen name="ForgotPassword" component={TestForgotPassword} />
  </Stack.Navigator>
);

export default AuthNavigator;