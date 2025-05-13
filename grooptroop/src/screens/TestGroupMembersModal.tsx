import React from 'react';
import { View, Text, Button, StyleSheet, FlatList, Image } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';

interface Member {
  id: string;
  name: string;
  role: string;
  avatarUrl?: string;
}

interface TestGroupMembersModalProps {
  navigation: any;
  route: any;
}

export default function TestGroupMembersModal({ navigation, route }: TestGroupMembersModalProps) {
  const groopId = route.params?.groopId || 'unknown';
  console.log(`[TEST_GROUP_MODAL] Rendering group members for: ${groopId}`);
  
  // Mock data for testing
  const members: Member[] = [
    { id: '1', name: 'John Smith', role: 'Admin', avatarUrl: null },
    { id: '2', name: 'Sarah Johnson', role: 'Member', avatarUrl: null },
    { id: '3', name: 'Robert Williams', role: 'Member', avatarUrl: null },
    { id: '4', name: 'Emma Davis', role: 'Member', avatarUrl: null },
    { id: '5', name: 'Michael Brown', role: 'Member', avatarUrl: null },
  ];
  
  const renderMember = ({ item }: { item: Member }) => (
    <View style={styles.memberItem}>
      <View style={styles.avatar}>
        <Text style={styles.avatarText}>{item.name.charAt(0)}</Text>
      </View>
      <View style={styles.memberInfo}>
        <Text style={styles.memberName}>{item.name}</Text>
        <Text style={styles.memberRole}>{item.role}</Text>
      </View>
      {item.role === 'Admin' && (
        <Ionicons name="star" size={18} color="#7C3AED" style={styles.adminIcon} />
      )}
    </View>
  );
  
  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <View style={styles.header}>
        <Text style={styles.title}>Group Members</Text>
        <Ionicons 
          name="close" 
          size={24} 
          color="#333" 
          onPress={() => {
            console.log('[TEST_GROUP_MODAL] Closing modal');
            navigation.goBack();
          }} 
          style={styles.closeIcon}
        />
      </View>
      
      <View style={styles.content}>
        <Text style={styles.subtitle}>Group ID: {groopId}</Text>
        
        <FlatList
          data={members}
          renderItem={renderMember}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.list}
        />
        
        <View style={styles.buttonContainer}>
          <Button
            title="Invite New Member"
            color="#7C3AED"
            onPress={() => console.log('[TEST_GROUP_MODAL] Invite new member pressed')}
          />
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e5e5',
    backgroundColor: 'white',
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  closeIcon: {
    padding: 4,
  },
  content: {
    flex: 1,
    padding: 20,
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
    marginBottom: 20,
  },
  list: {
    paddingBottom: 20,
  },
  memberItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'white',
    padding: 16,
    borderRadius: 8,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#7C3AED',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  avatarText: {
    color: 'white',
    fontSize: 18,
    fontWeight: 'bold',
  },
  memberInfo: {
    flex: 1,
  },
  memberName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 2,
  },
  memberRole: {
    fontSize: 14,
    color: '#666',
  },
  adminIcon: {
    marginLeft: 8,
  },
  buttonContainer: {
    marginTop: 20,
  },
});