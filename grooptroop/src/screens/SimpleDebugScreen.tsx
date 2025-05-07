import React, { useEffect } from 'react';
import { View, Text } from 'react-native';

type SimpleDebugScreenProps = {
  route?: {
    params?: {
      name?: string;
    };
  };
};

export default function SimpleDebugScreen({ route }: SimpleDebugScreenProps) {
  const screenName = route?.params?.name || "Debug";
  
  // Add logging for debugging
  useEffect(() => {
    console.log(`[DEBUG] ${screenName} screen MOUNTED`);
    return () => console.log(`[DEBUG] ${screenName} screen UNMOUNTED`);
  }, [screenName]);

  return (
    <View style={{ 
      flex: 1, 
      justifyContent: 'center', 
      alignItems: 'center', 
      backgroundColor: '#f5f5f5' 
    }}>
      <Text style={{ fontSize: 24, marginBottom: 10 }}>{screenName} Screen</Text>
      <Text style={{ color: '#666' }}>Screen is working correctly</Text>
    </View>
  );
}