import React, { useState, useEffect } from 'react';
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
  Platform
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { useAuth } from '../contexts/AuthProvider';
import { UserAvatar } from '../models/user';
import { storage, db } from '../lib/firebase';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { doc, updateDoc } from 'firebase/firestore';

const AVATAR_COLORS = [
  '#FF6B6B', // Red
  '#4ECDC4', // Teal
  '#45B7D1', // Light Blue
  '#FFBE0B', // Yellow
  '#FB5607', // Orange
  '#8338EC', // Purple
  '#3A86FF', // Blue
  '#38B000', // Green
  '#FF006E', // Pink
  '#9381FF', // Lavender
];

export default function ProfileSetupScreen({ navigation }: { navigation: any }) {
  const { user, profile, refreshProfile } = useAuth();
  const [displayName, setDisplayName] = useState('');
  const [selectedAvatarType, setSelectedAvatarType] = useState<'initial' | 'image' | 'bitmoji'>('initial');
  const [selectedColor, setSelectedColor] = useState(AVATAR_COLORS[0]);
  const [avatarImage, setAvatarImage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

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

  // Pick an image from the gallery
  const pickImage = async () => {
    console.log('[PROFILE_SETUP] Opening image picker');
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        console.log('[PROFILE_SETUP] Image selected:', result.assets[0].uri);
        setAvatarImage(result.assets[0].uri);
        setSelectedAvatarType('image');
      } else {
        console.log('[PROFILE_SETUP] Image picker canceled or no assets');
      }
    } catch (error) {
      console.error('[PROFILE_SETUP] Error picking image:', error);
      Alert.alert('Error', 'Failed to pick an image. Please try again.');
    }
  };

  // For mock implementation - later we'll integrate an actual bitmoji picker
  const openBitmojiPicker = () => {
    console.log('[PROFILE_SETUP] Opening bitmoji picker (placeholder)');
    Alert.alert(
      'Bitmoji Coming Soon',
      'Bitmoji integration will be available in a future update. For now, you can use a custom image.',
      [
        { text: 'Choose Image Instead', onPress: pickImage },
        { text: 'Cancel', style: 'cancel' }
      ]
    );
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

      let userAvatar: UserAvatar = {
        type: 'initial',
        value: displayName.charAt(0).toUpperCase(),
        color: selectedColor
      };

      // If user has selected an image, upload it
      if (selectedAvatarType === 'image' && avatarImage) {
        try {
          const downloadURL = await uploadAvatarImage(avatarImage);
          userAvatar = {
            type: 'image',
            value: downloadURL
          };
        } catch (error) {
          console.error('[PROFILE_SETUP] Error uploading image:', error);
          // Fall back to initial avatar
          userAvatar = {
            type: 'initial',
            value: displayName.charAt(0).toUpperCase(),
            color: selectedColor
          };
        }
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
      
      // Still set basic avatar and mark onboarding as complete
      const userRef = doc(db, 'users', user.uid);
      await updateDoc(userRef, {
        hasCompletedOnboarding: true,
        avatar: {
          type: 'initial',
          value: (user.displayName || 'User').charAt(0).toUpperCase(),
          color: selectedColor
        }
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
    if (selectedAvatarType === 'image' && avatarImage) {
      return (
        <Image source={{ uri: avatarImage }} style={styles.avatarPreview} />
      );
    }
    
    // Default to initials
    return (
      <View style={[styles.initialAvatar, { backgroundColor: selectedColor }]}>
        <Text style={styles.initialText}>
          {displayName ? displayName.charAt(0).toUpperCase() : '?'}
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
        <ScrollView contentContainerStyle={styles.scrollContent}>
          <View style={styles.header}>
            <Text style={styles.title}>Set Up Your Profile</Text>
            <Text style={styles.subtitle}>Customize how others will see you in GroopTroop</Text>
          </View>

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
            <View style={styles.avatarPreviewContainer}>
              {getAvatarPreview()}
            </View>
            
            {/* Avatar Type Selection */}
            <View style={styles.avatarTypeContainer}>
              <TouchableOpacity
                style={[
                  styles.avatarTypeButton,
                  selectedAvatarType === 'image' && styles.selectedAvatarType
                ]}
                onPress={pickImage}
              >
                <Ionicons name="image-outline" size={24} color={selectedAvatarType === 'image' ? '#7C3AED' : '#666'} />
                <Text style={[
                  styles.avatarTypeText,
                  selectedAvatarType === 'image' && styles.selectedAvatarTypeText
                ]}>Upload Photo</Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={[
                  styles.avatarTypeButton,
                  selectedAvatarType === 'bitmoji' && styles.selectedAvatarType
                ]}
                onPress={openBitmojiPicker}
              >
                <Ionicons name="happy-outline" size={24} color={selectedAvatarType === 'bitmoji' ? '#7C3AED' : '#666'} />
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
                  setSelectedAvatarType('initial');
                  setAvatarImage(null);
                }}
              >
                <Ionicons name="text" size={24} color={selectedAvatarType === 'initial' ? '#7C3AED' : '#666'} />
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
  },
  avatarPreviewContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: 16,
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
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    marginHorizontal: 4,
    backgroundColor: '#f8fafc',
  },
  selectedAvatarType: {
    borderColor: '#7C3AED',
    backgroundColor: '#EDE9FE',
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
  },
  saveButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
});