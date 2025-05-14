import React, { useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, Image } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import tw from '../../utils/tw';
import { useGroop } from '../../contexts/GroopProvider';
import Avatar from './Avatar';
import { UserProfile } from '../../contexts/AuthProvider';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../../lib/firebase';

interface GroopHeaderProps {
  minimal?: boolean;
  showMembers?: boolean;
  onPressMembers?: () => void;
  isChatScreen?: boolean;
  isItineraryScreen?: boolean;
  onShowEncryptionInfo?: () => void;
}

interface MemberData {
  uid: string;
  displayName: string;
  avatar?: any; // Using UserAvatar type but keeping it simple for debugging
}

export default function GroopHeader({ 
  minimal = false, 
  showMembers = true, 
  onPressMembers,
  isChatScreen = false,
  isItineraryScreen = false,
  onShowEncryptionInfo
}: GroopHeaderProps) {
  const { currentGroop } = useGroop();
  const navigation = useNavigation();
  const [memberProfiles, setMemberProfiles] = useState<MemberData[]>([]);
  const [isLoadingMembers, setIsLoadingMembers] = useState(true);

  if (!currentGroop) return null;

  const memberCount = currentGroop.members?.length || 0;
  
  // Maximum number of member avatars to show
  const MAX_AVATARS = 3;

  useEffect(() => {
  console.log(`[GROOP_HEADER] Component mounted with memberCount: ${memberCount}`);
  
  const startTime = Date.now();
  
  return () => {
    const totalTime = Date.now() - startTime;
    console.log(`[GROOP_HEADER] Component was mounted for ${totalTime}ms`);
  };
}, []);

// Log each render
console.log(`[GROOP_HEADER] Rendering with ${memberProfiles.length} member profiles loaded`);
console.log(`[GROOP_HEADER] isLoadingMembers: ${isLoadingMembers}`);

  // Load member profiles
  useEffect(() => {
    const fetchMemberProfiles = async () => {
      if (!currentGroop || !currentGroop.members || currentGroop.members.length === 0) {
        console.log('[GROOP_HEADER] No members to fetch');
        setIsLoadingMembers(false);
        return;
      }

      try {
        console.log(`[GROOP_HEADER] Fetching profiles for ${currentGroop.members.length} members`);
        setIsLoadingMembers(true);
        
        // Only fetch the first MAX_AVATARS members for efficiency
        const membersToFetch = currentGroop.members.slice(0, MAX_AVATARS);
        const memberData: MemberData[] = [];
        
        for (const memberId of membersToFetch) {
          try {
            console.log(`[GROOP_HEADER] Fetching profile for member: ${memberId.substring(0, 5)}...`);
            const memberRef = doc(db, 'users', memberId);
            const memberSnap = await getDoc(memberRef);
            
            if (memberSnap.exists()) {
              const data = memberSnap.data();
              console.log(`[GROOP_HEADER] Got profile for ${data.displayName || 'Unknown User'}`);
              console.log(`[GROOP_HEADER] Avatar data:`, data.avatar ? `type: ${data.avatar.type}` : 'none');
              
              memberData.push({
                uid: memberId,
                displayName: data.displayName || 'Unknown User',
                avatar: data.avatar
              });
            } else {
              console.log(`[GROOP_HEADER] No profile found for member: ${memberId.substring(0, 5)}...`);
              // Add placeholder data for non-existent users
              memberData.push({
                uid: memberId,
                displayName: 'User',
                avatar: undefined
              });
            }
          } catch (error) {
            console.error(`[GROOP_HEADER] Error fetching member ${memberId}:`, error);
            // Continue with next member
          }
        }
        
        console.log(`[GROOP_HEADER] Fetched ${memberData.length} member profiles`);
        setMemberProfiles(memberData);
      } catch (error) {
        console.error('[GROOP_HEADER] Error fetching member profiles:', error);
      } finally {
        setIsLoadingMembers(false);
      }
    };

    fetchMemberProfiles();
  }, [currentGroop]);

  const getAvatarFallback = (index: number) => {
  // Create a deterministic color based on index
  const colors = ['#FF6B6B', '#4ECDC4', '#7C3AED', '#F59E0B', '#3A86FF'];
  return (
    <View 
      style={[
        tw`w-full h-full items-center justify-center`,
        { backgroundColor: colors[index % colors.length] }
      ]}
    >
      <Text style={tw`text-[8px] text-white font-bold`}>
        {`U${index + 1}`}
      </Text>
    </View>
  );
};

  // Default handler for member press if not provided
  const handlePressMembers = () => {
    if (onPressMembers) {
      onPressMembers();
    } else {
      navigation.navigate('GroupMembers', { groopId: currentGroop.id });
    }
  };

  // For itinerary screen, we return null as the itinerary screen handles its own header
  if (isItineraryScreen) {
    return null;
  }

  // Render a member avatar - either with the Avatar component or a placeholder
const renderMemberAvatar = (member: MemberData, index: number) => {
  console.log(`[GROOP_HEADER] Rendering avatar for member: ${member.displayName}, index: ${index}`);
  
  // Calculate a slight offset for a staggered effect
  const verticalOffset = index % 2 === 0 ? 0 : -1;
    
  return (
    <TouchableOpacity 
      key={member.uid || index} 
      style={[
        tw`w-5 h-5 rounded-full border-2 border-white overflow-hidden shadow-sm`,
        { transform: [{ translateY: verticalOffset }] }
      ]}
      onPress={handlePressMembers}
    >
      {/* Avatar with error handling */}
      <View style={tw`w-full h-full`}>
        {member ? (
          <Avatar
            avatar={member.avatar}
            displayName={member.displayName}
            size={20}
          />
        ) : getAvatarFallback(index)}
      </View>
      
      {/* Add a subtle "active" indicator for the first member */}
      {index === 0 && (
        <View style={tw`absolute bottom-0 right-0 w-1.5 h-1.5 bg-green-400 rounded-full border border-white`} />
      )}
    </TouchableOpacity>
  );
};

  return (
    <View style={tw`${minimal ? 'pt-2' : 'pt-1'} pb-0 rounded-b-3xl`}>
      <View 
        style={[
          tw`mx-4 mb-2 bg-sky-50 rounded-xl px-3 py-2.5 shadow-md`, 
          {
            zIndex: 20,
            elevation: 4,
            position: 'relative',
          }
        ]}
      >
        <View style={tw`flex-row justify-between items-center mb-0.5`}>
          {/* Show "Trip Chat" for chat screen, groop name otherwise */}
          <Text style={tw`font-bold text-neutral text-sm flex-1`} numberOfLines={1}>
            {isChatScreen ? 'Trip Chat' : currentGroop.name}
          </Text>
          
          <View style={tw`flex-row items-center`}>
            {/* Chat-specific encryption indicator */}
            {isChatScreen && (
              <>
                <View style={tw`flex-row items-center mr-2`}>
                  <Ionicons name="lock-closed" size={11} color="#78c0e1" style={tw`mr-1`} />
                  <Text style={tw`text-gray-600 text-[10px]`}>
                    Encrypted
                  </Text>
                </View>
                
                <TouchableOpacity
                  onPress={onShowEncryptionInfo}
                  style={tw`p-1`}
                >
                  <Ionicons name="information-circle-outline" size={14} color="#78c0e1" />
                </TouchableOpacity>
              </>
            )}
          </View>
        </View>
        
        {/* Date and Location Row - Only show for non-chat screens */}
        {!isChatScreen && (
          <View style={tw`flex-row items-center mt-1 flex-wrap`}>
            {currentGroop.dateRange && (
              <View style={tw`flex-row items-center mr-2`}>
                <Ionicons name="calendar" size={12} color="#333" />
                <Text style={tw`ml-1 text-neutral text-[10px] font-medium`}>
                  {currentGroop.dateRange}
                </Text>
              </View>
            )}
            
            {currentGroop.location && (
              <View style={tw`flex-row items-center`}>
                {/* Location with red pin icon in a bubble */}
                <View style={tw`bg-gray-200 rounded-full px-2 py-0.5 flex-row items-center`}>
                  <Ionicons name="location" size={12} color="#F43F5E" />
                  <Text style={tw`ml-0.5 text-neutral text-[10px] font-medium`}>{currentGroop.location}</Text>
                </View>
                
                {/* Itinerary Button - matches location bubble style but with different color */}
                <TouchableOpacity
                  style={tw`ml-2 bg-primary rounded-full px-2 py-0.5 flex-row items-center`}
                  onPress={() => navigation.navigate('Itinerary')}
                >
                  <Ionicons name="calendar-outline" size={12} color="white" />
                  <Text style={tw`ml-0.5 text-white text-[10px] font-medium`}>Itinerary</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        )}
        
        {/* Chat-specific action buttons - only for chat screen */}
        {isChatScreen && (
          <View style={tw`flex-row mt-2`}>
            <TouchableOpacity 
              style={tw`flex-row items-center bg-gray-100 rounded-full px-2.5 py-0.5 mr-2`}
            >
              <Ionicons name="image" size={12} color="#333" />
              <Text style={tw`ml-1 text-neutral text-[10px] font-medium`}>Photos</Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={tw`flex-row items-center bg-gray-100 rounded-full px-2.5 py-0.5 mr-2`}
            >
              <Ionicons name="location" size={12} color="#F43F5E" />
              <Text style={tw`ml-1 text-neutral text-[10px] font-medium`}>Share Location</Text>
            </TouchableOpacity>

            {/* Itinerary Button - To the right of Share Location */}
            <TouchableOpacity 
              style={tw`flex-row items-center bg-primary rounded-full px-2.5 py-0.5`}
              onPress={() => navigation.navigate('Itinerary')}
            >
              <Ionicons name="calendar-outline" size={12} color="white" />
              <Text style={tw`ml-1 text-white text-[10px] font-medium`}>Itinerary</Text>
            </TouchableOpacity>
          </View>
        )}
        
        {/* Members count and avatars row */}
        {showMembers && memberCount > 0 && (
          <View style={tw`flex-row items-center mt-2 justify-between`}>
            <View style={tw`flex-row items-center`}>
              <Ionicons name="people" size={12} color="#333" />
              <Text style={tw`ml-1 text-neutral text-[10px] font-medium`}>
                {memberCount} {memberCount === 1 ? 'Member' : 'Members'}
              </Text>
            </View>
            
            <View style={tw`flex-row`}>
              {/* Member avatars - right aligned */}
              <View style={tw`flex-row -space-x-1.5`}>
                {isLoadingMembers ? (
                  // Show placeholder dots while loading
                  [...Array(Math.min(memberCount, MAX_AVATARS))].map((_, i) => (
                    <View 
                      key={`loading-${i}`} 
                      style={tw`w-5 h-5 rounded-full bg-gray-200 border-2 border-white`}
                    />
                  ))
                ) : (
                  // Render actual member avatars
                  memberProfiles.map((member, index) => renderMemberAvatar(member, index))
                )}
                
                {memberCount > MAX_AVATARS && (
                  <TouchableOpacity 
                    style={tw`w-5 h-5 rounded-full bg-primary border-2 border-white items-center justify-center shadow-sm`}
                    onPress={handlePressMembers}
                  >
                    <Text style={tw`text-[8px] text-white font-bold`}>+{memberCount - MAX_AVATARS}</Text>
                  </TouchableOpacity>
                )}
              </View>
            </View>
          </View>
        )}
      </View>
    </View>
  );
}