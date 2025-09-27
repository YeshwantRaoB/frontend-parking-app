import * as React from 'react';
import { View, Text, Button } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { 
  ClerkProvider, 
  useAuth,
  useSession,
  useClerk 
} from '@clerk/clerk-expo';
import * as SecureStore from 'expo-secure-store';
import * as WebBrowser from 'expo-web-browser';

// Import screens
import LoginScreen from './screens/LoginScreen';
import HomeScreen from './screens/HomeScreen';

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

// Main app navigation
function AppContent() {
  const { isLoaded, isSignedIn } = useAuth();
  const { session } = useSession();
  const { signOut } = useClerk();

  // Show loading state while Clerk is initializing
  if (!isLoaded) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <Text>Loading...</Text>
      </View>
    );
  }

  return (
    <NavigationContainer>
      <Stack.Navigator>
        {isSignedIn ? (
          // Signed in users see this
          <Stack.Screen 
            name="Home" 
            component={HomeScreen} 
            options={{
              headerShown: true,
              title: 'College Parking App',
              headerRight: () => (
                <Button 
                  onPress={signOut}
                  title="Sign Out"
                />
              )
            }}
          />
        ) : (
          // Signed out users see this
          <Stack.Screen 
            name="Login" 
            component={LoginScreen} 
            options={{ headerShown: false }}
          />
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