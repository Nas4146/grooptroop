import React, { useState, memo, useEffect } from 'react';
import { View, Text, StyleSheet, Image, Platform } from 'react-native';
// Import FastImage but don't use it directly yet
import FastImage from 'react-native-fast-image';
import { UserAvatar } from '../../contexts/AuthProvider';
import { AvatarService } from '../../services/AvatarService';

// Create an image URI cache at module level
const IMAGE_CACHE = new Map<string, string>();

// Set to false to avoid FastImage issues
const USE_FAST_IMAGE = false;

// Add a function to preload images for better performance
const preloadImage = (uri: string) => {
  if (uri && !IMAGE_CACHE.has(uri)) {
    // Cache the URI
    IMAGE_CACHE.set(uri, uri);
    
    // Try to preload with FastImage (fallback silently if it fails)
    if (USE_FAST_IMAGE) {
      try {
        FastImage.preload([{ uri }]);
      } catch (e) {
        // Silently fail if FastImage is not available
        console.warn('[AVATAR] FastImage preload failed', e);
      }
    }
  }
};

const generateColorFromName = (name: string): string => {
  if (!name) return '#7C3AED'; // Default purple

  // Simple hash function
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  
  // Convert to hex color (using your brand colors)
  const colors = [
    '#7C3AED', // Purple
    '#FF6B6B', // Coral red
    '#4ECDC4', // Turquoise
    '#10B981', // Green
    '#F59E0B', // Amber
    '#3B82F6', // Blue
    '#EC4899', // Pink
  ];
  
  return colors[Math.abs(hash) % colors.length];
};

interface AvatarProps {
  avatar?: UserAvatar;
  displayName?: string;
  size?: number;
  style?: any;
  textStyle?: any;
  imageStyle?: any;
}

const Avatar: React.FC<AvatarProps> = ({ 
  avatar, 
  displayName = '', 
  size = 40, 
  style,
  textStyle,
  imageStyle
}) => {
  // Debug log to see what props are being passed - only in development
  if (__DEV__ && false) {
    console.log(`[AVATAR_COMP] Rendering avatar for ${displayName || 'unknown'}, type: ${avatar?.type || 'none'}`);
  }
  
  // Add state for tracking image loading errors
  const [hasImageError, setHasImageError] = useState(false);
  
  // Convert size to number if it's a string like 'sm', 'md', etc.
  const sizeInPx = typeof size === 'number' ? size : 
    size === 'xs' ? 24 : 
    size === 'sm' ? 32 : 
    size === 'md' ? 40 : 
    size === 'lg' ? 48 : 
    size === 'xl' ? 56 : 40;
  
  // If no display name is provided, use a safer fallback
  const safeDisplayName = displayName || 'User';

  // Preload image when avatar changes
  useEffect(() => {
    if (avatar?.type && (avatar.type === 'url' || avatar.type === 'dicebear') && avatar.value) {
      preloadImage(avatar.value);
    }
  }, [avatar?.type, avatar?.value]);
  
  // If image fails to load or no avatar is provided, fall back to initials
  if (hasImageError || !avatar || !avatar.type) {
    // Get initials from name
    const initials = AvatarService.getInitials(safeDisplayName);
    const bgColor = avatar?.color || generateColorFromName(safeDisplayName);
    
    // Return initial avatar with background color
    return (
      <View 
        style={[
          { 
            width: sizeInPx, 
            height: sizeInPx, 
            borderRadius: sizeInPx / 2,
            backgroundColor: bgColor,
            alignItems: 'center',
            justifyContent: 'center'
          },
          style
        ]}
      >
        <Text 
          style={[
            { 
              color: 'white', 
              fontSize: sizeInPx * 0.4,
              fontWeight: 'bold' 
            },
            textStyle
          ]}
        >
          {initials}
        </Text>
      </View>
    );
  }
  
  // Handle DiceBear avatars - always use Image for now
  if (avatar.type === 'dicebear' && avatar.value) {
    return (
      <View
        style={[
          {
            width: sizeInPx,
            height: sizeInPx,
            borderRadius: sizeInPx / 2,
            backgroundColor: 'white',
            overflow: 'hidden',
          },
          style
        ]}
      >
        <Image
          source={{ uri: avatar.value, cache: 'force-cache' }}
          style={[
            { 
              width: '100%', 
              height: '100%',
              backgroundColor: 'white'
            },
            imageStyle
          ]}
          onError={() => setHasImageError(true)}
        />
      </View>
    );
  }
  
  // Handle URL avatars - always use Image for now
  if (avatar.type === 'url' && avatar.value) {
    return (
      <View
        style={[
          {
            width: sizeInPx,
            height: sizeInPx,
            borderRadius: sizeInPx / 2,
            backgroundColor: 'white',
            overflow: 'hidden',
          },
          style
        ]}
      >
        <Image
          source={{ uri: avatar.value, cache: 'force-cache' }}
          style={[
            { 
              width: '100%', 
              height: '100%',
              backgroundColor: 'white'
            },
            imageStyle
          ]}
          onError={() => setHasImageError(true)}
        />
      </View>
    );
  }
  
  // Handle initial avatars
  if (avatar.type === 'initial') {
    const bgColor = avatar.color || AvatarService.generateColorFromName(safeDisplayName);
    const initials = AvatarService.getInitials(safeDisplayName);
    
    return (
      <View 
        style={[
          { 
            width: sizeInPx, 
            height: sizeInPx, 
            borderRadius: sizeInPx / 2,
            backgroundColor: bgColor,
            alignItems: 'center',
            justifyContent: 'center'
          },
          style
        ]}
      >
        <Text 
          style={[
            { 
              color: 'white', 
              fontSize: sizeInPx * 0.4,
              fontWeight: 'bold' 
            },
            textStyle
          ]}
        >
          {initials}
        </Text>
      </View>
    );
  }
  
  // Fallback for unknown avatar types
  return (
    <View 
      style={[
        { 
          width: sizeInPx, 
          height: sizeInPx, 
          borderRadius: sizeInPx / 2,
          backgroundColor: '#CBD5E1',
          alignItems: 'center',
          justifyContent: 'center'
        },
        style
      ]}
    >
      <Text 
        style={[
          { 
            color: 'white', 
            fontSize: sizeInPx * 0.4,
            fontWeight: 'bold' 
          },
          textStyle
        ]}
      >
        {AvatarService.getInitials(safeDisplayName)}
      </Text>
    </View>
  );
};

export default memo(Avatar, (prevProps, nextProps) => {
  // Memoization check - this is important for performance
  const prevAvatarValue = prevProps.avatar?.value;
  const nextAvatarValue = nextProps.avatar?.value;
  
  const prevAvatarType = prevProps.avatar?.type;
  const nextAvatarType = nextProps.avatar?.type;
  
  return (
    prevProps.displayName === nextProps.displayName &&
    prevProps.size === nextProps.size &&
    prevAvatarType === nextAvatarType &&
    prevAvatarValue === nextAvatarValue &&
    JSON.stringify(prevProps.style) === JSON.stringify(nextProps.style) &&
    JSON.stringify(prevProps.textStyle) === JSON.stringify(nextProps.textStyle) &&
    JSON.stringify(prevProps.imageStyle) === JSON.stringify(nextProps.imageStyle)
  );
});