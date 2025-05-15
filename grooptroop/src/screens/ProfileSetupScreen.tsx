import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  Image,
  Alert,
  ActivityIndicator,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Animated,
  Easing,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../contexts/AuthProvider';
import { UserAvatar } from '../contexts/AuthProvider';
import { storage, db } from '../lib/firebase';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { doc, updateDoc } from 'firebase/firestore';
import { AvatarService, AVATAR_COLORS, DICEBEAR_STYLES } from '../services/AvatarService';
import BitmojiAvatar from '../components/avatar/BitmojiAvatar';
import DiceBearSelector from '../components/avatar/DiceBearSelector';
import DiceBearInlineCustomizer from '../components/avatar/DiceBearInlineCustomizer';
import tw from 'twrnc';

export default function ProfileSetupScreen({ navigation }: { navigation: any }) {
  const { user, profile, refreshProfile } = useAuth();
  const [displayName, setDisplayName] = useState('');
  const [selectedAvatarType, setSelectedAvatarType] = useState<'initial' | 'bitmoji' | 'dicebear'>('initial');  
  const [selectedColor, setSelectedColor] = useState(AVATAR_COLORS[0]);
  const [avatarImage, setAvatarImage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [bitmojiUrl, setBitmojiUrl] = useState<string | null>(null);
  const [dicebearStyle, setDicebearStyle] = useState(DICEBEAR_STYLES[0].id);
  const [dicebearSeed, setDicebearSeed] = useState('');
  const [dicebearParams, setDicebearParams] = useState<Record<string, any>>({});
  const [dicebearUrl, setDicebearUrl] = useState<string | null>(null);
  const [avatarContainerHeight] = useState(new Animated.Value(120));
  const prevAvatarType = useRef(selectedAvatarType);
  
  // Pre-fill displayName if user has one
  useEffect(() => {
    console.log('[PROFILE_SETUP] Screen mounted');
    if (user?.displayName) {
      console.log('[PROFILE_SETUP] User already has display name:', user.displayName);
      setDisplayName(user.displayName);
    }
    
    // Use photo URL if available
    if (user?.photoURL) {
      console.log('[PROFILE_SETUP] User has photo URL:', user.photoURL);
      setAvatarImage(user.photoURL);
      setSelectedAvatarType('image');
    }
    
    // If user already completed onboarding, return to main app
    if (profile?.hasCompletedOnboarding) {
      console.log('[PROFILE_SETUP] User already completed onboarding, navigating back');
      navigation.replace('MainApp');
    }

    return () => {
      console.log('[PROFILE_SETUP] Screen unmounted');
    };
  }, [user, profile]);

  // Update the useEffect for avatar type changes
useEffect(() => {
  if (selectedAvatarType !== prevAvatarType.current) {
    console.log('[PROFILE_SETUP] Avatar type changed, animating container');
    
    // Further reduced heights
    let targetHeight = 80; // default for 'initial'
    
    if (selectedAvatarType === 'bitmoji') {
      targetHeight = 400; // reduced from 450
    } else if (selectedAvatarType === 'dicebear') {
      targetHeight = 350; // reduced from 380
    }
    
    Animated.timing(avatarContainerHeight, {
      toValue: targetHeight,
      duration: 500,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: false
    }).start();
    
    prevAvatarType.current = selectedAvatarType;
  }
}, [selectedAvatarType]);

  const getAvatarTypeMessage = () => {
  console.log('[PROFILE_SETUP] Getting message for avatar type:', selectedAvatarType);
  
  if (selectedAvatarType === 'bitmoji') {
    const bitmojiMessages = [
      "Choose a Bitmoji that matches your vibe ✌️",
      "Pick a Bitmoji that feels like you 🔥",
    ];
    return bitmojiMessages[Math.floor(Math.random() * bitmojiMessages.length)];
  } else if (selectedAvatarType === 'dicebear') {
    const dicebearMessages = [
      "Create a custom avatar that represents you 🎨",
      "Design your perfect avatar with many styles 🌈",
    ];
    return dicebearMessages[Math.floor(Math.random() * dicebearMessages.length)];
  } else {
    const initialMessages = [
      "Simple and clean with your initials 🌟",
      "Keep it minimal with your initials ✨",
    ];
    return initialMessages[Math.floor(Math.random() * initialMessages.length)];
  }
};

  const BitmojiSelector = () => {
    const [bitmojiOptions, setBitmojiOptions] = useState<string[]>([]);
    const [selectedBitmojiIndex, setSelectedBitmojiIndex] = useState<number>(-1);
    const [loading, setLoading] = useState(true);
    
    // Animation values
    const animation = useRef(new Animated.Value(0)).current;
    
    // Start animation when component mounts
    useEffect(() => {
      console.log('[BITMOJI_SELECTOR] Starting entrance animation');
      Animated.timing(animation, {
        toValue: 1,
        duration: 500,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true
      }).start();
      
      loadBitmojiOptions();
    }, []);
    
    // Animation styles
    const animatedStyles = {
      opacity: animation,
      transform: [
        { 
          translateY: animation.interpolate({
            inputRange: [0, 1],
            outputRange: [50, 0]
          })
        }
      ]
    };
    
    const loadBitmojiOptions = async () => {
      setLoading(true);
      try {
        console.log('[BITMOJI_SELECTOR] Fetching trending bitmojis');
        const options = AvatarService.getTrendingBitmojis();
        console.log(`[BITMOJI_SELECTOR] Retrieved ${options.length} options`);
        setBitmojiOptions(options);
        
        // If user already has a bitmoji selected, find its index
        if (bitmojiUrl) {
          const index = options.findIndex(url => url === bitmojiUrl);
          console.log(`[BITMOJI_SELECTOR] Current bitmoji index: ${index}`);
          if (index >= 0) {
            setSelectedBitmojiIndex(index);
          }
        }
      } catch (error) {
        console.error('[BITMOJI_SELECTOR] Error loading options:', error);
      } finally {
        setLoading(false);
      }
    };
    
    const handleBitmojiSelect = useCallback((url: string, index: number) => {
      console.log(`[BITMOJI_SELECTOR] Selected bitmoji at index ${index}`);
      setSelectedBitmojiIndex(index);
      setBitmojiUrl(url);
    }, []);
    
    // Gen Z themed category pills
    const renderCategories = () => {
      return (
        <ScrollView 
          horizontal 
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.categoryContainer}
        >
          {['✨ Trending', '🔥 Fire', '🤩 Vibing', '😎 Cool', '💅 Aesthetic'].map(
            (category, index) => (
              <TouchableOpacity 
                key={index} 
                style={styles.categoryPill}
                onPress={() => {
                  console.log(`[BITMOJI_SELECTOR] Selected category: ${category}`);
                  // For now just reload options to simulate category change
                  loadBitmojiOptions();
                }}
              >
                <Text style={styles.categoryText}>{category}</Text>
              </TouchableOpacity>
            )
          )}
        </ScrollView>
      );
    };
    
  return (
    <Animated.View 
      style={[
        tw`w-full mt-2 pb-4`,
        animatedStyles
      ]}
    >
      {/* Categories with reduced height */}
      <ScrollView 
        horizontal 
        showsHorizontalScrollIndicator={false}
        style={tw`pb-2`}
      >
        {['✨ Trending', '🔥 Fire', '🤩 Vibing', '😎 Cool', '💅 Aesthetic'].map(
          (category, index) => (
            <TouchableOpacity 
              key={index} 
              style={tw`px-3 py-1.5 bg-slate-100 rounded-full mr-2 border border-slate-200`}
              onPress={() => {
                console.log(`[BITMOJI_SELECTOR] Selected category: ${category}`);
                loadBitmojiOptions();
              }}
            >
              <Text style={tw`text-xs font-medium text-slate-700`}>{category}</Text>
            </TouchableOpacity>
          )
        )}
      </ScrollView>
      
      {/* Loading state or grid */}
      {loading ? (
        <View style={tw`h-40 justify-center items-center`}>
          <ActivityIndicator color="#7C3AED" size="large" />
          <Text style={tw`mt-3 text-sm text-slate-500`}>Loading avatars...</Text>
        </View>
      ) : (
        <View style={tw`flex-row flex-wrap justify-around mt-2 px-1 pb-2`}>
          {bitmojiOptions.map((url, index) => (
            <TouchableOpacity
              key={index}
              style={[
                tw`w-[30%] aspect-square mb-3 rounded-xl overflow-hidden border bg-slate-50 mx-1`,
                selectedBitmojiIndex === index ? tw`border-2 border-violet-600` : tw`border-slate-200`
              ]}
              onPress={() => handleBitmojiSelect(url, index)}
            >
              <Image
                source={{ uri: url }}
                style={tw`w-full h-full`}
                resizeMode="contain"
                onError={(e) => console.error(`[BITMOJI_SELECTOR] Image load error for index ${index}:`, e.nativeEvent.error)}
              />
              {selectedBitmojiIndex === index && (
                <View style={tw`absolute inset-0 bg-violet-500/10 justify-center items-center`}>
                  <Ionicons name="checkmark-circle" size={24} color="#7C3AED" />
                </View>
              )}
            </TouchableOpacity>
          ))}
        </View>
      )}
    </Animated.View>
  );
};

// Handler for bitmoji picker
const openBitmojiPicker = () => {
  console.log('[PROFILE_SETUP] Switching to bitmoji avatar type');
  setSelectedAvatarType('bitmoji');
  
  // If no bitmoji is selected yet, pre-select one
  if (!bitmojiUrl) {
    console.log('[PROFILE_SETUP] No bitmoji selected yet, selecting default');
    const defaultBitmoji = AvatarService.getPlaceholderBitmojiUrl();
    setBitmojiUrl(defaultBitmoji);
  }
};
  

  // Upload avatar image to Firebase Storage
  const uploadAvatarImage = async (uri: string): Promise<string> => {
    console.log('[PROFILE_SETUP] Uploading avatar image');
    
    if (!user) throw new Error('User not authenticated');
    
    try {
      const response = await fetch(uri);
      const blob = await response.blob();
      
      const storageRef = ref(storage, `avatars/${user.uid}/profile-${Date.now()}.jpg`);
      
      console.log('[PROFILE_SETUP] Uploading blob to Firebase Storage');
      const uploadResult = await uploadBytes(storageRef, blob);
      
      console.log('[PROFILE_SETUP] Getting download URL');
      const downloadURL = await getDownloadURL(uploadResult.ref);
      
      console.log('[PROFILE_SETUP] Image uploaded successfully:', downloadURL);
      return downloadURL;
    } catch (error) {
      console.error('[PROFILE_SETUP] Error uploading avatar image:', error);
      throw error;
    }
  };

  // Save user profile
  const saveProfile = async () => {
    if (!displayName.trim()) {
      Alert.alert('Error', 'Please enter a display name');
      return;
    }

    if (!user) {
      Alert.alert('Error', 'You must be logged in to complete profile setup');
      return;
    }

    try {
      console.log('[PROFILE_SETUP] Saving profile');
      setIsSubmitting(true);

      let userAvatar;

      // If user has selected an image, upload it
      if (selectedAvatarType === 'image' && avatarImage) {
        try {
          console.log('[PROFILE_SETUP] Creating image avatar via AvatarService');
          userAvatar = await AvatarService.createImageAvatar(avatarImage, user.uid);
        } catch (error) {
          console.error('[PROFILE_SETUP] Error creating image avatar:', error);
          // Fall back to initial avatar
          console.log('[PROFILE_SETUP] Falling back to initial avatar');
          userAvatar = AvatarService.createInitialAvatar(displayName, selectedColor);
        }
      } else if (selectedAvatarType === 'bitmoji' && bitmojiUrl) {
        console.log('[PROFILE_SETUP] Creating bitmoji avatar');
        userAvatar = AvatarService.createBitmojiAvatar(bitmojiUrl);
      } else if (selectedAvatarType === 'dicebear' && dicebearSeed) {
        console.log('[PROFILE_SETUP] Creating DiceBear avatar');
        
        // Use the AvatarService to create the DiceBear avatar
        userAvatar = AvatarService.createDiceBearAvatar(dicebearSeed, dicebearStyle, dicebearParams);
      } else {
        console.log('[PROFILE_SETUP] Creating initial avatar via AvatarService');
        userAvatar = AvatarService.createInitialAvatar(displayName, selectedColor);
      }

      // Update the user's Firestore document
      console.log('[PROFILE_SETUP] Updating Firestore document');
      const userRef = doc(db, 'users', user.uid);
      await updateDoc(userRef, {
        displayName: displayName.trim(),
        avatar: userAvatar,
        avatarColor: selectedColor,
        hasCompletedOnboarding: true
      });

      console.log('[PROFILE_SETUP] Profile updated successfully');
      
      // Refresh the profile in auth context
      await refreshProfile();
      
      // Navigate to main app
      navigation.replace('MainApp');
    } catch (error) {
      console.error('[PROFILE_SETUP] Error saving profile:', error);
      Alert.alert('Error', 'Failed to save profile. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Skip profile setup for now
  const skipSetup = async () => {
    if (!user) return;
    
    try {
      console.log('[PROFILE_SETUP] Skipping profile setup');
      setIsSubmitting(true);
      
      // Create a simple initial avatar with AvatarService
      const avatar = AvatarService.createInitialAvatar(
        user.displayName || 'User',
        selectedColor
      );
      
      // Still mark onboarding as complete
      const userRef = doc(db, 'users', user.uid);
      await updateDoc(userRef, {
        hasCompletedOnboarding: true,
        avatar: avatar
      });
      
      await refreshProfile();
      navigation.replace('MainApp');
    } catch (error) {
      console.error('[PROFILE_SETUP] Error skipping profile setup:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handler for DiceBear avatar changes
  const handleDiceBearAvatarChange = (seed: string, style: string, params: Record<string, any>, url: string) => {
    console.log('[PROFILE_SETUP] DiceBear avatar changed:', { seed, style });
    setDicebearSeed(seed);
    setDicebearStyle(style);
    setDicebearParams(params);
    setDicebearUrl(url);
  };
  
  // Picker for DiceBear avatars
  const openDiceBearPicker = () => {
    console.log('[PROFILE_SETUP] Opening DiceBear avatar picker');
    setSelectedAvatarType('dicebear');
    
    // If no DiceBear URL yet, create one with displayName as seed
    if (!dicebearUrl) {
      const seed = displayName.toLowerCase().replace(/\s+/g, '-') || 'user-' + Math.floor(Math.random() * 10000);
      setDicebearSeed(seed);
    }
  };

  // Helper function to get avatar preview
  const getAvatarPreview = () => {
    console.log('[PROFILE_SETUP] Getting avatar preview for type:', selectedAvatarType);
    
    // For DiceBear type
    if (selectedAvatarType === 'dicebear') {
      return (
        <View style={tw`w-full items-center pt-0`}>
          <DiceBearInlineCustomizer
            initialSeed={dicebearSeed}
            initialStyle={dicebearStyle}
            initialParams={dicebearParams}
            onAvatarChange={handleDiceBearAvatarChange}
          />
        </View>
      );
    }
    
    // For Bitmoji type
    else if (selectedAvatarType === 'bitmoji') {
      // If we have a selected bitmoji, show it at the top of the selector
      const selectedPreview = bitmojiUrl ? (
        <View style={[styles.selectedBitmojiPreview, { marginBottom: 30 }]}>
          <BitmojiAvatar
            url={bitmojiUrl}
            displayName={displayName}
            size={120}
            color={selectedColor}
          />
          <Text style={styles.selectedBitmojiText}>Your Selected Avatar</Text>
        </View>
      ) : null;
      
      return (
        <View style={[styles.expandedAvatarContainer, { paddingBottom: 40 }]}>
          {selectedPreview}
          <BitmojiSelector />
        </View>
      );
    }
    
    // Default to initials avatar
    console.log('[PROFILE_SETUP] Rendering initial avatar preview');
    return (
      <View style={[styles.initialAvatar, { backgroundColor: selectedColor }]}>
        <Text style={styles.initialText}>
          {AvatarService.getInitials(displayName)}
        </Text>
      </View>
    );
  };

  return (
    <SafeAreaView style={tw`flex-1 bg-slate-50`}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={tw`flex-1`}
      >
        <ScrollView 
          contentContainerStyle={tw`flex-grow px-4 pt-1 pb-6`}
          showsVerticalScrollIndicator={true}
          keyboardShouldPersistTaps="handled"
        >
          {/* Header with reduced margins */}
          <View style={tw`items-center mb-3`}>
            <Text style={tw`text-xl font-bold text-slate-800 mb-1`}>Set Up Your Profile</Text>
            <Text style={tw`text-xs text-slate-500 text-center max-w-[90%]`}>{getAvatarTypeMessage()}</Text>         
          </View>
            
          {/* Profile Setup Form */}
          <View style={tw`bg-white rounded-xl p-4 shadow-sm border border-indigo-50`}>
            {/* Display Name Input */}
            <Text style={tw`text-sm font-semibold text-slate-700 mb-1.5`}>Display Name</Text>
            <TextInput
              style={tw`border border-slate-200 rounded-lg py-2.5 px-3 text-base mb-4 bg-slate-50 border-l-2 border-l-violet-600`}
              value={displayName}
              onChangeText={setDisplayName}
              placeholder="Enter your name"
              autoCapitalize="words"
              maxLength={30}
            />
            
            {/* Avatar Preview */}
            <Text style={tw`text-sm font-semibold text-slate-700 mb-1.5`}>Your Avatar</Text>
            <Animated.View 
              style={[
                tw`items-center justify-start my-2 py-1`,
                { 
                  minHeight: selectedAvatarType === 'bitmoji' ? 450 : 100,
                  height: avatarContainerHeight,
                  overflow: selectedAvatarType === 'bitmoji' ? 'visible' : 'hidden'
                }
              ]}
            >
              {getAvatarPreview()}
            </Animated.View>
            
            {/* Avatar Type Selection */}
            <View style={tw`flex-row justify-between mb-4`}>
              <TouchableOpacity
                style={[
                  tw`flex-1 items-center justify-center py-2.5 rounded-lg border mx-1`,
                  selectedAvatarType === 'bitmoji' 
                    ? tw`border-violet-600 bg-violet-50 shadow` 
                    : tw`border-slate-200 bg-slate-50`
                ]}
                onPress={openBitmojiPicker}
              >
                <Ionicons 
                  name="happy-outline" 
                  size={22} 
                  color={selectedAvatarType === 'bitmoji' ? '#7C3AED' : '#666'} 
                />
                <Text style={[
                  tw`mt-1 text-xs`,
                  selectedAvatarType === 'bitmoji' 
                    ? tw`text-violet-600 font-semibold` 
                    : tw`text-slate-500`
                ]}>Bitmoji</Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={[
                  tw`flex-1 items-center justify-center py-2.5 rounded-lg border mx-1`,
                  selectedAvatarType === 'initial' 
                    ? tw`border-violet-600 bg-violet-50 shadow` 
                    : tw`border-slate-200 bg-slate-50`
                ]}
                onPress={() => {
                  console.log('[PROFILE_SETUP] Selecting initial avatar type');
                  setSelectedAvatarType('initial');
                  setAvatarImage(null);
                }}
              >
                <Ionicons 
                  name="text" 
                  size={22} 
                  color={selectedAvatarType === 'initial' ? '#7C3AED' : '#666'} 
                />
                <Text style={[
                  tw`mt-1 text-xs`,
                  selectedAvatarType === 'initial' 
                    ? tw`text-violet-600 font-semibold` 
                    : tw`text-slate-500`
                ]}>Initial</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  tw`flex-1 items-center justify-center py-2.5 rounded-lg border mx-1`,
                  selectedAvatarType === 'dicebear' 
                    ? tw`border-violet-600 bg-violet-50 shadow` 
                    : tw`border-slate-200 bg-slate-50`
                ]}
                onPress={openDiceBearPicker}
              >
                <Ionicons 
                  name="person" 
                  size={22} 
                  color={selectedAvatarType === 'dicebear' ? '#7C3AED' : '#666'} 
                />
                <Text style={[
                  tw`mt-1 text-xs`,
                  selectedAvatarType === 'dicebear' 
                    ? tw`text-violet-600 font-semibold` 
                    : tw`text-slate-500`
                ]}>3D Style</Text>
              </TouchableOpacity>
            </View>
            
            {/* Color Picker for Initial Avatar */}
            {selectedAvatarType === 'initial' && (
              <View style={tw`my-1`}>
                <Text style={tw`text-xs text-slate-500 mb-1.5`}>Choose Color</Text>
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  style={tw`py-1`}
                >
                  {AVATAR_COLORS.map((color) => (
                    <TouchableOpacity
                      key={color}
                      style={[
                        tw`w-8 h-8 rounded-full mr-3`,
                        { backgroundColor: color },
                        selectedColor === color ? tw`border-2 border-slate-800` : {}
                      ]}
                      onPress={() => setSelectedColor(color)}
                    />
                  ))}
                </ScrollView>
              </View>
            )}
          </View>
          
          {/* Action Buttons */}
          <View style={tw`flex-row justify-between mt-3`}>
            <TouchableOpacity 
              style={tw`flex-1 py-2.5 px-4 rounded-lg items-center justify-center bg-slate-50 border border-slate-200 mr-2`}
              onPress={skipSetup}
              disabled={isSubmitting}
            >
              <Text style={tw`text-slate-500 text-sm font-medium`}>Skip for Now</Text>
            </TouchableOpacity>
            
            <TouchableOpacity
              style={tw`flex-1.5 py-2.5 px-4 rounded-lg items-center justify-center bg-violet-600 shadow-sm`}
              onPress={saveProfile}
              disabled={isSubmitting || !displayName.trim()}
            >
              {isSubmitting ? (
                <ActivityIndicator color="white" size="small" />
              ) : (
                <Text style={tw`text-white text-sm font-semibold`}>Save Profile</Text>
              )}
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f9fafb',
  },
  scrollContent: {
    flexGrow: 1,
    padding: 20,
    paddingBottom: 80, // Add extra padding at bottom to ensure scrollable content is fully visible
  },
  header: {
    alignItems: 'center',
    marginBottom: 30,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#1e293b',
    marginBottom: 8,
    textShadowColor: 'rgba(124, 58, 237, 0.15)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 3
  },
  subtitle: {
    fontSize: 16,
    color: '#64748b',
    textAlign: 'center',
    maxWidth: '80%',
  },
  formSection: {
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 15,
    elevation: 2,
    borderWidth: 1,
    borderColor: '#F3F0FF',
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    color: '#334155',
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 10,
    padding: 12,
    fontSize: 16,
    marginBottom: 24,
    backgroundColor: '#f8fafc',
    borderLeftWidth: 3,
    borderLeftColor: '#7C3AED',
    paddingLeft: 8,
    shadowColor: '#7C3AED',
    shadowOpacity: 0.04,
    shadowRadius: 3,
    shadowOffset: { width: 0, height: 2 },
  },
  avatarPreviewContainer: {
    alignItems: 'center',
    justifyContent: 'flex-start',
    marginVertical: 16,
    paddingVertical: 10,
    paddingBottom: 30, // Add extra padding at bottom
  },
  avatarPreview: {
    width: 120,
    height: 120,
    borderRadius: 60,
  },
  initialAvatar: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: '#7C3AED',
    justifyContent: 'center',
    alignItems: 'center',
  },
  initialText: {
    fontSize: 48,
    fontWeight: 'bold',
    color: 'white',
  },
  avatarTypeContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  avatarTypeButton: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    marginHorizontal: 4,
    backgroundColor: '#f8fafc',
  },
  selectedAvatarType: {
    borderColor: '#7C3AED',
    backgroundColor: '#EDE9FE',
    shadowColor: '#7C3AED',
    shadowOpacity: 0.3,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 3 },
    elevation: 3,
  },
  avatarTypeText: {
    marginTop: 4,
    fontSize: 12,
    color: '#64748b',
  },
  selectedAvatarTypeText: {
    color: '#7C3AED',
    fontWeight: '600',
  },
  colorPickerContainer: {
    marginVertical: 10,
  },
  colorLabel: {
    fontSize: 14,
    color: '#64748b',
    marginBottom: 8,
  },
  colorPickerScroll: {
    paddingVertical: 8,
  },
  colorOption: {
    width: 36,
    height: 36,
    borderRadius: 18,
    marginRight: 12,
  },
  selectedColorOption: {
    borderWidth: 3,
    borderColor: '#1e293b',
  },
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 30,
  },
  skipButton: {
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    flex: 1,
    marginRight: 10,
  },
  skipButtonText: {
    color: '#64748b',
    fontSize: 16,
    fontWeight: '500',
  },
  saveButton: {
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#7C3AED',
    flex: 1.5,
    shadowColor: '#7C3AED',
    shadowOpacity: 0.4,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 6,
  },
  saveButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  bitmojiContainer: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: '#f8fafc',
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  bitmojiPreview: {
    width: 140,
    height: 140,
  },
  expandedAvatarContainer: {
    width: '100%',
    alignItems: 'center',
    marginBottom: 40, // Increase bottom margin
    paddingTop: 10,
    minHeight: 400,
    paddingBottom: 30, // Add explicit padding at bottom
  },
  selectedBitmojiPreview: {
    alignItems: 'center',
    marginBottom: 16,
    marginTop: 10,
  },
  selectedBitmojiText: {
    fontSize: 14,
    color: '#64748b',
    marginTop: 8,
  },
  bitmojiSelectorContainer: {
    width: '100%',
    marginTop: 16,
    paddingBottom: 20, // Add padding at bottom
  },
  categoryContainer: {
    paddingBottom: 12,
  },
  categoryPill: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    backgroundColor: '#f1f5f9',
    borderRadius: 20,
    marginRight: 8,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    shadowColor: '#7C3AED',
    shadowOpacity: 0.1,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 1 },
    elevation: 1,
  },
  categoryText: {
    fontSize: 12,
    fontWeight: '500',
    color: '#334155',
  },
  bitmojiGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-around',
    marginTop: 12,
    paddingHorizontal: 5,
    paddingBottom: 20, // Add padding at bottom
  },
  bitmojiOption: {
    width: '30%',
    aspectRatio: 1,
    marginBottom: 25, // Increase bottom margin
    borderRadius: 12,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    backgroundColor: '#f8fafc',
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
    marginHorizontal: 4,
  },
  selectedBitmojiOption: {
    borderColor: '#7C3AED',
    borderWidth: 2,
    shadowColor: '#7C3AED',
    shadowOpacity: 0.3,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 3 },
    elevation: 4,
  },
  bitmojiImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'contain',
  },
  bitmojiSelectedOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(124, 58, 237, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  bitmojiLoading: {
    height: 200,
    justifyContent: 'center',
    alignItems: 'center',
  },
  bitmojiLoadingText: {
    marginTop: 12,
    color: '#64748b',
    fontSize: 14,
  },
});