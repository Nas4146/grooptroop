import { useState, useEffect } from 'react';
import { Keyboard, KeyboardEvent, Platform } from 'react-native';
import { useSharedValue, withTiming, useAnimatedStyle, runOnJS } from 'react-native-reanimated';

interface KeyboardControllerOptions {
  // Animation duration in ms
  animationDuration?: number;
  // Whether to include bottom inset in the height
  includeInsets?: boolean;
  // Bottom inset value
  bottomInset?: number;
}

export default function useKeyboardController(options: KeyboardControllerOptions = {}) {
  // Default options
  const {
    animationDuration = 250,
    includeInsets = true,
    bottomInset = 0
  } = options;
  
  // Keyboard metrics state
  const [keyboardHeight, setKeyboardHeight] = useState(0);
  const [keyboardVisible, setKeyboardVisible] = useState(false);
  const [keyboardAnimating, setKeyboardAnimating] = useState(false);
  
  // Animated values for smooth transitions
  const animatedKeyboardHeight = useSharedValue(0);
  const animatedKeyboardVisible = useSharedValue(0); // 0 = hidden, 1 = visible
  
  // Handle keyboard events
  useEffect(() => {
    // Create keyboard event handlers
    function onKeyboardShow(event: KeyboardEvent) {
      const height = event.endCoordinates.height;
      const adjustedHeight = includeInsets ? height - bottomInset : height;
      
      // Update raw values
      setKeyboardHeight(adjustedHeight);
      setKeyboardVisible(true);
      setKeyboardAnimating(true);
      
      // Animate values
      animatedKeyboardHeight.value = withTiming(adjustedHeight, {
        duration: animationDuration
      }, () => {
        runOnJS(setKeyboardAnimating)(false);
      });
      
      animatedKeyboardVisible.value = withTiming(1, {
        duration: animationDuration
      });
    }
    
    function onKeyboardHide() {
      // Update raw values
      setKeyboardVisible(false);
      setKeyboardAnimating(true);
      
      // Animate values
      animatedKeyboardHeight.value = withTiming(0, {
        duration: animationDuration
      }, () => {
        runOnJS(setKeyboardAnimating)(false);
        runOnJS(setKeyboardHeight)(0);
      });
      
      animatedKeyboardVisible.value = withTiming(0, {
        duration: animationDuration
      });
    }
    
    // Define the correct event names based on platform
    const showEvent = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
    const hideEvent = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';
    
    // Add listeners
    const showSubscription = Keyboard.addListener(showEvent, onKeyboardShow);
    const hideSubscription = Keyboard.addListener(hideEvent, onKeyboardHide);
    
    // Clean up listeners
    return () => {
      showSubscription.remove();
      hideSubscription.remove();
    };
  }, [animationDuration, bottomInset, includeInsets]);
  
  // Create animated styles for content and input container
  const keyboardSpacerStyle = useAnimatedStyle(() => {
    return {
      height: animatedKeyboardHeight.value,
    };
  });
  
  const inputContainerStyle = useAnimatedStyle(() => {
    return {
      transform: [{ translateY: -animatedKeyboardHeight.value }],
    };
  });
  
  // Helper function to dismiss keyboard
  const dismissKeyboard = () => {
    Keyboard.dismiss();
  };
  
  return {
    // Raw values
    keyboardHeight,
    keyboardVisible,
    keyboardAnimating,
    
    // Animated values
    animatedKeyboardHeight,
    animatedKeyboardVisible,
    
    // Animated styles
    keyboardSpacerStyle,
    inputContainerStyle,
    
    // Helpers
    dismissKeyboard
  };
}