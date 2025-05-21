import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Modal,
  ScrollView,
  ActivityIndicator,
  Alert,
  SafeAreaView,
  Platform,
  KeyboardAvoidingView,
  Animated,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import tw from '../../utils/tw';
import { useAuth } from '../../contexts/AuthProvider';
import { doc, updateDoc } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { UserAvatar } from '../../contexts/AuthProvider';
import { AvatarService, AVATAR_COLORS, DICEBEAR_STYLES } from '../../services/AvatarService';
import Avatar from '../common/Avatar';
import BitmojiAvatar from '../avatar/BitmojiAvatar';
import DiceBearInlineCustomizer from '../avatar/DiceBearInlineCustomizer';

interface EditAvatarModalProps {
  visible: boolean;
  onClose: () => void;
  onAvatarUpdated?: (newAvatar: UserAvatar) => void; // Add this new prop
}

const EditAvatarModal: React.FC<EditAvatarModalProps> = ({ visible, onClose, onAvatarUpdated }) => {
  const { user, profile, refreshProfile } = useAuth();
  
  // Toast notification state
  const [showToast, setShowToast] = useState(false);
  const [toastMessage, setToastMessage] = useState('');
  const toastOpacity = React.useRef(new Animated.Value(0)).current;
  
  // Avatar editing states
  const [selectedAvatarType, setSelectedAvatarType] = useState('initial');
  const [selectedColor, setSelectedColor] = useState(AVATAR_COLORS[0]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // Bitmoji states
  const [bitmojiUrl, setBitmojiUrl] = useState('');
  const [bitmojiOptions, setBitmojiOptions] = useState<string[]>([]);
  const [selectedBitmojiIndex, setSelectedBitmojiIndex] = useState(-1);
  const [loadingBitmojis, setLoadingBitmojis] = useState(false);
  
  // DiceBear states
  const [dicebearSeed, setDicebearSeed] = useState('');
  const [dicebearStyle, setDicebearStyle] = useState('bottts');
  const [dicebearParams, setDicebearParams] = useState<Record<string, any>>({});

  // Initialize states from current profile
  useEffect(() => {
    console.log('[EDIT_AVATAR_MODAL] Modal became visible, initializing from profile');
    if (profile?.avatar) {
      console.log('[EDIT_AVATAR_MODAL] Setting avatar type from profile:', profile.avatar.type);
      setSelectedAvatarType(profile.avatar.type);
      
      if (profile.avatar.type === 'bitmoji' && profile.avatar.value) {
        console.log('[EDIT_AVATAR_MODAL] Setting bitmoji URL from profile');
        setBitmojiUrl(profile.avatar.value);
      } else if (profile.avatar.type === 'dicebear') {
        console.log('[EDIT_AVATAR_MODAL] Setting dicebear params from profile');
        setDicebearSeed(profile.avatar.seed || profile.displayName?.toLowerCase().replace(/\s+/g, '-') || 'user');
        setDicebearStyle(profile.avatar.style || 'bottts');
        setDicebearParams(profile.avatar.params || {});
      }
    }
    
    // Set color from profile
    if (profile?.avatarColor) {
      console.log('[EDIT_AVATAR_MODAL] Setting color from profile:', profile.avatarColor);
      setSelectedColor(profile.avatarColor);
    }
  }, [visible, profile]);
  
  // Load bitmoji options when bitmoji type is selected
  useEffect(() => {
    if (visible && selectedAvatarType === 'bitmoji' && bitmojiOptions.length === 0) {
      console.log('[EDIT_AVATAR_MODAL] Loading bitmoji options');
      loadBitmojiOptions();
    }
  }, [visible, selectedAvatarType]);

  // Handle toast animation
  useEffect(() => {
    if (showToast) {
      Animated.sequence([
        Animated.timing(toastOpacity, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }),
        Animated.delay(2000), // Increase delay to 2000ms
        Animated.timing(toastOpacity, {
          toValue: 0,
          duration: 300,
          useNativeDriver: true,
        }),
      ]).start(() => setShowToast(false));
    }
  }, [showToast, toastOpacity]);

  // Show toast message
  const showToastMessage = (message: string) => {
    setToastMessage(message);
    setShowToast(true);
  };

  // Load bitmoji options
  const loadBitmojiOptions = async () => {
    setLoadingBitmojis(true);
    try {
      console.log('[EDIT_AVATAR_MODAL] Fetching trending bitmojis');
      const options = AvatarService.getTrendingBitmojis();
      console.log(`[EDIT_AVATAR_MODAL] Retrieved ${options.length} bitmoji options`);
      setBitmojiOptions(options);
      
      // If user already has a bitmoji selected, find its index
      if (bitmojiUrl) {
        const index = options.findIndex(url => url === bitmojiUrl);
        console.log(`[EDIT_AVATAR_MODAL] Current bitmoji index: ${index}`);
        if (index >= 0) {
          setSelectedBitmojiIndex(index);
        }
      } else if (options.length > 0) {
        // Auto-select first option if none is selected
        setBitmojiUrl(options[0]);
        setSelectedBitmojiIndex(0);
      }
    } catch (error) {
      console.error('[EDIT_AVATAR_MODAL] Error loading bitmoji options:', error);
    } finally {
      setLoadingBitmojis(false);
    }
  };

  // Handler for bitmoji selection
  const handleBitmojiSelect = (url: string, index: number) => {
    console.log(`[EDIT_AVATAR_MODAL] Selected bitmoji at index ${index}`);
    setSelectedBitmojiIndex(index);
    setBitmojiUrl(url);
  };

  // Handler for DiceBear avatar changes
  const handleDiceBearAvatarChange = (seed: string, style: string, params: Record<string, any>, url: string) => {
    console.log('[EDIT_AVATAR_MODAL] DiceBear avatar changed:', { seed, style });
    setDicebearSeed(seed || profile?.displayName?.toLowerCase().replace(/\s+/g, '-') || 'user');
    setDicebearStyle(style || 'bottts');
    setDicebearParams(params || {});
  };

  // Save avatar changes
  const saveAvatar = async () => {
    if (!user) {
      Alert.alert('Error', 'You must be logged in to update your avatar');
      return;
    }

    setIsSubmitting(true);
    
    try {
      console.log('[EDIT_AVATAR_MODAL] Saving avatar changes');
      let userAvatar: UserAvatar;
      
      // Prepare avatar object based on selected type
      if (selectedAvatarType === 'bitmoji' && bitmojiUrl) {
        console.log('[EDIT_AVATAR_MODAL] Creating Bitmoji avatar');
        userAvatar = AvatarService.createBitmojiAvatar(bitmojiUrl);
      } else if (selectedAvatarType === 'dicebear' && dicebearSeed) {
        console.log('[EDIT_AVATAR_MODAL] Creating DiceBear avatar');
        userAvatar = AvatarService.createDiceBearAvatar(dicebearSeed, dicebearStyle, dicebearParams);
      } else {
        console.log('[EDIT_AVATAR_MODAL] Creating initial avatar');
        userAvatar = AvatarService.createInitialAvatar(profile?.displayName || 'User', selectedColor);
      }

      // Update the user's Firestore document
      console.log('[EDIT_AVATAR_MODAL] Updating Firestore document');
      const userRef = doc(db, 'users', user.uid);
      await updateDoc(userRef, {
        avatar: userAvatar,
        avatarColor: selectedColor
      });

      console.log('[EDIT_AVATAR_MODAL] Avatar updated successfully');
      
      // Show success toast
      showToastMessage('Avatar updated successfully');
      
      // Call the callback with the new avatar if provided
      if (onAvatarUpdated) {
        console.log('[EDIT_AVATAR_MODAL] Notifying parent of avatar update');
        onAvatarUpdated(userAvatar);
      }
      
      // Close the modal - do this last to ensure toast is visible
      setTimeout(() => {
        onClose();
      }, 1000); // Short delay to ensure toast is visible
      
    } catch (error) {
      console.error('[EDIT_AVATAR_MODAL] Error saving avatar:', error);
      Alert.alert('Error', 'Failed to save avatar. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };
  
  // Avatar type message
  const getAvatarTypeMessage = () => {
    if (selectedAvatarType === 'initial') {
      return "Simple and clean with your initials ✨";
    } else if (selectedAvatarType === 'dicebear') {
      return "Customize your robot avatar!";
    } else if (selectedAvatarType === 'bitmoji') {
      return "Choose a fun cartoon avatar!";
    }
    return "Select an avatar type";
  };

  // Render Bitmoji selector grid
  const renderBitmojiGrid = () => {
    if (loadingBitmojis) {
      return (
        <View style={tw`h-40 justify-center items-center`}>
          <ActivityIndicator color="#7C3AED" size="large" />
          <Text style={tw`mt-3 text-sm text-slate-500`}>Loading avatars...</Text>
        </View>
      );
    }
    
    return (
      <View style={tw`flex-row flex-wrap justify-around mt-4`}>
        {bitmojiOptions.map((url, index) => (
          <TouchableOpacity
            key={index}
            style={[
              tw`w-[30%] aspect-square mb-3 rounded-xl overflow-hidden border bg-slate-50 mx-1`,
              selectedBitmojiIndex === index ? tw`border-2 border-violet-600` : tw`border-slate-200`
            ]}
            onPress={() => handleBitmojiSelect(url, index)}
          >
            <BitmojiAvatar
              url={url}
              displayName={profile?.displayName || 'User'}
              size={75}
            />
            {selectedBitmojiIndex === index && (
              <View style={tw`absolute inset-0 bg-violet-500/10 justify-center items-center`}>
                <Ionicons name="checkmark-circle" size={24} color="#7C3AED" />
              </View>
            )}
          </TouchableOpacity>
        ))}
      </View>
    );
  };

  // Render content based on selected avatar type
  const renderAvatarContent = () => {
    console.log('[EDIT_AVATAR_MODAL] Rendering avatar for type:', selectedAvatarType);
    
    switch(selectedAvatarType) {
      case 'bitmoji':
        return (
          <View style={tw`items-center mt-4 mb-6`}>
            {bitmojiUrl && (
              <View style={tw`mb-6`}>
                <BitmojiAvatar
                  url={bitmojiUrl}
                  displayName={profile?.displayName || 'User'}
                  size={120}
                />
              </View>
            )}
            
            <View style={tw`w-full`}>
              <Text style={tw`text-sm text-slate-700 mb-2`}>Choose a Bitmoji</Text>
              {renderBitmojiGrid()}
            </View>
          </View>
        );
        
      case 'dicebear':
        return (
          <View style={tw`items-center mt-4 mb-6`}>
            <Avatar
              avatar={{
                type: 'dicebear',
                seed: dicebearSeed,
                style: dicebearStyle,
                params: dicebearParams,
                value: AvatarService.getDiceBearAvatarUrl(dicebearSeed, dicebearStyle, 256, dicebearParams)
              }}
              displayName={profile?.displayName || 'User'}
              size={120}
              style={tw`mb-6`}
              key={`${dicebearSeed}-${dicebearStyle}-${JSON.stringify(dicebearParams)}`}
            />
            
            <View style={tw`w-full mt-4`}>
              <DiceBearInlineCustomizer
                initialSeed={dicebearSeed}
                initialStyle={dicebearStyle}
                initialParams={dicebearParams}
                onAvatarChange={handleDiceBearAvatarChange}
              />
            </View>
          </View>
        );
        
      case 'initial':
      default:
        return (
          <View style={tw`items-center justify-center my-6`}>
            <View
              style={[
                tw`w-30 h-30 rounded-full items-center justify-center`,
                { backgroundColor: selectedColor || '#7C3AED' }
              ]}
            >
              <Text style={tw`text-white text-4xl font-bold`}>
                {AvatarService.getInitials(profile?.displayName || 'User')}
              </Text>
            </View>
            
            <Text style={tw`mt-6 mb-2 text-sm text-slate-700`}>Choose a Color</Text>
            
            <View style={tw`flex-row flex-wrap justify-center mb-4`}>
              {AVATAR_COLORS.map(color => (
                <TouchableOpacity
                  key={color}
                  style={[
                    tw`w-8 h-8 rounded-full m-1.5 items-center justify-center`,
                    { backgroundColor: color },
                    selectedColor === color && tw`border-4 border-gray-200`
                  ]}
                  onPress={() => setSelectedColor(color)}
                >
                  {selectedColor === color && (
                    <Ionicons name="checkmark-circle" size={24} color="#FFFFFF" />
                  )}
                </TouchableOpacity>
              ))}
            </View>
          </View>
        );
    }
  };

  // Render avatar type selection buttons
  const renderAvatarTypeButtons = () => {
    return (
      <View style={tw`flex-row justify-between mb-6 mt-2`}>
        {/* Bitmoji Option */}
        <TouchableOpacity
          style={[
            tw`flex-1 items-center justify-center py-2.5 rounded-lg border mx-1`,
            selectedAvatarType === 'bitmoji' 
              ? tw`border-violet-600 bg-violet-50` 
              : tw`border-slate-200 bg-slate-50`
          ]}
          onPress={() => {
            console.log('[EDIT_AVATAR_MODAL] Switching to bitmoji type');
            setSelectedAvatarType('bitmoji');
            if (!bitmojiUrl && bitmojiOptions.length > 0) {
              setBitmojiUrl(bitmojiOptions[0]);
              setSelectedBitmojiIndex(0);
            }
          }}
        >
          <Ionicons 
            name="happy-outline" 
            size={22} 
            color={selectedAvatarType === 'bitmoji' ? '#7C3AED' : '#94A3B8'} 
          />
          <Text 
            style={[
              tw`text-xs mt-1`, 
              selectedAvatarType === 'bitmoji' ? tw`text-violet-600 font-medium` : tw`text-slate-500`
            ]}
          >
            Bitmoji
          </Text>
        </TouchableOpacity>
        
        {/* DiceBear Option */}
        <TouchableOpacity
          style={[
            tw`flex-1 items-center justify-center py-2.5 rounded-lg border mx-1`,
            selectedAvatarType === 'dicebear' 
              ? tw`border-violet-600 bg-violet-50` 
              : tw`border-slate-200 bg-slate-50`
          ]}
          onPress={() => {
            console.log('[EDIT_AVATAR_MODAL] Switching to dicebear type');
            setSelectedAvatarType('dicebear');
            if (!dicebearSeed) {
              setDicebearSeed(profile?.displayName?.toLowerCase().replace(/\s+/g, '-') || 'user');
            }
          }}
        >
          <Ionicons 
            name="hardware-chip-outline" 
            size={22} 
            color={selectedAvatarType === 'dicebear' ? '#7C3AED' : '#94A3B8'} 
          />
          <Text 
            style={[
              tw`text-xs mt-1`, 
              selectedAvatarType === 'dicebear' ? tw`text-violet-600 font-medium` : tw`text-slate-500`
            ]}
          >
            Robot
          </Text>
        </TouchableOpacity>
        
        {/* Initial Option */}
        <TouchableOpacity
          style={[
            tw`flex-1 items-center justify-center py-2.5 rounded-lg border mx-1`,
            selectedAvatarType === 'initial' 
              ? tw`border-violet-600 bg-violet-50` 
              : tw`border-slate-200 bg-slate-50`
          ]}
          onPress={() => {
            console.log('[EDIT_AVATAR_MODAL] Switching to initial type');
            setSelectedAvatarType('initial');
          }}
        >
          <Ionicons 
            name="text-outline" 
            size={22} 
            color={selectedAvatarType === 'initial' ? '#7C3AED' : '#94A3B8'} 
          />
          <Text 
            style={[
              tw`text-xs mt-1`, 
              selectedAvatarType === 'initial' ? tw`text-violet-600 font-medium` : tw`text-slate-500`
            ]}
          >
            Initials
          </Text>
        </TouchableOpacity>
      </View>
    );
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={false}
      onRequestClose={onClose}
    >
      <SafeAreaView style={tw`flex-1 bg-slate-50`}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={tw`flex-1`}
        >
          {/* Toast notification */}
          {showToast && (
            <Animated.View 
              style={[
                tw`absolute top-5 self-center py-2 px-4 rounded-lg bg-green-600 z-50 mx-4`,
                { opacity: toastOpacity }
              ]}
            >
              <Text style={tw`text-white font-medium text-center`}>{toastMessage}</Text>
            </Animated.View>
          )}
          
          {/* Header */}
          <View style={tw`flex-row justify-between items-center p-4 border-b border-gray-100`}>
            <TouchableOpacity onPress={onClose}>
              <Ionicons name="close" size={24} color="#1F2937" />
            </TouchableOpacity>
            <Text style={tw`text-lg font-bold text-slate-800`}>Edit Avatar</Text>
            <TouchableOpacity 
              onPress={saveAvatar}
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <ActivityIndicator size="small" color="#7C3AED" />
              ) : (
                <Text style={tw`text-primary font-bold`}>Save</Text>
              )}
            </TouchableOpacity>
          </View>
          
          <ScrollView 
            contentContainerStyle={tw`px-4 pt-2 pb-24`}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          >
            {/* Description */}
            <Text style={tw`text-xs text-slate-500 text-center max-w-[90%] mx-auto mt-2 mb-1`}>
              {getAvatarTypeMessage()}
            </Text>
            
            {/* Avatar Preview */}
            {renderAvatarContent()}
            
            {/* Avatar Type Selection */}
            {renderAvatarTypeButtons()}
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </Modal>
  );
};

export default EditAvatarModal;