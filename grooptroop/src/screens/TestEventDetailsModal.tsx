import React from 'react';
import { View, Text, Button, StyleSheet, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface TestEventDetailsModalProps {
  navigation: any;
  route: any;
}

export default function TestEventDetailsModal({ navigation, route }: TestEventDetailsModalProps) {
  const eventId = route.params?.eventId || 'unknown';
  console.log(`[TEST_EVENT_MODAL] Rendering event details for: ${eventId}`);
  
  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Event Details</Text>
        <Ionicons 
          name="close" 
          size={24} 
          color="#333" 
          onPress={() => {
            console.log('[TEST_EVENT_MODAL] Closing modal');
            navigation.goBack();
          }} 
          style={styles.closeIcon}
        />
      </View>
      
      <ScrollView style={styles.content}>
        <View style={styles.eventInfo}>
          <Text style={styles.eventTitle}>Sample Event</Text>
          <Text style={styles.eventId}>ID: {eventId}</Text>
          
          <View style={styles.eventDetail}>
            <Ionicons name="calendar" size={20} color="#7C3AED" style={styles.icon} />
            <Text style={styles.detailText}>May 15, 2023 • 3:00 PM</Text>
          </View>
          
          <View style={styles.eventDetail}>
            <Ionicons name="location" size={20} color="#7C3AED" style={styles.icon} />
            <Text style={styles.detailText}>123 Main St, Anytown, CA</Text>
          </View>
          
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Description</Text>
            <Text style={styles.sectionText}>
              This is a sample event description. Here you would see details about what this event is about,
              what to expect, and any other relevant information.
            </Text>
          </View>
          
          <View style={styles.buttonContainer}>
            <Button
              title="Add to Calendar"
              color="#7C3AED"
              onPress={() => console.log('[TEST_EVENT_MODAL] Add to calendar pressed')}
            />
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e5e5',
    backgroundColor: 'white',
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  closeIcon: {
    padding: 4,
  },
  content: {
    flex: 1,
  },
  eventInfo: {
    padding: 20,
  },
  eventTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 4,
  },
  eventId: {
    fontSize: 14,
    color: '#666',
    marginBottom: 20,
  },
  eventDetail: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  icon: {
    marginRight: 10,
  },
  detailText: {
    fontSize: 16,
    color: '#444',
  },
  section: {
    marginTop: 20,
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 8,
  },
  sectionText: {
    fontSize: 16,
    color: '#444',
    lineHeight: 22,
  },
  buttonContainer: {
    marginTop: 10,
  },
});