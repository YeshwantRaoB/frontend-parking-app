import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, Image, TouchableOpacity, StyleSheet, ScrollView, ActivityIndicator, Alert } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { useNavigation } from '@react-navigation/native';
import { useUser, useAuth } from '@clerk/clerk-expo';

export default function RegistrationScreen() {
  const [licencePlate, setLicencePlate] = useState('');
  const [fullName, setFullName] = useState('');
  const [branch, setBranch] = useState('');
  const [designation, setDesignation] = useState('');
  const [photo, setPhoto] = useState(null);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [userData, setUserData] = useState(null);
  const navigation = useNavigation();
  const { user } = useUser();
  const { getToken } = useAuth();

  // Pre-fill user data if available
  useEffect(() => {
    if (user) {
      setFullName(`${user.firstName || ''} ${user.lastName || ''}`.trim());
      setUserData({
        email: user.primaryEmailAddress?.emailAddress,
        name: `${user.firstName || ''} ${user.lastName || ''}`.trim()
      });
    }
  }, [user]);

  const pickImage = async () => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission required', 'Permission to access gallery is required to select photos.');
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 1,
      });

      if (!result.cancelled) {
        if (result.uri) {
          setPhoto(result.uri);
        } else if (result.assets && result.assets.length > 0) {
          setPhoto(result.assets[0].uri);
        } else {
          setPhoto(null);
        }
      } else {
        setPhoto(null);
      }
    } catch (error) {
      Alert.alert('Error', 'An error occurred while picking the image.');
    }
  };

  const handleSubmit = async () => {
    if (
      !licencePlate.trim() ||
      !fullName.trim() ||
      !branch.trim() ||
      !designation.trim() ||
      !photo ||
      photo.length === 0
    ) {
      Alert.alert('Validation error', 'Please fill all fields including the photo');
      return;

    setLoading(true);
    setMessage('');

    try {
      const token = await getToken();
      
      // First upload the image
      const formData = new FormData();
      formData.append('image', {
        uri: photo,
        name: 'photo.jpg',
        type: 'image/jpeg',
      });

      const imageResponse = await fetch('http://192.168.156.57:5000/upload-image', {
        method: 'POST',
        body: formData,
        headers: { 
          'Content-Type': 'multipart/form-data',
          'Authorization': `Bearer ${token}`,
        },
      });

      const imageJson = await imageResponse.json();

      if (!imageResponse.ok) {
        throw new Error(imageJson.error || 'Image upload failed');
      }

      const photoUrl = imageJson.url;

      // Then register the vehicle
      const response = await fetch('http://192.168.156.57:5000/register', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ 
          licencePlate, 
          fullName, 
          branch, 
          designation, 
          photoUrl,
          userId: user?.id // Link to Clerk user ID
        }),
      });

      const json = await response.json();

      if (response.ok) {
        Alert.alert('Success', 'Vehicle registration successful!');
        setLicencePlate('');
        setBranch('');
        setDesignation('');
        setPhoto(null);
        // Keep the name field filled with user's name
        setMessage('Registration successful! You can register another vehicle or go back.');
      } else {
        throw new Error(json.error || 'Registration failed');
      }
    } catch (error) {
      console.error('Registration error:', error);
      Alert.alert('Error', error.message || 'An error occurred during registration');
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.title}>Vehicle Registration</Text>
      
      {userData && (
        <View style={styles.userInfo}>
          <Text style={styles.userInfoText}>Logged in as: {userData.name}</Text>
          <Text style={styles.userInfoText}>{userData.email}</Text>
        </View>
      )}
      
      {message ? <Text style={styles.message}>{message}</Text> : null}
      
      <TextInput
        style={styles.input}
        placeholder="Licence Plate Number"
        value={licencePlate}
        onChangeText={setLicencePlate}
        autoCapitalize="characters"
      />
      
      <TextInput
        style={styles.input}
        placeholder="Full Name"
        value={fullName}
        onChangeText={setFullName}
      />
      
      <TextInput
        style={styles.input}
        placeholder="Branch/Department"
        value={branch}
        onChangeText={setBranch}
      />
      
      <TextInput
        style={styles.input}
        placeholder="Designation"
        value={designation}
        onChangeText={setDesignation}
      />
      
      <TouchableOpacity style={styles.uploadButton} onPress={pickImage} disabled={loading}>
        <Text style={styles.uploadButtonText}>
          {photo ? 'Change Photo' : 'Upload Vehicle Photo'}
        </Text>
      </TouchableOpacity>
      
      {photo && (
        <Image source={{ uri: photo }} style={styles.previewImage} />
      )}
      
      {loading ? (
        <ActivityIndicator size="large" color="#4a90e2" style={styles.loader} />
      ) : (
        <TouchableOpacity 
          style={[styles.submitButton, loading && styles.disabledButton]} 
          onPress={handleSubmit}
          disabled={loading}
        >
          <Text style={styles.submitButtonText}>
            {loading ? 'Processing...' : 'Register Vehicle'}
          </Text>
        </TouchableOpacity>
      )}
      
      <TouchableOpacity 
        style={styles.backButton}
        onPress={() => navigation.goBack()}
        disabled={loading}
      >
        <Text style={styles.backButtonText}>Back to Home</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 20,
    backgroundColor: '#f6f6f6',
    flexGrow: 1,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 16,
    textAlign: 'center',
    color: '#333',
  },
  userInfo: {
    backgroundColor: '#e3f2fd',
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
  },
  userInfoText: {
    fontSize: 14,
    color: '#1976d2',
    marginBottom: 4,
  },
  label: {
    fontSize: 16,
    marginTop: 14,
    marginBottom: 7,
  },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 14,
    marginBottom: 16,
    fontSize: 16,
    backgroundColor: '#fff',
  },
  uploadButton: {
    backgroundColor: '#4a90e2',
    padding: 15,
    borderRadius: 8,
    alignItems: 'center',
    marginBottom: 16,
    opacity: 1,
  },
  uploadButtonDisabled: {
    opacity: 0.6,
  },
  uploadButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  loader: {
    marginVertical: 24,
  },
  message: {
    marginTop: 20,
    fontSize: 16,
    fontWeight: 'bold',
    textAlign: 'center',
    color: '#2e7d32',
    backgroundColor: '#e8f5e9',
    padding: 10,
    borderRadius: 6,
  },
  loader: {
    marginVertical: 24,
  },
  backButton: {
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 10,
    borderWidth: 1,
    borderColor: '#ddd',
    backgroundColor: '#fff',
  },
  backButtonText: {
    color: '#333',
    fontSize: 16,
    fontWeight: '500',
  },
  submitButton: {
    backgroundColor: '#4CAF50',
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 10,
    marginBottom: 16,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  disabledButton: {
    backgroundColor: '#a5d6a7',
  },
  submitButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  previewImage: {
    width: '100%',
    height: 200,
    borderRadius: 8,
    marginBottom: 16,
    resizeMode: 'cover',
    borderWidth: 1,
    borderColor: '#eee',
  },
})};
