import React, { useState, useEffect, useRef } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ActivityIndicator, Alert, Image, ScrollView } from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import * as ImageManipulator from 'expo-image-manipulator';


export default function LicensePlateScanner() {
  const [permission, requestPermission] = useCameraPermissions();
  const [isProcessing, setIsProcessing] = useState(false);
  const [capturedPhoto, setCapturedPhoto] = useState(null);
  const [recognizedPlate, setRecognizedPlate] = useState('');
  const [vehicleData, setVehicleData] = useState(null);
  const cameraRef = useRef(null);

  useEffect(() => {
    if (!permission?.granted) {
      requestPermission();
    }
  }, [permission]);

  const takePicture = async () => {
  if (cameraRef.current && !isProcessing) {
    try {
      setIsProcessing(true);
      const photo = await cameraRef.current.takePictureAsync({ base64: true });
      
      // Resize and compress image to reduce size below 1MB
      const manipResult = await ImageManipulator.manipulateAsync(
        photo.uri,
        [{ resize: { width: 800 } }],  // resize width to 800px, height auto
        { compress: 0.6, format: ImageManipulator.SaveFormat.JPEG, base64: true }
      );

      setCapturedPhoto(manipResult.uri);

      await processImage(manipResult.base64);
    } catch (error) {
      Alert.alert('Error', 'Failed to take picture: ' + error.message);
      setIsProcessing(false);
    }
  }
};


  const processImage = async (base64Image) => {
    try {
      const formData = new FormData();
      formData.append('base64Image', 'data:image/jpg;base64,' + base64Image);
      formData.append('language', 'eng');
      formData.append('isOverlayRequired', 'false');

      const OCR_SPACE_API_KEY = 'K89074162588957'; // Your api key

      setRecognizedPlate('');
      setVehicleData(null);

      const response = await fetch('https://api.ocr.space/parse/image', {
        method: 'POST',
        headers: { apikey: OCR_SPACE_API_KEY },
        body: formData,
      });

      const result = await response.json();

      if (result.IsErroredOnProcessing) {
        throw new Error(result.ErrorMessage ? result.ErrorMessage[0] : 'OCR failed');
      }

      const parsedText = result.ParsedResults?.[0]?.ParsedText || '';
      if (!parsedText) {
        Alert.alert('OCR Result', 'No text could be recognized. Please try again.');
        setIsProcessing(false);
        return;
      }

      const matched = parsedText.match(/[A-Z0-9]{4,10}/gi);
      const plate = matched ? matched[0].toUpperCase() : parsedText.trim().toUpperCase();
      setRecognizedPlate(plate);

      await searchVehicle(plate);

    } catch (error) {
      Alert.alert('OCR Error', error.message);
      setIsProcessing(false);
    }
  };

  const searchVehicle = async (plateNumber) => {
    try {
      const response = await fetch(`http://192.168.156.57:5000/vehicles?licencePlate=${encodeURIComponent(plateNumber)}`); // Replace with your backend IP
      if (!response.ok) {
        throw new Error('Vehicle not found');
      }
      const data = await response.json();

      if (!data || data.length === 0) {
        Alert.alert('No vehicle found', `No vehicle found with licence plate: ${plateNumber}`);
        setVehicleData(null);
      } else {
        setVehicleData(data[0]);
      }
    } catch (error) {
      Alert.alert('Error', error.message);
      setVehicleData(null);
    } finally {
      setIsProcessing(false);
    }
  };

  if (!permission) {
    return <View style={styles.center}><Text>Requesting camera permission...</Text></View>;
  }
  if (!permission.granted) {
    return (
      <View style={styles.center}>
        <Text>No access to camera</Text>
        <TouchableOpacity onPress={requestPermission} style={styles.captureButton}>
          <Text style={styles.buttonText}>Grant Permission</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <ScrollView contentContainerStyle={styles.container}>
      {capturedPhoto ? (
        <>
          <Image source={{ uri: capturedPhoto }} style={styles.capturedImage} />
          <TouchableOpacity
            style={styles.captureButton}
            onPress={() => { setCapturedPhoto(null); setRecognizedPlate(''); setVehicleData(null); setIsProcessing(false); }}>
            <Text style={styles.buttonText}>Retake Photo</Text>
          </TouchableOpacity>
        </>
      ) : (
        <CameraView
          ref={cameraRef}
          style={styles.camera}
          onCameraReady={() => console.log('Camera is ready')}
        >
          <View style={styles.cameraButtonContainer}>
            <TouchableOpacity onPress={takePicture} style={styles.captureButton} disabled={isProcessing}>
              {
                isProcessing ? (
                  <ActivityIndicator color="#fff" size="large" />
                ) : (
                  <Text style={styles.buttonText}>Capture Plate</Text>
                )
              }
            </TouchableOpacity>
          </View>
        </CameraView>
      )}

      {recognizedPlate ? <Text style={styles.plateText}>Recognized Plate: {recognizedPlate}</Text> : null}

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
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 12,
    backgroundColor: '#000',
    flexGrow: 1,
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  camera: {
    height: 350,
    justifyContent: 'flex-end',
  },
  cameraButtonContainer: {
    backgroundColor: 'transparent',
    alignSelf: 'center',
    marginBottom: 20,
  },
  captureButton: {
    backgroundColor: '#cc0000',
    padding: 15,
    borderRadius: 10,
  },
  buttonText: {
    color: '#fff',
    fontWeight: 'bold',
    textAlign: 'center',
  },
  capturedImage: {
    width: '100%',
    height: 350,
    borderRadius: 10,
  },
  plateText: {
    marginTop: 12,
    fontSize: 20,
    fontWeight: 'bold',
    color: '#fff',
    textAlign: 'center',
  },
  resultContainer: {
    marginTop: 16,
    padding: 16,
    backgroundColor: '#222',
    borderRadius: 10,
  },
  resultLabel: {
    color: '#fff',
    fontSize: 18,
    marginBottom: 8,
  },
  photo: {
    width: 140,
    height: 140,
    borderRadius: 8,
    marginTop: 10,
    alignSelf: 'center',
  },
});
