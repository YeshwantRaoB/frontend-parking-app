import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { API_BASE_URL } from '../config';

export default function NetworkDiagnostic() {
  const [status, setStatus] = useState('Testing...');
  const [details, setDetails] = useState('');

  const testConnection = async () => {
    setStatus('Testing...');
    setDetails('');

    try {
      // Test 1: Basic fetch to health endpoint
      const healthResponse = await fetch(`${API_BASE_URL}/health`, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
      });

      if (healthResponse.ok) {
        const data = await healthResponse.json();
        setStatus('✅ Connection Successful');
        setDetails(`Server is running. Response: ${JSON.stringify(data)}`);
      } else {
        setStatus('❌ Server Error');
        setDetails(`HTTP ${healthResponse.status}: ${healthResponse.statusText}`);
      }
    } catch (error) {
      setStatus('❌ Network Error');
      setDetails(`Error: ${error.message}\n\nTrying to connect to: ${API_BASE_URL}`);
    }
  };

  useEffect(() => {
    testConnection();
  }, []);

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Network Diagnostic</Text>
      <Text style={styles.status}>{status}</Text>
      <Text style={styles.details}>{details}</Text>
      <TouchableOpacity style={styles.button} onPress={testConnection}>
        <Text style={styles.buttonText}>Test Again</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 20,
    backgroundColor: '#f0f0f0',
    margin: 10,
    borderRadius: 8,
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 10,
  },
  status: {
    fontSize: 16,
    marginBottom: 10,
    fontWeight: '600',
  },
  details: {
    fontSize: 12,
    color: '#666',
    marginBottom: 15,
  },
  button: {
    backgroundColor: '#4a90e2',
    padding: 10,
    borderRadius: 6,
    alignItems: 'center',
  },
  buttonText: {
    color: '#fff',
    fontWeight: '600',
  },
});