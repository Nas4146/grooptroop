import React, { useState } from 'react';
import { 
  View, 
  Text, 
  TextInput, 
  TouchableOpacity, 
  KeyboardAvoidingView, 
  Platform, 
  ScrollView,
  ActivityIndicator,
  Alert
} from 'react-native';
import { useAuth } from '../contexts/AuthProvider';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { AuthScreenNavigationProp } from '../navigation/types';
import tw from '../utils/tw';

function SignInScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { signIn, signInWithGoogle, signInWithApple, signInAnonymously } = useAuth();
  const navigation = useNavigation<AuthScreenNavigationProp>();

  const handleSignIn = async () => {
    if (!email || !password) {
      Alert.alert('Error', 'Please fill in all fields');
      return;
    }

    try {
      setIsSubmitting(true);
      await signIn(email, password);
      // Navigation handled by auth state change in AuthProvider
    } catch (error: any) {
      Alert.alert('Sign In Failed', error.message || 'Please try again');
    } finally {
      setIsSubmitting(false);
    }
  };
  
  const handleGoogleSignIn = async () => {
    try {
      setIsSubmitting(true);
      await signInWithGoogle();
      // Navigation handled by auth state change in AuthProvider
    } catch (error: any) {
      Alert.alert('Google Sign In Failed', error.message || 'Please try again');
    } finally {
      setIsSubmitting(false);
    }
  };
  
  const handleAppleSignIn = async () => {
    try {
      setIsSubmitting(true);
      await signInWithApple();
      // Navigation handled by auth state change in AuthProvider
    } catch (error: any) {
      Alert.alert('Apple Sign In Failed', error.message || 'Please try again');
    } finally {
      setIsSubmitting(false);
    }
  };
  
  const handleAnonymousSignIn = async () => {
    try {
      setIsSubmitting(true);
      await signInAnonymously();
      // Navigation handled by auth state change in AuthProvider
    } catch (error: any) {
      Alert.alert('Guest Sign In Failed', error.message || 'Please try again');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <KeyboardAvoidingView 
      style={tw`flex-1 bg-light`}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView contentContainerStyle={tw`flex-grow justify-center px-6 py-10`}>
        <View style={tw`items-center mb-8`}>
          {/* Replace Image with Ionicons */}
          <View style={tw`bg-primary/10 rounded-full p-6 mb-4`}>
            <Ionicons name="airplane" size={48} color="#7C3AED" />
          </View>
          <Text style={tw`text-3xl font-bold text-neutral mb-1`}>Welcome Back</Text>
          <Text style={tw`text-base text-gray-500`}>Sign in to continue planning your trips</Text>
        </View>
        
        <View style={tw`mb-6`}>
          <Text style={tw`text-sm text-gray-600 mb-1 ml-1`}>Email</Text>
          <TextInput
            style={tw`bg-white border border-gray-200 rounded-xl px-4 py-3 mb-4`}
            placeholder="Enter your email"
            value={email}
            onChangeText={setEmail}
            autoCapitalize="none"
            keyboardType="email-address"
          />
          
          <Text style={tw`text-sm text-gray-600 mb-1 ml-1`}>Password</Text>
          <TextInput
            style={tw`bg-white border border-gray-200 rounded-xl px-4 py-3 mb-2`}
            placeholder="Enter your password"
            value={password}
            onChangeText={setPassword}
            secureTextEntry
          />
          
          <TouchableOpacity 
            style={tw`self-end mb-4`}
            onPress={() => navigation.navigate('ForgotPassword')}
          >
            <Text style={tw`text-primary text-sm font-medium`}>Forgot Password?</Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={tw`bg-primary rounded-xl py-3.5 items-center mb-4`}
            onPress={handleSignIn}
            disabled={isSubmitting}
          >
            {isSubmitting ? (
              <ActivityIndicator color="white" />
            ) : (
              <Text style={tw`text-white font-bold`}>Sign In</Text>
            )}
          </TouchableOpacity>
        </View>
        
        <View style={tw`mb-6`}>
          <View style={tw`flex-row items-center mb-6`}>
            <View style={tw`flex-1 h-px bg-gray-200`} />
            <Text style={tw`px-4 text-gray-500`}>or continue with</Text>
            <View style={tw`flex-1 h-px bg-gray-200`} />
          </View>
          
          <View style={tw`flex-row justify-center mb-4`}>
            <TouchableOpacity 
              style={tw`bg-white border border-gray-200 rounded-xl py-3 px-6 mx-2 flex-row items-center`}
              onPress={handleGoogleSignIn}
              disabled={isSubmitting}
            >
              <Ionicons name="logo-google" size={20} color="#EA4335" />
              <Text style={tw`ml-2 font-medium text-neutral`}>Google</Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={tw`bg-white border border-gray-200 rounded-xl py-3 px-6 mx-2 flex-row items-center`}
              onPress={handleAppleSignIn}
              disabled={isSubmitting}
            >
              <Ionicons name="logo-apple" size={20} color="black" />
              <Text style={tw`ml-2 font-medium text-neutral`}>Apple</Text>
            </TouchableOpacity>
          </View>
        </View>
        
        {/* Anonymous sign in option */}
        <TouchableOpacity 
          style={tw`bg-gray-100 rounded-xl py-3 items-center mb-6`}
          onPress={handleAnonymousSignIn}
          disabled={isSubmitting}
        >
          <Text style={tw`text-gray-700 font-medium`}>Continue as Guest</Text>
        </TouchableOpacity>
        
        <View style={tw`flex-row justify-center`}>
          <Text style={tw`text-gray-600`}>Don't have an account?</Text>
          <TouchableOpacity onPress={() => navigation.navigate('SignUp')}>
            <Text style={tw`text-primary font-medium ml-1`}>Sign Up</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

export default SignInScreen;