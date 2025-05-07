import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { AuthStackParamList } from './types';
import SignInScreen from '../screens/signInScreen';
import SignUpScreen from '../screens/signUpScreen';
import ForgotPasswordScreen from '../screens/forgotPasswordScreen';
import { Text, View } from 'react-native';

// Simple backup components for testing
const TestSignIn = () => <View style={{flex:1, alignItems:'center', justifyContent:'center'}}><Text>Sign In Screen</Text></View>;

const Stack = createNativeStackNavigator<AuthStackParamList>();

const AuthNavigator = () => {
  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: '#fff' }
      }}
    >
      {/*<Stack.Screen name="SignIn" component={SignInScreen} />
      <Stack.Screen name="SignUp" component={SignUpScreen} />
      <Stack.Screen name="ForgotPassword" component={ForgotPasswordScreen} />*/}
      <Stack.Screen name="SignIn" component={TestSignIn} />
    </Stack.Navigator>
  );
};

export default AuthNavigator;