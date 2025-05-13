import React, { useState, useEffect, createContext, useContext } from 'react';
import { View, Text, Button, ActivityIndicator } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import { NavigationContainer, useNavigationContainerRef } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';

// Enhanced logging function
const log = (message: string, data?: any) => {
  if (data) {
    console.log(`[REBUILD] ${message}`, data);
  } else {
    console.log(`[REBUILD] ${message}`);
  }
};

// Create auth context
const AuthContext = createContext<{
  isSignedIn: boolean;
  isLoading: boolean;
  signIn: () => void;
  signOut: () => void;
} | null>(null);

// Auth provider component
function AuthProvider({ children }: { children: React.ReactNode }) {
  const [isLoading, setIsLoading] = useState(true);
  const [isSignedIn, setIsSignedIn] = useState(false);
  
  useEffect(() => {
    log('AuthProvider mounted');
    
    // Simulate checking authentication state
    const checkAuth = setTimeout(() => {
      log('Auth check complete');
      setIsLoading(false);
    }, 1000);
    
    return () => {
      clearTimeout(checkAuth);
      log('AuthProvider unmounted');
    };
  }, []);
  
  // Auth methods
  const signIn = () => {
    log('Signing in');
    setIsSignedIn(true);
  };
  
  const signOut = () => {
    log('Signing out');
    setIsSignedIn(false);
  };
  
  return (
    <AuthContext.Provider value={{ isSignedIn, isLoading, signIn, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

// Custom hook to use auth context
const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

// Auth Screens
const SignInScreen = () => {
  const { signIn } = useAuth();
  
  useEffect(() => {
    log('SignInScreen mounted');
    return () => log('SignInScreen unmounted');
  }, []);
  
  return (
    <SafeAreaView style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#f0f0f0' }}>
      <Text style={{ fontSize: 24 }}>Sign In</Text>
      <Button 
        title="Sign In" 
        onPress={() => {
          log('Sign in button pressed');
          signIn();
        }}
      />
      <Button 
        title="Go to Sign Up" 
        onPress={() => {
          log('Navigating to SignUp');
          navigation.navigate('SignUp');
        }}
      />
    </SafeAreaView>
  );
};

const SignUpScreen = ({ navigation }) => {
  useEffect(() => {
    log('SignUpScreen mounted');
    return () => log('SignUpScreen unmounted');
  }, []);
  
  return (
    <SafeAreaView style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#f0f0f0' }}>
      <Text style={{ fontSize: 24 }}>Sign Up</Text>
      <Button 
        title="Go to Sign In" 
        onPress={() => {
          log('Navigating to SignIn');
          navigation.navigate('SignIn');
        }}
      />
    </SafeAreaView>
  );
};

// Main App Screens
const HomeScreen = ({ navigation }) => {
  useEffect(() => {
    log('HomeScreen mounted');
    return () => log('HomeScreen unmounted');
  }, []);
  
  return (
    <SafeAreaView style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#f0f0f0' }}>
      <Text style={{ fontSize: 24 }}>Home Screen</Text>
      <Text style={{ marginTop: 10 }}>This is the home tab</Text>
      <Button 
        title="Go to Details" 
        onPress={() => {
          log('Navigating to DetailsScreen');
          navigation.navigate('Details');
        }} 
      />
      <Button 
        title="Open Event Details Modal" 
        onPress={() => {
          log('Opening EventDetails modal');
          navigation.navigate('EventDetails', { eventId: 'event123' });
        }} 
      />
      <Button 
        title="Open Group Members Modal" 
        onPress={() => {
          log('Opening GroupMembers modal');
          navigation.navigate('GroupMembers', { groopId: 'group456' });
        }} 
      />
      <Button 
        title="Open Admin Settings Modal" 
        onPress={() => {
          log('Opening AdminSettings modal');
          navigation.navigate('AdminSettings');
        }} 
      />
    </SafeAreaView>
  );
};

const DetailsScreen = () => {
  useEffect(() => {
    log('DetailsScreen mounted');
    return () => log('DetailsScreen unmounted');
  }, []);
  
  return (
    <SafeAreaView style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#f0f0f0' }}>
      <Text style={{ fontSize: 24 }}>Details Screen</Text>
      <Text style={{ marginTop: 10 }}>Details content here</Text>
    </SafeAreaView>
  );
};

const ProfileScreen = () => {
  const { signOut } = useAuth();
  
  useEffect(() => {
    log('ProfileScreen mounted');
    return () => log('ProfileScreen unmounted');
  }, []);
  
  return (
    <SafeAreaView style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#f0f0f0' }}>
      <Text style={{ fontSize: 24 }}>Profile</Text>
      <Text style={{ marginTop: 10 }}>Your profile information</Text>
      <Button 
        title="Sign Out" 
        onPress={() => {
          log('Sign out button pressed');
          signOut();
        }}
      />
    </SafeAreaView>
  );
};

// Modal Screens
const EventDetailsScreen = ({ route, navigation }) => {
  useEffect(() => {
    log('EventDetailsScreen mounted', route.params);
    return () => log('EventDetailsScreen unmounted');
  }, [route]);
  
  return (
    <SafeAreaView style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#f0f0f0' }}>
      <Text style={{ fontSize: 24 }}>Event Details</Text>
      <Text style={{ marginTop: 10 }}>Event ID: {route.params?.eventId || 'Unknown'}</Text>
      <Button 
        title="Close" 
        onPress={() => {
          log('Closing modal');
          navigation.goBack();
        }}
      />
    </SafeAreaView>
  );
};

const GroupMembersScreen = ({ route, navigation }) => {
  useEffect(() => {
    log('GroupMembersScreen mounted', route.params);
    return () => log('GroupMembersScreen unmounted');
  }, [route]);
  
  return (
    <SafeAreaView style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#f0f0f0' }}>
      <Text style={{ fontSize: 24 }}>Group Members</Text>
      <Text style={{ marginTop: 10 }}>Group ID: {route.params?.groopId || 'Unknown'}</Text>
      <Button 
        title="Close" 
        onPress={() => {
          log('Closing modal');
          navigation.goBack();
        }}
      />
    </SafeAreaView>
  );
};

const AdminSettingsScreen = ({ navigation }) => {
  useEffect(() => {
    log('AdminSettingsScreen mounted');
    return () => log('AdminSettingsScreen unmounted');
  }, []);
  
  return (
    <SafeAreaView style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#f0f0f0' }}>
      <Text style={{ fontSize: 24 }}>Admin Settings</Text>
      <Text style={{ marginTop: 10 }}>Configure group settings</Text>
      <Button 
        title="Close" 
        onPress={() => {
          log('Closing modal');
          navigation.goBack();
        }}
      />
    </SafeAreaView>
  );
};

// Create navigators
const AuthStack = createNativeStackNavigator();
const HomeStack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();
const RootStack = createNativeStackNavigator();

// Auth navigator
const AuthNavigator = () => {
  useEffect(() => {
    log('AuthNavigator mounted');
    return () => log('AuthNavigator unmounted');
  }, []);
  
  return (
    <AuthStack.Navigator>
      <AuthStack.Screen name="SignIn" component={SignInScreen} />
      <AuthStack.Screen name="SignUp" component={SignUpScreen} />
    </AuthStack.Navigator>
  );
};

// Home stack navigator
const HomeStackScreen = () => {
  useEffect(() => {
    log('HomeStackScreen mounted');
    return () => log('HomeStackScreen unmounted');
  }, []);
  
  return (
    <HomeStack.Navigator>
      <HomeStack.Screen name="Home" component={HomeScreen} />
      <HomeStack.Screen name="Details" component={DetailsScreen} />
    </HomeStack.Navigator>
  );
};

// Tab navigator
const TabNavigator = () => {
  useEffect(() => {
    log('TabNavigator mounted');
    return () => log('TabNavigator unmounted');
  }, []);
  
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        tabBarIcon: ({ focused, color, size }) => {
          let iconName;
          
          if (route.name === 'HomeTab') {
            iconName = focused ? 'home' : 'home-outline';
          } else if (route.name === 'ProfileTab') {
            iconName = focused ? 'person' : 'person-outline';
          }
          
          return <Ionicons name={iconName} size={size} color={color} />;
        },
        tabBarActiveTintColor: '#7C3AED',
        tabBarInactiveTintColor: '#6B7280',
      })}
    >
      <Tab.Screen 
        name="HomeTab" 
        component={HomeStackScreen} 
        options={{ 
          headerShown: false,
          title: 'Home'
        }}
      />
      <Tab.Screen 
        name="ProfileTab" 
        component={ProfileScreen} 
        options={{ title: 'Profile' }}
      />
    </Tab.Navigator>
  );
};

// Navigation container with state change logging
const NavigationLogger = ({ children }) => {
  const navigationRef = useNavigationContainerRef();
  
  return (
    <NavigationContainer
      ref={navigationRef}
      onReady={() => {
        log('Navigation container is ready');
      }}
      onStateChange={(state) => {
        const currentRouteName = navigationRef.getCurrentRoute()?.name;
        log(`Navigation state changed, current route: ${currentRouteName}`, state);
      }}
    >
      {children}
    </NavigationContainer>
  );
};

// Root navigator - now with modals
const RootNavigator = () => {
  const { isSignedIn, isLoading } = useAuth();
  
  useEffect(() => {
    log(`RootNavigator rendering with isSignedIn=${isSignedIn}, isLoading=${isLoading}`);
  }, [isSignedIn, isLoading]);
  
  if (isLoading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#f0f0f0' }}>
        <ActivityIndicator size="large" color="#7C3AED" />
        <Text style={{ marginTop: 10 }}>Loading...</Text>
      </View>
    );
  }
  
  return (
    <RootStack.Navigator screenOptions={{ headerShown: false }}>
      {isSignedIn ? (
        <RootStack.Screen name="MainApp" component={TabNavigator} />
      ) : (
        <RootStack.Screen name="Auth" component={AuthNavigator} />
      )}
      
      {/* Add modal screens */}
      <RootStack.Group screenOptions={{ presentation: 'modal' }}>
        <RootStack.Screen name="EventDetails" component={EventDetailsScreen} />
        <RootStack.Screen name="GroupMembers" component={GroupMembersScreen} />
        <RootStack.Screen name="AdminSettings" component={AdminSettingsScreen} />
      </RootStack.Group>
    </RootStack.Navigator>
  );
};

// Main app
export default function RebuildModalApp() {
  useEffect(() => {
    log('RebuildModalApp mounted');
    return () => log('RebuildModalApp unmounted');
  }, []);

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <AuthProvider>
          <NavigationLogger>
            <RootNavigator />
          </NavigationLogger>
        </AuthProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}