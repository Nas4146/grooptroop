import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  ScrollView,
  Animated,
  Easing,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { AvatarService, DICEBEAR_STYLES } from '../../services/AvatarService';
import DiceBearCustomizeDialog from './DiceBearCustomizeDialog';

interface DiceBearSelectorProps {
  initialSeed?: string;
  initialStyle?: string;
  initialParams?: Record<string, any>;
  onAvatarChange?: (seed: string, style: string, params: Record<string, any>, url: string) => void;
}

const DiceBearSelector: React.FC<DiceBearSelectorProps> = ({
  initialSeed = '',
  initialStyle = DICEBEAR_STYLES[0].id,
  initialParams = {},
  onAvatarChange,
}) => {
  const [style, setStyle] = useState(initialStyle === 'adventurer' ? 'bottts' : initialStyle); // Default to bottts instead of adventurer
  const [seed, setSeed] = useState(initialSeed || 'user-' + Math.floor(Math.random() * 10000));
  const [params, setParams] = useState<Record<string, any>>(initialParams);
  const [url, setUrl] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [imageError, setImageError] = useState(false);
  const [customizeVisible, setCustomizeVisible] = useState(false);
  
  // Animation values
  const animation = useRef(new Animated.Value(0)).current;
  
  // Helper function to update avatar URL
  const updateAvatarUrl = (newSeed: string, newStyle: string, newParams: Record<string, any> = {}) => {
    console.log(`[DICEBEAR_SELECTOR] Updating avatar: style=${newStyle}, seed=${newSeed}`, newParams);
    setLoading(true);
    setImageError(false);
    
    try {
      // Don't use adventurer style as it's causing issues
      const safeStyle = newStyle === 'adventurer' ? 'bottts' : newStyle;
      
      // Using PNG format explicitly for better compatibility
      const newUrl = AvatarService.getDiceBearAvatarUrl(newSeed, safeStyle, 256, newParams);
      
      if (!newUrl || newUrl.trim() === '') {
        throw new Error('Generated URL is empty');
      }
      
      setUrl(newUrl);
      setStyle(safeStyle); // Update the style state if we changed it for safety
      setParams(newParams);
      
      // Notify parent component if callback is provided
      if (onAvatarChange) {
        onAvatarChange(newSeed, safeStyle, newParams, newUrl);
      }
    } catch (error) {
      console.error('[DICEBEAR_SELECTOR] Error updating avatar URL:', error);
      setImageError(true);
      
      // If error occurs, try with bottts style as fallback
      if (newStyle !== 'bottts') {
        console.log('[DICEBEAR_SELECTOR] Using bottts style as fallback');
        updateAvatarUrl(newSeed, 'bottts', {});
      }
    } finally {
      setLoading(false);
    }
  };
  
  // Start animation when component mounts
  useEffect(() => {
    console.log('[DICEBEAR_SELECTOR] Component mounted');
    
    Animated.timing(animation, {
      toValue: 1,
      duration: 500,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true
    }).start();
    
    // Generate initial URL
    updateAvatarUrl(seed, style, params);
  }, []);
  
  // Animation styles
  const animatedStyles = {
    opacity: animation,
    transform: [
      { 
        translateY: animation.interpolate({
          inputRange: [0, 1],
          outputRange: [30, 0]
        })
      }
    ]
  };
  
  // Handle style selection
  const handleStyleSelect = (newStyle: string) => {
    console.log(`[DICEBEAR_SELECTOR] Style selected: ${newStyle}`);
    if (newStyle === style) return;
    
    // Skip adventurer style
    if (newStyle === 'adventurer') {
      console.log('[DICEBEAR_SELECTOR] Skipping adventurer style due to known issues');
      return;
    }
    
    // Generate new random params for this style
    const newParams = AvatarService.getRandomStyleParams(newStyle);
    
    // Update avatar with the new style
    updateAvatarUrl(seed, newStyle, newParams);
  };
  
  // Generate a random avatar
  const handleRandomize = () => {
    console.log('[DICEBEAR_SELECTOR] Randomizing avatar');
    
    // Gen Z-friendly seed words
    const seedWords = [
      'vibes', 'aesthetic', 'slay', 'based', 'fire', 'lit', 'mood',
      'drip', 'iconic', 'energy', 'chill', 'vibe', 'yeet', 'flex'
    ];
    
    const randomWord = seedWords[Math.floor(Math.random() * seedWords.length)];
    const randomSuffix = Math.floor(Math.random() * 10000).toString();
    const newSeed = `${randomWord}-${randomSuffix}`;
    
    console.log(`[DICEBEAR_SELECTOR] Generated random seed: ${newSeed}`);
    
    // Generate random params for current style
    const newParams = AvatarService.getRandomStyleParams(style);
    
    setSeed(newSeed);
    updateAvatarUrl(newSeed, style, newParams);
  };
  
  // Custom seed input
  const handleSeedChange = (text: string) => {
    // Remove spaces and special characters
    const cleanSeed = text.toLowerCase().replace(/[^a-z0-9-]/g, '-');
    console.log(`[DICEBEAR_SELECTOR] Seed changed: ${cleanSeed}`);
    
    setSeed(cleanSeed);
    updateAvatarUrl(cleanSeed, style, params);
  };

  // Handle customization dialog apply
  const handleCustomizeApply = (newParams: Record<string, any>) => {
    setCustomizeVisible(false);
    setParams(newParams);
    updateAvatarUrl(seed, style, newParams);
  };

  // Render style selection tabs
  const renderStyleTabs = () => {
    // Filter out the adventurer style since it's causing issues
    const filteredStyles = DICEBEAR_STYLES.filter(s => s.id !== 'adventurer');
    
    return (
      <ScrollView 
        horizontal 
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.styleTabsContainer}
      >
        {filteredStyles.map((styleOption) => (
          <TouchableOpacity 
            key={styleOption.id} 
            style={[
              styles.styleTab,
              style === styleOption.id && styles.selectedStyleTab
            ]}
            onPress={() => handleStyleSelect(styleOption.id)}
          >
            <Text style={[
              styles.styleTabText,
              style === styleOption.id && styles.selectedStyleTabText
            ]}>
              {styleOption.name}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>
    );
  };

  return (
    <Animated.View style={[styles.dicebearContainer, animatedStyles]}>
      {/* Current Avatar Preview */}
      <View style={styles.dicebearPreview}>
        {loading ? (
          <ActivityIndicator size="large" color="#7C3AED" style={styles.previewLoader} />
        ) : url ? (
          <Image 
            source={{ uri: url }} 
            style={styles.dicebearPreviewImage}
            onError={(e) => {
              console.error('[DICEBEAR_SELECTOR] Error loading preview:', e.nativeEvent.error);
              setLoading(false);
              // Use bottts as a fallback image
              setUrl(`https://api.dicebear.com/9.x/bottts/png?seed=${seed}&size=256`);
            }}
          />
        ) : (
          <View style={styles.dicebearPreviewFallback}>
            <Text style={styles.dicebearPreviewFallbackText}>
              {seed.slice(0, 2).toUpperCase()}
            </Text>
          </View>
        )}
      </View>
      
      {/* Style Selection */}
      <Text style={styles.dicebearSectionTitle}>Choose a Style</Text>
      {renderStyleTabs()}
      
      {/* Customize Button - New feature for avatar customization */}
      <View style={styles.customizeButtonWrapper}>
        <TouchableOpacity
          style={styles.customizeButton}
          onPress={() => setCustomizeVisible(true)}
        >
          <Ionicons name="options-outline" size={16} color="#7C3AED" />
          <Text style={styles.customizeButtonText}>Customize Avatar</Text>
        </TouchableOpacity>
      </View>
      
      {/* Controls - Fix the layout with better spacing */}
      <View style={styles.controlsContainer}>
        <View style={styles.dicebearControls}>
          <TouchableOpacity 
            style={styles.dicebearRandomButton}
            onPress={handleRandomize}
          >
            <Ionicons name="shuffle" size={18} color="#ffffff" />
            <Text style={styles.dicebearRandomButtonText}>Random</Text>
          </TouchableOpacity>
        </View>
        
        <View style={styles.seedContainer}>
          <Text style={styles.dicebearSeedLabel}>Your Seed</Text>
          <TextInput
            style={styles.dicebearSeedInput}
            value={seed}
            onChangeText={handleSeedChange}
            placeholder="Enter a seed word"
            placeholderTextColor="#a1a1aa"
          />
        </View>
      </View>
      
      {/* Customization Dialog - New feature for avatar customization */}
      <DiceBearCustomizeDialog
        visible={customizeVisible}
        style={style}
        seed={seed}
        currentParams={params}
        onClose={() => setCustomizeVisible(false)}
        onApply={handleCustomizeApply}
      />
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  dicebearContainer: {
    width: '100%',
    alignItems: 'center',
    paddingBottom: 40, // Increase padding at bottom to ensure everything is visible
  },
  dicebearPreview: {
    width: 150,
    height: 150,
    borderRadius: 75,
    backgroundColor: '#f1f5f9',
    overflow: 'hidden',
    borderWidth: 3,
    borderColor: 'white',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    marginBottom: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  previewLoader: {
    position: 'absolute',
  },
  dicebearPreviewImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  dicebearSectionTitle: {
    alignSelf: 'flex-start',
    fontSize: 16,
    fontWeight: '600',
    color: '#334155',
    marginVertical: 10,
  },
  styleTabsContainer: {
    flexDirection: 'row',
    paddingVertical: 6,
  },
  styleTab: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    marginRight: 8,
    borderRadius: 16,
    backgroundColor: '#f1f5f9',
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  selectedStyleTab: {
    backgroundColor: '#EDE9FE',
    borderColor: '#7C3AED',
  },
  styleTabText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#64748b',
  },
  selectedStyleTabText: {
    color: '#7C3AED',
    fontWeight: '600',
  },
  // New style for better layout
  controlsContainer: {
    width: '100%',
    marginTop: 16,
  },
  dicebearControls: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16, // Add space between random button and seed input
  },
  dicebearRandomButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#7C3AED',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 8,
    marginRight: 10,
    shadowColor: '#7C3AED',
    shadowOpacity: 0.3,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  dicebearRandomButtonText: {
    color: 'white',
    fontWeight: '600',
    fontSize: 14,
    marginLeft: 6,
  },
  // New container for seed input
  seedContainer: {
    width: '100%',
  },
  dicebearSeedLabel: {
    fontSize: 12,
    color: '#64748b',
    marginBottom: 4,
  },
  dicebearSeedInput: {
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 8, // Slightly increase padding for better touch targets
    fontSize: 14,
    backgroundColor: '#f8fafc',
  },
  dicebearPreviewFallback: {
    width: '100%',
    height: '100%',
    backgroundColor: '#7C3AED',
    justifyContent: 'center',
    alignItems: 'center',
  },
  dicebearPreviewFallbackText: {
    color: 'white',
    fontSize: 48,
    fontWeight: 'bold',
  },
  // New styles for customization button
  customizeButtonWrapper: {
    alignItems: 'center',
    marginVertical: 16,
  },
  customizeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 20,
    backgroundColor: '#EDE9FE',
    borderWidth: 1,
    borderColor: '#7C3AED',
  },
  customizeButtonText: {
    color: '#7C3AED',
    fontWeight: '600',
    marginLeft: 6,
  },
});

export default DiceBearSelector;