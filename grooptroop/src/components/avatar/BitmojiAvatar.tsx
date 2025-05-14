import React, { useState } from 'react';
import { Image, View, Text, StyleSheet } from 'react-native';
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
    <Image
      source={{ uri: url }}
      style={{ width: size, height: size, borderRadius: size/2 }}
      onError={() => setHasError(true)}
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