import React from 'react';
import { View, Text, Button, StyleSheet } from 'react-native';

interface TestHomeScreenProps {
  navigation: any;
}

export default function TestHomeScreen({ navigation }: TestHomeScreenProps) {
  console.log('[TEST_HOME] Rendering test home screen');
  
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Home</Text>
      <Text style={styles.subtitle}>Your activities will appear here</Text>
      
            <View style={styles.buttonContainer}>
        <Button
          title="Test Firestore Integration"
          onPress={() => {
            console.log('[TEST_HOME] Navigating to Firestore test');
            navigation.navigate('FirestoreTest');
          }}
        />
      </View>
      
      <View style={styles.buttonContainer}>
        <Button
          title="View Event Details"
          onPress={() => {
            console.log('[TEST_HOME] Opening event details modal');
            navigation.navigate('EventDetails', { eventId: 'event123' });
          }}
        />
      </View>
      
      <View style={styles.buttonContainer}>
        <Button
          title="View Group Members"
          onPress={() => {
            console.log('[TEST_HOME] Opening group members modal');
            navigation.navigate('GroupMembers', { groopId: 'group456' });
          }}
        />
      </View>

      <View style={styles.buttonContainer}>
  <Button
    title="Storage Test"
    onPress={() => {
      console.log('[TEST_HOME] Navigating to Storage test');
      navigation.navigate('StorageTest');
    }}
  />
</View>
      
      <View style={styles.buttonContainer}>
        <Button
          title="Go to Details"
          onPress={() => {
            console.log('[TEST_HOME] Navigating to details');
            navigation.navigate('Details');
          }}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center', 
    justifyContent: 'center',
    padding: 20,
    backgroundColor: '#f5f5f5',
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    marginBottom: 8,
    color: '#333',
  },
  subtitle: {
    fontSize: 18,
    marginBottom: 32,
    color: '#666',
    textAlign: 'center',
  },
  buttonContainer: {
    width: '100%',
    marginBottom: 16,
  },
});