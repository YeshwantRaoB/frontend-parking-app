import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Modal,
  Alert,
  ActivityIndicator,
  Dimensions,
  Image,
  ScrollView,
} from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import * as ImageManipulator from 'expo-image-manipulator';
import { useAuth } from '@clerk/clerk-expo';
import { API_BASE_URL } from '../config';

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

const LicensePlateScanner = ({ visible, onClose, onVehicleFound }) => {
  const [permission, requestPermission] = useCameraPermissions();
  const [isProcessing, setIsProcessing] = useState(false);
  const [capturedImage, setCapturedImage] = useState(null);
  const [extractedText, setExtractedText] = useState('');
  const [processingStep, setProcessingStep] = useState('');
  const [cameraFacing, setCameraFacing] = useState('back');
  const [showPreview, setShowPreview] = useState(false);
  const cameraRef = useRef(null);
  const { getToken } = useAuth();

  // Request permissions when modal becomes visible
  useEffect(() => {
    if (visible && !permission) {
      requestPermission();
    }
  }, [visible]);

  // Preprocess image for better OCR results
  const preprocessImage = async (imageUri) => {
    try {
      const processedImage = await ImageManipulator.manipulateAsync(
        imageUri,
        [{ resize: { width: 800 } }],
        { compress: 0.8, format: ImageManipulator.SaveFormat.JPEG }
      );
      return processedImage.uri;
    } catch (error) {
      console.error('Image preprocessing error:', error);
      throw error;
    }
  };

  // Perform license plate recognition using Plate Recognizer API via backend
  const performOCR = async (imageUri) => {
    try {
      setProcessingStep('Analyzing license plate with AI...');

      const token = await getToken();

      // Create form data with the image
      const formData = new FormData();
      
      formData.append('image', {
        uri: imageUri,
        type: 'image/jpeg',
        name: 'license_plate.jpg'
      });

      const headers = {
        'Accept': 'application/json',
      };

      // Add authorization header
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }

      console.log('Sending image to backend for plate recognition...');
      
      const apiResponse = await fetch(
        `${API_BASE_URL}/scan-plate`,
        {
          method: 'POST',
          headers,
          body: formData,
        }
      );

      if (!apiResponse.ok) {
        const errorData = await apiResponse.json();
        throw new Error(errorData.error || 'Failed to scan license plate');
      }

      const data = await apiResponse.json();
      console.log('Plate recognition response:', data);

      return data;
    } catch (error) {
      console.error('OCR error:', error);
      throw error;
    }
  };

  // Clean and validate extracted text
  const cleanLicensePlateText = (rawText) => {
    let cleaned = rawText.replace(/\s+/g, '').toUpperCase();
    cleaned = cleaned.replace(/[^A-Z0-9]/g, '');
    
    const patterns = [
      /^[A-Z]{2}\d{2}[A-Z]{1,2}\d{4}$/,
      /^[A-Z]{2}\d{2}[A-Z]{2}\d{4}$/,
      /^[A-Z]{3}\d{4}$/,
      /^[A-Z]{2}\d{1,2}[A-Z]{1,2}\d{1,4}$/,
    ];

    const possiblePlates = [];
    
    for (const pattern of patterns) {
      if (pattern.test(cleaned)) {
        possiblePlates.push(cleaned);
      }
    }

    if (possiblePlates.length === 0) {
      const sequences = cleaned.match(/[A-Z]{2,3}\d{1,4}[A-Z]{0,2}\d{0,4}/g) || [];
      possiblePlates.push(...sequences);
    }

    return possiblePlates;
  };

  // Search for vehicle in database
  const searchVehicleInDatabase = async (licensePlate) => {
    try {
      setProcessingStep('Searching database...');
      const token = await getAuthToken();

      const headers = {
        'Content-Type': 'application/json',
      };

      // Only add authorization header if token is available
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }

      const response = await fetch(
        `${API_BASE_URL}/vehicles/lookup/${encodeURIComponent(licensePlate)}`,
        {
          headers,
        }
      );

      if (!response.ok) {
        throw new Error('Failed to search database');
      }

      const data = await response.json();
      return data.found ? data.vehicle : null;
    } catch (error) {
      console.error('Database search error:', error);
      throw error;
    }
  };

  const takePicture = async () => {
    if (!cameraRef.current) return;

    try {
      setIsProcessing(true);
      setProcessingStep('Capturing image...');

      const photo = await cameraRef.current.takePictureAsync({
        quality: 0.8,
        base64: false,
        skipProcessing: false,
      });

      setCapturedImage(photo.uri);
      setShowPreview(true);

      const processedImageUri = await preprocessImage(photo.uri);
      const scanResult = await performOCR(processedImageUri);
      
      // Check if plate was detected
      if (!scanResult.plateDetected) {
        setExtractedText('No plate detected');
        Alert.alert(
          'No License Plate Detected',
          'Could not detect a valid license plate. Please try again with better lighting and ensure the plate is clearly visible.',
          [
            { text: 'Retry', onPress: () => setShowPreview(false) },
            { text: 'Cancel', onPress: onClose }
          ]
        );
        return;
      }

      // Set the detected plate text for display
      const detectedPlate = scanResult.detectedPlate;
      const confidence = scanResult.confidence ? `(${Math.round(scanResult.confidence * 100)}% confidence)` : '';
      setExtractedText(`${detectedPlate} ${confidence}`);

      // Check if vehicle was found in database
      if (scanResult.found && scanResult.vehicle) {
        Alert.alert(
          'Vehicle Found! ✅',
          `License Plate: ${detectedPlate}\n${confidence}\n\nOwner: ${scanResult.vehicle.fullName}\nDesignation: ${scanResult.vehicle.designation}\nBranch: ${scanResult.vehicle.branch}${scanResult.vehicle.registerNumber ? `\nRegister Number: ${scanResult.vehicle.registerNumber}` : ''}${scanResult.vehicle.department ? `\nDepartment: ${scanResult.vehicle.department}` : ''}`,
          [
            {
              text: 'View Details',
              onPress: () => {
                onVehicleFound(scanResult.vehicle);
                onClose();
              }
            },
            { text: 'Scan Another', onPress: () => setShowPreview(false) }
          ]
        );
      } else {
        Alert.alert(
          'Vehicle Not Registered ❌',
          `License Plate Detected: ${detectedPlate}\n${confidence}\n\nThis vehicle is not registered in the system.`,
          [
            { text: 'Scan Another', onPress: () => setShowPreview(false) },
            { text: 'Close', onPress: onClose }
          ]
        );
      }

    } catch (error) {
      console.error('License plate scanning error:', error);
      Alert.alert(
        'Scanning Error',
        error.message || 'Failed to process the image. Please try again.',
        [
          { text: 'Retry', onPress: () => setShowPreview(false) },
          { text: 'Cancel', onPress: onClose }
        ]
      );
    } finally {
      setIsProcessing(false);
      setProcessingStep('');
    }
  };

  const resetScanner = () => {
    setCapturedImage(null);
    setExtractedText('');
    setShowPreview(false);
    setIsProcessing(false);
    setProcessingStep('');
  };

  // Check if permission is still loading
  if (!permission) {
    return (
      <Modal visible={visible} animationType="slide">
        <View style={styles.container}>
          <View style={styles.centered}>
            <ActivityIndicator size="large" color="#4a90e2" />
            <Text style={styles.loadingText}>Loading camera...</Text>
          </View>
        </View>
      </Modal>
    );
  }

  // Check if permission is denied
  if (!permission.granted) {
    return (
      <Modal visible={visible} animationType="slide">
        <View style={styles.container}>
          <View style={styles.header}>
            <Text style={styles.headerTitle}>Camera Permission Required</Text>
            <TouchableOpacity style={styles.closeButton} onPress={onClose}>
              <Text style={styles.closeButtonText}>✕</Text>
            </TouchableOpacity>
          </View>
          <View style={styles.centered}>
            <Text style={styles.errorText}>Camera permission is required to scan license plates</Text>
            <TouchableOpacity style={styles.button} onPress={requestPermission}>
              <Text style={styles.buttonText}>Grant Permission</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.button, styles.cancelButton]} onPress={onClose}>
              <Text style={styles.buttonText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    );
  }

  return (
    <Modal visible={visible} animationType="slide">
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>License Plate Scanner</Text>
          <TouchableOpacity style={styles.closeButton} onPress={onClose}>
            <Text style={styles.closeButtonText}>✕</Text>
          </TouchableOpacity>
        </View>

        {showPreview ? (
          <ScrollView style={styles.previewContainer}>
            {capturedImage && (
              <View style={styles.imagePreview}>
                <Text style={styles.previewTitle}>Captured Image:</Text>
                <Image source={{ uri: capturedImage }} style={styles.previewImage} />
              </View>
            )}
            
            {isProcessing ? (
              <View style={styles.processingContainer}>
                <ActivityIndicator size="large" color="#4a90e2" />
                <Text style={styles.processingText}>{processingStep}</Text>
              </View>
            ) : (
              <View style={styles.resultContainer}>
                <Text style={styles.resultTitle}>Extracted Text:</Text>
                <Text style={styles.extractedText}>{extractedText || 'No text detected'}</Text>
                
                <View style={styles.previewButtons}>
                  <TouchableOpacity style={styles.retryButton} onPress={resetScanner}>
                    <Text style={styles.buttonText}>Scan Another</Text>
                  </TouchableOpacity>
                </View>
              </View>
            )}
          </ScrollView>
        ) : (
          <>
            <CameraView
              ref={cameraRef}
              style={styles.camera}
              facing={cameraFacing}
            >
              <View style={styles.cameraOverlay}>
                <View style={styles.scanFrame}>
                  <View style={styles.scanCorner} />
                  <View style={[styles.scanCorner, styles.topRight]} />
                  <View style={[styles.scanCorner, styles.bottomLeft]} />
                  <View style={[styles.scanCorner, styles.bottomRight]} />
                </View>
                
                <Text style={styles.instructionText}>
                  Position the license plate within the frame
                </Text>
              </View>
            </CameraView>

            <View style={styles.controls}>
              <TouchableOpacity
                style={[styles.captureButton, isProcessing && styles.captureButtonDisabled]}
                onPress={takePicture}
                disabled={isProcessing}
              >
                {isProcessing ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={styles.captureButtonText}>📷 Scan Plate</Text>
                )}
              </TouchableOpacity>
            </View>
          </>
        )}
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 50,
    paddingBottom: 20,
    backgroundColor: '#1a1a1a',
  },
  headerTitle: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  closeButton: {
    padding: 10,
  },
  closeButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  camera: {
    flex: 1,
  },
  cameraOverlay: {
    flex: 1,
    backgroundColor: 'transparent',
    justifyContent: 'center',
    alignItems: 'center',
  },
  scanFrame: {
    width: screenWidth * 0.8,
    height: screenHeight * 0.3,
    borderWidth: 2,
    borderColor: '#4a90e2',
    borderRadius: 10,
    position: 'relative',
  },
  scanCorner: {
    position: 'absolute',
    width: 30,
    height: 30,
    borderColor: '#4a90e2',
    borderLeftWidth: 3,
    borderTopWidth: 3,
    left: -2,
    top: -2,
  },
  topRight: {
    left: 'auto',
    right: -2,
    borderRightWidth: 3,
    borderLeftWidth: 0,
  },
  bottomLeft: {
    top: 'auto',
    bottom: -2,
    borderTopWidth: 0,
    borderBottomWidth: 3,
  },
  bottomRight: {
    left: 'auto',
    top: 'auto',
    right: -2,
    bottom: -2,
    borderLeftWidth: 0,
    borderTopWidth: 0,
    borderRightWidth: 3,
    borderBottomWidth: 3,
  },
  instructionText: {
    color: '#fff',
    fontSize: 16,
    marginTop: 20,
    textAlign: 'center',
    backgroundColor: 'rgba(0,0,0,0.5)',
    padding: 10,
    borderRadius: 5,
  },
  controls: {
    position: 'absolute',
    bottom: 30,
    left: 0,
    right: 0,
    alignItems: 'center',
  },
  captureButton: {
    backgroundColor: '#4a90e2',
    borderRadius: 50,
    padding: 15,
    paddingHorizontal: 30,
    elevation: 5,
  },
  captureButtonDisabled: {
    backgroundColor: '#999',
  },
  captureButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  previewContainer: {
    flex: 1,
    backgroundColor: '#000',
    padding: 20,
  },
  imagePreview: {
    marginBottom: 20,
  },
  previewTitle: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 10,
  },
  previewImage: {
    width: '100%',
    height: 200,
    borderRadius: 10,
  },
  processingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 50,
  },
  processingText: {
    color: '#fff',
    marginTop: 20,
    fontSize: 16,
  },
  resultContainer: {
    backgroundColor: '#1a1a1a',
    borderRadius: 10,
    padding: 20,
    marginTop: 20,
  },
  resultTitle: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 10,
  },
  extractedText: {
    color: '#4a90e2',
    fontSize: 18,
    marginBottom: 20,
  },
  previewButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  retryButton: {
    backgroundColor: '#4a90e2',
    padding: 10,
    borderRadius: 5,
    flex: 1,
    alignItems: 'center',
  },
  buttonText: {
    color: '#fff',
    fontWeight: 'bold',
  },
  errorText: {
    color: '#ff4444',
    fontSize: 16,
    marginBottom: 20,
    textAlign: 'center',
  },
  button: {
    backgroundColor: '#4a90e2',
    padding: 15,
    borderRadius: 5,
    width: '80%',
    alignItems: 'center',
    marginTop: 10,
  },
  cancelButton: {
    backgroundColor: '#999',
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  loadingText: {
    color: '#fff',
    marginTop: 10,
    fontSize: 16,
  },
});

export default LicensePlateScanner;