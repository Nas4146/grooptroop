import React from 'react';
import { View, Text } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import tw from '../utils/tw';
import GroopHeader from '../components/common/GroopHeader';

export default function MapScreen() {
return (
  <SafeAreaView style={tw`flex-1 bg-light`}>
    <GroopHeader minimal={true} />
    
    <View style={tw`px-4 pt-1 pb-2`}>
      <Text style={tw`text-2xl font-bold text-neutral`}>Map</Text>
    </View>
    
    {/* Rest of your map screen */}
  </SafeAreaView>
);
}