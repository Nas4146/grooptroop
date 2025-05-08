import React, { useState, useEffect, useRef } from 'react';
import { 
  View, 
  Text, 
  TextInput, 
  TouchableOpacity, 
  ActivityIndicator,
  Alert,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Keyboard
} from 'react-native';
import { useAuth } from '../contexts/AuthProvider';
import { Ionicons } from '@expo/vector-icons';
import tw from '../utils/tw';
import { KeyboardAwareScrollView } from 'react-native-keyboard-aware-scroll-view';
import * as AppleAuthentication from 'expo-apple-authentication';

export default function SimpleLoginScreen() {
 // Add refs to the inputs
    const scrollViewRef = useRef<ScrollView>(null);
    const emailInputRef = useRef<TextInput>(null);
    const passwordInputRef = useRef<TextInput>(null);
    const confirmPasswordInputRef = useRef<TextInput>(null);

    // State for Apple authentication availability
  const [isAppleAuthAvailable, setIsAppleAuthAvailable] = useState(false);

// Existing state
const [email, setEmail] = useState('');
const [password, setPassword] = useState('');
const [isSigningIn, setIsSigningIn] = useState(false);
const [name, setName] = useState('');
const [confirmPassword, setConfirmPassword] = useState('');
const [isSignUp, setIsSignUp] = useState(false);
  
// Auth context
const { signIn, signUp, signInAnonymously, signInWithGoogle, signInWithApple } = useAuth();

useEffect(() => {
    console.log('[DEBUG] SimpleLoginScreen MOUNTED');
    
    // Check if Apple authentication is available
    if (Platform.OS === 'ios') {
      AppleAuthentication.isAvailableAsync().then(available => {
        console.log('[DEBUG] Apple authentication available:', available);
        setIsAppleAuthAvailable(available);
      });
    }
    
    return () => console.log('[DEBUG] SimpleLoginScreen UNMOUNTED');
  }, []);

  // Handle email sign in
  const handleEmailSignIn = async () => {
    if (!email || !password) {
      Alert.alert('Error', 'Please enter both email and password');
      return;
    }

    try {
      console.log('[DEBUG] Starting email sign in');
      setIsSigningIn(true);
      
      await signIn(email, password);
      
      console.log('[DEBUG] Email sign in successful');
    } catch (error: any) {
      console.log('[DEBUG] Email sign in failed:', error.message);
      Alert.alert('Sign In Failed', error.message || 'Please try again');
    } finally {
      setIsSigningIn(false);
    }
  };
  
  // Handle email sign up
  const handleEmailSignUp = async () => {
    // Validate inputs
    if (!name || !email || !password || !confirmPassword) {
      Alert.alert('Error', 'Please fill in all fields');
      return;
    }

    if (password !== confirmPassword) {
      Alert.alert('Error', 'Passwords do not match');
      return;
    }

    try {
      console.log('[DEBUG] Starting email sign up');
      setIsSigningIn(true);
      
      await signUp(email, password, name);
      
      console.log('[DEBUG] Email sign up successful');
    } catch (error: any) {
      console.log('[DEBUG] Email sign up failed:', error.message);
      Alert.alert('Sign Up Failed', error.message || 'Please try again');
    } finally {
      setIsSigningIn(false);
    }
  };

  // Handle anonymous sign in
  const handleAnonymousSignIn = async () => {
    try {
      console.log('[DEBUG] Starting anonymous sign in');
      setIsSigningIn(true);
      
      await signInAnonymously();
      
      console.log('[DEBUG] Anonymous sign in successful');
    } catch (error: any) {
      console.log('[DEBUG] Anonymous sign in failed:', error.message);
      Alert.alert('Guest Sign In Failed', error.message || 'Please try again');
    } finally {
      setIsSigningIn(false);
    }
  };


  
  // Toggle between sign in and sign up
  const toggleAuthMode = () => {
    setIsSignUp(!isSignUp);
    // Clear form when switching modes
    if (!isSignUp) {
      setName('');
      setConfirmPassword('');
    }
  };

    // Add a function to handle input focus with scrolling
    const handleInputFocus = (y: number) => {
        // Increase delay to allow keyboard to fully appear first
        setTimeout(() => {
          scrollViewRef.current?.scrollTo({
            y: y + (Platform.OS === 'ios' ? 50 : 0), // Add extra offset on iOS
            animated: true
          });
        }, 300); // Increased from 100ms to 300ms
      };

      return (
        <KeyboardAwareScrollView
          style={tw`flex-1 bg-gray-100`}
          contentContainerStyle={tw`flex-grow p-5 justify-center`}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
          extraScrollHeight={120}
          enableOnAndroid={true}
    >
      <ScrollView 
        ref={scrollViewRef}
        contentContainerStyle={tw`flex-grow p-5 justify-center`}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={tw`items-center mb-8`}>
          <View style={tw`bg-primary bg-opacity-10 rounded-full p-6 mb-4`}>
            <Ionicons name={isSignUp ? "person-add" : "airplane"} size={48} color="#7C3AED" />
          </View>
          <Text style={tw`text-2xl font-bold mb-2 text-neutral`}>
            {isSignUp ? 'Create Account' : 'Welcome Back'}
          </Text>
          <Text style={tw`text-base text-gray-500 text-center`}>
            {isSignUp
              ? 'Sign up to start planning trips with friends'
              : 'Sign in to continue planning your trips'}
          </Text>
        </View>
        
        {/* Form */}
        <View style={tw`bg-white rounded-xl p-4 shadow-sm`}>
          {/* Name field - only for sign up */}
          {isSignUp && (
            <>
              <Text style={tw`text-sm mb-1.5 text-gray-500 ml-1`}>Name</Text>
              <TextInput
                style={tw`border border-gray-200 rounded-lg p-3 mb-4 bg-gray-50`}
                placeholder="Enter your name"
                value={name}
                onChangeText={setName}
                testID="name-input"
                returnKeyType="next"
                onSubmitEditing={() => emailInputRef.current?.focus()}
                onFocus={() => handleInputFocus(0)}
              />
            </>
          )}
          
          {/* Email field */}
          <Text style={tw`text-sm mb-1.5 text-gray-500 ml-1`}>Email</Text>
          <TextInput
            ref={emailInputRef}
            style={tw`border border-gray-200 rounded-lg p-3 mb-4 bg-gray-50`}
            placeholder="Enter your email"
            value={email}
            onChangeText={setEmail}
            autoCapitalize="none"
            keyboardType="email-address"
            testID="email-input"
            returnKeyType="next"
            onSubmitEditing={() => passwordInputRef.current?.focus()}
            onFocus={() => handleInputFocus(60)}
          />
          
          {/* Password field */}
          <Text style={tw`text-sm mb-1.5 text-gray-500 ml-1`}>Password</Text>
          <TextInput
            ref={passwordInputRef}
            style={tw`border border-gray-200 rounded-lg p-3 mb-4 bg-gray-50`}
            placeholder={isSignUp ? "Create a password" : "Enter your password"}
            value={password}
            onChangeText={setPassword}
            secureTextEntry
            testID="password-input"
            returnKeyType={isSignUp ? "next" : "done"}
            onSubmitEditing={() => {
              if (isSignUp) {
                confirmPasswordInputRef.current?.focus();
              } else {
                Keyboard.dismiss();
              }
            }}
            onFocus={() => handleInputFocus(120)}
          />
          
          {/* Confirm Password field - only for sign up */}
          {isSignUp && (
            <>
              <Text style={tw`text-sm mb-1.5 text-gray-500 ml-1`}>Confirm Password</Text>
              <TextInput
                ref={confirmPasswordInputRef}
                style={tw`border border-gray-200 rounded-lg p-3 mb-4 bg-gray-50`}
                placeholder="Confirm your password"
                value={confirmPassword}
                onChangeText={setConfirmPassword}
                secureTextEntry
                testID="confirm-password-input"
                returnKeyType="done"
                onSubmitEditing={() => Keyboard.dismiss()}
                onFocus={() => handleInputFocus(180)}
              />
            </>
          )}
          
          {/* Action Button */}
          <TouchableOpacity 
            style={tw`bg-primary p-3.5 rounded-lg items-center mb-3`}
            onPress={isSignUp ? handleEmailSignUp : handleEmailSignIn}
            disabled={isSigningIn}
            testID={isSignUp ? "signup-button" : "signin-button"}
          >
            {isSigningIn ? (
              <ActivityIndicator color="white" />
            ) : (
              <Text style={tw`text-white text-base font-semibold`}>
                {isSignUp ? 'Sign Up' : 'Sign In'}
              </Text>
            )}
          </TouchableOpacity>
          
          {/* Anonymous Sign In */}
          <TouchableOpacity 
            style={tw`bg-gray-100 p-3.5 rounded-lg items-center mb-5`}
            onPress={handleAnonymousSignIn}
            disabled={isSigningIn}
          >
            <Text style={tw`text-gray-600 text-base`}>Continue as Guest</Text>
          </TouchableOpacity>
          
          {/* Toggle between Sign In and Sign Up */}
          <View style={tw`flex-row justify-center items-center`}>
            <Text style={tw`text-gray-500`}>
              {isSignUp ? 'Already have an account?' : "Don't have an account?"}
            </Text>
            <TouchableOpacity onPress={toggleAuthMode}>
              <Text style={tw`text-primary font-medium ml-1`}>
                {isSignUp ? 'Sign In' : 'Sign Up'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </KeyboardAwareScrollView>
  );
}