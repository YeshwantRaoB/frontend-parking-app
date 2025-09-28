import { useState, useEffect } from 'react';
import { View, Text, TextInput, Image, TouchableOpacity, StyleSheet, ScrollView, ActivityIndicator, Alert, Modal, FlatList } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { useNavigation } from '@react-navigation/native';
import { useUser, useAuth } from '@clerk/clerk-expo';
import { API_BASE_URL } from './config';
import Footer from './components/Footer';

// Branch/Department options
const BRANCH_OPTIONS = [
  'Automobile Engg.',
  'Chemical Engg.',
  'Civil Engg.',
  'Computer Science & Engg.',
  'Electronics & Communication Engg.',
  'Electrical & Electronics Engg.',
  'Mechanical Engg.',
  'Polymer Technology'
];

// Branch code mapping for register number validation
const BRANCH_CODES = {
  'Automobile Engg.': 'AT',
  'Chemical Engg.': 'CH',
  'Civil Engg.': 'CE',
  'Computer Science & Engg.': 'CS',
  'Electronics & Communication Engg.': 'EC',
  'Electrical & Electronics Engg.': 'EE',
  'Mechanical Engg.': 'ME',
  'Polymer Technology': 'PT'
};

// Designation options
const DESIGNATION_OPTIONS = ['Student', 'Staff'];

// Staff position options
const STAFF_POSITION_OPTIONS = ['HOD', 'Lecturer'];

export default function RegistrationScreen() {
  const [licencePlate, setLicencePlate] = useState('');
  const [fullName, setFullName] = useState('');
  const [branch, setBranch] = useState('');
  const [designation, setDesignation] = useState('');
  const [registerNumber, setRegisterNumber] = useState('');
  const [staffPosition, setStaffPosition] = useState('');
  const [vehicleName, setVehicleName] = useState('');
  const [vehiclePhoto, setVehiclePhoto] = useState(null);
  const [ownerPhoto, setOwnerPhoto] = useState(null);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [userData, setUserData] = useState(null);

  // Modal states for dropdowns
  const [showBranchModal, setShowBranchModal] = useState(false);
  const [showDesignationModal, setShowDesignationModal] = useState(false);
  const [showStaffPositionModal, setShowStaffPositionModal] = useState(false);

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

  const pickImage = async (type) => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission required', 'Permission to access gallery is required to select photos.');
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });

      if (!result.canceled) {
        const imageUri = result.uri || (result.assets && result.assets[0]?.uri);
        if (imageUri) {
          if (type === 'vehicle') {
            setVehiclePhoto(imageUri);
          } else if (type === 'owner') {
            setOwnerPhoto(imageUri);
          }
        }
      }
    } catch (error) {
      Alert.alert('Error', 'An error occurred while picking the image.');
    }
  };

  // Dropdown component
  const DropdownModal = ({ visible, onClose, options, onSelect, title }) => (
    <Modal visible={visible} animationType="slide" transparent={true}>
      <View style={styles.modalOverlay}>
        <View style={styles.dropdownModal}>
          <View style={styles.dropdownHeader}>
            <Text style={styles.dropdownTitle}>{title}</Text>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <Text style={styles.closeButtonText}>✕</Text>
            </TouchableOpacity>
          </View>
          <FlatList
            data={options}
            keyExtractor={(item, index) => index.toString()}
            renderItem={({ item }) => (
              <TouchableOpacity
                style={styles.dropdownItem}
                onPress={() => {
                  onSelect(item);
                  onClose();
                }}
              >
                <Text style={styles.dropdownItemText}>{item}</Text>
              </TouchableOpacity>
            )}
          />
        </View>
      </View>
    </Modal>
  );

  const handleSubmit = async () => {
    // Validation
    if (!licencePlate.trim() || !fullName.trim() || !branch.trim() || !designation.trim() || !vehicleName.trim() || !vehiclePhoto || !ownerPhoto) {
      Alert.alert('Validation error', 'Please fill all required fields and upload both photos');
      return;
    }

    if (designation === 'Student' && !registerNumber.trim()) {
      Alert.alert('Validation error', 'Register number is required for students');
      return;
    }

    if (designation === 'Staff' && !staffPosition.trim()) {
      Alert.alert('Validation error', 'Staff position (HOD or Lecturer) is required for staff');
      return;
    }

    // Validate register number format for students
    if (designation === 'Student') {
      // Format: 103 + BranchCode + YearDigits + RollNumber
      // Example: 103CS23062
      const registerPattern = /^103[A-Z]{2}\d{2}\d{3}$/;
      if (!registerPattern.test(registerNumber.toUpperCase())) {
        Alert.alert('Validation error', 'Register number must be in format 103XX##### (e.g., 103CS23062)\n\n103 = College code\nXX = Branch code (CS, ME, etc.)\n## = Year (23, 24, etc.)\n### = Roll number');
        return;
      }

      // Validate branch code matches selected branch
      const branchCode = BRANCH_CODES[branch];
      const registerBranchCode = registerNumber.toUpperCase().substring(3, 5);
      if (branchCode && registerBranchCode !== branchCode) {
        Alert.alert('Validation error', `Register number branch code (${registerBranchCode}) doesn't match selected branch. Expected: ${branchCode}`);
        return;
      }
    }

    setLoading(true);
    setMessage('');

    try {
      const token = await getToken();

      // Upload vehicle photo
      const vehicleFormData = new FormData();
      vehicleFormData.append('image', {
        uri: vehiclePhoto,
        name: 'vehicle_photo.jpg',
        type: 'image/jpeg',
      });

      const vehicleImageResponse = await fetch(`${API_BASE_URL}/upload-image`, {
        method: 'POST',
        body: vehicleFormData,
        headers: {
          'Content-Type': 'multipart/form-data',
          'Authorization': `Bearer ${token}`,
        },
      });

      const vehicleImageJson = await vehicleImageResponse.json();
      console.log('Vehicle photo upload response:', vehicleImageJson);
      if (!vehicleImageResponse.ok) {
        throw new Error(vehicleImageJson.error || 'Vehicle photo upload failed');
      }

      // Upload owner photo
      const ownerFormData = new FormData();
      ownerFormData.append('image', {
        uri: ownerPhoto,
        name: 'owner_photo.jpg',
        type: 'image/jpeg',
      });

      const ownerImageResponse = await fetch(`${API_BASE_URL}/upload-image`, {
        method: 'POST',
        body: ownerFormData,
        headers: {
          'Content-Type': 'multipart/form-data',
          'Authorization': `Bearer ${token}`,
        },
      });

      const ownerImageJson = await ownerImageResponse.json();
      console.log('Owner photo upload response:', ownerImageJson);
      if (!ownerImageResponse.ok) {
        throw new Error(ownerImageJson.error || 'Owner photo upload failed');
      }

      // Register the vehicle - ensure all possible field names are included
      const registrationData = {
        licencePlate: licencePlate.trim(),
        fullName: fullName.trim(),
        branch: branch.trim(),
        designation: designation.trim(),
        vehicleName: vehicleName.trim(),
        vehiclePhotoUrl: vehicleImageJson.url,
        ownerPhotoUrl: ownerImageJson.url,
        // Also try alternative field names the backend might expect
        photoUrl: vehicleImageJson.url, // Legacy field name
        userId: user?.id
      };

      // Add conditional fields
      if (designation === 'Student') {
        registrationData.registerNumber = registerNumber.trim();
      } else if (designation === 'Staff') {
        registrationData.staffPosition = staffPosition.trim();
        // Also send as department for backward compatibility
        registrationData.department = staffPosition.trim();
      }

      // Debug: Log the data being sent
      console.log('Registration data being sent:', JSON.stringify(registrationData, null, 2));

      const response = await fetch(`${API_BASE_URL}/register`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify(registrationData),
      });

      const json = await response.json();

      if (response.ok) {
        Alert.alert('Success', 'Vehicle registration successful!');
        // Reset form
        setLicencePlate('');
        setBranch('');
        setDesignation('');
        setRegisterNumber('');
        setStaffPosition('');
        setVehicleName('');
        setVehiclePhoto(null);
        setOwnerPhoto(null);
        setMessage('Registration successful! You can register another vehicle or go back.');
      } else {
        // Log the full error response for debugging
        console.error('Registration failed:', {
          status: response.status,
          statusText: response.statusText,
          error: json
        });
        throw new Error(json.error || json.message || 'Registration failed');
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
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
          disabled={loading}
        >
          <Text style={styles.backButtonText}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Vehicle Registration</Text>
        <View style={{ width: 60 }} />
      </View>

      {userData && (
        <View style={styles.userInfo}>
          <Text style={styles.userInfoText}>Logged in as: {userData.name}</Text>
          <Text style={styles.userInfoText}>{userData.email}</Text>
        </View>
      )}

      {message ? <Text style={styles.message}>{message}</Text> : null}

      <TextInput
        style={styles.input}
        placeholder="License Plate Number"
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
        placeholder="Vehicle Name/Model"
        value={vehicleName}
        onChangeText={setVehicleName}
      />

      {/* Branch/Department Dropdown */}
      <TouchableOpacity
        style={styles.dropdownButton}
        onPress={() => setShowBranchModal(true)}
      >
        <Text style={[styles.dropdownText, !branch && styles.placeholderText]}>
          {branch || 'Select Branch/Department'}
        </Text>
        <Text style={styles.dropdownArrow}>▼</Text>
      </TouchableOpacity>

      {/* Designation Dropdown */}
      <TouchableOpacity
        style={styles.dropdownButton}
        onPress={() => setShowDesignationModal(true)}
      >
        <Text style={[styles.dropdownText, !designation && styles.placeholderText]}>
          {designation || 'Select Designation'}
        </Text>
        <Text style={styles.dropdownArrow}>▼</Text>
      </TouchableOpacity>

      {/* Conditional fields based on designation */}
      {designation === 'Student' && (
        <View style={styles.conditionalSection}>
          <Text style={styles.sectionLabel}>Student Information</Text>
          <TextInput
            style={styles.input}
            placeholder={`Register Number (e.g., 103${BRANCH_CODES[branch] || 'XX'}23062)`}
            value={registerNumber}
            onChangeText={setRegisterNumber}
            autoCapitalize="characters"
            maxLength={11}
          />
          <Text style={styles.helperText}>
            Format: 103 + Branch Code + Year + Roll Number{'\n'}
            Example: 103CS23062 (103=College, CS=Computer Science, 23=Year 2023, 062=Roll No.)
          </Text>
        </View>
      )}

      {designation === 'Staff' && (
        <View style={styles.conditionalSection}>
          <Text style={styles.sectionLabel}>Staff Information</Text>
          <TouchableOpacity
            style={styles.dropdownButton}
            onPress={() => setShowStaffPositionModal(true)}
          >
            <Text style={[styles.dropdownText, !staffPosition && styles.placeholderText]}>
              {staffPosition || 'Select Position (HOD or Lecturer)'}
            </Text>
            <Text style={styles.dropdownArrow}>▼</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Photo Upload Sections */}
      <View style={styles.photoSection}>
        <Text style={styles.sectionLabel}>Vehicle Photo</Text>
        <TouchableOpacity
          style={styles.uploadButton}
          onPress={() => pickImage('vehicle')}
          disabled={loading}
        >
          <Text style={styles.uploadButtonText}>
            {vehiclePhoto ? '📷 Change Vehicle Photo' : '📷 Upload Vehicle Photo'}
          </Text>
        </TouchableOpacity>

        {vehiclePhoto && (
          <Image source={{ uri: vehiclePhoto }} style={styles.previewImage} />
        )}
      </View>

      <View style={styles.photoSection}>
        <Text style={styles.sectionLabel}>Owner Photo</Text>
        <TouchableOpacity
          style={styles.uploadButton}
          onPress={() => pickImage('owner')}
          disabled={loading}
        >
          <Text style={styles.uploadButtonText}>
            {ownerPhoto ? '📷 Change Owner Photo' : '📷 Upload Owner Photo'}
          </Text>
        </TouchableOpacity>

        {ownerPhoto && (
          <Image source={{ uri: ownerPhoto }} style={styles.previewImage} />
        )}
      </View>

      {/* Dropdown Modals */}
      <DropdownModal
        visible={showBranchModal}
        onClose={() => setShowBranchModal(false)}
        options={BRANCH_OPTIONS}
        onSelect={setBranch}
        title="Select Branch/Department"
      />

      <DropdownModal
        visible={showDesignationModal}
        onClose={() => setShowDesignationModal(false)}
        options={DESIGNATION_OPTIONS}
        onSelect={setDesignation}
        title="Select Designation"
      />

      <DropdownModal
        visible={showStaffPositionModal}
        onClose={() => setShowStaffPositionModal(false)}
        options={STAFF_POSITION_OPTIONS}
        onSelect={setStaffPosition}
        title="Select Staff Position"
      />

      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#4a90e2" />
          <Text style={styles.loadingText}>Processing registration...</Text>
        </View>
      ) : (
        <TouchableOpacity
          style={[styles.submitButton, loading && styles.disabledButton]}
          onPress={handleSubmit}
          disabled={loading}
        >
          <Text style={styles.submitButtonText}>
            Register Vehicle
          </Text>
        </TouchableOpacity>
      )}

      <Footer />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 20,
    backgroundColor: '#f0f2f5',
    flexGrow: 1,
    paddingTop: 50,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 25,
    backgroundColor: '#fff',
    padding: 15,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  backButton: {
    padding: 12,
    backgroundColor: '#f8f9fa',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#e9ecef',
  },
  backButtonText: {
    color: '#495057',
    fontSize: 16,
    fontWeight: '600',
  },
  title: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#212529',
    textAlign: 'center',
  },
  userInfo: {
    backgroundColor: '#e7f3ff',
    padding: 18,
    borderRadius: 12,
    marginBottom: 25,
    borderLeftWidth: 4,
    borderLeftColor: '#4a90e2',
  },
  userInfoText: {
    fontSize: 15,
    color: '#1565c0',
    marginBottom: 4,
    fontWeight: '500',
  },
  input: {
    borderWidth: 1,
    borderColor: '#e9ecef',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    fontSize: 16,
    backgroundColor: '#fff',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  dropdownButton: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#e9ecef',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    backgroundColor: '#fff',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  dropdownText: {
    fontSize: 16,
    color: '#212529',
    flex: 1,
  },
  placeholderText: {
    color: '#6c757d',
  },
  dropdownArrow: {
    fontSize: 12,
    color: '#6c757d',
    marginLeft: 10,
  },
  conditionalSection: {
    backgroundColor: '#fff3cd',
    padding: 16,
    borderRadius: 12,
    marginBottom: 16,
    borderLeftWidth: 4,
    borderLeftColor: '#ffc107',
  },
  sectionLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#495057',
    marginBottom: 12,
  },
  helperText: {
    fontSize: 12,
    color: '#6c757d',
    marginTop: -12,
    marginBottom: 16,
    paddingHorizontal: 4,
    lineHeight: 16,
  },
  photoSection: {
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 12,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  uploadButton: {
    backgroundColor: '#4a90e2',
    padding: 16,
    borderRadius: 10,
    alignItems: 'center',
    marginBottom: 12,
    shadowColor: '#4a90e2',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 3,
  },
  uploadButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  previewImage: {
    width: '100%',
    height: 180,
    borderRadius: 10,
    marginTop: 8,
    resizeMode: 'cover',
    borderWidth: 1,
    borderColor: '#e9ecef',
  },
  loadingContainer: {
    alignItems: 'center',
    marginVertical: 30,
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: '#6c757d',
    fontWeight: '500',
  },
  message: {
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center',
    color: '#155724',
    backgroundColor: '#d4edda',
    padding: 16,
    borderRadius: 12,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#c3e6cb',
  },
  submitButton: {
    backgroundColor: '#28a745',
    padding: 18,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 10,
    marginBottom: 30,
    shadowColor: '#28a745',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 4,
  },
  disabledButton: {
    backgroundColor: '#a5d6a7',
  },
  submitButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '700',
  },
  // Modal styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  dropdownModal: {
    backgroundColor: '#fff',
    borderRadius: 12,
    width: '85%',
    maxHeight: '70%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  dropdownHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#e9ecef',
  },
  dropdownTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#212529',
  },
  closeButton: {
    padding: 8,
    borderRadius: 20,
    backgroundColor: '#f8f9fa',
  },
  closeButtonText: {
    fontSize: 16,
    color: '#6c757d',
    fontWeight: 'bold',
  },
  dropdownItem: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f8f9fa',
  },
  dropdownItemText: {
    fontSize: 16,
    color: '#212529',
  },
});