import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Image, ScrollView, TouchableOpacity, ActivityIndicator, Alert } from 'react-native';
import { useAuth } from '../contexts/AuthProvider';
import { Ionicons } from '@expo/vector-icons';
import { doc, getDoc, updateDoc, arrayUnion, arrayRemove } from 'firebase/firestore';
import { db as firestore } from '../lib/firebase';

interface EventDetailsScreenProps {
  navigation: any;
  route: any;
}

export default function EventDetailsScreen({ navigation, route }: EventDetailsScreenProps) {
  const { eventId } = route.params;
  const { user } = useAuth();
  const [event, setEvent] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isAttending, setIsAttending] = useState(false);
  const [attendingCount, setAttendingCount] = useState(0);
  
  useEffect(() => {
    fetchEventDetails();
  }, [eventId]);
  
  const fetchEventDetails = async () => {
    try {
      setLoading(true);
      setError(null);
      
      console.log(`[EVENT_DETAILS] Fetching event: ${eventId}`);
      const eventRef = doc(firestore, 'events', eventId);
      const eventDoc = await getDoc(eventRef);
      
      if (eventDoc.exists()) {
        const eventData = eventDoc.data();
        setEvent(eventData);
        
        // Check if user is attending
        const attendees = eventData.attendeeIds || [];
        setIsAttending(attendees.includes(user?.uid));
        setAttendingCount(attendees.length);
        
        console.log('[EVENT_DETAILS] Event loaded successfully');
      } else {
        console.log('[EVENT_DETAILS] Event not found');
        setError('Event not found');
      }
    } catch (err) {
      console.error('[EVENT_DETAILS] Error fetching event:', err);
      setError('Failed to load event details');
    } finally {
      setLoading(false);
    }
  };
  
  const toggleAttendance = async () => {
    if (!user) {
      Alert.alert('Error', 'You must be logged in to RSVP');
      return;
    }
    
    try {
      const eventRef = doc(firestore, 'events', eventId);
      
      if (isAttending) {
        // Leave event
        await updateDoc(eventRef, {
          attendeeIds: arrayRemove(user.uid),
          attendees: attendingCount - 1
        });
        setIsAttending(false);
        setAttendingCount(prev => prev - 1);
      } else {
        // Join event
        await updateDoc(eventRef, {
          attendeeIds: arrayUnion(user.uid),
          attendees: attendingCount + 1
        });
        setIsAttending(true);
        setAttendingCount(prev => prev + 1);
      }
      
      console.log(`[EVENT_DETAILS] User ${isAttending ? 'left' : 'joined'} event`);
    } catch (err) {
      console.error('[EVENT_DETAILS] Error updating attendance:', err);
      Alert.alert('Error', `Failed to ${isAttending ? 'leave' : 'join'} event`);
    }
  };
  
  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#7C3AED" />
        <Text style={styles.loadingText}>Loading event details...</Text>
      </View>
    );
  }
  
  if (error) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorText}>{error}</Text>
        <TouchableOpacity 
          style={styles.retryButton} 
          onPress={fetchEventDetails}
        >
          <Text style={styles.retryText}>Retry</Text>
        </TouchableOpacity>
      </View>
    );
  }
  
  if (!event) return null;
  
  const eventDate = event.date?.toDate ? event.date.toDate() : new Date();
  const formattedDate = eventDate.toLocaleDateString('en-US', { 
    weekday: 'long',
    month: 'long', 
    day: 'numeric',
    year: 'numeric'
  });
  
  const formattedTime = eventDate.toLocaleTimeString('en-US', { 
    hour: '2-digit',
    minute: '2-digit'
  });
  
  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity 
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Ionicons name="arrow-back" size={24} color="#333" />
        </TouchableOpacity>
        <Text style={styles.headerTitle} numberOfLines={1}>Event Details</Text>
        <TouchableOpacity style={styles.shareButton}>
          <Ionicons name="share-outline" size={24} color="#333" />
        </TouchableOpacity>
      </View>
      
      {event.imageUrl ? (
        <Image source={{ uri: event.imageUrl }} style={styles.eventImage} />
      ) : (
        <View style={styles.eventImagePlaceholder}>
          <Ionicons name="calendar" size={60} color="#7C3AED" />
        </View>
      )}
      
      <View style={styles.contentContainer}>
        <Text style={styles.eventTitle}>{event.title}</Text>
        
        <View style={styles.eventMeta}>
          <View style={styles.metaItem}>
            <Ionicons name="time-outline" size={20} color="#666" style={styles.metaIcon} />
            <View>
              <Text style={styles.metaText}>{formattedDate}</Text>
              <Text style={styles.metaSubtext}>{formattedTime}</Text>
            </View>
          </View>
          
          <View style={styles.metaItem}>
            <Ionicons name="location-outline" size={20} color="#666" style={styles.metaIcon} />
            <View>
              <Text style={styles.metaText}>{event.location}</Text>
              {event.locationDetails && (
                <Text style={styles.metaSubtext}>{event.locationDetails}</Text>
              )}
            </View>
          </View>
          
          <View style={styles.metaItem}>
            <Ionicons name="people-outline" size={20} color="#666" style={styles.metaIcon} />
            <Text style={styles.metaText}>
              {attendingCount} {attendingCount === 1 ? 'person' : 'people'} attending
            </Text>
          </View>
          
          {event.organizer && (
            <View style={styles.metaItem}>
              <Ionicons name="person-outline" size={20} color="#666" style={styles.metaIcon} />
              <Text style={styles.metaText}>Organized by {event.organizer}</Text>
            </View>
          )}
        </View>
        
        <View style={styles.descriptionContainer}>
          <Text style={styles.descriptionTitle}>About This Event</Text>
          <Text style={styles.description}>{event.description || 'No description provided.'}</Text>
        </View>
        
        <TouchableOpacity 
          style={[
            styles.attendButton, 
            isAttending ? styles.leavingButton : {}
          ]}
          onPress={toggleAttendance}
        >
          <Text style={styles.attendButtonText}>
            {isAttending ? 'Cancel Attendance' : 'Attend Event'}
          </Text>
        </TouchableOpacity>
        
        {event.groupId && (
          <TouchableOpacity 
            style={styles.groupButton}
            onPress={() => navigation.navigate('GroupDetails', { groupId: event.groupId })}
          >
            <Text style={styles.groupButtonText}>View Group</Text>
          </TouchableOpacity>
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    color: '#666',
    fontSize: 16,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  backButton: {
    padding: 4,
  },
  headerTitle: {
    flex: 1,
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    textAlign: 'center',
    marginHorizontal: 16,
  },
  shareButton: {
    padding: 4,
  },
  eventImage: {
    width: '100%',
    height: 200,
    resizeMode: 'cover',
  },
  eventImagePlaceholder: {
    width: '100%',
    height: 200,
    backgroundColor: '#f0f0f0',
    justifyContent: 'center',
    alignItems: 'center',
  },
  contentContainer: {
    padding: 20,
  },
  eventTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 16,
  },
  eventMeta: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
    elevation: 1,
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 14,
  },
  metaIcon: {
    marginRight: 12,
    marginTop: 2,
  },
  metaText: {
    fontSize: 16,
    color: '#333',
  },
  metaSubtext: {
    fontSize: 14,
    color: '#666',
    marginTop: 2,
  },
  descriptionContainer: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
    elevation: 1,
  },
  descriptionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  description: {
    fontSize: 16,
    color: '#444',
    lineHeight: 24,
  },
  attendButton: {
    backgroundColor: '#7C3AED',
    borderRadius: 8,
    paddingVertical: 14,
    alignItems: 'center',
    marginBottom: 12,
  },
  leavingButton: {
    backgroundColor: '#EDE9FE',
    borderWidth: 1,
    borderColor: '#7C3AED',
  },
  attendButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  groupButton: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: '#7C3AED',
    borderRadius: 8,
    paddingVertical: 14,
    alignItems: 'center',
  },
  groupButtonText: {
    color: '#7C3AED',
    fontSize: 16,
    fontWeight: '600',
  },
  errorContainer: {
    flex: 1,
    padding: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  errorText: {
    fontSize: 16,
    color: '#B91C1C',
    marginBottom: 20,
    textAlign: 'center',
  },
  retryButton: {
    backgroundColor: '#7C3AED',
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 8,
  },
  retryText: {
    color: 'white',
    fontWeight: '600',
  },
});