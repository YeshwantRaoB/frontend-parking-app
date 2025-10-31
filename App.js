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
import * as Notifications from 'expo-notifications';
import Constants from 'expo-constants';
import { API_BASE_URL } from './config';

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

// Notification setup
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

// Register for push notifications
const registerForPushNotificationsAsync = async (getToken) => {
  try {
    console.log('Starting push notification registration...');

    // Check if running in Expo Go
    const isExpoGo = !Constants.executionEnvironment;
    console.log('Is Expo Go:', isExpoGo);

    if (isExpoGo) {
      console.log('Running in Expo Go - push notifications may not work properly');
      // For Expo Go, we'll skip Firebase-dependent features
      return null;
    }

    // Wait for app to be ready
    await new Promise(resolve => setTimeout(resolve, 3000));

    // Check if notifications are supported
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    console.log('Existing notification permission status:', existingStatus);

    let finalStatus = existingStatus;

    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
      console.log('Requested permission, new status:', finalStatus);
    }

    if (finalStatus !== 'granted') {
      console.log('Failed to get push token for push notification!');
      return null;
    }

    // Get the push token
    console.log('Getting Expo push token...');
    const token = (await Notifications.getExpoPushTokenAsync()).data;
    console.log('Push token obtained:', token);

    // Send token to server
    const authToken = await getToken();
    if (authToken) {
      console.log('Sending token to server...');
      await fetch(`${API_BASE_URL}/register-push-token`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authToken}`,
        },
        body: JSON.stringify({ pushToken: token }),
      });
      console.log('Token registered with server successfully');
    }

    return token;
  } catch (error) {
    console.error('Error registering for push notifications:', error);
    // Don't throw error, just log it - notifications are not critical
    return null;
  }
};

// Main app navigation
function AppContent() {
  const { isLoaded, isSignedIn, getToken } = useAuth();
  const { user, isLoaded: userLoaded } = useUser();

  // Register for push notifications when user signs in
  React.useEffect(() => {
    if (isSignedIn && user) {
      registerForPushNotificationsAsync(getToken);
    }
  }, [isSignedIn, user, getToken]);


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