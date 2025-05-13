import React, { useState } from 'react';
import { View, Text, Button, StyleSheet, Switch, TextInput, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';

interface TestAdminSettingsModalProps {
  navigation: any;
}

export default function TestAdminSettingsModal({ navigation }: TestAdminSettingsModalProps) {
  console.log(`[TEST_ADMIN_MODAL] Rendering admin settings`);
  
  // Mock settings state
  const [isPrivate, setIsPrivate] = useState(true);
  const [allowInvites, setAllowInvites] = useState(true);
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const [groupName, setGroupName] = useState('Hiking Enthusiasts');
  const [groupDescription, setGroupDescription] = useState('Group for people who love hiking');
  
  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <View style={styles.header}>
        <Text style={styles.title}>Admin Settings</Text>
        <Ionicons 
          name="close" 
          size={24} 
          color="#333" 
          onPress={() => {
            console.log('[TEST_ADMIN_MODAL] Closing modal');
            navigation.goBack();
          }} 
          style={styles.closeIcon}
        />
      </View>
      
      <ScrollView style={styles.content}>
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Group Information</Text>
          
          <View style={styles.inputContainer}>
            <Text style={styles.label}>Group Name</Text>
            <TextInput
              style={styles.input}
              value={groupName}
              onChangeText={setGroupName}
              placeholder="Enter group name"
            />
          </View>
          
          <View style={styles.inputContainer}>
            <Text style={styles.label}>Description</Text>
            <TextInput
              style={[styles.input, styles.textarea]}
              value={groupDescription}
              onChangeText={setGroupDescription}
              placeholder="Enter group description"
              multiline
              numberOfLines={4}
            />
          </View>
        </View>
        
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Privacy Settings</Text>
          
          <View style={styles.settingRow}>
            <View>
              <Text style={styles.settingTitle}>Private Group</Text>
              <Text style={styles.settingDescription}>Only members can see content</Text>
            </View>
            <Switch 
              value={isPrivate}
              onValueChange={setIsPrivate}
              trackColor={{ false: '#ccc', true: '#a78bfa' }}
              thumbColor={isPrivate ? '#7C3AED' : '#f4f3f4'}
            />
          </View>
          
          <View style={styles.settingRow}>
            <View>
              <Text style={styles.settingTitle}>Member Invites</Text>
              <Text style={styles.settingDescription}>Allow members to invite others</Text>
            </View>
            <Switch 
              value={allowInvites}
              onValueChange={setAllowInvites}
              trackColor={{ false: '#ccc', true: '#a78bfa' }}
              thumbColor={allowInvites ? '#7C3AED' : '#f4f3f4'}
            />
          </View>
          
          <View style={styles.settingRow}>
            <View>
              <Text style={styles.settingTitle}>Notifications</Text>
              <Text style={styles.settingDescription}>Enable group notifications</Text>
            </View>
            <Switch 
              value={notificationsEnabled}
              onValueChange={setNotificationsEnabled}
              trackColor={{ false: '#ccc', true: '#a78bfa' }}
              thumbColor={notificationsEnabled ? '#7C3AED' : '#f4f3f4'}
            />
          </View>
        </View>
        
        <View style={styles.buttonContainer}>
          <Button
            title="Save Changes"
            color="#7C3AED"
            onPress={() => {
              console.log('[TEST_ADMIN_MODAL] Save changes pressed');
              navigation.goBack();
            }}
          />
        </View>
        
        <View style={styles.dangerSection}>
          <Text style={styles.dangerTitle}>Danger Zone</Text>
          <Button
            title="Delete Group"
            color="#DC2626"
            onPress={() => console.log('[TEST_ADMIN_MODAL] Delete group pressed')}
          />
        </View>
      </ScrollView>
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
  section: {
    backgroundColor: 'white',
    borderRadius: 8,
    padding: 16,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginBottom: 16,
  },
  inputContainer: {
    marginBottom: 16,
  },
  label: {
    fontSize: 14,
    fontWeight: '500',
    color: '#555',
    marginBottom: 6,
  },
  input: {
    borderWidth: 1,
    borderColor: '#d4d4d8',
    borderRadius: 6,
    padding: 10,
    fontSize: 16,
    backgroundColor: '#fff',
  },
  textarea: {
    minHeight: 100,
    textAlignVertical: 'top',
  },
  settingRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  settingTitle: {
    fontSize: 16,
    fontWeight: '500',
    color: '#333',
    marginBottom: 2,
  },
  settingDescription: {
    fontSize: 14,
    color: '#666',
  },
  buttonContainer: {
    marginVertical: 20,
  },
  dangerSection: {
    backgroundColor: '#FEF2F2',
    borderRadius: 8,
    padding: 16,
    marginBottom: 40,
    borderWidth: 1,
    borderColor: '#FECACA',
  },
  dangerTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#DC2626',
    marginBottom: 16,
  },
});