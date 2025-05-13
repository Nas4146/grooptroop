import React, { useState } from 'react';
import { View, Text, Button, StyleSheet, TextInput, TouchableOpacity, Alert } from 'react-native';
import { useAuth } from '../contexts/AuthProvider';

interface TestSimpleLoginScreenProps {
  navigation: any;
}

export default function TestSimpleLoginScreen({ navigation }: TestSimpleLoginScreenProps) {
  // Update these to real email/password that you'll create
  const [email, setEmail] = useState('testuser@example.com');
  const [password, setPassword] = useState('Test123!');
  const [isLoading, setIsLoading] = useState(false);
  
  // Use the actual auth context
  const { signIn, signInAnonymously, signUp } = useAuth();
  
  console.log('[TEST_LOGIN] Rendering test login screen');
  
  // Add the missing handleLogin function
  const handleLogin = async () => {
    console.log('[TEST_LOGIN] Login button pressed');
    
    if (!email || !password) {
      Alert.alert('Error', 'Please enter email and password');
      return;
    }
    
    setIsLoading(true);
    try {
      await signIn(email, password);
      console.log('[TEST_LOGIN] Login successful');
    } catch (error) {
      console.error('[TEST_LOGIN] Login error:', error);
      Alert.alert('Login Failed', error.message || 'Please check your credentials');
    } finally {
      setIsLoading(false);
    }
  };
  
  // Add handleGuestLogin function that was also referenced
  const handleGuestLogin = async () => {
    console.log('[TEST_LOGIN] Guest login button pressed');
    
    setIsLoading(true);
    try {
      await signInAnonymously();
      console.log('[TEST_LOGIN] Anonymous login successful');
    } catch (error) {
      console.error('[TEST_LOGIN] Anonymous login error:', error);
      Alert.alert('Login Failed', error.message || 'Unable to sign in as guest');
    } finally {
      setIsLoading(false);
    }
  };
  
  // Add a create account button to register a test user
  const handleCreateAccount = async () => {
    console.log('[TEST_LOGIN] Creating test account');
    
    if (!email || !password) {
      Alert.alert('Error', 'Please enter email and password');
      return;
    }
    
    setIsLoading(true);
    try {
      await signUp(email, password, 'Test User');
      console.log('[TEST_LOGIN] Test account created successfully');
      Alert.alert('Success', 'Test account created. You can now sign in.');
    } catch (error) {
      console.error('[TEST_LOGIN] Account creation error:', error);
      // If the account already exists, this is not a problem for our testing
      if (error.code === 'auth/email-already-in-use') {
        Alert.alert('Account Exists', 'This account already exists. You can sign in with it.');
      } else {
        Alert.alert('Account Creation Failed', error.message || 'Please try different credentials');
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>GroopTroop</Text>
      <Text style={styles.subtitle}>Test Authentication</Text>
      
      <View style={styles.form}>
        <TextInput
          style={styles.input}
          placeholder="Email"
          value={email}
          onChangeText={setEmail}
          keyboardType="email-address"
          autoCapitalize="none"
        />
        
        <TextInput
          style={styles.input}
          placeholder="Password"
          value={password}
          onChangeText={setPassword}
          secureTextEntry
        />
        
        <TouchableOpacity
          style={styles.loginButton}
          onPress={handleLogin}
          disabled={isLoading}
        >
          <Text style={styles.loginButtonText}>
            {isLoading ? 'Signing in...' : 'Sign In'}
          </Text>
        </TouchableOpacity>
        
        {/* Add Create Account button */}
        <TouchableOpacity
          style={styles.createButton}
          onPress={handleCreateAccount}
          disabled={isLoading}
        >
          <Text style={styles.createButtonText}>
            Create Test Account
          </Text>
        </TouchableOpacity>
        
        <TouchableOpacity
          style={styles.guestButton}
          onPress={handleGuestLogin}
          disabled={isLoading}
        >
          <Text style={styles.guestButtonText}>Continue as Guest</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    padding: 20,
    backgroundColor: '#f5f5f5',
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    marginBottom: 10,
    color: '#7C3AED',
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 18,
    marginBottom: 30,
    color: '#666',
    textAlign: 'center',
  },
  form: {
    width: '100%',
  },
  input: {
    backgroundColor: 'white',
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 15,
    marginBottom: 16,
    fontSize: 16,
  },
  loginButton: {
    backgroundColor: '#7C3AED',
    borderRadius: 8,
    padding: 16,
    alignItems: 'center',
    marginTop: 10,
  },
  loginButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
  guestButton: {
    borderWidth: 1,
    borderColor: '#7C3AED',
    borderRadius: 8,
    padding: 16,
    alignItems: 'center',
    marginTop: 16,
  },
  guestButtonText: {
    color: '#7C3AED',
    fontSize: 16,
    fontWeight: 'bold',
  },
  createButton: {
    backgroundColor: '#4B5563',
    borderRadius: 8,
    padding: 16,
    alignItems: 'center',
    marginTop: 12,
  },
  createButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
});