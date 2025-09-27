import React from 'react';
import { View, Text, TouchableOpacity, Image, StyleSheet, SafeAreaView, ActivityIndicator } from 'react-native';
import { useAuth, useOAuth } from '@clerk/clerk-expo';
import * as WebBrowser from 'expo-web-browser';

// WebBrowser.maybeCompleteAuthSession(); // For web only

export default function LoginScreen({ navigation }) {
  const { isLoaded, isSignedIn } = useAuth();
  const [isLoading, setIsLoading] = React.useState(false);
  
  // Use the useOAuth hook for Google OAuth
  const { startOAuthFlow } = useOAuth({ strategy: 'oauth_google' });

  // Handle Google OAuth sign-in
  const handleGoogleSignIn = async () => {
    if (!isLoaded) {
      console.log('Clerk not loaded yet');
      return;
    }
    
    try {
      setIsLoading(true);
      
      // Start the OAuth flow
      const { createdSessionId, setActive } = await startOAuthFlow();
      
      if (createdSessionId && setActive) {
        // User is signed in, update the session
        await setActive({ session: createdSessionId });
      } else {
        // Handle the case where the user didn't complete the OAuth flow
        throw new Error('OAuth flow was not completed');
      }
    } catch (err) {
      console.error('OAuth error:', err);
      // Show error to user
      alert(`Failed to sign in: ${err.message || 'Unknown error'}`);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <Image 
          source={require('../assets/logo.png')} 
          style={styles.logo}
          resizeMode="contain"
        />
        <Text style={styles.title}>Welcome to College Parking App</Text>
        <Text style={styles.subtitle}>Sign in to manage your parking</Text>
        
        {isLoading ? (
          <View style={[styles.button, styles.loadingButton]}>
            <ActivityIndicator color="#fff" />
          </View>
        ) : (
          <TouchableOpacity 
            style={styles.button} 
            onPress={handleGoogleSignIn}
            disabled={isLoading}
          >
            <Text style={styles.buttonText}>Sign In with Google</Text>
          </TouchableOpacity>
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  content: {
    flex: 1,
    padding: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  logo: {
    width: 150,
    height: 150,
    marginBottom: 24,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 8,
    textAlign: 'center',
    color: '#333',
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginBottom: 32,
  },
  button: {
    backgroundColor: '#007AFF',
    padding: 16,
    borderRadius: 8,
    width: '100%',
    maxWidth: 300,
    alignItems: 'center',
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  loadingButton: {
    justifyContent: 'center',
    alignItems: 'center',
  },
});
