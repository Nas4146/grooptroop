import React from 'react';
import { View, Text, Button, StyleSheet, Image } from 'react-native';

interface TestProfileScreenProps {
  navigation: any;
  onSignOut: () => void;
}

export default function TestProfileScreen({ navigation, onSignOut }: TestProfileScreenProps) {
  console.log('[TEST_PROFILE] Rendering test profile screen');
  
  return (
    <View style={styles.container}>
      <View style={styles.profileHeader}>
        <View style={styles.avatarContainer}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>JD</Text>
          </View>
        </View>
        <Text style={styles.name}>John Doe</Text>
        <Text style={styles.email}>john.doe@example.com</Text>
      </View>
      
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Account</Text>
        
        <View style={styles.buttonContainer}>
          <Button
            title="Edit Profile"
            onPress={() => {
              console.log('[TEST_PROFILE] Edit profile pressed');
              // Could navigate to an edit profile screen in the future
            }}
          />
        </View>
        
        <View style={styles.buttonContainer}>
          <Button
            title="Settings"
            onPress={() => {
              console.log('[TEST_PROFILE] Settings pressed');
              // Could navigate to a settings screen in the future
            }}
          />
        </View>
        
        <View style={styles.buttonContainer}>
          <Button
            title="Sign Out"
            color="#ff3b30"
            onPress={() => {
              console.log('[TEST_PROFILE] Sign out pressed');
              if (onSignOut) {
                onSignOut();
              }
            }}
          />
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
    padding: 20,
  },
  profileHeader: {
    alignItems: 'center',
    marginBottom: 30,
  },
  avatarContainer: {
    marginBottom: 16,
  },
  avatar: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: '#7C3AED',
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    color: 'white',
    fontSize: 36,
    fontWeight: 'bold',
  },
  name: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 4,
  },
  email: {
    fontSize: 16,
    color: '#666',
  },
  section: {
    backgroundColor: 'white',
    borderRadius: 8,
    padding: 16,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 16,
  },
  buttonContainer: {
    marginBottom: 12,
  },
});