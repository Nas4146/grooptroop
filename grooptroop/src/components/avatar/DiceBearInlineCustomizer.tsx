import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { AvatarService, DICEBEAR_STYLES, STYLE_PARAMETERS } from '../../services/AvatarService';
import tw from 'twrnc';

interface DiceBearInlineCustomizerProps {
  initialSeed?: string;
  initialStyle?: string;
  initialParams?: Record<string, any>;
  onAvatarChange?: (seed: string, style: string, params: Record<string, any>, url: string) => void;
}

const DiceBearInlineCustomizer: React.FC<DiceBearInlineCustomizerProps> = ({
  initialSeed = '',
  initialStyle = DICEBEAR_STYLES[0].id,
  initialParams = {},
  onAvatarChange,
}) => {
  const [style, setStyle] = useState(initialStyle);
  const [seed, setSeed] = useState(initialSeed || 'user-' + Math.floor(Math.random() * 10000));
  const [params, setParams] = useState<Record<string, any>>(initialParams);
  const [url, setUrl] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [activeSection, setActiveSection] = useState<string | null>(null);
  
  const styleParams = STYLE_PARAMETERS[style as keyof typeof STYLE_PARAMETERS] || {};
  
  // Helper function to update avatar URL
  const updateAvatarUrl = (newSeed: string, newStyle: string, newParams: Record<string, any> = {}) => {
    console.log(`[DICEBEAR_INLINE] Updating avatar: style=${newStyle}, seed=${newSeed}`, newParams);
    setLoading(true);
    
    try {
      // Using PNG format explicitly for better compatibility
      const newUrl = AvatarService.getDiceBearAvatarUrl(newSeed, newStyle, 256, newParams);
      
      setUrl(newUrl);
      setParams(newParams);
      
      // Notify parent component if callback is provided
      if (onAvatarChange) {
        onAvatarChange(newSeed, newStyle, newParams, newUrl);
      }
    } catch (error) {
      console.error('[DICEBEAR_INLINE] Error updating avatar URL:', error);
      // Use a fallback style if there's an error
      if (newStyle !== 'bottts') {
        updateAvatarUrl(newSeed, 'bottts', {});
      }
    } finally {
      setLoading(false);
    }
  };
  
  useEffect(() => {
    console.log('[DICEBEAR_INLINE] Component mounted');
    updateAvatarUrl(seed, style, params);
  }, []);
  
  // Handle style selection
  const handleStyleSelect = (newStyle: string) => {
    console.log(`[DICEBEAR_INLINE] Style selected: ${newStyle}`);
    if (newStyle === style) return;
    
    setStyle(newStyle);
    
    // Generate new random params for this style
    const newParams = AvatarService.getRandomStyleParams(newStyle);
    
    // Update avatar with the new style
    updateAvatarUrl(seed, newStyle, newParams);
  };
  
  // Generate a random avatar
  const handleRandomize = () => {
    console.log('[DICEBEAR_INLINE] Randomizing avatar');
    
    // Gen Z-friendly seed words
    const seedWords = [
      'vibes', 'aesthetic', 'slay', 'based', 'fire', 'lit', 'mood',
      'drip', 'iconic', 'energy', 'chill', 'vibe', 'yeet', 'flex'
    ];
    
    const randomWord = seedWords[Math.floor(Math.random() * seedWords.length)];
    const randomSuffix = Math.floor(Math.random() * 10000).toString();
    const newSeed = `${randomWord}-${randomSuffix}`;
    
    console.log(`[DICEBEAR_INLINE] Generated random seed: ${newSeed}`);
    
    // Generate random params for current style
    const newParams = AvatarService.getRandomStyleParams(style);
    
    setSeed(newSeed);
    updateAvatarUrl(newSeed, style, newParams);
  };
  
  // Handle parameter changes
  const handleParamChange = (key: string, value: string | number) => {
    const newParams = { ...params, [key]: value };
    setParams(newParams);
    updateAvatarUrl(seed, style, newParams);
  };
  
  // Render style selection tabs
  const renderStyleTabs = () => {
    return (
      <ScrollView 
        horizontal 
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.styleTabsContainer}
      >
        {DICEBEAR_STYLES.map((styleOption) => (
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

  // Render color options for a parameter
  const renderColorOptions = (key: string, options: string[]) => {
    return (
      <View style={tw`mb-1`}>
        <View style={tw`flex-row flex-wrap`}>
          {options.map((color, index) => (
            <TouchableOpacity
              key={`${color}-${index}`} // Add index to ensure uniqueness
              style={[
                tw`w-6 h-6 rounded-full mr-1.5 mb-1.5 border border-slate-200`,
                params[key] === color && tw`border-2 border-violet-600`,
                { backgroundColor: `#${color}` }
              ]}
              onPress={() => handleParamChange(key, color)}
            />
          ))}
        </View>
      </View>
    );
  };
  
  // Render numeric options
  const renderNumericOptions = (key: string, options: number[]) => {
    return (
      <View style={tw`flex-row flex-wrap mb-1`}>
        {options.map((option) => (
          <TouchableOpacity
            key={option}
            style={[
              tw`px-2 py-1 rounded-md mr-1.5 mb-1.5 border`,
              params[key] === option ? tw`bg-violet-100 border-violet-600` : tw`bg-slate-50 border-slate-200`
            ]}
            onPress={() => handleParamChange(key, option)}
          >
            <Text 
              style={params[key] === option ? tw`text-violet-700 font-medium text-xs` : tw`text-slate-700 text-xs`}
            >
              {option}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
    );
  };
  
  // Render string options
  const renderStringOptions = (key: string, options: string[]) => {
    return (
      <View style={tw`mb-1`}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          <View style={tw`flex-row flex-wrap`}>
            {options.map((option, index) => (
              <TouchableOpacity
                key={`${option}-${index}`} // Add index to ensure uniqueness
                style={[
                  tw`px-2 py-1 rounded-md mr-1.5 mb-1.5 border`,
                  params[key] === option ? tw`bg-violet-100 border-violet-600` : tw`bg-slate-50 border-slate-200`
                ]}
                onPress={() => handleParamChange(key, option)}
              >
                <Text 
                  style={[
                    params[key] === option ? tw`text-violet-700 font-medium text-xs` : tw`text-slate-700 text-xs`,
                    tw`max-w-[100px]`
                  ]}
                  numberOfLines={1}
                >
                  {option}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </ScrollView>
      </View>
    );
  };
  
  // Render customization controls for the current style
  const renderCustomizationOptions = () => {
    if (!styleParams) return null;
    
    const optionKeys = Object.keys(styleParams);
    if (optionKeys.length === 0) return null;
    
    return (
      <>
        {optionKeys.map(key => {
          const options = styleParams[key as keyof typeof styleParams];
          if (!options || options.length === 0) return null;
          
          const isExpanded = activeSection === key;
          const formattedName = key.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase());
          
          // Check the first item to determine the type
          const firstOption = options[0];
          
          return (
            <View key={key} style={tw`mb-2 rounded-lg border border-slate-200 overflow-hidden bg-slate-50`}>
              <TouchableOpacity
                style={tw`flex-row justify-between items-center px-2 py-2`}
                onPress={() => setActiveSection(isExpanded ? null : key)}
              >
                <Text style={tw`text-xs font-medium text-slate-700`}>{formattedName}</Text>
                <Ionicons 
                  name={isExpanded ? "chevron-up" : "chevron-down"} 
                  size={16} 
                  color="#64748b" 
                />
              </TouchableOpacity>
              
              {isExpanded && (
                <View style={tw`px-2 py-2 bg-white`}>
                  {typeof firstOption === 'number' && renderNumericOptions(key, options as number[])}
                  {typeof firstOption === 'string' && firstOption.match(/^[0-9A-Fa-f]{6}$/) && renderColorOptions(key, options as string[])}
                  {typeof firstOption === 'string' && !firstOption.match(/^[0-9A-Fa-f]{6}$/) && renderStringOptions(key, options as string[])}
                </View>
              )}
            </View>
          );
        })}
      </>
    );
  };
  
  // Update the return section to remove the duplicate title and make the layout more compact
  return (
    <View style={tw`w-full bg-indigo-50 rounded-lg p-3`}>
      <View style={tw`flex-row justify-between items-center mb-2`}>
        {/* Avatar Preview */}
        <View style={tw`w-[90px] h-[90px] rounded-full bg-slate-100 overflow-hidden border-2 border-white shadow-sm items-center justify-center`}>
          {loading ? (
            <ActivityIndicator size="large" color="#7C3AED" style={tw`absolute`} />
          ) : url ? (
            <Image 
              source={{ uri: url }} 
              style={tw`w-full h-full`}
              onError={(e) => {
                console.error('[DICEBEAR_INLINE] Error loading preview:', e.nativeEvent.error);
                setUrl(`https://api.dicebear.com/9.x/bottts/png?seed=${seed}&size=256`);
              }}
            />
          ) : (
            <View style={tw`w-full h-full bg-violet-600 items-center justify-center`}>
              <Text style={tw`text-white text-3xl font-bold`}>
                {seed.slice(0, 2).toUpperCase()}
              </Text>
            </View>
          )}
        </View>
        
        {/* Random Button */}
        <TouchableOpacity 
          style={tw`flex-row items-center justify-center bg-violet-600 py-2 px-3 rounded-full shadow-sm mr-2`}
          onPress={handleRandomize}
        >
          <Ionicons name="shuffle" size={16} color="#ffffff" />
          <Text style={tw`text-white font-semibold ml-1.5 text-sm`}>Random</Text>
        </TouchableOpacity>
      </View>
      
      {/* Style Selection */}
      <Text style={tw`text-sm font-semibold text-slate-700 mb-1.5`}>Choose a Style</Text>
      <ScrollView 
        horizontal 
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={tw`flex-row py-1 pb-3 flex-wrap`}
      >
        {DICEBEAR_STYLES.map((styleOption) => (
          <TouchableOpacity 
            key={styleOption.id} 
            style={[
              tw`px-3 py-1.5 rounded-full mr-2 border mb-1`,
              style === styleOption.id ? tw`bg-violet-100 border-violet-600` : tw`bg-slate-100 border-slate-200`
            ]}
            onPress={() => handleStyleSelect(styleOption.id)}
          >
            <Text style={[
              tw`text-xs font-medium`,
              style === styleOption.id ? tw`text-violet-600` : tw`text-slate-700`
            ]}>
              {styleOption.name}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>
      
      {/* Customization Options in a Card with its own ScrollView */}
      <View style={tw`mt-1.5 bg-white rounded-lg border border-indigo-100 p-2 h-[140px] overflow-hidden`}>
        <Text style={tw`text-xs font-semibold text-slate-700 mb-1 px-0.5`}>Customize Your Avatar</Text>
        <ScrollView 
          style={tw`flex-1`}
          showsVerticalScrollIndicator={true}
          nestedScrollEnabled={true}
        >
          {renderCustomizationOptions()}
        </ScrollView>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    width: '100%',
    paddingBottom: 0, // Removed padding
  },
  topSection: {
    flexDirection: 'row',
    justifyContent: 'space-between', 
    alignItems: 'center',
    marginBottom: 8,
  },
  previewContainer: {
    width: 100, // Smaller size
    height: 100, // Smaller size
    borderRadius: 50,
    backgroundColor: '#f1f5f9',
    overflow: 'hidden',
    borderWidth: 3,
    borderColor: 'white',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    marginBottom: 0, // Removed margin
    justifyContent: 'center',
    alignItems: 'center',
  },
  previewLoader: {
    position: 'absolute',
  },
  previewImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  previewFallback: {
    width: '100%',
    height: '100%',
    backgroundColor: '#7C3AED',
    justifyContent: 'center',
    alignItems: 'center',
  },
  previewFallbackText: {
    color: 'white',
    fontSize: 32, // Smaller font
    fontWeight: 'bold',
  },
  randomizeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#7C3AED',
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 20,
    marginRight: 10,
    shadowColor: '#7C3AED',
    shadowOpacity: 0.3,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  randomizeText: {
    color: 'white',
    fontWeight: '600',
    fontSize: 14,
    marginLeft: 6,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#334155',
    marginBottom: 6, // Reduced margin
    marginTop: 4,
  },
  styleTabsContainer: {
    flexDirection: 'row',
    paddingVertical: 4, // Reduced padding
    paddingBottom: 8, // Reduced padding
    flexWrap: 'wrap',
  },
  styleTab: {
    paddingHorizontal: 8, // Smaller padding
    paddingVertical: 5, // Smaller padding
    marginRight: 6,
    marginBottom: 6,
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
    fontSize: 11, // Smaller font
    fontWeight: '500',
    color: '#64748b',
  },
  selectedStyleTabText: {
    color: '#7C3AED',
    fontWeight: '600',
  },
  
  // Customization card
  customizationCard: {
    marginTop: 6, // Reduced margin
    backgroundColor: '#FBFAFC',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    padding: 8, // Reduced padding
    paddingBottom: 4, // Reduced padding
    height: 180, // Reduced height
    overflow: 'hidden',
  },
  customizationTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: '#334155',
    marginBottom: 4, // Reduced margin
    paddingHorizontal: 2,
  },
  customizationScroll: {
    flex: 1,
  },
  customizationContainer: {
    paddingBottom: 8,
  },
  optionSection: {
    marginBottom: 6, // Reduced margin
    borderRadius: 8,
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    overflow: 'hidden',
  },
  optionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 8, // Reduced padding
    paddingVertical: 6, // Reduced padding
  },
  optionName: {
    fontSize: 12, // Smaller font
    fontWeight: '500',
    color: '#334155',
  },
  optionContent: {
    paddingHorizontal: 6,
    paddingBottom: 8, // Reduced padding
    paddingTop: 4, // Reduced padding
  },
  optionRow: {
    marginBottom: 6, // Reduced margin
    paddingLeft: 2,
  },
  colorOptionsContainer: {
    flexDirection: 'row',
    paddingVertical: 4, // Reduced padding
    paddingRight: 12,
    flexWrap: 'wrap',
  },
  stringOptionsContainer: {
    flexDirection: 'row',
    paddingVertical: 4, // Reduced padding
    paddingRight: 12,
    flexWrap: 'wrap',
  },
  colorOption: {
    width: 24, // Smaller size
    height: 24, // Smaller size
    borderRadius: 12,
    marginRight: 6, // Reduced margin
    marginBottom: 6,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  selectedColorOption: {
    borderWidth: 2, // Reduced border width
    borderColor: '#7C3AED',
  },
  buttonOption: {
    paddingHorizontal: 8, // Reduced padding
    paddingVertical: 4, // Reduced padding
    borderRadius: 12,
    marginRight: 6,
    marginBottom: 6,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    backgroundColor: '#f1f5f9',
    minWidth: 36, // Reduced width
    alignItems: 'center',
  },
  selectedButtonOption: {
    borderColor: '#7C3AED',
    backgroundColor: '#EDE9FE',
  },
  buttonText: {
    color: '#64748b',
    fontSize: 11, // Smaller font
    fontWeight: '400',
  },
  selectedButtonText: {
    color: '#7C3AED',
    fontWeight: '600',
    fontSize: 11, // Smaller font
  },
});

export default DiceBearInlineCustomizer;