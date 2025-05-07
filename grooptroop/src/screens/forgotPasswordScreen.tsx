import React, { useState } from 'react';
import { 
  View, 
  Text, 
  TextInput, 
  TouchableOpacity, 
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Alert
} from 'react-native';
import { useAuth } from '../contexts/AuthProvider';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { AuthScreenNavigationProp } from '../navigation/types';
import tw from '../utils/tw';

export default function ForgotPasswordScreen() {
  const [email, setEmail] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [resetSent, setResetSent] = useState(false);
  const { resetPassword } = useAuth();
  const navigation = useNavigation<AuthScreenNavigationProp>();

  const handleResetPassword = async () => {
    if (!email) {
      Alert.alert('Error', 'Please enter your email');
      return;
    }

    try {
      setIsSubmitting(true);
      await resetPassword(email);
      setResetSent(true);
    } catch (error: any) {
      Alert.alert('Password Reset Failed', error.message || 'Please try again');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <KeyboardAvoidingView 
      style={tw`flex-1 bg-light`}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <View style={tw`flex-1 justify-center px-6`}>
        <TouchableOpacity 
          style={tw`absolute top-12 left-4 z-10 p-2`}
          onPress={() => navigation.goBack()}
        >
          <Ionicons name="arrow-back" size={24} color="#1F2937" />
        </TouchableOpacity>
        
        <View style={tw`items-center mb-8`}>
          {/* Replace Image with Ionicons */}
          <View style={tw`bg-primary/10 rounded-full p-6 mb-4`}>
            <Ionicons name="lock-closed" size={48} color="#7C3AED" />
          </View>
          <Text style={tw`text-2xl font-bold text-neutral mb-1`}>Forgot Password</Text>
          <Text style={tw`text-base text-gray-500 text-center`}>
            Enter your email and we'll send you instructions to reset your password
          </Text>
        </View>
        
        {resetSent ? (
          <View style={tw`items-center mb-6 bg-green-50 p-4 rounded-xl`}>
            <Ionicons name="checkmark-circle" size={40} color="#10B981" />
            <Text style={tw`text-green-800 font-medium text-center mt-2`}>
              Password reset email sent! Check your inbox for instructions.
            </Text>
          </View>
        ) : (
          <View style={tw`mb-6`}>
            <Text style={tw`text-sm text-gray-600 mb-1 ml-1`}>Email</Text>
            <TextInput
              style={tw`bg-white border border-gray-200 rounded-xl px-4 py-3 mb-6`}
              placeholder="Enter your email"
              value={email}
              onChangeText={setEmail}
              autoCapitalize="none"
              keyboardType="email-address"
            />
            
            <TouchableOpacity 
              style={tw`bg-primary rounded-xl py-3.5 items-center`}
              onPress={handleResetPassword}
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <ActivityIndicator color="white" />
              ) : (
                <Text style={tw`text-white font-bold`}>Send Reset Link</Text>
              )}
            </TouchableOpacity>
          </View>
        )}
        
        <TouchableOpacity 
          style={tw`flex-row justify-center items-center mt-4`}
          onPress={() => navigation.navigate('SignIn')}
        >
          <Ionicons name="arrow-back" size={16} color="#7C3AED" />
          <Text style={tw`text-primary font-medium ml-1`}>Back to Sign In</Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}