import React from 'react';
import { View, Text } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function MapScreen() {
  return (
    <SafeAreaView className="flex-1 justify-center items-center">
      <Text className="text-xl font-semibold">Map Screen</Text>
      <Text className="text-gray-500 mt-2">Coming soon</Text>
    </SafeAreaView>
  );
}