import React from 'react';
import { Modal, View, Text, TouchableOpacity } from 'react-native';
import logger from '../../utils/logger';
import tw from '../../utils/tw';
import Ionicons from 'react-native-vector-icons/Ionicons';

interface EncryptionInfoModalProps {
  visible: boolean; // Changed from isVisible to visible
  onClose: () => void;
  groopId?: string; // Make groopId optional since it was in the chatScreen call
  tw?: any; // Add tw as optional since it was passed from chatScreen
}

const EncryptionInfoModal: React.FC<EncryptionInfoModalProps> = ({ 
  visible, // Changed from isVisible to visible 
  onClose,
  groopId
}) => {
  // Make sure we log when modal is rendered
  logger.chat(`EncryptionInfoModal rendered with visible=${visible}`);
  
  const handleClose = () => {
    // Add logging
    logger.chat('EncryptionInfoModal close button pressed');
    onClose();
  };

  return (
    <Modal
      transparent={true}
      visible={visible} // Changed from isVisible to visible
      animationType="slide"
      onRequestClose={handleClose}
    >
      <TouchableOpacity
        style={tw`flex-1 bg-black bg-opacity-50 justify-center items-center`}
        activeOpacity={1}
        onPress={handleClose}
      >
        <View 
          style={tw`bg-white p-5 rounded-xl w-5/6 max-w-md`}
          onStartShouldSetResponder={() => true}
          onTouchEnd={e => e.stopPropagation()}
        >
          {/* Drag indicator */}
          <View style={tw`w-16 h-1 bg-gray-300 rounded-full mx-auto mb-6`} />
          
          {/* Header with lock icon */}
          <View style={tw`flex-row items-center justify-center mb-6`}>
            <View style={tw`h-14 w-14 rounded-full bg-primary bg-opacity-20 items-center justify-center`}>
              <Ionicons name="lock-closed" size={32} color="#7C3AED" />
            </View>
          </View>
          
          <Text style={tw`text-center text-2xl font-bold mb-3 text-neutral`}>
            Secure Chat 🔒✨
          </Text>
          
          {/* Explanation sections */}
          <View style={tw`mb-6`}>
            <View style={tw`bg-purple-50 p-4 rounded-xl mb-4`}>
              <View style={tw`flex-row items-start mb-2`}>
                <Ionicons name="shield-checkmark" size={20} color="#7C3AED" style={tw`mt-0.5 mr-3`} />
                <Text style={tw`flex-1 font-bold text-base text-neutral`}>
                  Private AF
                </Text>
              </View>
              <Text style={tw`text-gray-700 pl-8`}>
                Your messages stay between you and the chat members. Not even our servers can see what you're saying.
              </Text>
            </View>
            
            <View style={tw`bg-blue-50 p-4 rounded-xl mb-4`}>
              <View style={tw`flex-row items-start mb-2`}>
                <Ionicons name="key" size={20} color="#78c0e1" style={tw`mt-0.5 mr-3`} />
                <Text style={tw`flex-1 font-bold text-base text-neutral`}>
                  Encrypted in Transit
                </Text>
              </View>
              <Text style={tw`text-gray-700 pl-8`}>
                Messages are scrambled before they leave your phone and can only be unscrambled by chat members.
              </Text>
            </View>
            
            <View style={tw`bg-green-50 p-4 rounded-xl`}>
              <View style={tw`flex-row items-start mb-2`}>
                <Ionicons name="eye-off" size={20} color="#10B981" style={tw`mt-0.5 mr-3`} />
                <Text style={tw`flex-1 font-bold text-base text-neutral`}>
                  No Snooping
                </Text>
              </View>
              <Text style={tw`text-gray-700 pl-8`}>
                You'll see a lock icon 🔒 on messages that are protected by encryption.
              </Text>
            </View>
          </View>
          
          {/* Action buttons */}
          <TouchableOpacity 
            style={tw`bg-primary py-3.5 rounded-xl mb-2`}
            onPress={handleClose}
          >
            <Text style={tw`text-white text-center font-bold`}>
              Got it!
            </Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={tw`py-2`}
            onPress={handleClose}
          >
            <Text style={tw`text-gray-500 text-center text-sm`}>
              Tap anywhere to dismiss
            </Text>
          </TouchableOpacity>
        </View>
      </TouchableOpacity>
    </Modal>
  );
};

export default EncryptionInfoModal;