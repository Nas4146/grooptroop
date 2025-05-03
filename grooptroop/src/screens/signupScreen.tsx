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
  Alert,
  Image
} from 'react-native';
import { useAuth } from '../contexts/AuthProvider';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { AuthScreenNavigationProp } from '../navigation/types';
import tw from '../utils/tw';

export default function SignUpScreen() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { signUp, signInWithGoogle, signInWithApple } = useAuth();
  const navigation = useNavigation<AuthScreenNavigationProp>();

  const handleSignUp = async () => {
    if (!name || !email || !password || !confirmPassword) {
      Alert.alert('Error', 'Please fill in all fields');
      return;
    }

    if (password !== confirmPassword) {
      Alert.alert('Error', 'Passwords do not match');
      return;
    }

    try {
      setIsSubmitting(true);
      await signUp(email, password, name);
      // Navigation handled by auth state change in AuthProvider
    } catch (error: any) {
      Alert.alert('Sign Up Failed', error.message || 'Please try again');
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

  return (
    <KeyboardAvoidingView 
      style={tw`flex-1 bg-light`}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView contentContainerStyle={tw`flex-grow px-6 py-10`}>
        <View style={tw`items-center mb-8`}>
          {/* Replace Image with Ionicons */}
          <View style={tw`bg-primary/10 rounded-full p-6 mb-4`}>
            <Ionicons name="person-add" size={48} color="#7C3AED" />
          </View>
          <Text style={tw`text-3xl font-bold text-neutral mb-1`}>Create Account</Text>
          <Text style={tw`text-base text-gray-500`}>Sign up to start planning trips with friends</Text>
        </View>
        
        <View style={tw`mb-6`}>
          <Text style={tw`text-sm text-gray-600 mb-1 ml-1`}>Name</Text>
          <TextInput
            style={tw`bg-white border border-gray-200 rounded-xl px-4 py-3 mb-4`}
            placeholder="Enter your name"
            value={name}
            onChangeText={setName}
          />
          
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
            style={tw`bg-white border border-gray-200 rounded-xl px-4 py-3 mb-4`}
            placeholder="Create a password"
            value={password}
            onChangeText={setPassword}
            secureTextEntry
          />
          
          <Text style={tw`text-sm text-gray-600 mb-1 ml-1`}>Confirm Password</Text>
          <TextInput
            style={tw`bg-white border border-gray-200 rounded-xl px-4 py-3 mb-6`}
            placeholder="Confirm your password"
            value={confirmPassword}
            onChangeText={setConfirmPassword}
            secureTextEntry
          />
          
          <TouchableOpacity 
            style={tw`bg-primary rounded-xl py-3.5 items-center mb-4`}
            onPress={handleSignUp}
            disabled={isSubmitting}
          >
            {isSubmitting ? (
              <ActivityIndicator color="white" />
            ) : (
              <Text style={tw`text-white font-bold`}>Sign Up</Text>
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
        
        <View style={tw`flex-row justify-center`}>
          <Text style={tw`text-gray-600`}>Already have an account?</Text>
          <TouchableOpacity onPress={() => navigation.navigate('SignIn')}>
            <Text style={tw`text-primary font-medium ml-1`}>Sign In</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}