import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth, useOAuth } from '@clerk/clerk-expo';
import Footer from '../components/Footer';

export default function LoginScreen({ navigation }) {
  const { isLoaded } = useAuth();
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
        <View style={styles.logoContainer}>
          <Text style={styles.logoText}>🚗</Text>
        </View>
        <Text style={styles.title}>College Parking Management</Text>
        <Text style={styles.subtitle}>Sign in with your college email to continue</Text>
        
        {isLoading ? (
          <View style={[styles.button, styles.loadingButton]}>
            <ActivityIndicator color="#fff" />
            <Text style={styles.loadingText}>Signing in...</Text>
          </View>
        ) : (
          <TouchableOpacity 
            style={styles.button} 
            onPress={handleGoogleSignIn}
            disabled={isLoading}
          >
            <Text style={styles.buttonText}>🔐 Sign In with Google</Text>
          </TouchableOpacity>
        )}
        
        <TouchableOpacity 
          style={[styles.button, { backgroundColor: '#28a745', marginTop: 20 }]} 
          onPress={() => navigation.navigate('Test')}
        >
          <Text style={styles.buttonText}>🔧 Test Network Connection</Text>
        </TouchableOpacity>

        <Text style={styles.footerText}>
          For students, teachers, and college management
        </Text>
      </View>
      
      <Footer />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  content: {
    flex: 1,
    padding: 30,
    justifyContent: 'center',
    alignItems: 'center',
  },
  logoContainer: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: '#4a90e2',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 30,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 5,
  },
  logoText: {
    fontSize: 50,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    marginBottom: 10,
    textAlign: 'center',
    color: '#333',
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginBottom: 40,
    paddingHorizontal: 20,
    lineHeight: 22,
  },
  button: {
    backgroundColor: '#4a90e2',
    padding: 18,
    borderRadius: 12,
    width: '100%',
    maxWidth: 320,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  buttonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
  },
  loadingButton: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    color: '#fff',
    fontSize: 16,
    marginLeft: 10,
  },
  footerText: {
    fontSize: 14,
    color: '#999',
    textAlign: 'center',
    marginTop: 30,
    fontStyle: 'italic',
  },
});
