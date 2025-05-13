import React, { useState, useEffect, createContext, useContext } from 'react';
import { View, Text, Button, ActivityIndicator, StyleSheet } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import { NavigationContainer, useNavigationContainerRef } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import TestSimpleLoginScreen from './src/screens/TestSimpleLoginScreen';
import TestHomeScreen from './src/screens/TestHomeScreen';
import TestDetailsScreen from './src/screens/TestDetailsScreen';
import TestProfileScreen from './src/screens/TestProfileScreen';
import TestEventDetailsModal from './src/screens/TestEventDetailsModal';
import TestGroupMembersModal from './src/screens/TestGroupMembersModal';
import TestAdminSettingsModal from './src/screens/TestAdminSettingsModal';

// Import your actual SimpleLoginScreen
import SimpleLoginScreen from './src/screens/SimpleLoginScreen';

// Enhanced logging function with component names for better tracing
const log = (message: string, data?: any) => {
  const timestamp = new Date().toLocaleTimeString();
  if (data) {
    console.log(`[INTEGRATED_AUTH ${timestamp}] ${message}`, data);
  } else {
    console.log(`[INTEGRATED_AUTH ${timestamp}] ${message}`);
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

// Error boundary for component-level error handling
class ErrorBoundary extends React.Component<
  { componentName: string; fallback: React.ReactNode; children: React.ReactNode },
  { hasError: boolean; error: Error | null }
> {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }
  
  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }
  
  componentDidCatch(error, errorInfo) {
    log(`Error in ${this.props.componentName}:`, { error, errorInfo });
  }
  
  render() {
    if (this.state.hasError) {
      return (
        <View style={styles.errorContainer}>
          <Text style={styles.errorTitle}>Error in {this.props.componentName}</Text>
          <Text style={styles.errorMessage}>{this.state.error?.message}</Text>
          <Button title="Reset" onPress={() => this.setState({ hasError: false })} />
          {this.props.fallback}
        </View>
      );
    }
    
    return this.props.children;
  }
}

// Wrapper for SimpleLoginScreen with logging
const EnhancedSimpleLoginScreen = ({ navigation }) => {
  const { signIn } = useAuth();
  
  useEffect(() => {
    log('EnhancedSimpleLoginScreen mounted');
    return () => log('EnhancedSimpleLoginScreen unmounted');
  }, []);
  
  // Handle successful login
  const handleLoginSuccess = () => {
    log('Login successful, signing in');
    signIn();
  };
  
  // Wrap the actual SimpleLoginScreen with error boundary and pass needed props
  return (
    <ErrorBoundary 
      componentName="TestSimpleLoginScreen"
      fallback={
        <View style={styles.fallback}>
          <Text style={styles.fallbackTitle}>Login Error</Text>
          <Text>There was a problem loading the login screen</Text>
          <Button title="Try Again" onPress={() => navigation.replace('Login')} />
        </View>
      }
    >
      <TestSimpleLoginScreen 
        onLoginSuccess={handleLoginSuccess}
        navigation={navigation} 
      />
    </ErrorBoundary>
  );
};

// Main App Screens (Keeping these as test screens for now)
const EnhancedHomeScreen = ({ navigation }) => {
  useEffect(() => {
    log('EnhancedHomeScreen mounted');
    return () => log('EnhancedHomeScreen unmounted');
  }, []);
  
  return (
    <ErrorBoundary 
      componentName="TestHomeScreen"
      fallback={
        <View style={styles.fallback}>
          <Text style={styles.fallbackTitle}>Home Screen Error</Text>
          <Text>There was a problem loading the home screen</Text>
          <Button title="Go Back" onPress={() => navigation.goBack()} />
        </View>
      }
    >
      <TestHomeScreen navigation={navigation} />
    </ErrorBoundary>
  );
};

const EnhancedDetailsScreen = ({ navigation, route }) => {
  useEffect(() => {
    log('EnhancedDetailsScreen mounted');
    return () => log('EnhancedDetailsScreen unmounted');
  }, []);
  
  return (
    <ErrorBoundary 
      componentName="TestDetailsScreen"
      fallback={
        <View style={styles.fallback}>
          <Text style={styles.fallbackTitle}>Details Screen Error</Text>
          <Text>There was a problem loading the details</Text>
          <Button title="Go Back" onPress={() => navigation.goBack()} />
        </View>
      }
    >
      <TestDetailsScreen navigation={navigation} route={route} />
    </ErrorBoundary>
  );
};

const EnhancedProfileScreen = ({ navigation }) => {
  const { signOut } = useAuth();
  
  useEffect(() => {
    log('EnhancedProfileScreen mounted');
    return () => log('EnhancedProfileScreen unmounted');
  }, []);
  
  const handleSignOut = () => {
    log('User signed out');
    signOut();
  };
  
  return (
    <ErrorBoundary 
      componentName="TestProfileScreen"
      fallback={
        <View style={styles.fallback}>
          <Text style={styles.fallbackTitle}>Profile Screen Error</Text>
          <Text>There was a problem loading the profile</Text>
          <Button title="Go Back" onPress={() => navigation.goBack()} />
        </View>
      }
    >
      <TestProfileScreen 
        navigation={navigation} 
        onSignOut={handleSignOut}
      />
    </ErrorBoundary>
  );
};

// Modal Screens
const EnhancedEventDetailsScreen = ({ route, navigation }) => {
  useEffect(() => {
    log('EnhancedEventDetailsScreen mounted', route.params);
    return () => log('EnhancedEventDetailsScreen unmounted');
  }, [route]);
  
  return (
    <ErrorBoundary 
      componentName="TestEventDetailsModal"
      fallback={
        <View style={styles.fallback}>
          <Text style={styles.fallbackTitle}>Event Details Error</Text>
          <Text>There was a problem loading the event details</Text>
          <Button title="Close" onPress={() => navigation.goBack()} />
        </View>
      }
    >
      <TestEventDetailsModal navigation={navigation} route={route} />
    </ErrorBoundary>
  );
};

const EnhancedGroupMembersScreen = ({ route, navigation }) => {
  useEffect(() => {
    log('EnhancedGroupMembersScreen mounted', route.params);
    return () => log('EnhancedGroupMembersScreen unmounted');
  }, [route]);
  
  return (
    <ErrorBoundary 
      componentName="TestGroupMembersModal"
      fallback={
        <View style={styles.fallback}>
          <Text style={styles.fallbackTitle}>Group Members Error</Text>
          <Text>There was a problem loading the group members</Text>
          <Button title="Close" onPress={() => navigation.goBack()} />
        </View>
      }
    >
      <TestGroupMembersModal navigation={navigation} route={route} />
    </ErrorBoundary>
  );
};

const EnhancedAdminSettingsScreen = ({ navigation }) => {
  useEffect(() => {
    log('EnhancedAdminSettingsScreen mounted');
    return () => log('EnhancedAdminSettingsScreen unmounted');
  }, []);
  
  return (
    <ErrorBoundary 
      componentName="TestAdminSettingsModal"
      fallback={
        <View style={styles.fallback}>
          <Text style={styles.fallbackTitle}>Admin Settings Error</Text>
          <Text>There was a problem loading the admin settings</Text>
          <Button title="Close" onPress={() => navigation.goBack()} />
        </View>
      }
    >
      <TestAdminSettingsModal navigation={navigation} />
    </ErrorBoundary>
  );
};

// Create navigators
const AuthStack = createNativeStackNavigator();
const HomeStack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();
const RootStack = createNativeStackNavigator();

// Auth navigator - now using SimpleLoginScreen
const AuthNavigator = () => {
  useEffect(() => {
    log('AuthNavigator mounted');
    return () => log('AuthNavigator unmounted');
  }, []);
  
  return (
    <AuthStack.Navigator screenOptions={{ headerShown: false }}>
      <AuthStack.Screen 
        name="Login" 
        component={EnhancedSimpleLoginScreen} 
      />
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
      <HomeStack.Screen name="Home" component={EnhancedHomeScreen} />
      <HomeStack.Screen name="Details" component={EnhancedDetailsScreen} />
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
          const iconMap = {
            HomeTab: focused ? 'home' : 'home-outline',
            ProfileTab: focused ? 'person' : 'person-outline',
          };
          
          const iconName = iconMap[route.name] || 'help-circle-outline';
          
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
        component={EnhancedProfileScreen} 
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
        log(`Navigation state changed, current route: ${currentRouteName}`);
      }}
    >
      {children}
    </NavigationContainer>
  );
};

// Root navigator
const RootNavigator = () => {
  const { isSignedIn, isLoading } = useAuth();
  
  useEffect(() => {
    log(`RootNavigator rendering with isSignedIn=${isSignedIn}, isLoading=${isLoading}`);
  }, [isSignedIn, isLoading]);
  
  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#7C3AED" />
        <Text style={styles.loadingText}>Loading...</Text>
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
  <RootStack.Screen name="EventDetails" component={EnhancedEventDetailsScreen} />
  <RootStack.Screen name="GroupMembers" component={EnhancedGroupMembersScreen} />
  <RootStack.Screen name="AdminSettings" component={EnhancedAdminSettingsScreen} />
</RootStack.Group>
    </RootStack.Navigator>
  );
};

// Main app
export default function IntegratedAuthApp() {
  useEffect(() => {
    log('IntegratedAuthApp mounted');
    return () => log('IntegratedAuthApp unmounted');
  }, []);

  return (
    <GestureHandlerRootView style={styles.container}>
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

// Centralized styles
const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  screen: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f9fafb',
    padding: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 12,
    color: '#111827',
  },
  subtitle: {
    fontSize: 16,
    marginBottom: 24,
    color: '#4b5563',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f9fafb',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: '#6b7280',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fee2e2',
    padding: 20,
  },
  errorTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#b91c1c',
    marginBottom: 8,
  },
  errorMessage: {
    fontSize: 14,
    color: '#b91c1c',
    marginBottom: 16,
    textAlign: 'center',
  },
  fallback: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#f3f4f6',
  },
  fallbackTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 12,
  }
});