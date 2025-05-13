import React from 'react';
import { View, Text, Button, StyleSheet, ScrollView } from 'react-native';

interface TestDetailsScreenProps {
  navigation: any;
  route: any;
}

export default function TestDetailsScreen({ navigation, route }: TestDetailsScreenProps) {
  const itemId = route.params?.itemId || 'default';
  console.log(`[TEST_DETAILS] Rendering details screen for item: ${itemId}`);
  
  return (
    <ScrollView style={styles.scrollView}>
      <View style={styles.container}>
        <Text style={styles.title}>Details</Text>
        <Text style={styles.subtitle}>Item ID: {itemId}</Text>
        
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Information</Text>
          <Text style={styles.cardText}>This is a test details screen that shows how navigation parameters work.</Text>
        </View>
        
        <View style={styles.buttonContainer}>
          <Button
            title="Go Back"
            onPress={() => {
              console.log('[TEST_DETAILS] Going back');
              navigation.goBack();
            }}
          />
        </View>
        
        <View style={styles.buttonContainer}>
          <Button
            title="Open Different Item"
            onPress={() => {
              const newId = Math.floor(Math.random() * 1000);
              console.log(`[TEST_DETAILS] Opening item ${newId}`);
              navigation.push('Details', { itemId: newId });
            }}
          />
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scrollView: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  container: {
    flex: 1,
    alignItems: 'center',
    padding: 20,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    marginBottom: 8,
    color: '#333',
  },
  subtitle: {
    fontSize: 18,
    marginBottom: 24,
    color: '#666',
  },
  card: {
    backgroundColor: 'white',
    borderRadius: 8,
    padding: 16,
    marginBottom: 24,
    width: '100%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  cardTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 8,
    color: '#333',
  },
  cardText: {
    fontSize: 16,
    color: '#666',
    lineHeight: 22,
  },
  buttonContainer: {
    width: '100%',
    marginBottom: 16,
  },
});