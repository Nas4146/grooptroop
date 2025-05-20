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

// Update the DiceBear style options with more diverse options

export const DICEBEAR_STYLES = [
  { id: 'bottts', name: '🤖 Robots', description: 'Unique robot characters' },
  { id: 'avataaars', name: '👤 People', description: 'Customizable human avatars' },
  { id: 'micah', name: '👥 Abstract', description: 'Simple, diverse human faces' },
  { id: 'lorelei', name: '🧒 Chibi', description: 'Cute chibi-style avatars' },
  { id: 'miniavs', name: '😎 MiniAvs', description: '3D emoji characters' },
  { id: 'personas', name: '🌈 Personas', description: 'Diverse human faces' },
  { id: 'notionists', name: '💼 Professional', description: 'Professional look' },
  { id: 'pixel-art', name: '🎮 Pixel', description: 'Retro pixel style' },
  { id: 'croodles', name: '✏️ Doodles', description: 'Hand-drawn style' },
  { id: 'thumbs', name: '👍 Thumbs', description: 'Unique thumbs up avatars' },
];

// Available style-specific parameters
export const STYLE_PARAMETERS = {
  bottts: {
    // Robot colors
    primaryColor: ['663399', '2a4b8d', '6d3e91', '1e1e1e', '3498db', '9b59b6', 'e74c3c', '2ecc71', 'f39c12'],
    backgroundColor: ['b6e3f4', 'c0aede', 'd1d4f9', 'ffd5dc', 'ffdfbf', '1d3557', 'f28123', '4169e1', '006d77'],
    textureChance: [0, 50, 100] // Chance of texture overlay
  },
  miniavs: {
    // Human styles
    skinColor: ['8d5524', 'c68642', 'e0ac69', 'f1c27d', 'ffdbac', '4a312c', 'aa8976', '6b4423', '2d170b'],
    hairColor: ['000000', '6a4e42', '977961', '090806', '694013', 'e6be8a', 'f8e8b7', '774411', 'c2c2c2'],
    backgroundColor: ['b6e3f4', 'c0aede', 'd1d4f9', 'ffd5dc', 'ffdfbf', '1d3557', 'f28123', '4169e1']
  },
  lorelei: {
    // High variety of skin tones
    skinColor: ['ca9e72', 'e5b39a', 'f5d0b5', '4a312c', '6b4423', '2d170b', '8d5524', 'c68642', 'e0ac69'],
    shapeColor: ['0a5b83', '1c799f', '69d2e7', 'a7e8f8', 'e0f8ff', '2a4b8d', '3498db'],
    backgroundColor: ['b6e3f4', 'c0aede', 'd1d4f9', 'ffd5dc', 'ffdfbf', '1d3557', 'f28123', '4169e1']
  },
  avataaars: {
    // Most diverse options
    skinColor: ['614335', 'd08b5b', 'ae5d29', 'edb98a', 'ffdbb4', 'fd9841', 'f8d25c', '86a8e7'],
    hairColor: ['2c1b18', 'a55728', 'b58143', 'c93305-1', 'e8e1e1', '6a4e42', 'c93305-2', 'd4a181'],
    backgroundColor: ['b6e3f4', 'c0aede', 'd1d4f9', 'ffd5dc', 'ffdfbf', '65c9ff', 'ffedef', '69d2e7'],
    topType: ['longHair', 'shortHair', 'eyepatch', 'hat', 'hijab', 'turban', 'bigHair', 'bob', 'bun'],
    accessoriesType: ['blank', 'kurt', 'prescription01', 'prescription02', 'round', 'sunglasses', 'wayfarers'],
    facialHairType: ['blank', 'beardMedium', 'beardLight', 'beardMajestic', 'moustacheFancy', 'moustacheMagnum'],
    clotheType: ['blazerShirt', 'blazerSweater', 'collarSweater', 'graphicShirt', 'hoodie', 'overall', 'shirtCrewNeck']
  },
  micah: {
    // Abstract style with diverse colors
    baseColor: ['0e0e0e', 'ffb300', 'd3a588', '73513c', '4c3228', '5c4444', 'ffdbb4', 'edb98a'],
    earringsProbability: [0, 50, 100],
    glassesProbability: [0, 50, 100],
    hairColor: ['0e0e0e', '4c3228', 'ac6511', 'dc8e24', 'afafaf', 'ff9100', 'ffb300', 'ffffff'],
    backgroundColor: ['26a4ff', 'ffc10e', 'fb765e', '48ad8e', '9368e3', 'fa80bc', '89e24e']
  },
  'pixel-art': {
    // Pixel characters with diverse options
    backgroundColor: ['b6e3f4', 'c0aede', 'd1d4f9', 'ffd5dc', 'ffdfbf', '1d3557', 'f28123', '4169e1'],
    body: [1, 2, 3, 4],
    skinColor: ['ffcab9', 'f8b788', 'e7975f', 'd47d4a', 'ae5d29', '8c4922', '573218']
  },
  personas: {
    // New persona style - diverse and inclusive
    backgroundColor: ['b6e3f4', 'c0aede', 'd1d4f9', 'ffd5dc', 'ffdfbf', '1d3557', 'f28123', '4169e1'],
    skinColor: ['614335', 'd08b5b', 'ae5d29', 'edb98a', 'ffdbb4', 'fd9841', 'f8d25c', '86a8e7'],
    hairColor: ['2c1b18', 'a55728', 'b58143', 'c93305-1', 'e8e1e1', '6a4e42', 'c93305-2', 'd4a181']
  },
  notionists: {
    // Professional and clean style
    backgroundColor: ['f5f5f5', 'eeeeee', 'e0e0e0', 'bdbdbd', '9e9e9e', '757575'],
    skinColor: ['614335', 'd08b5b', 'ae5d29', 'edb98a', 'ffdbb4', 'fd9841', 'f8d25c'],
    hairColor: ['2c1b18', 'a55728', 'b58143', 'c93305', 'e8e1e1', '6a4e42', 'c93305']
  }
};

// Fix the export syntax by properly separating class methods from standalone exports

// Add these standalone functions at the top of the file, before the class definition
export const generateColorFromName = (name: string): string => {
  if (!name) return AVATAR_COLORS[0];
  
  // Simple hash function to get consistent colors
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  
  // Use the hash to pick a color from your array
  const index = Math.abs(hash) % AVATAR_COLORS.length;
  return AVATAR_COLORS[index];
};

export const getInitials = (name: string): string => {
  if (!name) return '?';
  
  return name
    .split(' ')
    .map(word => word[0])
    .join('')
    .toUpperCase()
    .substring(0, 2);
};

// Then update the AvatarService class to use these functions instead of having them at the end

export class AvatarService {
  // Use the standalone functions inside the class methods
  static getInitials(name: string | undefined | null): string {
    console.log('[AVATAR] Getting initials for name:', name);
    
    if (!name) {
      console.log('[AVATAR] No name provided, returning default ?');
      return '?';
    }
    
    const initials = getInitials(name);
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
  
  // Get placeholder bitmoji URLs (for future implementation)
static getPlaceholderBitmojiUrl(): string {
  console.log('[AVATAR] Getting random placeholder bitmoji URL');
  
  // Use reliable public URLs that won't break
  const bitmojiUrls = [
    'https://cdn-icons-png.flaticon.com/512/599/599305.png', // Man with glasses
    'https://cdn-icons-png.flaticon.com/512/146/146005.png', // Woman with ponytail
    'https://cdn-icons-png.flaticon.com/512/4140/4140048.png', // Cool guy
    'https://cdn-icons-png.flaticon.com/512/236/236832.png', // Woman with short hair
    'https://cdn-icons-png.flaticon.com/512/1326/1326405.png', // Young professional
    'https://cdn-icons-png.flaticon.com/512/5231/5231019.png'  // Cool person with beanie
  ];
  
  const url = bitmojiUrls[Math.floor(Math.random() * bitmojiUrls.length)];
  console.log('[AVATAR] Selected bitmoji URL:', url);
  return url;
}
  
  // Create a bitmoji avatar using selected or random bitmoji
  static createBitmojiAvatar(bitmojiUrl?: string): UserAvatar {
    console.log('[AVATAR] Creating bitmoji avatar');
    
    // Use provided URL or get a placeholder if none provided
    const url = bitmojiUrl || this.getPlaceholderBitmojiUrl();
    console.log('[AVATAR] Using bitmoji URL:', url.substring(0, 40) + '...');
    
    const avatar = {
      type: 'bitmoji' as const,
      value: url
    };
    
    console.log('[AVATAR] Bitmoji avatar created successfully');
    return avatar;
  }
  
  // Mock Bitmoji selection - in a real app, this would integrate with Snapchat's SDK
  static async selectBitmoji(): Promise<string | null> {
    console.log('[AVATAR] Opening mock bitmoji selector');
    
    try {
      // For now, just return a random bitmoji from our placeholders
      // In a real implementation, this would show the Snapchat Bitmoji picker
      const selectedUrl = this.getPlaceholderBitmojiUrl();
      
      console.log('[AVATAR] Bitmoji selected:', selectedUrl.substring(0, 40) + '...');
      
      // Simulate network delay to make it feel more realistic
      await new Promise(resolve => setTimeout(resolve, 800));
      
      return selectedUrl;
    } catch (error) {
      console.error('[AVATAR] Error selecting bitmoji:', error);
      return null;
    }
  }
  
  // Enhanced bitmoji picker with expanded library and trends
static async openEnhancedBitmojiPicker(userId: string): Promise<UserAvatar | null> {
  console.log('[AVATAR] Opening enhanced bitmoji picker for user:', userId);
  
  try {
    // In production, we would integrate with Snapchat's Bitmoji SDK
    // For now, we'll simulate the picker with a timeout and random selection
    console.log('[AVATAR] Initiating bitmoji selection process');
    
    // Simulate loading the bitmoji library
    await new Promise(resolve => setTimeout(resolve, 600));
    
    // Get a "selected" bitmoji URL
    const selectedBitmoji = await this.selectBitmoji();
    
    if (selectedBitmoji) {
      // Create and return the bitmoji avatar
      return this.createBitmojiAvatar(selectedBitmoji);
    } else {
      console.log('[AVATAR] No bitmoji selected, returning null');
      return null;
    }
  } catch (error) {
    console.error('[AVATAR] Error in bitmoji picker:', error);
    return null;
  }
}
  
  // Add trending bitmoji collection - very appealing to Gen Z
static getTrendingBitmojis(): string[] {
  console.log('[AVATAR] Fetching trending bitmojis');
  
  // Use the same reliable URLs
  const trendingBitmojis = [
    'https://cdn-icons-png.flaticon.com/512/599/599305.png',
    'https://cdn-icons-png.flaticon.com/512/146/146005.png',
    'https://cdn-icons-png.flaticon.com/512/4140/4140048.png',
    'https://cdn-icons-png.flaticon.com/512/236/236832.png',
    'https://cdn-icons-png.flaticon.com/512/1326/1326405.png',
    'https://cdn-icons-png.flaticon.com/512/5231/5231019.png',
    'https://cdn-icons-png.flaticon.com/512/4128/4128176.png',
    'https://cdn-icons-png.flaticon.com/512/1154/1154448.png'
  ];
  
  console.log('[AVATAR] Retrieved trending bitmojis collection with', trendingBitmojis.length, 'items');
  return trendingBitmojis;
}

// Update the getDiceBearAvatarUrl method

// Add a cache to avoid repeated requests for the same URLs
static urlCache: Record<string, string> = {};

static getDiceBearAvatarUrl(
  seed: string,
  style: string = 'adventurer',
  size: number = 256,
  params: Record<string, any> = {}
): string {
  console.log(`[AVATAR] Creating DiceBear avatar URL with style: ${style}, seed: ${seed}`);
  
  try {
    // Ensure the seed is URL-safe
    const safeSeed = encodeURIComponent(seed.trim());
    
    // Create a cache key from the parameters
    const cacheKey = `${style}-${safeSeed}-${size}-${JSON.stringify(params)}`;
    
    // Return cached URL if available
    if (this.urlCache[cacheKey]) {
      console.log('[AVATAR] Using cached URL for:', cacheKey);
      return this.urlCache[cacheKey];
    }
    
    // Validate style
    const validStyle = DICEBEAR_STYLES.find(s => s.id === style)?.id || 'adventurer';
    
    // Build query parameters
    const queryParams = new URLSearchParams();
    queryParams.append('seed', safeSeed);
    queryParams.append('size', size.toString());
    
    // Add any additional parameters
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        queryParams.append(key, value.toString());
      }
    });
    
    // Use PNG format by default for React Native compatibility
    const url = `https://api.dicebear.com/9.x/${validStyle}/png?${queryParams.toString()}`;
    console.log(`[AVATAR] Generated DiceBear URL: ${url.substring(0, 100)}...`);
    
    // Cache the URL
    this.urlCache[cacheKey] = url;
    
    return url;
  } catch (error) {
    console.error('[AVATAR] Error generating DiceBear URL:', error);
    // Return a safe fallback URL
    return `https://api.dicebear.com/9.x/bottts/png?seed=fallback&size=${size}`;
  }
}

// Create a DiceBear avatar in UserAvatar format
static createDiceBearAvatar(seed: string, style: string = 'adventurer', params: Record<string, any> = {}): UserAvatar {
  console.log(`[AVATAR] Creating DiceBear avatar object with style: ${style}, seed: ${seed}`);
  
  const avatar = {
    type: 'dicebear' as const,
    value: this.getDiceBearAvatarUrl(seed, style, 256, params),
    style: style,
    seed: seed,
    params: params
  };
  
  console.log('[AVATAR] DiceBear avatar created successfully:', avatar.type, avatar.style);
  return avatar;
}

// Get preview images for a specific DiceBear style
static getDiceBearStylePreviews(style: string, count: number = 6): string[] {
  console.log(`[AVATAR] Getting ${count} previews for style: ${style}`);
  
  // Gen Z appealing seed words
  const seedWords = [
    'vibes', 'aesthetic', 'slay', 'based', 'fire', 'lit', 
    'mood', 'drip', 'iconic', 'energy', 'chill', 'vibe',
    'yeet', 'flex', 'rizz', 'bussin', 'cap', 'no-cap'
  ];
  
  // Generate previews with different seeds
  const previews = Array(count).fill(0).map((_, i) => {
    const seed = seedWords[i % seedWords.length] + i;
    return this.getDiceBearAvatarUrl(seed, style, 128);
  });
  
  console.log(`[AVATAR] Generated ${previews.length} previews for style: ${style}`);
  return previews;
}

// Upload a DiceBear avatar to Firebase Storage
static async uploadDiceBearAvatar(uid: string, seed: string, style: string, params: Record<string, any> = {}): Promise<string> {
  console.log(`[AVATAR] Uploading DiceBear avatar to Firebase for user: ${uid}`);
  
  try {
    // Generate the URL for a PNG version
    const pngUrl = this.getDiceBearAvatarUrl(seed, style, 256, { ...params, format: 'png' });
    
    // Fetch the PNG data
    console.log('[AVATAR] Fetching PNG from DiceBear API');
    const response = await fetch(pngUrl);
    if (!response.ok) {
      throw new Error(`Failed to fetch DiceBear avatar: ${response.statusText}`);
    }
    
    const blob = await response.blob();
    
    // Upload to Firebase Storage
    const filename = `dicebear-${style}-${Date.now()}`;
    const storageRef = ref(storage, `avatars/${uid}/${filename}.png`);
    console.log('[AVATAR] Uploading to Firebase Storage:', storageRef.fullPath);
    
    await uploadBytes(storageRef, blob, { contentType: 'image/png' });
    
    // Get the download URL
    const downloadURL = await getDownloadURL(storageRef);
    console.log('[AVATAR] Upload successful, download URL:', downloadURL.substring(0, 60) + '...');
    
    return downloadURL;
  } catch (error) {
    console.error('[AVATAR] Error uploading DiceBear avatar:', error);
    throw error;
  }
}

// Generate random parameters for a given style
static getRandomStyleParams(style: string): Record<string, any> {
  const styleParams = STYLE_PARAMETERS[style as keyof typeof STYLE_PARAMETERS];
  if (!styleParams) return {};
  
  const params: Record<string, any> = {};
  
  Object.entries(styleParams).forEach(([key, options]) => {
    if (Array.isArray(options) && options.length > 0) {
      // Select a random option
      params[key] = options[Math.floor(Math.random() * options.length)];
    }
  });
  
  console.log(`[AVATAR] Generated random params for ${style}:`, params);
  return params;
}
}