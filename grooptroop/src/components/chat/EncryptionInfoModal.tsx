import React, { memo, useState, useEffect } from 'react';
import { Modal, View, Text, TouchableOpacity, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { EncryptionService } from '../../services/EncryptionService';
import tw from '../../utils/tw';
import logger from '../../utils/logger';

interface EncryptionInfoModalProps {
  visible: boolean;
  onClose: () => void;
  groopId?: string;
}

const EncryptionInfoModal = memo(({ visible, onClose, groopId }: EncryptionInfoModalProps) => {
  const [hasKey, setHasKey] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(true);
  const [keygenProgress, setKeygenProgress] = useState(0);
  
  useEffect(() => {
    // Only check when modal becomes visible
    if (visible && groopId) {
      setLoading(true);
      
      const checkEncryption = async () => {
        try {
          const hasGroupKey = await EncryptionService.hasGroupKey(groopId);
          logger.chat(`Group ${groopId} encryption key status: ${hasGroupKey ? 'exists' : 'missing'}`);
          setHasKey(hasGroupKey);
        } catch (error) {
          logger.error('Error checking encryption keys:', error);
          setHasKey(false);
        } finally {
          setLoading(false);
        }
      };
      
      checkEncryption();
    }
  }, [visible, groopId]);
  
  // Generate a new encryption key for the group
  const handleGenerateKey = async () => {
    if (!groopId) return;
    
    try {
      setKeygenProgress(0);
      
      // Start key generation with progress reporting
      await EncryptionService.generateAndShareGroupKey(
        groopId, 
        (progress: number) => setKeygenProgress(Math.round(progress * 100))
      );
      
      // Update status
      setHasKey(true);
      setKeygenProgress(100);
    } catch (error) {
      logger.error('Error generating encryption key:', error);
      setKeygenProgress(0);
    }
  };
  
  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={tw`flex-1 justify-center items-center bg-black bg-opacity-50`}>
        <View style={tw`bg-white rounded-xl p-6 w-[90%] max-w-md`}>
          <View style={tw`flex-row justify-between items-center mb-4`}>
            <View style={tw`flex-row items-center`}>
              <Ionicons name="lock-closed" size={24} color="#7C3AED" />
              <Text style={tw`text-xl font-bold ml-2`}>End-to-End Encryption</Text>
            </View>
            <TouchableOpacity onPress={onClose}>
              <Ionicons name="close" size={24} color="#666" />
            </TouchableOpacity>
          </View>
          
          {loading ? (
            <View style={tw`py-4 items-center`}>
              <ActivityIndicator color="#7C3AED" size="large" />
              <Text style={tw`mt-2 text-gray-600`}>Checking encryption status...</Text>
            </View>
          ) : (
            <>
              <Text style={tw`text-base text-gray-700 mb-4`}>
                {hasKey ? 
                  'Your messages in this group are protected with end-to-end encryption. Only you and other group members can read them.' :
                  'Encryption is currently not set up for this group. Generate a key to enable end-to-end encryption.'}
              </Text>
              
              <View style={tw`mb-4 p-3 bg-gray-100 rounded-lg`}>
                <Text style={tw`text-sm font-medium text-gray-800 mb-2`}>Group ID:</Text>
                <Text style={tw`text-sm font-mono text-gray-600`}>
                  {groopId || 'Unknown'}
                </Text>
                
                <Text style={tw`text-sm font-medium text-gray-800 mt-3 mb-1`}>Encryption Status:</Text>
                <View style={tw`flex-row items-center`}>
                  <Ionicons 
                    name={hasKey ? "shield-checkmark" : "shield-outline"} 
                    size={16} 
                    color={hasKey ? "#22C55E" : "#F59E0B"} 
                  />
                  <Text style={tw`ml-2 text-sm ${hasKey ? 'text-green-600' : 'text-amber-600'}`}>
                    {hasKey ? 'Encryption Active' : 'Not Encrypted'}
                  </Text>
                </View>
              </View>
              
              {!hasKey && (
                <TouchableOpacity
                  style={tw`bg-violet-600 rounded-lg py-3 px-4 mb-2 flex-row items-center justify-center`}
                  onPress={handleGenerateKey}
                  disabled={keygenProgress > 0}
                >
                  {keygenProgress > 0 ? (
                    <>
                      <ActivityIndicator size="small" color="white" style={tw`mr-2`} />
                      <Text style={tw`text-white font-medium`}>
                        Generating... {keygenProgress}%
                      </Text>
                    </>
                  ) : (
                    <>
                      <Ionicons name="key-outline" size={18} color="white" style={tw`mr-2`} />
                      <Text style={tw`text-white font-medium`}>Generate Encryption Key</Text>
                    </>
                  )}
                </TouchableOpacity>
              )}
              
              <TouchableOpacity
                style={tw`mt-2 rounded-lg py-3 px-4 self-center`}
                onPress={onClose}
              >
                <Text style={tw`text-gray-700 font-medium text-center`}>Close</Text>
              </TouchableOpacity>
            </>
          )}
        </View>
      </View>
    </Modal>
  );
});

EncryptionInfoModal.displayName = 'EncryptionInfoModal';

export default EncryptionInfoModal;