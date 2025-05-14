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
import { AvatarService, AVATAR_COLORS } from '../services/AvatarService';
import BitmojiAvatar from '../components/avatar/BitmojiAvatar';

export default function ProfileSetupScreen({ navigation }: { navigation: any }) {
  const { user, profile, refreshProfile } = useAuth();
  const [displayName, setDisplayName] = useState('');
  const [selectedAvatarType, setSelectedAvatarType] = useState<'initial' | 'bitmoji'>('initial');  
  const [selectedColor, setSelectedColor] = useState(AVATAR_COLORS[0]);
  const [avatarImage, setAvatarImage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [bitmojiUrl, setBitmojiUrl] = useState<string | null>(null);
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

  useEffect(() => {
    if (selectedAvatarType !== prevAvatarType.current) {
      console.log('[PROFILE_SETUP] Avatar type changed, animating container');
      
      // Target height based on avatar type - increase for bitmoji to give more space
      const targetHeight = selectedAvatarType === 'bitmoji' ? 600 : 120; // Increased from 520 to 600
      
      Animated.timing(avatarContainerHeight, {
        toValue: targetHeight,
        duration: 500,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: false
      }).start();
      
      prevAvatarType.current = selectedAvatarType;
    }
    
    if (selectedAvatarType === 'bitmoji' && bitmojiUrl) {
      console.log('[PROFILE_SETUP] Bitmoji state updated - type:', selectedAvatarType, 'URL:', bitmojiUrl);
    }
  }, [selectedAvatarType, bitmojiUrl]);

  const getAvatarTypeMessage = () => {
    console.log('[PROFILE_SETUP] Getting message for avatar type:', selectedAvatarType);
    
    if (selectedAvatarType === 'bitmoji') {
      const bitmojiMessages = [
        "Choose a Bitmoji that matches your vibe ✌️",
        "Pick a Bitmoji that feels like you 🔥",
      ];
      return bitmojiMessages[Math.floor(Math.random() * bitmojiMessages.length)];
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
          styles.bitmojiSelectorContainer, 
          animatedStyles,
          { paddingBottom: 20 } // Add extra padding at bottom
        ]}
      >
        {renderCategories()}
        
        {loading ? (
          <View style={styles.bitmojiLoading}>
            <ActivityIndicator color="#7C3AED" size="large" />
            <Text style={styles.bitmojiLoadingText}>Loading avatars...</Text>
          </View>
        ) : (
          <Animated.View 
            style={[
              styles.bitmojiGrid, 
              { 
                opacity: animation,
                paddingBottom: 30 // Add padding to prevent last row from being cut off
              }
            ]}
          >
            {bitmojiOptions.map((url, index) => (
              <TouchableOpacity
                key={index}
                style={[
                  styles.bitmojiOption,
                  selectedBitmojiIndex === index && styles.selectedBitmojiOption,
                  { marginBottom: 25 } // Increase spacing between rows
                ]}
                onPress={() => handleBitmojiSelect(url, index)}
              >
                <Image
                  source={{ uri: url }}
                  style={styles.bitmojiImage}
                  onError={(e) => console.error(`[BITMOJI_SELECTOR] Image load error for index ${index}:`, e.nativeEvent.error)}
                />
                {selectedBitmojiIndex === index && (
                  <View style={styles.bitmojiSelectedOverlay}>
                    <Ionicons name="checkmark-circle" size={24} color="#7C3AED" />
                  </View>
                )}
              </TouchableOpacity>
            ))}
          </Animated.View>
        )}
      </Animated.View>
    );
  };

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

  // Helper function to get avatar preview
  const getAvatarPreview = () => {
    console.log('[PROFILE_SETUP] Getting avatar preview for type:', selectedAvatarType);
    
    // For Bitmoji type
    if (selectedAvatarType === 'bitmoji') {
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
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.container}
      >
        <ScrollView 
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={true}
          scrollEventThrottle={16}
          removeClippedSubviews={false} // Important to prevent clipping
          keyboardShouldPersistTaps="handled" // Helps with keyboard interactions
        >
          <View style={styles.header}>
            <Text style={styles.title}>Set Up Your Profile</Text>
            <Text style={styles.subtitle}>{getAvatarTypeMessage()}</Text>         
          </View>
          
          {/* Profile Setup Form */}
          <View style={styles.formSection}>
            {/* Display Name Input */}
            <Text style={styles.label}>Display Name</Text>
            <TextInput
              style={styles.input}
              value={displayName}
              onChangeText={setDisplayName}
              placeholder="Enter your name"
              autoCapitalize="words"
              maxLength={30}
            />
            
            {/* Avatar Preview */}
            <Text style={styles.label}>Your Avatar</Text>
            <Animated.View 
              style={[
                styles.avatarPreviewContainer, 
                { 
                  minHeight: selectedAvatarType === 'bitmoji' ? 520 : 120, // Use minHeight instead of height to allow expansion
                  height: avatarContainerHeight,
                  overflow: selectedAvatarType === 'bitmoji' ? 'visible' : 'hidden'
                }
              ]}
            >
              {getAvatarPreview()}
            </Animated.View>
            
            {/* Avatar Type Selection */}
            <View style={styles.avatarTypeContainer}>
              <TouchableOpacity
                style={[
                  styles.avatarTypeButton,
                  selectedAvatarType === 'bitmoji' && styles.selectedAvatarType
                ]}
                onPress={openBitmojiPicker}
              >
                <Ionicons 
                  name="happy-outline" 
                  size={24} 
                  color={selectedAvatarType === 'bitmoji' ? '#7C3AED' : '#666'} 
                />
                <Text style={[
                  styles.avatarTypeText,
                  selectedAvatarType === 'bitmoji' && styles.selectedAvatarTypeText
                ]}>Bitmoji</Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={[
                  styles.avatarTypeButton,
                  selectedAvatarType === 'initial' && styles.selectedAvatarType
                ]}
                onPress={() => {
                  console.log('[PROFILE_SETUP] Selecting initial avatar type');
                  setSelectedAvatarType('initial');
                  setAvatarImage(null);
                }}
              >
                <Ionicons 
                  name="text" 
                  size={24} 
                  color={selectedAvatarType === 'initial' ? '#7C3AED' : '#666'} 
                />
                <Text style={[
                  styles.avatarTypeText,
                  selectedAvatarType === 'initial' && styles.selectedAvatarTypeText
                ]}>Initial</Text>
              </TouchableOpacity>
            </View>
            
            {/* Color Picker for Initial Avatar */}
            {selectedAvatarType === 'initial' && (
              <View style={styles.colorPickerContainer}>
                <Text style={styles.colorLabel}>Choose Color</Text>
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={styles.colorPickerScroll}
                >
                  {AVATAR_COLORS.map((color) => (
                    <TouchableOpacity
                      key={color}
                      style={[
                        styles.colorOption,
                        { backgroundColor: color },
                        selectedColor === color && styles.selectedColorOption
                      ]}
                      onPress={() => setSelectedColor(color)}
                    />
                  ))}
                </ScrollView>
              </View>
            )}
          </View>
          
          {/* Action Buttons */}
          <View style={styles.buttonContainer}>
            <TouchableOpacity 
              style={styles.skipButton}
              onPress={skipSetup}
              disabled={isSubmitting}
            >
              <Text style={styles.skipButtonText}>Skip for Now</Text>
            </TouchableOpacity>
            
            <TouchableOpacity
              style={styles.saveButton}
              onPress={saveProfile}
              disabled={isSubmitting || !displayName.trim()}
            >
              {isSubmitting ? (
                <ActivityIndicator color="white" size="small" />
              ) : (
                <Text style={styles.saveButtonText}>Save Profile</Text>
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