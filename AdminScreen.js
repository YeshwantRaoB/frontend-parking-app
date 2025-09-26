import React, { useState } from 'react';
import { View, Text, TextInput, Button, Image, StyleSheet, ScrollView, ActivityIndicator, Alert } from 'react-native';
import { useNavigation } from '@react-navigation/native';

export default function AdminScreen() {
  const [searchPlate, setSearchPlate] = useState('');
  const [vehicleData, setVehicleData] = useState(null);
  const [loading, setLoading] = useState(false);
  const navigation = useNavigation();

  const handleSearch = async () => {
    if (!searchPlate.trim()) {
      Alert.alert('Input Error', 'Please enter a licence plate number to search.');
      return;
    }

    setLoading(true);
    setVehicleData(null);

    try {
      // Replace <Your IP> with your backend IP
      const response = await fetch(`http://192.168.64.57:5000/vehicles?licencePlate=${encodeURIComponent(searchPlate.trim())}`);

      if (!response.ok) {
        throw new Error('Vehicle not found');
      }

      const data = await response.json();

      if (!data || data.length === 0) {
        Alert.alert('No vehicle found', 'No vehicle found matching that licence plate.');
        setVehicleData(null);
      } else {
        setVehicleData(data[0]);
      }
    } catch (error) {
      Alert.alert('Error', error.message);
      setVehicleData(null);
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.title}>Admin Vehicle Search</Text>
      <TextInput
        style={styles.input}
        value={searchPlate}
        onChangeText={setSearchPlate}
        placeholder="Enter Licence Plate Number"
        autoCapitalize="characters"
      />
      <Button title="Search" onPress={handleSearch} color="#cc0000" />

      {loading && <ActivityIndicator size="large" color="#cc0000" style={{ marginTop: 20 }} />}

      {vehicleData && (
        <View style={styles.resultContainer}>
          <Text style={styles.resultLabel}>Licence Plate: {vehicleData.licencePlate}</Text>
          <Text style={styles.resultLabel}>Name: {vehicleData.fullName}</Text>
          <Text style={styles.resultLabel}>Branch: {vehicleData.branch}</Text>
          <Text style={styles.resultLabel}>Designation: {vehicleData.designation}</Text>
          {vehicleData.photoUrl ? (
            <Image source={{ uri: vehicleData.photoUrl }} style={styles.photo} />
          ) : (
            <Text>No photo available</Text>
          )}
        </View>
      )}
      <Button 
        title="Scan License Plate" 
        onPress={() => navigation.navigate('PlateScanner')} 
        color="#cc0000" 
      />
      <Button
        title="Test Camera"
        onPress={() => navigation.navigate('TestCamera')}
        color="#cc0000"
      />
      <Button 
        title="Go to Registration" 
        onPress={() => navigation.navigate('Registration')} 
        color="#888" 
        style={{ marginTop: 20 }}
      />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 18,
    backgroundColor: '#fff',
    flexGrow: 1,
  },
  title: {
    fontSize: 26,
    fontWeight: 'bold',
    marginBottom: 20,
    textAlign: 'center',
    color: '#cc0000',
  },
  input: {
    borderWidth: 1,
    borderColor: '#999',
    borderRadius: 7,
    padding: 10,
    fontSize: 18,
    marginBottom: 12,
  },
  resultContainer: {
    marginTop: 30,
    padding: 15,
    borderWidth: 1,
    borderColor: '#cc0000',
    borderRadius: 8,
    backgroundColor: '#ffe6e6',
  },
  resultLabel: {
    fontSize: 18,
    marginBottom: 8,
  },
  photo: {
    width: 140,
    height: 140,
    borderRadius: 8,
    marginTop: 10,
  },
});
