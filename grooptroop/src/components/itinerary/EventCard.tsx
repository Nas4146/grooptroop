import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, Image } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList, EventCardProps } from '../../navigation/types';
import tw from '../../utils/tw';
import PaymentSheet from '../payments/PaymentSheet';
import { useGroop } from '../../contexts/GroopProvider';
import { useAuth } from '../../contexts/AuthProvider';
import EventDetailsModal from './EventDetails';
import { PaymentService } from '../../services/PaymentService';

type EventDetailsNavigationProp = NativeStackNavigationProp<RootStackParamList, 'EventDetails'>;

export default function EventCard({ 
  event, 
  isSelected = false,
  isFirst = false,
  isLast = false 
}: EventCardProps) {
  const navigation = useNavigation<EventDetailsNavigationProp>();
  const { currentGroop } = useGroop();
  const { profile } = useAuth();
  const [detailsModalVisible, setDetailsModalVisible] = useState(false);
  const [paymentSheetVisible, setPaymentSheetVisible] = useState(false);
  const [isPaid, setIsPaid] = useState(false);

  // Check if this event is already paid by the user
  useEffect(() => {
    if (event.isPaymentRequired && event.id && currentGroop?.id && profile?.uid) {
      checkPaymentStatus();
    }
  }, [event.id, currentGroop?.id, profile?.uid, paymentSheetVisible]);
  
  const checkPaymentStatus = async () => {
    try {
      if (!currentGroop?.id || !profile?.uid) {
        console.log('[EVENT_CARD] Cannot check payment status: Missing groop ID or user ID');
        return;
      }
      
      // Check if this specific event is paid
      const eventPaid = await PaymentService.isEventPaid(currentGroop.id, profile.uid, event.id);
      setIsPaid(eventPaid);
      
    } catch (error) {
      console.error(`[EVENT_CARD] Error checking payment status for event ${event.title}:`, error);
    }
  };

  const handlePress = () => {
    setDetailsModalVisible(true);
  };

  const handlePayment = (e?: any) => {
    if (e && e.stopPropagation) {
      e.stopPropagation(); // Prevent event card click
    }
    console.log(`[EVENT_CARD] Opening payment sheet for event: ${event.title}`);
    setPaymentSheetVisible(true);
  };

  // payment completion handler
  const handlePaymentSheetClose = (paymentCompleted: boolean = false) => {
    setPaymentSheetVisible(false);
    
    // If payment was completed, update the paid status immediately
    if (paymentCompleted) {
      console.log('[EVENT_CARD] Payment completed for event:', event.title);
      setIsPaid(true);
    }
  };

  // Get event color and mood based on event type
  const getEventMood = () => {
    switch(event.type) {
      case 'party':
        return {
          bg: 'bg-rose-100',
          border: 'border-rose-300',
          icon: 'wine',
          color: '#F43F5E',
          emoji: '🎉'
        };
      case 'food':
        return {
          bg: 'bg-amber-100',
          border: 'border-amber-300',
          icon: 'restaurant',
          color: '#F59E0B',
          emoji: '🍕'
        };
      case 'activity':
        return {
          bg: 'bg-sky-100',
          border: 'border-sky-300',
          icon: 'bicycle',
          color: '#0EA5E9',
          emoji: '🏄‍♂️'
        };
      default:
        return {
          bg: 'bg-sky-100',
          border: 'border-sky-300',
          icon: 'calendar',
          color: '#78c0e1', 
          emoji: '📅'
        };
    }
  };

  const mood = getEventMood();
  const costDisplay = event.costPerPerson ? `$${event.costPerPerson}` : '';

  return (
    <>
      <View style={tw`relative ${!isFirst ? 'mt-3' : ''}`}>
        {/* Timeline connector - adjusted position for smaller bubble */}
        {!isLast && (
          <View style={tw`absolute left-[18px] top-[43px] bottom-0 w-0.5 bg-gray-200 z-0`} />
        )}
        
        <View style={tw`flex-row`}>
          {/* Event time bubble - smaller size and moved left */}
          <View style={tw`w-11 h-10 rounded-full ${mood.bg} items-center justify-center mr-1.5 z-10`}>
            <Text style={tw`text-xs font-bold text-gray-700`}>{event.time || ''}</Text>
          </View>
          
          <TouchableOpacity
            onPress={handlePress}
            style={tw`flex-1 rounded-2xl px-3 py-2.5 shadow-sm ${
              isSelected 
              ? 'bg-sky-100 border border-sky-300' 
              : `bg-white border ${mood.border}`
            } ${event.isOptional ? 'opacity-80' : 'opacity-100'}`}
          >
            <View style={tw`flex-row justify-between items-start pr-1.5`}>
              <View style={tw`flex-1 pr-1`}>
                {/* Row with title and mood emoji */}
                <View style={tw`flex-row items-center flex-wrap`}>
                  <Text style={tw`text-base font-bold ${
                    event.isOptional ? 'text-gray-500' : 'text-gray-800'
                  }`}>
                    {event.title || ''}
                  </Text>
                  <Text style={tw`ml-1.5 text-base`}>{mood.emoji}</Text>
                </View>
                
                {/* Optional tag */}
                {event.isOptional && (
                  <View style={tw`flex-row items-center mt-0.5`}>
                    <View style={tw`bg-gray-100 rounded-full px-1.5 py-0.5`}>
                      <Text style={tw`text-xs font-medium text-gray-500`}>Optional</Text>
                    </View>
                  </View>
                )}
                            
                {/* Location if available */}
                {event.location && (
                  <View style={tw`flex-row items-center mt-1`}>
                    <Ionicons name="location-outline" size={14} color="#6B7280" />
                    <Text style={tw`text-xs text-gray-500 ml-0.5`}>{event.location}</Text>
                  </View>
                )}
                            
                {/* Description with ellipsis if too long */}
                <Text 
                  numberOfLines={2}
                  ellipsizeMode="tail"
                  style={tw`text-sm text-gray-600 mt-1.5`}
                >
                  {event.description || ''}
                </Text>
                            
                {/* Trending hashtags - more compact */}
                {event.tags && event.tags.length > 0 && (
                  <View style={tw`flex-row flex-wrap mt-1.5`}>
                    {event.tags.map(tag => (
                      <Text key={tag} style={tw`mr-1.5 text-xs text-secondary font-medium`}>
                        #{tag}
                      </Text>
                    ))}
                  </View>
                )}
              </View>
              
              {/* Payment indicator - updated to show paid status */}
              {event.isPaymentRequired && (
                <TouchableOpacity
                  style={tw`items-center`}
                  onPress={handlePayment}
                >
                  {isPaid ? (
                    <>
                      <Ionicons 
                        name="checkmark-circle" 
                        size={14} 
                        color="#22c55e" 
                        style={tw`mb-0.5 self-center`} 
                      />
                      <View style={tw`bg-green-100 rounded-full px-2.5 py-1 flex-row items-center`}>
                        <View style={tw`h-3.5 w-3.5 rounded-full bg-green-500 mr-1.5`} />
                        <Text style={tw`text-xs font-medium text-green-700`}>Paid</Text>
                      </View>
                    </>
                  ) : (
                    <>
                      <Ionicons 
                        name="card-outline" 
                        size={14} 
                        color="#f59e0b" 
                        style={tw`mb-0.5 self-center`} 
                      />
                      <View style={tw`bg-gray-100 rounded-full px-2.5 py-1 flex-row items-center`}>
                        <View style={tw`h-3.5 w-3.5 rounded-full bg-amber-500 mr-1.5`} />
                        <Text style={tw`text-xs font-medium text-gray-700`}>
                          ${event.costPerPerson || 0}
                        </Text>
                      </View>
                    </>
                  )}
                </TouchableOpacity>
              )}
            </View>
            
            {/* People attending indicators - more compact */}
            {typeof event.attendees === 'number' && event.attendees > 0 && (
              <View style={tw`flex-row items-center mt-2`}>
                <View style={tw`flex-row -space-x-2`}>
                  {[1,2,3].map(i => (
                    <View key={i} style={tw`w-5 h-5 rounded-full border-2 border-white`}>
                      <Image 
                        source={{ uri: `https://i.pravatar.cc/100?img=${i+10}` }} 
                        style={tw`w-full h-full rounded-full`}
                      />
                    </View>
                  ))}
                  <View style={tw`w-5 h-5 rounded-full bg-primary border-2 border-white items-center justify-center`}>
                    <Text style={tw`text-[10px] text-white font-bold`}>+3</Text>
                  </View>
                </View>
              </View>
            )}
          </TouchableOpacity>
        </View>
      </View>
      
      {/* Event Details Modal */}
      <EventDetailsModal
        visible={detailsModalVisible}
        event={event}
        groopId={currentGroop?.id || ''}
        onClose={() => setDetailsModalVisible(false)}
        onPayment={handlePayment}
      />

      {/* Payment Sheet Modal - now with isPaid prop */}
      <PaymentSheet
        visible={paymentSheetVisible}
        onClose={handlePaymentSheetClose}
        groopId={currentGroop?.id || ''}
        eventId={event.id}
        amount={typeof event.costPerPerson === 'number' ? event.costPerPerson : 0}
        description={`Payment for ${event.title}`}
        title={`Pay for ${event.title}`}
        isPaid={isPaid}
      />
    </>
  );
}