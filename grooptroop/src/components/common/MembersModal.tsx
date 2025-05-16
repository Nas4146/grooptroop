import React from 'react';
import { 
  View, 
  Text, 
  Modal, 
  TouchableOpacity, 
  TouchableWithoutFeedback,
  FlatList
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import tw from '../../utils/tw';
import Avatar from './Avatar';

interface MemberData {
  uid: string;
  displayName: string;
  avatar?: any;
}

interface MembersModalProps {
  visible: boolean;
  onClose: () => void;
  members: MemberData[];
  groopName: string;
}

const MembersModal: React.FC<MembersModalProps> = ({ visible, onClose, members, groopName }) => {
  const renderMember = ({ item }: { item: MemberData }) => (
    <View style={tw`flex-row items-center py-3 px-4 border-b border-gray-100`}>
      <Avatar 
        avatar={item.avatar}
        displayName={item.displayName}
        size={46}
        style={tw`shadow-sm`}
      />
      <Text style={tw`ml-3 text-base font-medium text-gray-800`}>
        {item.displayName}
      </Text>
    </View>
  );

  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="fade"
      onRequestClose={onClose}
    >
      <TouchableWithoutFeedback onPress={onClose}>
        <View style={tw`flex-1 bg-black/50 justify-center items-center p-4`}>
          <TouchableWithoutFeedback onPress={(e) => e.stopPropagation()}>
            <View style={tw`bg-white w-full max-w-xs rounded-2xl overflow-hidden shadow-xl`}>
              {/* Modal Header */}
              <View style={tw`flex-row justify-between items-center p-4 border-b border-gray-100`}>
                <View>
                  <Text style={tw`text-gray-500 text-xs`}>Squad</Text>
                  <Text style={tw`text-lg font-semibold text-gray-900 mt-0.5`}>
                    {groopName}
                  </Text>
                </View>
                <TouchableOpacity 
                  onPress={onClose}
                  style={tw`rounded-full p-1.5 bg-gray-100 active:bg-gray-200`}
                >
                  <Ionicons name="close" size={18} color="#4b5563" />
                </TouchableOpacity>
              </View>
              
              {/* Members List */}
              <FlatList
                data={members}
                renderItem={renderMember}
                keyExtractor={(item) => item.uid}
                style={tw`max-h-80`}
                showsVerticalScrollIndicator={false}
                contentContainerStyle={tw`pb-2`}
                ListEmptyComponent={
                  <View style={tw`py-8 items-center`}>
                    <Text style={tw`text-gray-500 text-center`}>No members found</Text>
                  </View>
                }
                ListHeaderComponent={
                  <View style={tw`px-4 py-2 bg-gray-50`}>
                    <Text style={tw`text-xs text-gray-500 font-medium`}>
                      {members.length} {members.length === 1 ? 'MEMBER' : 'MEMBERS'}
                    </Text>
                  </View>
                }
              />
            </View>
          </TouchableWithoutFeedback>
        </View>
      </TouchableWithoutFeedback>
    </Modal>
  );
};

export default MembersModal;