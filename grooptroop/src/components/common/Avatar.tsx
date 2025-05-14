import React from 'react';
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
  console.log(`[AVATAR_COMP] Rendering avatar for ${displayName || 'unknown'}, type: ${avatar?.type || 'none'}`);
  
  // Handle image avatar
  if (avatar?.type === 'image' && avatar.value) {
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
        onError={(e) => console.error('[AVATAR_COMP] Error loading image:', e.nativeEvent.error)}
      />
    );
  }
  

  console.log(`[AVATAR_RENDER] Rendering avatar for ${displayName || 'unknown user'}`);
console.log(`[AVATAR_RENDER] Avatar data:`, avatar ? JSON.stringify(avatar).substring(0, 100) + '...' : 'null');
console.log(`[AVATAR_RENDER] Avatar type: ${avatar?.type || 'none'}`);

  // Handle bitmoji avatar (future implementation)
  if (avatar?.type === 'bitmoji' && avatar.value) {
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
        onError={(e) => console.error('[AVATAR_COMP] Error loading bitmoji:', e.nativeEvent.error)}
      />
    );
  }
  
  // Handle initial avatar (default)
  console.log('[AVATAR_COMP] Rendering initial avatar');
  const initials = avatar?.type === 'initial' ? avatar.value : AvatarService.getInitials(displayName);
  const bgColor = avatar?.type === 'initial' ? avatar.color : avatar?.color || '#7C3AED';
  
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