import React, { useState } from 'react';
import { View, Text, Image, StyleSheet } from 'react-native';
import { UserAvatar } from '../../contexts/AuthProvider';
import { AvatarService } from '../../services/AvatarService';

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
  displayName, 
  size = 40, 
  style,
  textStyle,
  imageStyle
}) => {
  // Add this state to track image loading errors
  const [hasImageError, setHasImageError] = useState(false);
  
  console.log(`[AVATAR_COMP] Rendering avatar for ${displayName || 'unknown'}, type: ${avatar?.type || 'none'}`);
  
  // If image fails to load or no avatar is provided, fall back to initials
  if (hasImageError || !avatar) {
    console.log('[AVATAR_COMP] Using fallback initials avatar due to error or missing avatar');
    const initials = AvatarService.getInitials(displayName || '');
    const bgColor = '#7C3AED'; // Default purple
    
    return (
      <View
        style={[
          styles.initialContainer,
          { 
            width: size, 
            height: size, 
            borderRadius: size / 2,
            backgroundColor: bgColor
          },
          style
        ]}
      >
        <Text 
          style={[
            styles.initialText, 
            { fontSize: size * 0.4 },
            textStyle
          ]}
        >
          {initials}
        </Text>
      </View>
    );
  }
  
  // Handle image avatar
  if (avatar.type === 'image' && avatar.value) {
    console.log('[AVATAR_COMP] Rendering image avatar');
    return (
      <Image
        source={{ uri: avatar.value }}
        style={[
          styles.image,
          { width: size, height: size, borderRadius: size / 2 },
          imageStyle,
          style
        ]}
        onError={(e) => {
          console.error('[AVATAR_COMP] Error loading image:', e.nativeEvent.error);
          setHasImageError(true);
        }}
      />
    );
  }

  // Handle bitmoji avatar
  if (avatar.type === 'bitmoji' && avatar.value) {
    console.log('[AVATAR_COMP] Rendering bitmoji avatar');
    return (
      <Image
        source={{ uri: avatar.value }}
        style={[
          styles.image,
          { width: size, height: size, borderRadius: size / 2 },
          imageStyle,
          style
        ]}
        onError={(e) => {
          console.error('[AVATAR_COMP] Error loading bitmoji:', e.nativeEvent.error);
          setHasImageError(true);
        }}
      />
    );
  }
  
  // Handle DiceBear avatar
  if (avatar.type === 'dicebear') {
    console.log('[AVATAR_COMP] Rendering DiceBear avatar');
    
    // Convert the URL to PNG format if it's SVG for better compatibility
    const imageUrl = avatar.value.includes('svg') 
      ? avatar.value.replace('/svg?', '/png?') 
      : avatar.value;
    
    console.log('[AVATAR_COMP] Using DiceBear URL:', imageUrl.substring(0, 50) + '...');
        
    return (
      <Image
        source={{ uri: imageUrl }}
        style={[
          styles.image,
          { width: size, height: size, borderRadius: size / 2 },
          imageStyle,
          style
        ]}
        onError={(e) => {
          console.error('[AVATAR_COMP] Error loading DiceBear avatar:', e.nativeEvent.error);
          setHasImageError(true);
        }}
      />
    );
  }
  
  // Handle initial avatar (default)
  console.log('[AVATAR_COMP] Rendering initial avatar');
  const initials = avatar.type === 'initial' ? avatar.value : AvatarService.getInitials(displayName || '');
  const bgColor = avatar.type === 'initial' ? avatar.color : '#7C3AED';
  
  return (
    <View
      style={[
        styles.initialContainer,
        { 
          width: size, 
          height: size, 
          borderRadius: size / 2,
          backgroundColor: bgColor
        },
        style
      ]}
    >
      <Text 
        style={[
          styles.initialText, 
          { fontSize: size * 0.4 },
          textStyle
        ]}
      >
        {initials}
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

export default Avatar;