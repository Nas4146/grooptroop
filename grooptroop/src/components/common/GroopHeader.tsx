import React, { useEffect, useState, useMemo, useCallback, memo } from 'react';
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
  // Display options
  minimal?: boolean;
  showMembers?: boolean;
  
  // Screen-specific configurations
  isChatScreen?: boolean;
  isItineraryScreen?: boolean;
  
  // Encryption (chat-specific)
  encryptionEnabled?: boolean;
  onShowEncryptionInfo?: () => void;
  
  // Customization
  title?: string;
  backgroundColor?: string;
  actions?: React.ReactNode;
  
  // Callbacks
  onPressMembers?: () => void;
  onBackPress?: () => void;
  
  // Loading states
  loading?: boolean;
  error?: string;
  onRetry?: () => void;
  
  // Accessibility
  accessibilityLabel?: string;
  testID?: string;
}

// More specific types
interface MemberData {
  uid: string;
  displayName: string;
  avatar?: {
    type?: 'dicebear' | 'upload' | 'initial';
    seed?: string;
    url?: string;
    color?: string;
  };
}

// Add screen configuration interface
interface ScreenConfig {
  showEncryption?: boolean;
  showActionButtons?: boolean;
  showDateLocation?: boolean;
  title?: string;
  backgroundColor: string; // Required field
  actions?: React.ReactNode;
}

// Define screen configurations
type ScreenType = 'chat' | 'itinerary' | 'payments' | 'map' | 'default';

const SCREEN_CONFIGURATIONS: Record<ScreenType, Partial<ScreenConfig>> = {
  chat: {
    showEncryption: true,
    showActionButtons: false, // Changed from true to false - removes the action buttons row
    showDateLocation: true, // Changed from false to true - shows date/location like default
    title: undefined, // Changed from 'Trip Chat' to undefined - will use groop name
    backgroundColor: 'bg-sky-50'
  },
  itinerary: {
    backgroundColor: 'bg-sky-50'
  },
  payments: {
    backgroundColor: 'bg-sky-50'
  },
  map: {
    backgroundColor: 'bg-sky-50'
  },
  default: {
    showEncryption: false,
    showActionButtons: false,
    showDateLocation: true,
    backgroundColor: 'bg-sky-50'
  }
};

const getScreenConfig = (props: GroopHeaderProps, currentGroop?: any): ScreenConfig => {
  let baseConfig: Partial<ScreenConfig>;
  
  if (props.isChatScreen) {
    baseConfig = SCREEN_CONFIGURATIONS.chat;
  } else if (props.isItineraryScreen) {
    baseConfig = SCREEN_CONFIGURATIONS.itinerary;
  } else {
    baseConfig = SCREEN_CONFIGURATIONS.default;
  }
  
  // Merge with props and provide defaults
  return {
    showEncryption: baseConfig.showEncryption || false,
    showActionButtons: baseConfig.showActionButtons || false,
    showDateLocation: baseConfig.showDateLocation || true,
    title: props.title || baseConfig.title || currentGroop?.name,
    backgroundColor: props.backgroundColor || baseConfig.backgroundColor || 'bg-sky-50'
  };
};

export default React.memo(function GroopHeader({ 
  minimal = false, 
  showMembers = true, 
  onPressMembers,
  isChatScreen = false,
  isItineraryScreen = false,
  onShowEncryptionInfo,
  title,
  onBackPress,
  encryptionEnabled,
  loading
}: GroopHeaderProps) {
  const { currentGroop } = useGroop();
  const navigation = useNavigation<GroopHeaderNavigationProp>();
  const [memberProfiles, setMemberProfiles] = useState<MemberData[]>([]);
  const [isLoadingMembers, setIsLoadingMembers] = useState(true);
  const [showMembersModal, setShowMembersModal] = useState(false);
  const [loadingError, setLoadingError] = useState<string | null>(null);

  if (!currentGroop) return null;

  const memberCount = currentGroop.members?.length || 0;
  
  // Maximum number of member avatars to show
  const MAX_AVATARS = 3;

  // Add useMemo for expensive calculations
  const memoizedData = useMemo(() => ({
    memberCount: currentGroop?.members?.length || 0,
    displayedAvatars: Math.min(memberCount, MAX_AVATARS),
    extraMembersCount: Math.max(0, memberCount - MAX_AVATARS)
  }), [currentGroop?.members]);

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

  // Memoize member profile fetching
  const fetchMemberProfiles = useCallback(async () => {
    if (!currentGroop?.members?.length) {
      logger.groop('No members to fetch');
      setIsLoadingMembers(false);
      return;
    }

    try {
      logger.groop(`Fetching profiles for ${currentGroop.members.length} members`);
      setIsLoadingMembers(true);
      setLoadingError(null);
      
      // Parallel fetching for better performance
      const memberPromises = currentGroop.members.map(async (memberId) => {
        try {
          const memberRef = doc(db, 'users', memberId);
          const memberSnap = await getDoc(memberRef);
          
          if (memberSnap.exists()) {
            const data = memberSnap.data();
            return {
              uid: memberId,
              displayName: data.displayName || 'Unknown User',
              avatar: data.avatar
            };
          } else {
            return {
              uid: memberId,
              displayName: 'User',
              avatar: undefined
            };
          }
        } catch (error) {
          logger.error(`Error fetching member ${memberId}:`, error);
          return {
            uid: memberId,
            displayName: 'User',
            avatar: undefined
          };
        }
      });

      const memberData = await Promise.all(memberPromises);
      logger.groop(`Fetched ${memberData.length} member profiles`);
      setMemberProfiles(memberData);
    } catch (error) {
      logger.error('Error fetching member profiles:', error);
      setLoadingError('Error loading member profiles. Please try again.');
    } finally {
      setIsLoadingMembers(false);
    }
  }, [currentGroop?.members]);

  useEffect(() => {
    fetchMemberProfiles();
  }, [fetchMemberProfiles]);

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
    return (
      <View 
        style={[
          tw`w-5 h-5 rounded-full border-2 border-white bg-white overflow-hidden`, // Smaller size
          { 
            marginLeft: index > 0 ? -6 : 0, // Reduced overlap
            zIndex: MAX_AVATARS - index,
            // Add subtle border around the avatar
            borderWidth: 2,
            borderColor: 'rgba(124, 58, 237, 0.15)', // Subtle purple border
          }
        ]}
      >
        {member ? (
          <Avatar
            avatar={member.avatar}
            displayName={member.displayName}
            size={20} // Smaller avatar size
          />
        ) : getAvatarFallback(index)}
        
        {/* Online status indicator for first member - smaller */}
        {index === 0 && (
          <View style={tw`absolute -bottom-0.5 -right-0.5 w-2 h-2 bg-green-400 rounded-full border border-white`} /> 
        )}
      </View>
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

  // Get the current screen configuration
  const screenConfig = getScreenConfig({ 
    minimal, 
    showMembers, 
    onPressMembers, 
    isChatScreen, 
    isItineraryScreen, 
    onShowEncryptionInfo, 
    title, 
    onBackPress, 
    encryptionEnabled, 
    loading 
  });

  // Enhanced loading component
  const LoadingAvatars = memo(({ count }: { count: number }) => (
    <>
      {[...Array(count)].map((_, i) => (
        <View 
          key={`loading-${i}`} 
          style={[
            tw`w-5 h-5 rounded-full bg-slate-200 border-2 border-white`,
            { 
              marginLeft: i > 0 ? -6 : 0,
              backgroundColor: '#E2E8F0',
              borderColor: 'rgba(124, 58, 237, 0.15)',
            }
          ]}
        >
          <View 
            style={[
              tw`w-full h-full rounded-full`,
              {
                backgroundColor: '#CBD5E1', // Solid color instead of gradient
              }
            ]} 
          />
        </View>
      ))}
    </>
  ));

  // Error state component
  const ErrorState = memo(({ error, onRetry }: { error: string; onRetry: () => void }) => (
    <TouchableOpacity onPress={onRetry} style={tw`flex-row items-center`}>
      <Ionicons name="refresh" size={12} color="#EF4444" />
      <Text style={tw`text-xs text-red-500 ml-1`}>Retry</Text>
    </TouchableOpacity>
  ));

  // Split into smaller, focused components
  const HeaderTitle = memo(({ isChatScreen, groopName }: { isChatScreen: boolean; groopName: string }) => (
    <Text style={tw`font-bold text-slate-800 text-base tracking-tight`} numberOfLines={1}>
      {groopName} {/* Always use groop name, regardless of screen type */}
    </Text>
  ));

  // Update EncryptionIndicator to ensure text is always rendered:
  const EncryptionIndicator = memo(({ 
    enabled, 
    onShowInfo 
  }: { 
    enabled: boolean; 
    onShowInfo?: () => void; // Make optional to prevent undefined errors
  }) => (
    <TouchableOpacity
      onPress={onShowInfo}
      style={tw`flex-row items-center bg-sky-50 rounded-full px-2.5 py-1 border border-sky-200`}
      accessible={true}
      accessibilityLabel="Encryption information"
    >
      <Ionicons 
        name={enabled ? "shield-checkmark" : "shield-outline"} 
        size={12} 
        color={enabled ? "#06B6D4" : "#94A3B8"} 
        style={tw`mr-1`} 
      />
      <Text style={tw`text-xs font-medium ${enabled ? 'text-sky-600' : 'text-slate-500'}`}>
        {enabled ? 'Secure' : 'Unsecured'}
      </Text>
    </TouchableOpacity>
  ));

  const DateLocationInfo = memo(({ groop }: { groop: any }) => (
    <View style={tw`flex-row items-center`}>
      {groop.dateRange && (
        <View style={tw`flex-row items-center mr-3 bg-amber-50 rounded-full px-2.5 py-1 border border-amber-200`}>
          <Ionicons name="calendar-outline" size={11} color="#F59E0B" />
          <Text style={tw`ml-1 text-amber-700 text-xs font-medium`}>
            {groop.dateRange}
          </Text>
        </View>
      )}
      
      {groop.location && (
        <View style={tw`bg-rose-50 rounded-full px-2.5 py-1 flex-row items-center border border-rose-200`}>
          <Text style={tw`text-xs mr-1`}>📍</Text>
          <Text style={tw`text-rose-700 text-xs font-medium`}>{groop.location}</Text>
        </View>
      )}
    </View>
  ));

  // Memoize heavy computations
  const avatarData = useMemo(() => {
    return memberProfiles.slice(0, MAX_AVATARS).map((member, index) => ({
      member,
      index,
      key: member.uid || `member-${index}`,
      style: index > 0 ? { marginLeft: -6 } : null
    }));
  }, [memberProfiles]);

  // Update the main layout structure:
  return (
    <View 
      style={tw`${minimal ? 'pt-2' : 'pt-3'} pb-0 px-3`} // Changed pb-1.5 to pb-0
      testID="groop-header-container"
    >
      <View 
        style={[
          tw`bg-blue-50 rounded-xl px-3 py-3 border border-blue-100`,
          {
            // Floating effect without shadows
            transform: [{ translateY: -1 }],
            backgroundColor: 'rgba(239, 246, 255, 0.8)', // Very subtle light blue with transparency
          }
        ]}
        testID="groop-header-content"
      >
        {/* REMOVED: Subtle gradient accent bar at top */}
        {/* <View 
          style={[
            tw`absolute top-0 left-0 right-0 h-0.5 rounded-t-xl`,
            {
              backgroundColor: '#7C3AED',
            }
          ]}
        /> */}
        
        {/* Top row - smaller spacing */}
        <View style={tw`flex-row justify-between items-center mb-2`}>
          {/* Left side: Status indicator + Title */}
          <View style={tw`flex-row items-center flex-1 mr-2`}>
            {/* Live trip status indicator - smaller */}
            <View style={tw`flex-row items-center mr-2`}>
              <View style={tw`w-1.5 h-1.5 bg-green-400 rounded-full mr-1`} />
              <Text style={tw`text-[10px] text-green-600 font-medium`}>Live</Text>
            </View>
            
            <HeaderTitle 
              isChatScreen={isChatScreen} 
              groopName={currentGroop.name}
              testID="header-title"
            />
          </View>
          
          {/* Right side: Encryption only (removed notification toggle) */}
          <View style={tw`flex-row items-center`}>
            {screenConfig.showEncryption && (
              <EncryptionIndicator 
                enabled={encryptionEnabled} 
                onShowInfo={onShowEncryptionInfo} 
                testID="encryption-indicator"
              />
            )}
          </View>
        </View>
        
        {/* Enhanced Date/Location row - smaller */}
        {screenConfig.showDateLocation && (currentGroop.dateRange || currentGroop.location) && (
          <View style={tw`flex-row items-center justify-between mb-2`}>
            <DateLocationInfo groop={currentGroop} />
            
            {/* Right side quick action - smaller - fixed gradient */}
            <TouchableOpacity
              style={[
                tw`rounded-full px-2.5 py-1 flex-row items-center`,
                {
                  backgroundColor: '#7C3AED', // Solid color instead of gradient
                }
              ]}
              onPress={() => navigation.navigate('ItineraryTab')}
            >
              <Ionicons name="map-outline" size={10} color="white" />
              <Text style={tw`ml-1 text-white text-[10px] font-medium`}>Plan</Text>
            </TouchableOpacity>
          </View>
        )}
        
        {/* Enhanced Chat action buttons - smaller */}
        {screenConfig.showActionButtons && (
          <View style={tw`flex-row justify-between mb-2`}>
            {/* Photos, Share, Itinerary buttons - REMOVED for chat screens */}
          </View>
        )}
        
        {/* Enhanced Members row - smaller and updated text - LAST ROW: Remove bottom margin */}
        {showMembers && memberCount > 0 && (
          <TouchableOpacity 
            style={tw`flex-row items-center justify-between`} // No mb-2 here since it's the last element
            onPress={handlePressMembers}
            accessible={true}
            accessibilityLabel={`View ${memberCount} group members`}
            accessibilityHint="Opens member list modal"
            accessibilityRole="button"
          >
            {/* Left: Member count with icon - smaller */}
            <View style={tw`flex-row items-center flex-1`}>
              <View style={tw`bg-indigo-50 rounded-full p-1 mr-1.5`}>
                <Ionicons name="people" size={10} color="#6366F1" />
              </View>
              <Text style={tw`text-slate-700 text-[10px] font-medium`}>
                {memberCount} {memberCount === 1 ? 'member' : 'members'}
              </Text>
            </View>
            
            {/* Right: Avatar stack with better styling and borders */}
            <View style={tw`flex-row items-center`}>
              <View style={tw`flex-row mr-1.5`}>
                {isLoadingMembers ? (
                  <LoadingAvatars count={Math.min(memberCount, MAX_AVATARS)} />
                ) : loadingError ? (
                  <ErrorState error={loadingError} onRetry={fetchMemberProfiles} />
                ) : (
                  avatarData.map(({ member, index, key, style }) => (
                    <View key={key} style={style}>
                      {renderMemberAvatar(member, index)}
                    </View>
                  ))
                )}
                
                {memberCount > MAX_AVATARS && (
                  <View 
                    style={[
                      tw`w-5 h-5 rounded-full items-center justify-center border-2 border-white`,
                      { 
                        marginLeft: -6,
                        backgroundColor: '#8B5CF6', // Solid color instead of gradient
                      }
                    ]}
                  >
                    <Text style={tw`text-[8px] text-white font-bold`}>+{memberCount - MAX_AVATARS}</Text>
                  </View>
                )}
              </View>
              
              {/* View all arrow - smaller */}
              <Ionicons name="chevron-forward" size={12} color="#94A3B8" />
            </View>
          </TouchableOpacity>
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
}, (prevProps, nextProps) => {
  // Check all relevant props for changes
  const propsToCompare: (keyof GroopHeaderProps)[] = [
    'minimal', 'showMembers', 'isChatScreen', 'isItineraryScreen',
    'title', 'encryptionEnabled', 'loading', 'error'
  ];
  
  return propsToCompare.every(key => prevProps[key] === nextProps[key]);
});