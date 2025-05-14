import { UserAvatar } from '../contexts/AuthProvider';
import { storage } from '../lib/firebase';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import * as ImagePicker from 'expo-image-picker';

// Avatar color options - gen Z aesthetic with vibrant and pastel options
export const AVATAR_COLORS = [
  '#FF6B6B', // Coral red - energetic
  '#4ECDC4', // Turquoise - calming
  '#7C3AED', // Purple (your primary) - creative
  '#10B981', // Green - fresh
  '#F59E0B', // Amber - warm
  '#8338EC', // Violet - playful
  '#3B82F6', // Blue - trustworthy
  '#EC4899', // Pink - fun
  '#06D6A0', // Mint - soothing
  '#FB5607', // Orange - adventurous
];

export class AvatarService {
  // Get initials from a display name
  static getInitials(name: string | undefined | null): string {
    console.log('[AVATAR] Getting initials for name:', name);
    
    if (!name) {
      console.log('[AVATAR] No name provided, returning default ?');
      return '?';
    }
    
    const initials = name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .substring(0, 2);
      
    console.log('[AVATAR] Generated initials:', initials);
    return initials;
  }

  // Get a random color for avatar
  static getRandomColor(): string {
    const color = AVATAR_COLORS[Math.floor(Math.random() * AVATAR_COLORS.length)];
    console.log('[AVATAR] Generated random color:', color);
    return color;
  }

  // Create a default initial avatar
  static createInitialAvatar(displayName: string, color?: string): UserAvatar {
    console.log('[AVATAR] Creating initial avatar for:', displayName);
    const avatar = {
      type: 'initial' as const,
      value: this.getInitials(displayName),
      color: color || this.getRandomColor()
    };
    console.log('[AVATAR] Initial avatar created:', avatar);
    return avatar;
  }

  // Open image picker to select avatar
  static async pickImage(options?: ImagePicker.ImagePickerOptions): Promise<string | null> {
    console.log('[AVATAR] Opening image picker with options:', options ? JSON.stringify(options) : 'default');
    
    try {
      const defaultOptions = {
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      };
      
      const result = await ImagePicker.launchImageLibraryAsync(options || defaultOptions);

      if (!result.canceled && result.assets && result.assets.length > 0) {
        console.log('[AVATAR] Image selected:', result.assets[0].uri.substring(0, 30) + '...');
        return result.assets[0].uri;
      } else {
        console.log('[AVATAR] Image picker canceled or no assets');
        return null;
      }
    } catch (error) {
      console.error('[AVATAR] Error picking image:', error);
      return null;
    }
  }

  // Upload avatar image to Firebase Storage
  static async uploadAvatarImage(uri: string, userId: string): Promise<string> {
    console.log('[AVATAR] Starting upload of avatar image for user:', userId);
    
    try {
      // First, fetch the image data
      console.log('[AVATAR] Fetching image data from URI');
      const response = await fetch(uri);
      const blob = await response.blob();
      
      // Create reference with unique filename
      const filename = `profile-${Date.now()}`;
      const storageRef = ref(storage, `avatars/${userId}/${filename}.jpg`);
      console.log('[AVATAR] Storage reference created:', storageRef.fullPath);
      
      // Upload the image
      console.log('[AVATAR] Uploading blob to Firebase Storage');
      const uploadResult = await uploadBytes(storageRef, blob);
      console.log('[AVATAR] Upload successful, metadata:', uploadResult.metadata.name);
      
      // Get the download URL
      const downloadURL = await getDownloadURL(uploadResult.ref);
      console.log('[AVATAR] Image URL retrieved:', downloadURL.substring(0, 40) + '...');
      
      return downloadURL;
    } catch (error) {
      console.error('[AVATAR] Error uploading avatar image:', error);
      throw error;
    }
  }

  // Create an image avatar
  static async createImageAvatar(imageUri: string, userId: string): Promise<UserAvatar> {
    console.log('[AVATAR] Creating image avatar for user:', userId);
    
    try {
      const downloadURL = await this.uploadAvatarImage(imageUri, userId);
      const avatar = {
        type: 'image' as const,
        value: downloadURL
      };
      console.log('[AVATAR] Image avatar created successfully');
      return avatar;
    } catch (error) {
      console.error('[AVATAR] Failed to create image avatar, falling back to initial', error);
      return this.createInitialAvatar(userId.substring(0, 2));
    }
  }
  
  // Mock Bitmoji functionality (for future integration)
  static openBitmojiPicker(): void {
    console.log('[AVATAR] Bitmoji picker not yet implemented');
    // To be implemented with Snapchat's Bitmoji SDK
  }
  
  // Get placeholder bitmoji URLs (for future implementation)
  static getPlaceholderBitmojiUrl(): string {
    const bitmojiUrls = [
      'https://sdk.bitmoji.com/render/panel/20048676-99468787249_4-s5-v1.png?transparent=1',
      'https://sdk.bitmoji.com/render/panel/e0c8b93f-96ab-4b19-91b8-bottke-5-v1.png?transparent=1',
      'https://sdk.bitmoji.com/render/panel/3038a9fc-126a-467f-857f-83r4jd-5-v1.png?transparent=1',
    ];
    return bitmojiUrls[Math.floor(Math.random() * bitmojiUrls.length)];
  }
}