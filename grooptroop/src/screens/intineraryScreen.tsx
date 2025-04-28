import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

export default function ItineraryScreen() {
  return (
    <View style={styles.container}>
      <Text>Itinerary (Home)</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: 'center', justifyContent: 'center' },
});