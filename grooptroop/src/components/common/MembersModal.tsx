import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  Modal, 
  TouchableOpacity, 
  TouchableWithoutFeedback,
  FlatList,
  Animated,
  Easing
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

// Create a separate MemberItem component to handle individual animations
const MemberItem = React.memo(({ item, index }: { item: MemberData; index: number }) => {
  // We can safely use hooks here since this is a component
  const itemAnimation = React.useRef(new Animated.Value(0)).current;
  
  React.useEffect(() => {
    // Animate each item when it renders
    Animated.timing(itemAnimation, {
      toValue: 1,
      duration: 300,
      delay: index * 50,
      useNativeDriver: true,
    }).start();
    
    // Clean up animation
    return () => {
      itemAnimation.setValue(0);
    };
  }, [itemAnimation, index]);
  
  const animatedStyle = {
    opacity: itemAnimation,
    transform: [
      {
        translateY: itemAnimation.interpolate({
          inputRange: [0, 1],
          outputRange: [10, 0],
        }),
      },
    ],
  };

  return (
    <Animated.View style={animatedStyle}>
      <TouchableOpacity 
        style={tw`flex-row items-center py-3 px-4 my-1 bg-white rounded-xl border border-gray-50 active:bg-gray-50`}
        activeOpacity={0.7}
      >
        <View style={tw`relative`}>
          <Avatar 
            avatar={item.avatar}
            displayName={item.displayName}
            size={46}
          />
          
          {/* Online indicator dot - show randomly on some members */}
          {index % 5 !== 0 && (
            <View style={tw`absolute bottom-0 right-0 w-3 h-3 bg-green-400 rounded-full border-2 border-white`} />
          )}
        </View>
        
        <View style={tw`ml-3 flex-1`}>
          <Text style={tw`text-base font-bold text-gray-800`}>
            {item.displayName}
          </Text>
        </View>
        
        {/* Show crown for first member (likely creator) */}
        {index === 0 && (
          <Ionicons name="crown" size={18} color="#FFD700" style={tw`ml-1`} />
        )}
      </TouchableOpacity>
    </Animated.View>
  );
});

const MembersModal: React.FC<MembersModalProps> = ({ visible, onClose, members, groopName }) => {
  // Animation values for the modal entrance
  const [animation] = useState(new Animated.Value(0));
  
  // Start animation when modal becomes visible
  useEffect(() => {
    if (visible) {
      Animated.timing(animation, {
        toValue: 1,
        duration: 300,
        easing: Easing.out(Easing.back(1.1)),
        useNativeDriver: true,
      }).start();
    } else {
      animation.setValue(0);
    }
  }, [visible]);
  
  // Animation styles
  const modalScaleAndOpacity = {
    transform: [
      {
        scale: animation.interpolate({
          inputRange: [0, 1],
          outputRange: [0.9, 1],
        }),
      },
    ],
    opacity: animation.interpolate({
      inputRange: [0, 1],
      outputRange: [0, 1],
    }),
  };

  // Now we just need to render our separate component
  const renderMember = ({ item, index }: { item: MemberData; index: number }) => {
    return <MemberItem item={item} index={index} />;
  };

  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="fade"
      onRequestClose={onClose}
      statusBarTranslucent
    >
      <TouchableWithoutFeedback onPress={onClose}>
        <View style={tw`flex-1 bg-black/50 justify-center items-center p-4`}>
          <TouchableWithoutFeedback onPress={(e) => e.stopPropagation()}>
            <Animated.View style={[tw`w-full max-w-xs overflow-hidden`, modalScaleAndOpacity]}>
              {/* Modal Content */}
              <View style={tw`bg-white rounded-3xl overflow-hidden`}>
                {/* Header with vibrant background */}
                <View style={tw`bg-violet-600 p-5`}>
                  <View style={tw`flex-row justify-between items-center`}>
                    <View>
                      <Text style={tw`text-white text-xs font-semibold uppercase tracking-wider opacity-80`}>Group</Text>
                      <Text style={tw`text-xl font-bold text-white mt-0.5 mb-1`}>
                        {groopName}
                      </Text>
                      <View style={tw`flex-row items-center`}>
                        <Ionicons name="people" size={14} color="rgba(255,255,255,0.9)" />
                        <Text style={tw`ml-1 text-white/90 text-xs font-medium`}>
                          {members.length} {members.length === 1 ? 'person' : 'people'} in this trip
                        </Text>
                      </View>
                    </View>
                    <TouchableOpacity 
                      onPress={onClose}
                      style={tw`rounded-full p-2 bg-white/20 active:bg-white/30`}
                    >
                      <Ionicons name="close" size={20} color="white" />
                    </TouchableOpacity>
                  </View>
                </View>
                
                {/* Members List with rounded top corners overlapping the header */}
                <View style={tw`bg-slate-50 rounded-t-3xl -mt-3 pt-4 px-3 pb-3`}>
                  {members.length === 0 ? (
                    <View style={tw`py-10 items-center`}>
                      <Ionicons name="people-outline" size={48} color="#CBD5E1" />
                      <Text style={tw`text-gray-500 text-center mt-3 font-medium`}>No members found</Text>
                    </View>
                  ) : (
                    <FlatList
                      data={members}
                      renderItem={renderMember}
                      keyExtractor={(item) => item.uid}
                      style={tw`max-h-80`}
                      showsVerticalScrollIndicator={false}
                      contentContainerStyle={tw`pt-1 pb-3`}
                      ListHeaderComponent={
                        <View style={tw`mb-2`}>
                          <Text style={tw`text-xs text-slate-500 font-medium px-2`}>
                            MEMBERS
                          </Text>
                        </View>
                      }
                    />
                  )}
                  
                  {/* Action button */}
                  <TouchableOpacity 
                    style={tw`bg-primary mt-1 rounded-xl py-2.5 items-center flex-row justify-center`}
                    onPress={onClose}
                  >
                    <Text style={tw`text-white font-bold`}>Done</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </Animated.View>
          </TouchableWithoutFeedback>
        </View>
      </TouchableWithoutFeedback>
    </Modal>
  );
};

export default MembersModal;