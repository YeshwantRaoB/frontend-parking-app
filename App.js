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
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;

    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }

    if (finalStatus !== 'granted') {
      console.log('Failed to get push token for push notification!');
      return;
    }

    const token = (await Notifications.getExpoPushTokenAsync()).data;
    console.log('Push token:', token);

    // Send token to server
    const authToken = await getToken();
    if (authToken) {
      await fetch(`${API_BASE_URL}/register-push-token`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authToken}`,
        },
        body: JSON.stringify({ pushToken: token }),
      });
    }

    return token;
  } catch (error) {
    console.error('Error registering for push notifications:', error);
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