import React, { useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import FastImage from 'react-native-fast-image';
import { AvatarService } from '../../services/AvatarService';

interface BitmojiAvatarProps {
  url: string;
  displayName?: string;
  size?: number;
  color?: string;
}

const BitmojiAvatar = ({ url, displayName, size = 120, color = '#7C3AED' }: BitmojiAvatarProps) => {
  const [hasError, setHasError] = useState(false);
  
  if (hasError) {
    // Show initials if image failed to load
    return (
      <View 
        style={[
          styles.fallbackContainer, 
          { width: size, height: size, borderRadius: size/2, backgroundColor: color }
        ]}
      >
        <Text style={[styles.fallbackText, { fontSize: size * 0.4 }]}>
          {AvatarService.getInitials(displayName)}
        </Text>
      </View>
    );
  }
  
  return (
    <FastImage
      source={{ uri: url }}
      style={{ width: size, height: size, borderRadius: size/2 }}
      onError={() => setHasError(true)}
      priority={FastImage.priority.low}
      resizeMode={FastImage.resizeMode.cover}
      cacheControl={FastImage.cacheControl.immutable}
    />
  );
};

const styles = StyleSheet.create({
  fallbackContainer: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  fallbackText: {
    color: 'white',
    fontWeight: 'bold',
  }
});

export default BitmojiAvatar;