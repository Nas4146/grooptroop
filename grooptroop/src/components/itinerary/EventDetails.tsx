import React from 'react';
import { View, Text, Modal, TouchableOpacity, ScrollView, Image, Linking } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { ItineraryEvent } from '../../models/itinerary';
import tw from '../../utils/tw';
import PaymentSheet from '../payments/PaymentSheet';

interface EventDetailsModalProps {
  visible: boolean;
  event: ItineraryEvent | null;
  groopId: string;
  onClose: () => void;
  onPayment: () => void;
}

export default function EventDetailsModal({
  visible,
  event,
  groopId,
  onClose,
  onPayment
}: EventDetailsModalProps) {
  if (!visible) return null;
  
  // Show loading or error state if event is null but modal is visible
  if (!event) {
    return (
      <Modal
        visible={visible}
        transparent={true}
        animationType="slide"
        onRequestClose={onClose}
      >
        <View style={tw`flex-1 bg-black bg-opacity-50 justify-end`}>
          <View style={tw`bg-white rounded-t-3xl p-4 items-center`}>
            <TouchableOpacity 
              style={tw`self-end`}
              onPress={onClose}
            >
              <Ionicons name="close" size={24} color="#666" />
            </TouchableOpacity>
            <Text style={tw`text-neutral text-lg font-medium mt-4`}>
              Event details not available
            </Text>
            <View style={tw`my-6`}>
              <Ionicons name="alert-circle-outline" size={48} color="#CBD5E1" />
            </View>
          </View>
        </View>
      </Modal>
    );
  }

  // Get event emoji based on type
  const getEventEmoji = () => {
    switch(event.type) {
      case 'party': return '🎉';
      case 'food': return '🍕';
      case 'activity': return '🏄‍♂️';
      default: return '📅';
    }
  };

  // Handle location press to open maps
  const handleLocationPress = () => {
    if (!event.location) return;
    
    const mapUrl = `https://maps.google.com/?q=${encodeURIComponent(event.location)}`;
    Linking.openURL(mapUrl).catch(err => 
      console.error('[EVENT_DETAILS] Error opening map:', err)
    );
  };

  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="slide"
      onRequestClose={onClose}
    >
      <View style={tw`flex-1 bg-black bg-opacity-50 justify-end`}>
        <View style={tw`bg-white rounded-t-3xl max-h-[85%]`}>
          <View style={tw`p-4 border-b border-gray-200 flex-row justify-between items-center`}>
            <Text style={tw`text-lg font-bold text-neutral`}>Event Details</Text>
            <TouchableOpacity onPress={onClose}>
              <Ionicons name="close" size={24} color="#666" />
            </TouchableOpacity>
          </View>
          
          <ScrollView style={tw`p-4`} showsVerticalScrollIndicator={false}>
            {/* Header with emoji */}
            <View style={tw`flex-row items-center`}>
              <Text style={tw`text-2xl font-bold text-neutral flex-1`}>{event.title}</Text>
              <Text style={tw`text-2xl ml-2`}>{getEventEmoji()}</Text>
            </View>
            
            <View style={tw`flex-row items-center mt-2`}>
              <Ionicons name="time-outline" size={16} color="#666" />
              <Text style={tw`ml-1 text-gray-600`}>{event.time || 'Time TBD'}</Text>
              <Text style={tw`mx-2 text-gray-400`}>|</Text>
              <Ionicons name="calendar-outline" size={16} color="#666" />
              <Text style={tw`ml-1 text-gray-600`}>{event.date || 'Date TBD'}</Text>
            </View>
            
            {event.location && (
              <TouchableOpacity 
                style={tw`flex-row items-center mt-2`}
                onPress={handleLocationPress}
              >
                <Ionicons name="location-outline" size={16} color="#666" />
                <Text style={tw`ml-1 text-gray-600 underline`}>{event.location}</Text>
                <Ionicons name="open-outline" size={14} color="#666" style={tw`ml-1`} />
              </TouchableOpacity>
            )}

            {/* People attending section */}
            {event.attendees && event.attendees > 0 && (
              <View style={tw`mt-4 bg-gray-50 p-2 rounded-lg`}>
                <View style={tw`flex-row items-center justify-between`}>
                  <Text style={tw`text-sm font-medium text-gray-600`}>Attending</Text>
                  <Text style={tw`text-sm font-medium text-primary`}>{event.attendees} people</Text>
                </View>
                
                <View style={tw`flex-row mt-1`}>
                  <View style={tw`flex-row -space-x-2`}>
                    {[1,2,3].map(i => (
                      <View key={i} style={tw`w-7 h-7 rounded-full border-2 border-white`}>
                        <Image 
                          source={{ uri: `https://i.pravatar.cc/100?img=${i+10}` }} 
                          style={tw`w-full h-full rounded-full`}
                        />
                      </View>
                    ))}
                    {event.attendees > 3 && (
                      <View style={tw`w-7 h-7 rounded-full bg-primary border-2 border-white items-center justify-center`}>
                        <Text style={tw`text-xs text-white font-bold`}>+{event.attendees - 3}</Text>
                      </View>
                    )}
                  </View>
                </View>
              </View>
            )}
            
            <View style={tw`mt-6`}>
              <Text style={tw`text-lg font-bold text-neutral mb-2`}>Description</Text>
              {event.description ? (
                <Text style={tw`text-gray-700`}>{event.description}</Text>
              ) : (
                <Text style={tw`text-gray-500 italic`}>No description provided</Text>
              )}
            </View>

            {event.isPaymentRequired && (
              <View style={tw`mt-6 bg-amber-50 p-4 rounded-lg`}>
                <Text style={tw`text-lg font-bold text-neutral mb-2`}>Payment Details</Text>
                <View style={tw`flex-row justify-between`}>
                  <Text style={tw`text-gray-700`}>Cost per person:</Text>
                  <Text style={tw`font-bold text-secondary`}>${event.costPerPerson?.toFixed(2) || 0}</Text>
                </View>
                <View style={tw`flex-row justify-between mt-1`}>
                  <Text style={tw`text-gray-700`}>Total cost:</Text>
                  <Text style={tw`font-bold text-neutral`}>${event.totalCost?.toFixed(2) || 0}</Text>
                </View>
                <View style={tw`flex-row justify-between mt-1`}>
                  <Text style={tw`text-gray-700`}>Status:</Text>
                  <Text style={tw`font-bold ${event.paid ? 'text-green-600' : 'text-amber-600'}`}>
                    {event.paid ? 'Paid' : 'Pending'}
                  </Text>
                </View>
                
                {!event.paid && event.costPerPerson && event.costPerPerson > 0 && (
                  <TouchableOpacity 
                    style={tw`bg-primary py-2 rounded-lg items-center mt-3`}
                    onPress={onPayment}
                  >
                    <Text style={tw`text-white font-bold`}>Pay Now</Text>
                  </TouchableOpacity>
                )}
              </View>
            )}
            
            {event.isOptional && (
              <View style={tw`mt-4 bg-blue-50 p-3 rounded-lg flex-row items-center`}>
                <Ionicons name="information-circle-outline" size={20} color="#3B82F6" />
                <Text style={tw`text-blue-700 ml-2`}>This event is optional</Text>
              </View>
            )}

            {event.tags && event.tags.length > 0 && (
              <View style={tw`mt-4 mb-8`}>
                <Text style={tw`text-lg font-bold text-neutral mb-2`}>Tags</Text>
                <View style={tw`flex-row flex-wrap`}>
                  {event.tags.map(tag => (
                    <View key={tag} style={tw`bg-gray-100 rounded-full px-3 py-1 mr-2 mb-2`}>
                      <Text style={tw`text-xs font-medium text-gray-600`}>#{tag}</Text>
                    </View>
                  ))}
                </View>
              </View>
            )}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}