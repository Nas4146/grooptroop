import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  ScrollView,
  Image,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { AvatarService, STYLE_PARAMETERS } from '../../services/AvatarService';

interface DiceBearCustomizeDialogProps {
  visible: boolean;
  style: string;
  seed: string;
  currentParams: Record<string, any>;
  onClose: () => void;
  onApply: (params: Record<string, any>) => void;
}

const DiceBearCustomizeDialog: React.FC<DiceBearCustomizeDialogProps> = ({
  visible,
  style,
  seed,
  currentParams,
  onClose,
  onApply,
}) => {
  const [params, setParams] = useState<Record<string, any>>({ ...currentParams });
  const [previewUrl, setPreviewUrl] = useState<string>('');
  
  // Get available options for this style
  const styleParams = STYLE_PARAMETERS[style as keyof typeof STYLE_PARAMETERS] || {};
  
  useEffect(() => {
    if (visible) {
      updatePreview();
    }
  }, [visible, params]);
  
  // Update the preview URL when parameters change
  const updatePreview = () => {
    const url = AvatarService.getDiceBearAvatarUrl(seed, style, 256, params);
    setPreviewUrl(url);
  };
  
  // Handle parameter changes
  const handleParamChange = (key: string, value: string | number) => {
    setParams(prev => ({ ...prev, [key]: value }));
  };
  
  // Render color options
  const renderColorOptions = (key: string, options: string[]) => {
    return (
      <View style={styles.optionSection}>
        <Text style={styles.optionTitle}>
          {key.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase())}
        </Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          <View style={styles.colorOptions}>
            {options.map((color) => (
              <TouchableOpacity
                key={color}
                style={[
                  styles.colorOption,
                  { backgroundColor: `#${color}` },
                  params[key] === color && styles.selectedColorOption
                ]}
                onPress={() => handleParamChange(key, color)}
              />
            ))}
          </View>
        </ScrollView>
      </View>
    );
  };
  
  // Render numeric options
  const renderNumericOptions = (key: string, options: number[]) => {
    return (
      <View style={styles.optionSection}>
        <Text style={styles.optionTitle}>
          {key.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase())}
        </Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          <View style={styles.buttonOptions}>
            {options.map((option) => (
              <TouchableOpacity
                key={option}
                style={[
                  styles.buttonOption,
                  params[key] === option && styles.selectedButtonOption
                ]}
                onPress={() => handleParamChange(key, option)}
              >
                <Text style={params[key] === option ? styles.selectedButtonText : styles.buttonText}>
                  {option}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </ScrollView>
      </View>
    );
  };
  
  // Render string options
  const renderStringOptions = (key: string, options: string[]) => {
    return (
      <View style={styles.optionSection}>
        <Text style={styles.optionTitle}>
          {key.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase())}
        </Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          <View style={styles.buttonOptions}>
            {options.map((option) => (
              <TouchableOpacity
                key={option}
                style={[
                  styles.buttonOption,
                  params[key] === option && styles.selectedButtonOption
                ]}
                onPress={() => handleParamChange(key, option)}
              >
                <Text 
                  style={params[key] === option ? styles.selectedButtonText : styles.buttonText}
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
  
  // Render different option types
  const renderOptions = () => {
    return Object.entries(styleParams).map(([key, options]) => {
      if (!Array.isArray(options) || options.length === 0) return null;
      
      // Check the first item to determine the type of options
      const firstOption = options[0];
      
      if (typeof firstOption === 'number') {
        return renderNumericOptions(key, options as number[]);
      } else if (typeof firstOption === 'string' && firstOption.match(/^[0-9A-Fa-f]{6}$/)) {
        return renderColorOptions(key, options as string[]);
      } else if (typeof firstOption === 'string') {
        return renderStringOptions(key, options as string[]);
      }
      
      return null;
    });
  };
  
  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={true}
    >
      <View style={styles.modalContainer}>
        <View style={styles.modalContent}>
          <View style={styles.headerRow}>
            <Text style={styles.modalTitle}>Customize Avatar</Text>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <Ionicons name="close" size={24} color="#334155" />
            </TouchableOpacity>
          </View>
          
          <View style={styles.previewContainer}>
            <Image
              source={{ uri: previewUrl }}
              style={styles.previewImage}
              resizeMode="cover"
            />
          </View>
          
          <ScrollView style={styles.optionsContainer}>
            {renderOptions()}
          </ScrollView>
          
          <View style={styles.actionsContainer}>
            <TouchableOpacity 
              style={styles.randomizeButton}
              onPress={() => {
                const randomParams = AvatarService.getRandomStyleParams(style);
                setParams(randomParams);
              }}
            >
              <Ionicons name="shuffle" size={18} color="#7C3AED" />
              <Text style={styles.randomizeText}>Randomize</Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={styles.applyButton}
              onPress={() => onApply(params)}
            >
              <Text style={styles.applyText}>Apply</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalContainer: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  modalContent: {
    backgroundColor: 'white',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 30,
    maxHeight: '90%',
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 15,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#334155',
  },
  closeButton: {
    padding: 5,
  },
  previewContainer: {
    alignItems: 'center',
    marginBottom: 20,
  },
  previewImage: {
    width: 150,
    height: 150,
    borderRadius: 75,
    borderWidth: 3,
    borderColor: 'white',
    elevation: 3,
  },
  optionsContainer: {
    maxHeight: 300,
    marginBottom: 20,
  },
  optionSection: {
    marginBottom: 15,
  },
  optionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#334155',
    marginBottom: 8,
  },
  colorOptions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  colorOption: {
    width: 36,
    height: 36,
    borderRadius: 18,
    marginRight: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  selectedColorOption: {
    borderWidth: 3,
    borderColor: '#7C3AED',
  },
  buttonOptions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  buttonOption: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 30,
    marginRight: 8,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    backgroundColor: '#f8fafc',
    minWidth: 45,
    alignItems: 'center',
  },
  selectedButtonOption: {
    borderColor: '#7C3AED',
    backgroundColor: '#EDE9FE',
  },
  buttonText: {
    color: '#64748b',
    fontSize: 14,
  },
  selectedButtonText: {
    color: '#7C3AED',
    fontWeight: '600',
    fontSize: 14,
  },
  actionsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 10,
  },
  randomizeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#7C3AED',
    backgroundColor: '#EDE9FE',
  },
  randomizeText: {
    marginLeft: 5,
    color: '#7C3AED',
    fontWeight: '600',
    fontSize: 16,
  },
  applyButton: {
    padding: 12,
    borderRadius: 8,
    backgroundColor: '#7C3AED',
    paddingHorizontal: 24,
    elevation: 2,
  },
  applyText: {
    color: 'white',
    fontWeight: '600',
    fontSize: 16,
  },
});

export default DiceBearCustomizeDialog;