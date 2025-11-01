import * as React from 'react';
import { View, Text, ActivityIndicator, Platform } from 'react-native';
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
import * as Device from 'expo-device';
import messaging from '@react-native-firebase/messaging';
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

// Request Firebase messaging permission
const requestFirebasePermission = async () => {
  try {
    if (Platform.OS === 'ios') {
      const authStatus = await messaging().requestPermission();
      const enabled =
        authStatus === messaging.AuthorizationStatus.AUTHORIZED ||
        authStatus === messaging.AuthorizationStatus.PROVISIONAL;
      
      if (enabled) {
        console.log('iOS Firebase authorization status:', authStatus);
      }
      return enabled;
    }
    return true; // Android doesn't need this step
  } catch (error) {
    console.error('Error requesting Firebase permission:', error);
    return false;
  }
};

// Register for push notifications
const registerForPushNotificationsAsync = async (getToken) => {
  try {
    console.log('Starting push notification registration...');

    // Check if running on a physical device
    if (!Device.isDevice) {
      console.log('Must use physical device for push notifications');
      return null;
    }

    // Check if running in Expo Go
    const isExpoGo = Constants.executionEnvironment === 'storeClient';
    console.log('Is Expo Go:', isExpoGo);

    if (isExpoGo) {
      console.log('Running in Expo Go - push notifications may not work properly with FCM');
      return null;
    }

    // Request Firebase permission (iOS only)
    const hasFirebasePermission = await requestFirebasePermission();
    if (!hasFirebasePermission && Platform.OS === 'ios') {
      console.log('Firebase permission not granted');
      return null;
    }

    // Request notification permissions
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

    // Get Firebase Cloud Messaging token
    console.log('Getting FCM token...');
    const fcmToken = await messaging().getToken();
    console.log('FCM token obtained:', fcmToken);

    // Also get Expo push token for compatibility
    let expoPushToken = null;
    try {
      const projectId = Constants.expoConfig?.extra?.eas?.projectId;
      if (projectId) {
        expoPushToken = (await Notifications.getExpoPushTokenAsync({ projectId })).data;
        console.log('Expo push token obtained:', expoPushToken);
      }
    } catch (error) {
      console.log('Could not get Expo push token:', error.message);
    }

    // Send tokens to server
    const authToken = await getToken();
    if (authToken) {
      console.log('Sending tokens to server...');
      await fetch(`${API_BASE_URL}/register-push-token`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authToken}`,
        },
        body: JSON.stringify({ 
          pushToken: expoPushToken || fcmToken,
          fcmToken: fcmToken,
          platform: Platform.OS
        }),
      });
      console.log('Tokens registered with server successfully');
    }

    return fcmToken;
  } catch (error) {
    console.error('Error registering for push notifications:', error);
    console.error('Error details:', error.message);
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

  // Handle foreground notifications
  React.useEffect(() => {
    const unsubscribeForeground = messaging().onMessage(async remoteMessage => {
      console.log('Foreground notification received:', remoteMessage);
      
      // Show local notification when app is in foreground
      await Notifications.scheduleNotificationAsync({
        content: {
          title: remoteMessage.notification?.title || 'New Notification',
          body: remoteMessage.notification?.body || '',
          data: remoteMessage.data,
        },
        trigger: null,
      });
    });

    // Handle notification opened when app is in background
    const unsubscribeBackground = messaging().onNotificationOpenedApp(remoteMessage => {
      console.log('Notification opened from background:', remoteMessage);
      // Handle navigation based on notification data if needed
    });

    // Check if app was opened by a notification
    messaging()
      .getInitialNotification()
      .then(remoteMessage => {
        if (remoteMessage) {
          console.log('App opened by notification:', remoteMessage);
          // Handle navigation based on notification data if needed
        }
      });

    return () => {
      unsubscribeForeground();
      unsubscribeBackground();
    };
  }, []);

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