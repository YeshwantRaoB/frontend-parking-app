import * as React from 'react';
import { View, Text, ActivityIndicator } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import {
  ClerkProvider,
  useAuth,
  useUser
} from '@clerk/clerk-expo';
import * as SecureStore from 'expo-secure-store';
import * as WebBrowser from 'expo-web-browser';

// Import screens
import LoginScreen from './screens/LoginScreen';
import AdminScreen from './AdminScreen';
import UserScreen from './UserScreen';
import RegistrationScreen from './RegistrationScreen';
import TestScreen from './TestScreen';

// Enable OAuth in WebBrowser
WebBrowser.maybeCompleteAuthSession();

const Stack = createNativeStackNavigator();

// Clerk publishable key from environment variables
const clerkPublishableKey = process.env.EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY;

// Token cache for Clerk
const tokenCache = {
  async getToken(key) {
    try {
      return await SecureStore.getItemAsync(key);
    } catch (err) {
      return null;
    }
  },
  async saveToken(key, value) {
    try {
      return await SecureStore.setItemAsync(key, value);
    } catch (err) {
      return;
    }
  },
};

// Helper function to check if user is admin
const isUserAdmin = (user) => {
  return user?.publicMetadata?.role === 'admin';
};

// Main app navigation
function AppContent() {
  const { isLoaded, isSignedIn } = useAuth();
  const { user, isLoaded: userLoaded } = useUser();

  // Show loading state while Clerk is initializing
  if (!isLoaded || !userLoaded) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#f5f5f5' }}>
        <ActivityIndicator size="large" color="#4a90e2" />
        <Text style={{ marginTop: 10, fontSize: 16, color: '#666' }}>Loading...</Text>
      </View>
    );
  }

  return (
    <NavigationContainer>
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        {isSignedIn ? (
          // Signed in users see role-based screens
          isUserAdmin(user) ? (
            // Admin users see admin screen and can also register vehicles
            <>
              <Stack.Screen
                name="Admin"
                component={AdminScreen}
                options={{ headerShown: false }}
              />
              <Stack.Screen
                name="Registration"
                component={RegistrationScreen}
                options={{ headerShown: false }}
              />
            </>
          ) : (
            // Regular users see user screen and registration
            <>
              <Stack.Screen
                name="User"
                component={UserScreen}
                options={{ headerShown: false }}
              />
              <Stack.Screen
                name="Registration"
                component={RegistrationScreen}
                options={{ headerShown: false }}
              />
            </>
          )
        ) : (
          // Signed out users see login and test screen
          <>
            <Stack.Screen
              name="Login"
              component={LoginScreen}
              options={{ headerShown: false }}
            />
            <Stack.Screen
              name="Test"
              component={TestScreen}
              options={{ headerShown: false }}
            />
          </>
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
}

// Wrap the app with ClerkProvider
export default function App() {
  if (!clerkPublishableKey) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <Text>Error: Clerk publishable key is missing</Text>
        <Text>Make sure you have set EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY in your .env file</Text>
      </View>
    );
  }

  return (
    <ClerkProvider
      publishableKey={clerkPublishableKey}
      tokenCache={tokenCache}
      navigate={(to) => {
        // Handle navigation for OAuth callbacks
        console.log('Navigating to:', to);
      }}
    >
      <AppContent />
    </ClerkProvider>
  );
}