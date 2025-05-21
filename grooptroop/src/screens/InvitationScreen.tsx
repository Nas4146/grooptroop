import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  Image, 
  TouchableOpacity, 
  ActivityIndicator, 
  SafeAreaView,
  ScrollView,
  Animated,
  Alert,
  Dimensions
} from 'react-native';
import { useRoute, useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../contexts/AuthProvider';
import { useGroop } from '../contexts/GroopProvider';
import { InvitationService } from '../services/InvitationService';
import { GroopService } from '../services/GroopService';
import tw from '../utils/tw';
import * as Haptics from 'expo-haptics';

// Type for the route params
type InvitationRouteParams = {
  groopId: string;
};

export default function InvitationScreen() {
  const route = useRoute();
  const navigation = useNavigation();
  const { profile, isAuthenticated } = useAuth();
  const { setCurrentGroop } = useGroop();
  
  const [loading, setLoading] = useState(true);
  const [joining, setJoining] = useState(false);
  const [invitation, setInvitation] = useState<{
    valid: boolean;
    message?: string;
    groopName?: string;
    groopId?: string;
    groopPhoto?: string;
    createdBy?: string;
    memberCount?: number;
  } | null>(null);
  
  // Animation values
  const fadeAnim = React.useRef(new Animated.Value(0)).current;
  const scaleAnim = React.useRef(new Animated.Value(0.9)).current;
  
  // Get the groop ID from route params
  const params = route.params as InvitationRouteParams;
  const groopId = params?.groopId;
  
  useEffect(() => {
    // Validate the invitation when the component mounts
    const validateInvitation = async () => {
      if (!groopId) {
        console.log('[INVITATION_SCREEN] No groop ID provided');
        setInvitation({ valid: false, message: 'Invalid invitation link.' });
        setLoading(false);
        return;
      }
      
      try {
        console.log('[INVITATION_SCREEN] Validating invitation for groop:', groopId);
        const result = await InvitationService.validateInvitation(groopId);
        setInvitation(result);
      } catch (error) {
        console.error('[INVITATION_SCREEN] Error validating invitation:', error);
        setInvitation({ valid: false, message: 'Failed to validate invitation.' });
      } finally {
        setLoading(false);
        
        // Start animations
        Animated.parallel([
          Animated.timing(fadeAnim, {
            toValue: 1,
            duration: 500,
            useNativeDriver: true,
          }),
          Animated.timing(scaleAnim, {
            toValue: 1,
            duration: 500,
            useNativeDriver: true,
          }),
        ]).start();
      }
    };
    
    validateInvitation();
  }, [groopId]);

  // Remove browser-specific code that won't work in React Native
  // The Open Graph meta tags would need to be handled on a web server instead
  
  // Handle joining the groop
  const handleJoinGroop = async () => {
    if (!invitation?.groopId) return;
    
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      setJoining(true);
      
      if (!isAuthenticated) {
        console.log('[INVITATION_SCREEN] User not authenticated, navigating to sign in');
        // Navigate to sign in screen with params
        navigation.navigate('SignIn' as never, { 
          groopId: invitation.groopId 
        } as never);
        return;
      }
      
      if (!profile) {
        console.log('[INVITATION_SCREEN] No user profile found');
        setJoining(false);
        return;
      }
      
      console.log(`[INVITATION_SCREEN] User ${profile.uid} joining groop ${invitation.groopId}`);
      const result = await InvitationService.acceptInvitation(invitation.groopId, profile.uid);
      
      if (result.success) {
        console.log('[INVITATION_SCREEN] Successfully joined groop');
        
        try {
          // Update the current groop in context
          const groopData = await GroopService.getGroop(invitation.groopId);
          if (groopData) {
            setCurrentGroop(groopData);
          }
          
          // Show success feedback
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          
          // Navigate to the chat screen for the newly joined groop
          navigation.navigate('MainTabs' as never, { 
            screen: 'Chat',
            params: { groopId: invitation.groopId }
          } as never);
        } catch (error) {
          console.error('[INVITATION_SCREEN] Error loading groop after join:', error);
          Alert.alert('Success', 'You joined the groop, but there was an issue loading the details.');
          navigation.navigate('MainTabs' as never);
        }
      } else {
        // Handle the case where they're already a member
        if (result.alreadyMember) {
          console.log('[INVITATION_SCREEN] User already a member, navigating to chat');
          navigation.navigate('MainTabs' as never, { 
            screen: 'Chat',
            params: { groopId: invitation.groopId }
          } as never);
        } else {
          console.log('[INVITATION_SCREEN] Failed to join groop:', result.message);
          Alert.alert('Error', result.message || 'Failed to join the groop. Please try again.');
        }
      }
    } catch (error) {
      console.error('[INVITATION_SCREEN] Error joining groop:', error);
      Alert.alert('Error', 'Something went wrong. Please try again.');
    } finally {
      setJoining(false);
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={tw`flex-1 bg-light justify-center items-center`}>
        <ActivityIndicator size="large" color="#7C3AED" />
        <Text style={tw`mt-4 text-gray-600`}>Validating invitation...</Text>
      </SafeAreaView>
    );
  }
  
  if (!invitation || !invitation.valid) {
    return (
      <SafeAreaView style={tw`flex-1 bg-light`}>
        <View style={tw`flex-1 justify-center items-center p-6`}>
          <Ionicons name="alert-circle-outline" size={64} color="#EF4444" />
          <Text style={tw`text-xl font-bold text-gray-800 mt-4 text-center`}>
            Invalid Invitation
          </Text>
          <Text style={tw`text-gray-600 text-center mt-2 mb-8`}>
            {invitation?.message || "This invitation link is invalid or has expired."}
          </Text>
          
          <TouchableOpacity
            style={tw`bg-primary py-3 px-6 rounded-lg`}
            onPress={() => navigation.navigate('MainTabs' as never)}
          >
            <Text style={tw`text-white font-bold`}>Go Home</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }
  
  return (
    <SafeAreaView style={tw`flex-1 bg-light`}>
      <ScrollView contentContainerStyle={tw`flex-grow`}>
        <Animated.View 
          style={[
            tw`flex-1 p-6 justify-center`,
            {
              opacity: fadeAnim,
              transform: [{ scale: scaleAnim }]
            }
          ]}
        >
          {/* Header with logo */}
          <View style={tw`items-center mb-8`}>
            <View style={tw`w-20 h-20 bg-primary/10 rounded-full items-center justify-center mb-2`}>
              <Ionicons name="people" size={40} color="#7C3AED" />
            </View>
            <Text style={tw`text-primary font-bold text-lg`}>GroopTroop</Text>
          </View>
          
          {/* Invitation card */}
          <View style={tw`bg-white rounded-3xl overflow-hidden mb-8`}>
            {/* Top banner/image */}
            <View style={tw`bg-primary h-24 items-center justify-center`}>
              {invitation.groopPhoto ? (
                <Image
                  source={{ uri: invitation.groopPhoto }}
                  style={tw`w-full h-full`}
                  resizeMode="cover"
                />
              ) : (
                <View style={tw`flex-row items-center`}>
                  <Ionicons name="airplane-outline" size={32} color="white" />
                </View>
              )}
            </View>
            
            {/* Invitation content */}
            <View style={tw`p-6`}>
              <Text style={tw`text-2xl font-bold text-center text-neutral mb-2`}>
                You've been invited to join
              </Text>
              
              <Text style={tw`text-primary text-2xl font-bold text-center mb-6`}>
                {invitation.groopName}
              </Text>
              
              <View style={tw`flex-row justify-center mb-6`}>
                <View style={tw`bg-gray-100 rounded-full px-3 py-1 mr-2 flex-row items-center`}>
                  <Ionicons name="people" size={16} color="#64748B" />
                  <Text style={tw`ml-1 text-xs text-gray-600`}>
                    {invitation.memberCount || 1} {invitation.memberCount === 1 ? 'member' : 'members'}
                  </Text>
                </View>
                
                <View style={tw`bg-gray-100 rounded-full px-3 py-1 flex-row items-center`}>
                  <Ionicons name="calendar-outline" size={16} color="#64748B" />
                  <Text style={tw`ml-1 text-xs text-gray-600`}>Trip Planning</Text>
                </View>
              </View>
              
              <TouchableOpacity
                style={tw`bg-primary py-4 rounded-xl flex-row justify-center items-center mb-4`}
                onPress={handleJoinGroop}
                disabled={joining}
              >
                {joining ? (
                  <ActivityIndicator color="white" size="small" />
                ) : (
                  <>
                    <Ionicons name="checkmark-circle-outline" size={20} color="white" style={tw`mr-2`} />
                    <Text style={tw`text-white font-bold text-lg`}>Join Trip</Text>
                  </>
                )}
              </TouchableOpacity>
              
              {!isAuthenticated && (
                <Text style={tw`text-xs text-gray-500 text-center`}>
                  You'll need to sign in or create an account to join
                </Text>
              )}
            </View>
          </View>
          
          {/* App features section */}
          <View style={tw`mb-4`}>
            <Text style={tw`text-lg font-bold text-neutral mb-4`}>What is GroopTroop?</Text>
            
            <View style={tw`flex-row items-center mb-4`}>
              <View style={tw`w-10 h-10 rounded-full bg-primary/20 items-center justify-center mr-4`}>
                <Ionicons name="chatbubbles-outline" size={20} color="#7C3AED" />
              </View>
              <View style={tw`flex-1`}>
                <Text style={tw`font-medium text-neutral mb-1`}>Group Chat</Text>
                <Text style={tw`text-sm text-gray-500`}>Private, secure group messaging</Text>
              </View>
            </View>
            
            <View style={tw`flex-row items-center mb-4`}>
              <View style={tw`w-10 h-10 rounded-full bg-primary/20 items-center justify-center mr-4`}>
                <Ionicons name="calendar-outline" size={20} color="#7C3AED" />
              </View>
              <View style={tw`flex-1`}>
                <Text style={tw`font-medium text-neutral mb-1`}>Trip Planning</Text>
                <Text style={tw`text-sm text-gray-500`}>Coordinate activities and itineraries</Text>
              </View>
            </View>
            
            <View style={tw`flex-row items-center`}>
              <View style={tw`w-10 h-10 rounded-full bg-primary/20 items-center justify-center mr-4`}>
                <Ionicons name="cash-outline" size={20} color="#7C3AED" />
              </View>
              <View style={tw`flex-1`}>
                <Text style={tw`font-medium text-neutral mb-1`}>Split Costs</Text>
                <Text style={tw`text-sm text-gray-500`}>Easily manage payments and expenses</Text>
              </View>
            </View>
          </View>
        </Animated.View>
      </ScrollView>
    </SafeAreaView>
  );
}