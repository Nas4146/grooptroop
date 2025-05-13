import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image, Alert, ActivityIndicator } from 'react-native';
import { useAuth } from '../contexts/AuthProvider';
import { Ionicons } from '@expo/vector-icons';
import { doc, getDoc } from 'firebase/firestore';
import { db as firestore } from '../lib/firebase';

interface ProfileScreenProps {
  navigation: any;
}

export default function ProfileScreen({ navigation }: ProfileScreenProps) {
  const { user, signOut } = useAuth();
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch user profile data
  useEffect(() => {
    console.log('[PROFILE_DEBUG] Profile component mounted, user:', user ? `ID: ${user.uid}` : 'null');
    
    async function fetchUserProfile() {
      try {
        if (!user) {
          console.log('[PROFILE_DEBUG] No user available, setting default profile');
          setProfile({
            displayName: 'Guest User',
            email: 'Not signed in',
            photoURL: null
          });
          setLoading(false);
          return;
        }
        
        console.log('[PROFILE_DEBUG] Fetching profile for user:', user.uid);
        const userRef = doc(firestore, 'users', user.uid);
        console.log('[PROFILE_DEBUG] Firestore reference created');
        
        try {
          const userDoc = await getDoc(userRef);
          console.log('[PROFILE_DEBUG] getDoc completed, exists:', userDoc.exists());
          
          if (userDoc.exists()) {
            const userData = userDoc.data();
            console.log('[PROFILE_DEBUG] User data retrieved:', Object.keys(userData).join(', '));
            setProfile(userData);
          } else {
            console.log('[PROFILE_DEBUG] No profile found, using auth data');
            // Use auth data if no profile document exists
            setProfile({
              displayName: user.displayName || 'GroopTroop User',
              email: user.email || 'Anonymous User',
              photoURL: user.photoURL,
              createdAt: new Date()
            });
          }
        } catch (docError) {
          console.error('[PROFILE_DEBUG] Error in getDoc operation:', docError);
          throw docError;
        }
      } catch (error: any) {
        console.error('[PROFILE_DEBUG] Error fetching profile:', error);
        setError(error.message || 'Failed to load profile data');
        
        // Set default profile even if there's an error
        setProfile({
          displayName: user?.displayName || 'GroopTroop User',
          email: user?.email || 'No email available',
          photoURL: null
        });
      } finally {
        console.log('[PROFILE_DEBUG] Setting loading to false');
        setLoading(false);
      }
    }
    
    fetchUserProfile();
    
    // Add cleanup function
    return () => {
      console.log('[PROFILE_DEBUG] Profile component unmounted');
    };
  }, [user]);
  
  // Add a separate useEffect for the timeout
  useEffect(() => {
    // Safety timeout to prevent getting stuck on loading
    let safetyTimer: NodeJS.Timeout | null = null;
    
    if (loading) {
      console.log('[PROFILE_DEBUG] Setting safety timeout');
      safetyTimer = setTimeout(() => {
        console.log('[PROFILE_DEBUG] Safety timeout triggered, forcing loading to false');
        setLoading(false);
      }, 5000);
    }
    
    // Clean up the timeout if component unmounts or loading changes
    return () => {
      if (safetyTimer) {
        clearTimeout(safetyTimer);
      }
    };
  }, [loading]);
  
  const handleSignOut = async () => {
    try {
      console.log('[PROFILE_DEBUG] Signing out user');
      await signOut();
    } catch (error) {
      console.error('[PROFILE_DEBUG] Error signing out:', error);
      Alert.alert('Error', 'Failed to sign out');
    }
  };
  
  // Show loading state
  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#7C3AED" />
        <Text style={styles.loadingText}>Loading profile...</Text>
        {/* Removed setTimeout from here */}
      </View>
    );
  }
  
  // Show error state
  if (error && !profile) {
    return (
      <View style={styles.centered}>
        <Ionicons name="alert-circle" size={50} color="#DC2626" />
        <Text style={styles.errorText}>{error}</Text>
        <TouchableOpacity
          style={styles.retryButton}
          onPress={() => {
            setLoading(true);
            setError(null);
            // Force re-fetch by bumping state
            setProfile(null);
          }}
        >
          <Text style={styles.retryText}>Retry</Text>
        </TouchableOpacity>
      </View>
    );
  }


  // We'll always have at least a default profile here
 // Get initials for avatar
  const getInitials = () => {
    if (!profile?.displayName) return '?';
    return profile.displayName
      .split(' ')
      .map((n: string) => n[0])
      .join('')
      .toUpperCase()
      .substring(0, 2);
  };

  return (
    <View style={styles.container}>
      {/* Rest of your component code remains unchanged */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Profile</Text>
      </View>
      
      <View style={styles.profileSection}>
        <View style={styles.avatarContainer}>
          {profile?.photoURL ? (
            <Image source={{ uri: profile.photoURL }} style={styles.avatar} />
          ) : (
            <View style={styles.avatarFallback}>
              <Text style={styles.avatarText}>{getInitials()}</Text>
            </View>
          )}
        </View>
        
        <Text style={styles.name}>
          {profile?.displayName || 'GroopTroop User'}
        </Text>
        <Text style={styles.email}>
          {profile?.email || (user?.isAnonymous ? 'Anonymous User' : 'No email')}
        </Text>
        
        {user?.isAnonymous && (
          <TouchableOpacity 
            style={styles.upgradeButton}
            onPress={() => navigation.navigate('CompleteProfile')}
          >
            <Text style={styles.upgradeButtonText}>Complete Your Profile</Text>
          </TouchableOpacity>
        )}
      </View>
      
      <View style={styles.sectionContainer}>
        <Text style={styles.sectionTitle}>Account</Text>
        
        <TouchableOpacity 
          style={styles.menuItem}
          onPress={() => navigation.navigate('EditProfile')}
        >
          <Ionicons name="person-outline" size={24} color="#333" style={styles.menuIcon} />
          <Text style={styles.menuText}>Edit Profile</Text>
          <Ionicons name="chevron-forward" size={20} color="#999" />
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={styles.menuItem}
          onPress={() => navigation.navigate('Settings')}
        >
          <Ionicons name="settings-outline" size={24} color="#333" style={styles.menuIcon} />
          <Text style={styles.menuText}>Settings</Text>
          <Ionicons name="chevron-forward" size={20} color="#999" />
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={styles.menuItem}
          onPress={() => navigation.navigate('Help')}
        >
          <Ionicons name="help-circle-outline" size={24} color="#333" style={styles.menuIcon} />
          <Text style={styles.menuText}>Help & Support</Text>
          <Ionicons name="chevron-forward" size={20} color="#999" />
        </TouchableOpacity>
      </View>
      
      <TouchableOpacity 
        style={styles.signOutButton}
        onPress={handleSignOut}
      >
        <Text style={styles.signOutText}>Sign Out</Text>
      </TouchableOpacity>
      
      <Text style={styles.versionText}>GroopTroop v1.0.0</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    color: '#666',
    fontSize: 16,
  },
  header: {
    paddingTop: 16,
    paddingBottom: 16,
    paddingHorizontal: 16,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  profileSection: {
    alignItems: 'center',
    padding: 20,
    paddingBottom: 30,
    backgroundColor: 'white',
  },
  avatarContainer: {
    marginVertical: 16,
  },
  avatar: {
    width: 100,
    height: 100,
    borderRadius: 50,
  },
  avatarFallback: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: '#7C3AED',
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    fontSize: 36,
    color: 'white',
    fontWeight: 'bold',
  },
  name: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
  },
  email: {
    fontSize: 16,
    color: '#666',
    marginTop: 4,
  },
  upgradeButton: {
    marginTop: 16,
    backgroundColor: '#7C3AED',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 20,
  },
  upgradeButtonText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '600',
  },
  sectionContainer: {
    backgroundColor: 'white',
    marginTop: 16,
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 8,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: '#eee',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginBottom: 16,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  menuIcon: {
    marginRight: 12,
  },
  menuText: {
    fontSize: 16,
    color: '#333',
    flex: 1,
  },
  signOutButton: {
    marginTop: 30,
    backgroundColor: '#FEE2E2',
    padding: 16,
    marginHorizontal: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  signOutText: {
    color: '#B91C1C',
    fontSize: 16,
    fontWeight: '600',
  },
  versionText: {
    textAlign: 'center',
    marginTop: 30,
    color: '#999',
    fontSize: 14,
  },
  errorText: {
    marginTop: 12,
    marginBottom: 20,
    color: '#DC2626',
    fontSize: 16,
    textAlign: 'center',
    paddingHorizontal: 20,
  },
  retryButton: {
    backgroundColor: '#7C3AED',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
  },
  retryText: {
    color: 'white',
    fontWeight: '600',
  },
});