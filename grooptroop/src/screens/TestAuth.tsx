import React, { useEffect } from 'react';
import { View, Text, Button } from 'react-native';
import { useAuth } from '../contexts/AuthProvider';
import SimpleLoginScreen from './SimpleLoginScreen';

export default function TestAuth() {
    // Move the hook call inside the component
    const { signOut } = useAuth();
    
    return (
      <View style={{ flex: 1 }}>
        <Button 
          title="Sign Out" 
          onPress={async () => {
            try {
              await signOut();
              console.log("Signed out successfully");
            } catch (error) {
              console.error("Error signing out:", error);
            }
          }} 
          color="red" 
        />
        <SimpleLoginScreen />
      </View>
    );
  }