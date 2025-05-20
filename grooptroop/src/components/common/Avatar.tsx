import React, { useState, memo } from 'react';
import { View, Text, Image, StyleSheet } from 'react-native';
import { UserAvatar } from '../../contexts/AuthProvider';
import { AvatarService } from '../../services/AvatarService';

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
  displayName = '', // Provide default empty string
  size = 40, 
  style,
  textStyle,
  imageStyle
}) => {
  // Debug log to see what props are being passed
  if (__DEV__) {
    console.log(`[AVATAR_COMP] Rendering avatar for ${displayName || 'unknown'}, type: ${avatar?.type || 'none'}`);
  }
  
  // Add this state to track image loading errors
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
  
  // Handle DiceBear avatars
  if (avatar.type === 'dicebear' && avatar.value) {
    // Container with shadow
    return (
      <View 
        style={[
          { 
            width: sizeInPx, 
            height: sizeInPx, 
            borderRadius: sizeInPx / 2,
            backgroundColor: 'white',
            overflow: 'hidden',
            // Apply shadow to container instead of image
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 1 },
            shadowOpacity: 0.1,
            shadowRadius: 1,
            elevation: 2
          },
          style
        ]}
      >
        {/* Image with no shadow */}
        <Image
          source={{ uri: avatar.value }}
          style={[
            { 
              width: '100%', 
              height: '100%',
              backgroundColor: 'white' // Ensure image has opaque background
            },
            imageStyle
          ]}
          onError={() => setHasImageError(true)}
        />
      </View>
    );
  }
  
  // Handle URL avatars
  if (avatar.type === 'url' && avatar.value) {
    // Container with shadow
    return (
      <View 
        style={[
          { 
            width: sizeInPx, 
            height: sizeInPx, 
            borderRadius: sizeInPx / 2,
            backgroundColor: 'white',
            overflow: 'hidden',
            // Apply shadow to container instead of image
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 1 },
            shadowOpacity: 0.1,
            shadowRadius: 1,
            elevation: 2
          },
          style
        ]}
      >
        {/* Image with no shadow */}
        <Image
          source={{ uri: avatar.value }}
          style={[
            { 
              width: '100%', 
              height: '100%',
              backgroundColor: 'white' // Ensure image has opaque background
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

const styles = StyleSheet.create({
  image: {
    overflow: 'hidden',
  },
  initialContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  initialText: {
    color: 'white',
    fontWeight: 'bold',
  }
});

export default memo(Avatar, (prevProps, nextProps) => {
  // Check if avatar is the same
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