import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, FlatList, ActivityIndicator, RefreshControl, Image } from 'react-native';
import { useAuth } from '../contexts/AuthProvider';
import { Ionicons } from '@expo/vector-icons';
import { collection, query, orderBy, limit, getDocs } from 'firebase/firestore';
import { db as firestore } from '../lib/firebase';

interface HomeScreenProps {
  navigation: any;
}

interface EventItem {
  id: string;
  title: string;
  date: any;
  location: string;
  imageUrl?: string;
  attendees: number;
}

export default function HomeScreen({ navigation }: HomeScreenProps) {
  const { user } = useAuth();
  const [events, setEvents] = useState<EventItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchEvents();
  }, []);

  const fetchEvents = async () => {
    try {
      setError(null);
      if (!refreshing) setLoading(true);
      
      console.log('[HOME] Fetching events');
      
      // This would eventually filter by user's groups/interests
      const eventsQuery = query(
        collection(firestore, 'events'), 
        orderBy('date', 'asc'),
        limit(20)
      );
      
      const snapshot = await getDocs(eventsQuery);
      const eventsList = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as EventItem[];
      
      console.log(`[HOME] Loaded ${eventsList.length} events`);
      setEvents(eventsList);
    } catch (err) {
      console.error('[HOME] Error fetching events:', err);
      setError('Failed to load events');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    fetchEvents();
  };
  
  // Create sample events if none exist (for testing only)
  const createSampleEvents = () => {
    // Implementation would go here
    console.log('[HOME] This would create sample events (not implemented)');
  };

  const renderEventCard = ({ item }: { item: EventItem }) => {
    const eventDate = item.date?.toDate ? item.date.toDate() : new Date();
    
    return (
      <TouchableOpacity
        style={styles.eventCard}
        onPress={() => navigation.navigate('EventDetails', { eventId: item.id })}
      >
        {item.imageUrl ? (
          <Image source={{ uri: item.imageUrl }} style={styles.eventImage} />
        ) : (
          <View style={styles.eventImagePlaceholder}>
            <Ionicons name="calendar" size={30} color="#7C3AED" />
          </View>
        )}
        
        <View style={styles.eventInfo}>
          <Text style={styles.eventTitle}>{item.title}</Text>
          
          <View style={styles.eventDetail}>
            <Ionicons name="time-outline" size={16} color="#666" style={styles.eventIcon} />
            <Text style={styles.eventDetailText}>
              {eventDate.toLocaleDateString('en-US', { 
                month: 'short',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
              })}
            </Text>
          </View>
          
          <View style={styles.eventDetail}>
            <Ionicons name="location-outline" size={16} color="#666" style={styles.eventIcon} />
            <Text style={styles.eventDetailText} numberOfLines={1}>
              {item.location}
            </Text>
          </View>
          
          <View style={styles.eventAttendees}>
            <Ionicons name="people-outline" size={16} color="#666" style={styles.eventIcon} />
            <Text style={styles.eventDetailText}>
              {item.attendees} attendees
            </Text>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  if (loading && !refreshing) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#7C3AED" />
        <Text style={styles.loadingText}>Loading events...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Upcoming Events</Text>
        <TouchableOpacity 
          style={styles.createButton}
          onPress={() => navigation.navigate('CreateEvent')}
        >
          <Ionicons name="add" size={24} color="white" />
        </TouchableOpacity>
      </View>
      
      {error ? (
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity 
            style={styles.retryButton} 
            onPress={fetchEvents}
          >
            <Text style={styles.retryText}>Retry</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={events}
          keyExtractor={(item) => item.id}
          renderItem={renderEventCard}
          contentContainerStyle={styles.listContent}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Ionicons name="calendar-outline" size={60} color="#ccc" />
              <Text style={styles.emptyText}>No events found</Text>
              <TouchableOpacity 
                style={styles.createSampleButton}
                onPress={createSampleEvents}
              >
                <Text style={styles.createSampleText}>Create Sample Events</Text>
              </TouchableOpacity>
            </View>
          }
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              colors={['#7C3AED']}
            />
          }
        />
      )}
    </View>
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
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 16,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
  },
  createButton: {
    backgroundColor: '#7C3AED',
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  listContent: {
    padding: 16,
    paddingBottom: 32,
  },
  eventCard: {
    flexDirection: 'row',
    backgroundColor: 'white',
    borderRadius: 12,
    overflow: 'hidden',
    marginBottom: 16,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  eventImage: {
    width: 100,
    height: 'auto',
  },
  eventImagePlaceholder: {
    width: 100,
    backgroundColor: '#f0f0f0',
    justifyContent: 'center',
    alignItems: 'center',
  },
  eventInfo: {
    flex: 1,
    padding: 12,
  },
  eventTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 8,
    color: '#333',
  },
  eventDetail: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  eventIcon: {
    marginRight: 6,
  },
  eventDetailText: {
    fontSize: 14,
    color: '#666',
  },
  eventAttendees: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
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
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 30,
  },
  emptyText: {
    fontSize: 16,
    color: '#666',
    marginTop: 10,
    marginBottom: 20,
  },
  createSampleButton: {
    backgroundColor: '#7C3AED',
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 8,
  },
  createSampleText: {
    color: 'white',
    fontWeight: '600',
  },
});