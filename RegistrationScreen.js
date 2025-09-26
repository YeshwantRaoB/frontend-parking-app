import React, { useState } from 'react';
import { View, Text, TextInput, Button, Image, TouchableOpacity, StyleSheet, ScrollView, ActivityIndicator, Alert } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { useNavigation } from '@react-navigation/native';

export default function RegistrationScreen() {
  const [licencePlate, setLicencePlate] = useState('');
  const [fullName, setFullName] = useState('');
  const [branch, setBranch] = useState('');
  const [designation, setDesignation] = useState('');
  const [photo, setPhoto] = useState(null);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const navigation = useNavigation();

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
    }

    setLoading(true);
    setMessage('');

    try {
      const formData = new FormData();
      formData.append('image', {
        uri: photo,
        name: 'photo.jpg',
        type: 'image/jpeg',
      });

      // Replace <Your IP> with your backend IP address
      const imageResponse = await fetch('http://192.168.64.57:5000/upload-image', {
        method: 'POST',
        body: formData,
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      const imageJson = await imageResponse.json();

      if (!imageResponse.ok) {
        throw new Error(imageJson.error || 'Image upload failed');
      }

      const photoUrl = imageJson.url;

      const response = await fetch('http://192.168.64.57:5000/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ licencePlate, fullName, branch, designation, photoUrl }),
      });

      const json = await response.json();

      if (response.ok) {
        setMessage('Registration successful!');
        setLicencePlate('');
        setFullName('');
        setBranch('');
        setDesignation('');
        setPhoto(null);
      } else {
        setMessage(json.error || 'Registration failed');
      }
    } catch (error) {
      setMessage(error.message || 'Error connecting to server');
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.title}>Vehicle Registration</Text>

      <Text style={styles.label}>Licence Plate Number</Text>
      <TextInput
        style={styles.input}
        value={licencePlate}
        onChangeText={setLicencePlate}
        placeholder="e.g. KA01AB1234"
      />

      <Text style={styles.label}>Full Name</Text>
      <TextInput
        style={styles.input}
        value={fullName}
        onChangeText={setFullName}
        placeholder="Your Name"
      />

      <Text style={styles.label}>Branch</Text>
      <TextInput
        style={styles.input}
        value={branch}
        onChangeText={setBranch}
        placeholder="CSE / IT / Mech / etc."
      />

      <Text style={styles.label}>Designation</Text>
      <TextInput
        style={styles.input}
        value={designation}
        onChangeText={setDesignation}
        placeholder="Student / Teacher / Staff"
      />

      <Text style={styles.label}>Photo</Text>
      <TouchableOpacity onPress={pickImage} style={styles.photoButton}>
        <Text style={styles.photoButtonText}>
          {photo ? 'Change Photo' : 'Pick Photo'}
        </Text>
      </TouchableOpacity>
      {photo && <Image source={{ uri: photo }} style={styles.photo} />}

      {loading ? (
        <ActivityIndicator size="large" color="#0066cc" />
      ) : (
        <Button title="Register" onPress={handleSubmit} color="#0066cc" />
      )}

      {message ? <Text style={styles.message}>{message}</Text> : null}

      <Button 
        title="Go to Admin Screen" 
        onPress={() => navigation.navigate('AdminLogin')} 
        color="#888" 
      />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 18,
    backgroundColor: '#f6f6f6',
    flexGrow: 1,
  },
  title: {
    fontSize: 27,
    fontWeight: 'bold',
    marginVertical: 18,
    textAlign: 'center',
  },
  label: {
    fontSize: 16,
    marginTop: 14,
    marginBottom: 7,
  },
  input: {
    borderWidth: 1,
    borderColor: '#aaa',
    borderRadius: 7,
    padding: 10,
    fontSize: 16,
    backgroundColor: '#fff',
  },
  photoButton: {
    backgroundColor: '#0066cc',
    padding: 10,
    borderRadius: 7,
    marginVertical: 8,
    alignItems: 'center',
  },
  photoButtonText: {
    color: '#fff',
  },
  photo: {
    width: 110,
    height: 110,
    borderRadius: 7,
    marginVertical: 8,
  },
  message: {
    marginTop: 20,
    fontSize: 16,
    fontWeight: 'bold',
    color: '#006600',
    textAlign: 'center',
  },
});
