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
import MembersModal from './MembersModal';
import { MainTabParamList } from '../../navigation/types';
import { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import logger from '../../utils/logger';

// Create a proper navigation type
type GroopHeaderNavigationProp = BottomTabNavigationProp<MainTabParamList>;

interface GroopHeaderProps {
  minimal?: boolean;
  showMembers?: boolean;
  onPressMembers?: () => void;
  isChatScreen?: boolean;
  isItineraryScreen?: boolean;
  onShowEncryptionInfo?: () => void;
  title?: string; // Add title prop
  onBackPress?: () => void; // Add onBackPress prop
  showEncryptionInfo?: () => void; // Add showEncryptionInfo prop
  encryptionEnabled?: boolean; // Add encryptionEnabled prop
  loading?: boolean; // Add loading prop
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
  onShowEncryptionInfo,
  title,
  onBackPress,
  showEncryptionInfo,
  encryptionEnabled,
  loading
}: GroopHeaderProps) {
  const { currentGroop } = useGroop();
  const navigation = useNavigation<GroopHeaderNavigationProp>();
  const [memberProfiles, setMemberProfiles] = useState<MemberData[]>([]);
  const [isLoadingMembers, setIsLoadingMembers] = useState(true);
  const [showMembersModal, setShowMembersModal] = useState(false);

  if (!currentGroop) return null;

  const memberCount = currentGroop.members?.length || 0;
  
  // Maximum number of member avatars to show
  const MAX_AVATARS = 3;

  useEffect(() => {
    // Replace console.log with logger.groop
    logger.groop(`Component mounted with memberCount: ${memberCount}`);
  
    const startTime = Date.now();
  
    return () => {
      const totalTime = Date.now() - startTime;
      logger.groop(`Component was mounted for ${totalTime}ms`);
    };
  }, []);

  // Log each render - these will be no-ops in production
  logger.groop(`Rendering with ${memberProfiles.length} member profiles loaded`);
  logger.groop(`isLoadingMembers: ${isLoadingMembers}`);

  // Load member profiles
  useEffect(() => {
    const fetchMemberProfiles = async () => {
      if (!currentGroop || !currentGroop.members || currentGroop.members.length === 0) {
        logger.groop('No members to fetch');
        setIsLoadingMembers(false);
        return;
      }

      try {
        logger.groop(`Fetching profiles for ${currentGroop.members.length} members`);
        setIsLoadingMembers(true);
        
        // Fetch ALL members instead of just MAX_AVATARS so we have complete data for the modal
        const memberData: MemberData[] = [];
        
        for (const memberId of currentGroop.members) {
          try {
            logger.groop(`Fetching profile for member: ${memberId.substring(0, 5)}...`);
            const memberRef = doc(db, 'users', memberId);
            const memberSnap = await getDoc(memberRef);
            
            if (memberSnap.exists()) {
              const data = memberSnap.data();
              logger.groop(`Got profile for ${data.displayName || 'Unknown User'}`);
              logger.groop('Avatar data:', data.avatar ? `type: ${data.avatar.type}` : 'none');
              
              memberData.push({
                uid: memberId,
                displayName: data.displayName || 'Unknown User',
                avatar: data.avatar
              });
            } else {
              logger.groop(`No profile found for member: ${memberId.substring(0, 5)}...`);
              // Add placeholder data for non-existent users
              memberData.push({
                uid: memberId,
                displayName: 'User',
                avatar: undefined
              });
            }
          } catch (error) {
            // Keep error logs for debugging
            logger.error(`Error fetching member ${memberId}:`, error);
            // Continue with next member
          }
        }
        
        logger.groop(`Fetched ${memberData.length} member profiles`);
        setMemberProfiles(memberData);
      } catch (error) {
        logger.error('Error fetching member profiles:', error);
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

  // Handle member press - now just open modal
  const handlePressMembers = () => {
    // If custom handler is provided, use that instead
    if (onPressMembers) {
      // Try-catch to handle potential navigation errors
      try {
        onPressMembers();
      } catch (error) {
        logger.warn('Error in onPressMembers callback, falling back to modal:', error);
        setShowMembersModal(true);
      }
      return;
    }
    
    logger.groop('Opening members modal');
    setShowMembersModal(true);
  };

  // For itinerary screen, we return null as the itinerary screen handles its own header
  if (isItineraryScreen) {
    return null;
  }

  // Render a member avatar - either with the Avatar component or a placeholder
  const renderMemberAvatar = (member: MemberData, index: number) => {
    logger.groop(`Rendering avatar for member: ${member.displayName}, index: ${index}`);
    
    // Calculate a slight offset for a staggered effect
    const verticalOffset = index % 2 === 0 ? 0 : -1;
      
    return (
      <TouchableOpacity 
        key={member.uid || index} 
        style={[
          tw`w-5 h-5 rounded-full border-2 border-white overflow-hidden`,
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

  const MemberAvatar = ({ profile, index }: { profile: any, index: number }) => {
    // Only log in development mode using the logger - it's already DEV-guarded
    logger.groop(`Rendering avatar for member: ${profile.displayName}, index: ${index}`);
    
    return (
      <View style={[
        tw`rounded-full overflow-hidden`,
        { 
          marginLeft: index === 0 ? 0 : -8, 
          zIndex: 10 - index,
          backgroundColor: 'white',
        }
      ]}>
        <View style={tw`w-7 h-7 rounded-full border-2 border-white overflow-hidden`}>
          <Avatar
            user={profile.displayName}
            size="sm"
            avatarType={profile.avatar?.type}
            avatarSeed={profile.avatar?.seed}
            avatarUrl={profile.avatar?.url}
            backgroundColor={profile.avatar?.color}
          />
        </View>
      </View>
    );
  };

  return (
    <View style={tw`${minimal ? 'pt-2' : 'pt-1'} pb-0 rounded-b-3xl`}>
      <View 
        style={[
          tw`mx-4 mb-2 bg-sky-50 rounded-xl px-3 py-2.5`, 
          {
            zIndex: 20,
            position: 'relative',
          }
        ]}
      >
        {/* Original GroopHeader content - unchanged */}
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
                  onPress={() => navigation.navigate('ItineraryTab')}
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
              onPress={() => navigation.navigate('ItineraryTab')}
            >
              <Ionicons name="calendar-outline" size={12} color="white" />
              <Text style={tw`ml-1 text-white text-[10px] font-medium`}>Itinerary</Text>
            </TouchableOpacity>
          </View>
        )}
        
        {/* Members count and avatars row - now fully clickable to open modal */}
        {showMembers && memberCount > 0 && (
          <View style={tw`flex-row items-center mt-2 justify-between`}>
            {/* Make the entire row clickable */}
            <TouchableOpacity 
              style={tw`flex-row items-center flex-1`}
              onPress={handlePressMembers}
            >
              <Ionicons name="people" size={12} color="#333" />
              <Text style={tw`ml-1 text-neutral text-[10px] font-medium`}>
                {memberCount} {memberCount === 1 ? 'Member' : 'Members'}
              </Text>
            </TouchableOpacity>
            
            <View style={tw`flex-row`}>
              {/* Member avatars - right aligned */}
              <View style={tw`flex-row`}>
                {isLoadingMembers ? (
                  // Show placeholder dots while loading
                  [...Array(Math.min(memberCount, MAX_AVATARS))].map((_, i) => (
                    <View 
                      key={`loading-${i}`} 
                      style={[
                        tw`w-5 h-5 rounded-full bg-gray-200 border-2 border-white`,
                        i > 0 ? { marginLeft: -6 } : null
                      ]}
                    />
                  ))
                ) : (
                  // Render actual member avatars - first MAX_AVATARS only
                  memberProfiles.slice(0, MAX_AVATARS).map((member, index) => (
                    <View key={member.uid || index} style={index > 0 ? { marginLeft: -6 } : null}>
                      {renderMemberAvatar(member, index)}
                    </View>
                  ))
                )}
                
                {memberCount > MAX_AVATARS && (
                  <TouchableOpacity 
                    style={[
                      tw`w-5 h-5 rounded-full bg-primary border-2 border-white items-center justify-center`,
                      { marginLeft: -6 }
                    ]}
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

      {/* Members Modal */}
      <MembersModal
        visible={showMembersModal}
        onClose={() => setShowMembersModal(false)}
        members={memberProfiles}
        groopName={currentGroop.name}
      />
    </View>
  );
}