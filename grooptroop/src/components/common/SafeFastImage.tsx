import React, { useState, useEffect } from 'react';
import { Image, Platform } from 'react-native';
import FastImage from 'react-native-fast-image';

// Global state to track FastImage availability
const FastImageState = {
  isAvailable: true,
  hasChecked: false
};

// Helper function to safely check if FastImage works
export const checkFastImageAvailability = () => {
  if (FastImageState.hasChecked) return FastImageState.isAvailable;
  
  try {
    // Simple check if the module is properly initialized
    if (FastImage && 
        FastImage.priority && 
        FastImage.resizeMode && 
        typeof FastImage.preload === 'function') {
      FastImageState.isAvailable = true;
    } else {
      FastImageState.isAvailable = false;
    }
  } catch (e) {
    FastImageState.isAvailable = false;
    console.warn('FastImage not available:', e.message);
  } finally {
    FastImageState.hasChecked = true;
  }
  
  return FastImageState.isAvailable;
};

// Safe FastImage component with automatic fallback
const SafeFastImage = (props) => {
  const [fallback, setFallback] = useState(!checkFastImageAvailability());

  if (fallback) {
    return (
      <Image
        {...props}
        resizeMode={props.resizeMode?.toString() || 'cover'}
      />
    );
  }

  return (
    <FastImage
      {...props}
      onError={(e) => {
        setFallback(true);
        if (props.onError) props.onError(e);
      }}
    />
  );
};

export default SafeFastImage;