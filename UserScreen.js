import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  ActivityIndicator,
  Alert,
  Modal,
  TextInput,
  ScrollView,
  Image
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useAuth, useUser } from '@clerk/clerk-expo';
import { API_BASE_URL } from './config';
import Footer from './components/Footer';

// Branch/Department options (same as registration screen)
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

// Vehicle type options
const VEHICLE_TYPE_OPTIONS = ['2 Wheeler', '4 Wheeler'];



export default function UserScreen() {
  const navigation = useNavigation();
  const { signOut, getToken } = useAuth();
  const { user } = useUser();
  const [vehicles, setVehicles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalVisible, setModalVisible] = useState(false);
  const [selectedVehicle, setSelectedVehicle] = useState(null);
  const [formData, setFormData] = useState({
    licencePlate: '',
    fullName: '',
    branch: '',
    designation: '',
    registerNumber: '',
    staffPosition: '',
    vehicleName: '',
    vehicleType: '',
    phoneNumber: '',
  });
  const [phoneError, setPhoneError] = useState('');
  const [updating, setUpdating] = useState(false);

  // Modal states for dropdowns
  const [showBranchModal, setShowBranchModal] = useState(false);
  const [showDesignationModal, setShowDesignationModal] = useState(false);
  const [showStaffPositionModal, setShowStaffPositionModal] = useState(false);
  const [showVehicleTypeModal, setShowVehicleTypeModal] = useState(false);
  const [showPhotoModal, setShowPhotoModal] = useState(false);
  const [selectedPhoto, setSelectedPhoto] = useState(null);
  const [selectedPhotoInfo, setSelectedPhotoInfo] = useState(null);


  useEffect(() => {
    fetchMyVehicles();
  }, []);

  // Phone number validation function
  const validatePhoneNumber = (phone) => {
    const phoneRegex = /^[6-9]\d{9}$/;
    return phoneRegex.test(phone);
  };

  const handlePhoneChange = (input) => {
    // Remove any non-digit characters
    const cleanedInput = input.replace(/\D/g, '');
    
    // Limit to 10 digits
    const limitedInput = cleanedInput.slice(0, 10);
    
    setFormData((prev) => ({ ...prev, phoneNumber: limitedInput }));
    
    // Validate phone number
    if (limitedInput.length === 10 && validatePhoneNumber(limitedInput)) {
      setPhoneError('');
    } else if (limitedInput.length === 10) {
      setPhoneError('Phone number must start with 6, 7, 8, or 9');
    } else if (limitedInput.length > 0) {
      setPhoneError('Phone number must be 10 digits');
    } else {
      setPhoneError('');
    }
  };

  const fetchMyVehicles = async () => {
    try {
      setLoading(true);
      const token = await getToken();

      if (!token) {
        throw new Error('No authentication token available');
      }

      console.log('Fetching user vehicles from:', `${API_BASE_URL}/my-vehicles`);

      const response = await fetch(`${API_BASE_URL}/my-vehicles`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error('Failed to fetch vehicles');
      }

      const data = await response.json();
      setVehicles(data.vehicles || []);
    } catch (error) {
      console.error('Error fetching vehicles:', error);
      Alert.alert('Error', 'Failed to load your vehicles');
    } finally {
      setLoading(false);
    }
  };

  const handleSignOut = async () => {
    try {
      await signOut();
    } catch (err) {
      console.error('Error signing out:', err);
      Alert.alert('Error', 'Failed to sign out');
    }
  };

  const openEditModal = (vehicle) => {
    setSelectedVehicle(vehicle);
    setFormData({
      licencePlate: vehicle.licencePlate,
      fullName: vehicle.fullName,
      branch: vehicle.branch,
      designation: vehicle.designation,
      registerNumber: vehicle.registerNumber || '',
      staffPosition: vehicle.staffPosition || vehicle.department || '',
      vehicleName: vehicle.vehicleName || '',
      vehicleType: vehicle.vehicleType || '',
      phoneNumber: vehicle.phoneNumber || '',
    });
    setPhoneError('');
    setModalVisible(true);
  };

  const closeModal = () => {
    setModalVisible(false);
    setSelectedVehicle(null);
    setFormData({
      licencePlate: '',
      fullName: '',
      branch: '',
      designation: '',
      registerNumber: '',
      staffPosition: '',
      vehicleName: '',
      vehicleType: '',
      phoneNumber: '',
    });
    setPhoneError('');
  };

  const handleFormChange = (field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const showPhoto = (photoUrl, photoType = 'Photo', vehicleInfo = '') => {
    setSelectedPhoto(photoUrl);
    setSelectedPhotoInfo({ type: photoType, vehicle: vehicleInfo });
    setShowPhotoModal(true);
  };

  // Dropdown component (same as registration screen)
  const DropdownModal = ({ visible, onClose, options, onSelect, title }) => (
    <Modal visible={visible} animationType="slide" transparent={true}>
      <View style={styles.dropdownModalOverlay}>
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

  const updateVehicle = async () => {
    if (!selectedVehicle) return;

    // Validation
    if (!formData.licencePlate.trim() || !formData.fullName.trim() || !formData.branch.trim() || !formData.designation.trim() || !formData.vehicleName.trim() || !formData.vehicleType.trim() || !formData.phoneNumber.trim()) {
      Alert.alert('Validation error', 'Please fill all required fields including phone number');
      return;
    }

    // Phone number validation
    if (!validatePhoneNumber(formData.phoneNumber)) {
      Alert.alert('Validation error', 'Please enter a valid 10-digit Indian mobile number starting with 6, 7, 8, or 9');
      return;
    }

    if (formData.designation === 'Student' && !formData.registerNumber.trim()) {
      Alert.alert('Validation error', 'Register number is required for students');
      return;
    }

    if (formData.designation === 'Staff' && !formData.staffPosition.trim()) {
      Alert.alert('Validation error', 'Staff position (HOD or Lecturer) is required for staff');
      return;
    }

    // Validate register number format for students
    if (formData.designation === 'Student' && formData.registerNumber.trim()) {
      const registerPattern = /^103[A-Z]{2}\d{2}\d{3}$/;
      if (!registerPattern.test(formData.registerNumber.toUpperCase())) {
        Alert.alert('Validation error', 'Register number must be in format 103XX##### (e.g., 103CS23062)\n\n103 = College code\nXX = Branch code (CS, ME, etc.)\n## = Year (23, 24, etc.)\n### = Roll number');
        return;
      }

      // Validate branch code matches selected branch
      const branchCode = BRANCH_CODES[formData.branch];
      const registerBranchCode = formData.registerNumber.toUpperCase().substring(3, 5);
      if (branchCode && registerBranchCode !== branchCode) {
        Alert.alert('Validation error', `Register number branch code (${registerBranchCode}) doesn't match selected branch. Expected: ${branchCode}`);
        return;
      }
    }

    setUpdating(true);
    try {
      const token = await getToken();
      const response = await fetch(`${API_BASE_URL}/my-vehicles/${selectedVehicle._id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify(formData),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Update failed');
      }

      Alert.alert('Success', 'Vehicle updated successfully');
      closeModal();
      fetchMyVehicles();
    } catch (error) {
      console.error('Error updating vehicle:', error);
      Alert.alert('Error', error.message || 'Failed to update vehicle');
    } finally {
      setUpdating(false);
    }
  };

  const renderVehicle = ({ item }) => {
    // Enhanced Debug: Log all vehicle data to identify owner photo issue
    console.log('=== USER SCREEN VEHICLE DATA ===');
    console.log('License Plate:', item.licencePlate);
    console.log('Vehicle Photo URL:', item.vehiclePhotoUrl);
    console.log('Owner Photo URL:', item.ownerPhotoUrl);
    console.log('Legacy Photo URL:', item.photoUrl);
    console.log('All item keys:', Object.keys(item));
    console.log('Full item data:', JSON.stringify(item, null, 2));
    console.log('Owner photo exists?', !!item.ownerPhotoUrl);
    console.log('Owner photo type:', typeof item.ownerPhotoUrl);
    console.log('================================');

    return (
      <View style={styles.vehicleCard}>
        {/* Photo Buttons Section */}
        <View style={styles.photoButtonsSection}>
          <Text style={styles.photoSectionTitle}>📷 Photos</Text>
          <View style={styles.photoButtonsContainer}>
            {/* Vehicle Photo Button */}
            {(item.vehiclePhotoUrl || (item.photoUrl && !item.ownerPhotoUrl)) ? (
              <TouchableOpacity
                style={styles.photoButton}
                onPress={() => showPhoto(item.vehiclePhotoUrl || item.photoUrl, 'Vehicle Photo', `${item.licencePlate} - ${item.fullName}`)}
              >
                <Text style={styles.photoButtonText}>🚗 View Vehicle Photo</Text>
              </TouchableOpacity>
            ) : (
              <View style={styles.noPhotoButton}>
                <Text style={styles.noPhotoButtonText}>🚗 No Vehicle Photo</Text>
              </View>
            )}

            {/* Owner Photo Button */}
            {item.ownerPhotoUrl ? (
              <TouchableOpacity
                style={styles.photoButton}
                onPress={() => showPhoto(item.ownerPhotoUrl, 'Owner Photo', `${item.licencePlate} - ${item.fullName}`)}
              >
                <Text style={styles.photoButtonText}>👤 View Owner Photo</Text>
              </TouchableOpacity>
            ) : (
              <View style={styles.noPhotoButton}>
                <Text style={styles.noPhotoButtonText}>👤 No Owner Photo</Text>
              </View>
            )}
          </View>
        </View>
        <View style={styles.vehicleInfo}>
          <Text style={styles.licensePlate}>{item.licencePlate}</Text>
          <Text style={styles.vehicleDetail}>Name: {item.fullName}</Text>
          {item.phoneNumber && (
            <Text style={styles.phoneNumber}>📞 {item.phoneNumber}</Text>
          )}
          {item.vehicleName && (
            <Text style={styles.vehicleDetail}>Vehicle: {item.vehicleName}</Text>
          )}
          {item.vehicleType && (
            <Text style={styles.vehicleDetail}>Type: {item.vehicleType}</Text>
          )}
          <Text style={styles.vehicleDetail}>Branch: {item.branch}</Text>
          <Text style={styles.vehicleDetail}>Designation: {item.designation}</Text>
          {item.registerNumber && (
            <Text style={styles.vehicleDetail}>Register No: {item.registerNumber}</Text>
          )}
          {(item.staffPosition || item.department) && (
            <Text style={styles.vehicleDetail}>Position: {item.staffPosition || item.department}</Text>
          )}

          <TouchableOpacity
            style={styles.editButton}
            onPress={() => openEditModal(item)}
          >
            <Text style={styles.editButtonText}>Edit Details</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.welcomeText}>
          Welcome, {user?.firstName || 'User'}!
        </Text>
        <View style={styles.headerButtons}>
          <TouchableOpacity
            style={styles.reloadButton}
            onPress={fetchMyVehicles}
          >
            <Text style={styles.reloadButtonText}>🔄</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.signOutButton}
            onPress={handleSignOut}
          >
            <Text style={styles.signOutText}>Sign Out</Text>
          </TouchableOpacity>
        </View>
      </View>

      <Text style={styles.sectionTitle}>My Registered Vehicles</Text>

      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#4a90e2" />
          <Text style={styles.loadingText}>Loading your vehicles...</Text>
        </View>
      ) : vehicles.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyText}>No vehicles registered yet</Text>
          <TouchableOpacity
            style={styles.registerButton}
            onPress={() => navigation.navigate('Registration')}
          >
            <Text style={styles.registerButtonText}>Register Your First Vehicle</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <>
          <FlatList
            data={vehicles}
            renderItem={renderVehicle}
            keyExtractor={(item) => item._id}
            style={styles.vehiclesList}
            showsVerticalScrollIndicator={false}
          />
          <TouchableOpacity
            style={styles.addButton}
            onPress={() => navigation.navigate('Registration')}
          >
            <Text style={styles.addButtonText}>+ Add Another Vehicle</Text>
          </TouchableOpacity>
        </>
      )}

      {/* Edit Modal */}
      <Modal visible={modalVisible} animationType="slide" transparent={true}>
        <View style={styles.modalOverlay}>
          <ScrollView style={styles.modalView}>
            <Text style={styles.modalTitle}>Edit Vehicle Details</Text>

            <TextInput
              style={styles.modalInput}
              placeholder="License Plate"
              value={formData.licencePlate}
              onChangeText={(val) => handleFormChange('licencePlate', val)}
              autoCapitalize="characters"
            />
            <TextInput
              style={styles.modalInput}
              placeholder="Full Name"
              value={formData.fullName}
              onChangeText={(val) => handleFormChange('fullName', val)}
            />

            {/* Phone Number Input */}
            <View style={styles.phoneSection}>
              <Text style={styles.sectionLabel}>📞 Contact Information</Text>
              <TextInput
                style={[styles.modalInput, phoneError ? styles.inputError : null]}
                placeholder="Phone Number (10 digits)"
                value={formData.phoneNumber}
                onChangeText={handlePhoneChange}
                keyboardType="phone-pad"
                maxLength={10}
              />
              {phoneError ? <Text style={styles.errorText}>{phoneError}</Text> : null}
              <Text style={styles.helperText}>
                Enter a valid Indian mobile number starting with 6, 7, 8, or 9
              </Text>
            </View>

            <TextInput
              style={styles.modalInput}
              placeholder="Vehicle Name/Model"
              value={formData.vehicleName}
              onChangeText={(val) => handleFormChange('vehicleName', val)}
            />

            {/* Vehicle Type Dropdown */}
            <TouchableOpacity
              style={styles.dropdownButton}
              onPress={() => setShowVehicleTypeModal(true)}
            >
              <Text style={[styles.dropdownText, !formData.vehicleType && styles.placeholderText]}>
                {formData.vehicleType || 'Select Vehicle Type'}
              </Text>
              <Text style={styles.dropdownArrow}>▼</Text>
            </TouchableOpacity>

            {/* Branch/Department Dropdown */}
            <TouchableOpacity
              style={styles.dropdownButton}
              onPress={() => setShowBranchModal(true)}
            >
              <Text style={[styles.dropdownText, !formData.branch && styles.placeholderText]}>
                {formData.branch || 'Select Branch/Department'}
              </Text>
              <Text style={styles.dropdownArrow}>▼</Text>
            </TouchableOpacity>

            {/* Designation Dropdown */}
            <TouchableOpacity
              style={styles.dropdownButton}
              onPress={() => setShowDesignationModal(true)}
            >
              <Text style={[styles.dropdownText, !formData.designation && styles.placeholderText]}>
                {formData.designation || 'Select Designation'}
              </Text>
              <Text style={styles.dropdownArrow}>▼</Text>
            </TouchableOpacity>

            {/* Conditional fields based on designation */}
            {formData.designation === 'Student' && (
              <View style={styles.conditionalSection}>
                <Text style={styles.sectionLabel}>Student Information</Text>
                <TextInput
                  style={styles.modalInput}
                  placeholder={`Register Number (e.g., 103${BRANCH_CODES[formData.branch] || 'XX'}23062)`}
                  value={formData.registerNumber}
                  onChangeText={(val) => handleFormChange('registerNumber', val)}
                  autoCapitalize="characters"
                  maxLength={11}
                />
                <Text style={styles.helperText}>
                  Format: 103 + Branch Code + Year + Roll Number{'\n'}
                  Example: 103CS23062 (103=College, CS=Computer Science, 23=Year 2023, 062=Roll No.)
                </Text>


              </View>
            )}

            {formData.designation === 'Staff' && (
              <View style={styles.conditionalSection}>
                <Text style={styles.sectionLabel}>Staff Information</Text>
                <TouchableOpacity
                  style={styles.dropdownButton}
                  onPress={() => setShowStaffPositionModal(true)}
                >
                  <Text style={[styles.dropdownText, !formData.staffPosition && styles.placeholderText]}>
                    {formData.staffPosition || 'Select Position (HOD or Lecturer)'}
                  </Text>
                  <Text style={styles.dropdownArrow}>▼</Text>
                </TouchableOpacity>
              </View>
            )}

            <View style={styles.modalButtons}>
              <TouchableOpacity
                onPress={updateVehicle}
                style={[styles.modalButton, styles.saveButton]}
                disabled={updating}
              >
                {updating ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={styles.buttonText}>Save Changes</Text>
                )}
              </TouchableOpacity>

              <TouchableOpacity
                onPress={closeModal}
                style={[styles.modalButton, styles.cancelButton]}
                disabled={updating}
              >
                <Text style={styles.buttonText}>Cancel</Text>
              </TouchableOpacity>
            </View>
          </ScrollView>
        </View>
      </Modal>

      {/* Dropdown Modals */}
      <DropdownModal
        visible={showBranchModal}
        onClose={() => setShowBranchModal(false)}
        options={BRANCH_OPTIONS}
        onSelect={(value) => handleFormChange('branch', value)}
        title="Select Branch/Department"
      />

      <DropdownModal
        visible={showDesignationModal}
        onClose={() => setShowDesignationModal(false)}
        options={DESIGNATION_OPTIONS}
        onSelect={(value) => handleFormChange('designation', value)}
        title="Select Designation"
      />

      <DropdownModal
        visible={showStaffPositionModal}
        onClose={() => setShowStaffPositionModal(false)}
        options={STAFF_POSITION_OPTIONS}
        onSelect={(value) => handleFormChange('staffPosition', value)}
        title="Select Staff Position"
      />

      <DropdownModal
        visible={showVehicleTypeModal}
        onClose={() => setShowVehicleTypeModal(false)}
        options={VEHICLE_TYPE_OPTIONS}
        onSelect={(value) => handleFormChange('vehicleType', value)}
        title="Select Vehicle Type"
      />



      {/* Photo Modal */}
      <Modal visible={showPhotoModal} animationType="fade" transparent={true}>
        <View style={styles.photoModalOverlay}>
          <View style={styles.photoModalContainer}>
            <View style={styles.photoModalHeader}>
              <Text style={styles.photoModalTitle}>
                {selectedPhotoInfo?.type} - {selectedPhotoInfo?.vehicle}
              </Text>
              <TouchableOpacity
                style={styles.photoModalCloseButton}
                onPress={() => setShowPhotoModal(false)}
              >
                <Text style={styles.photoModalCloseText}>✕</Text>
              </TouchableOpacity>
            </View>
            <View style={styles.photoModalImageContainer}>
              {selectedPhoto && (
                <Image
                  source={{ uri: selectedPhoto }}
                  style={styles.photoModalImage}
                  resizeMode="contain"
                  onError={(error) => console.log('Photo modal load error:', error)}
                />
              )}
            </View>
          </View>
        </View>
      </Modal>

      <Footer />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f0f2f5',
    paddingTop: 50,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 15,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  welcomeText: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
  },
  headerButtons: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  reloadButton: {
    backgroundColor: '#4a90e2',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 6,
    marginRight: 8,
  },
  reloadButtonText: {
    fontSize: 18,
  },
  signOutButton: {
    backgroundColor: '#f44336',
    paddingHorizontal: 15,
    paddingVertical: 8,
    borderRadius: 6,
  },
  signOutText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    margin: 20,
    marginBottom: 15,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: '#666',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  emptyText: {
    fontSize: 18,
    color: '#666',
    textAlign: 'center',
    marginBottom: 30,
  },
  registerButton: {
    backgroundColor: '#4a90e2',
    paddingHorizontal: 30,
    paddingVertical: 15,
    borderRadius: 8,
  },
  registerButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  vehiclesList: {
    flex: 1,
    paddingHorizontal: 20,
  },
  vehicleCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 5,
    borderLeftWidth: 5,
    borderLeftColor: '#28a745',
    borderWidth: 1,
    borderColor: '#e9ecef',
  },
  photoButtonsSection: {
    marginTop: 12,
    marginBottom: 8,
  },
  photoSectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#495057',
    marginBottom: 8,
  },
  photoButtonsContainer: {
    flexDirection: 'row',
    gap: 8,
    flexWrap: 'wrap',
  },
  photoButton: {
    backgroundColor: '#17a2b8',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 20,
    shadowColor: '#17a2b8',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 3,
    elevation: 2,
    flex: 1,
    minWidth: 120,
  },
  photoButtonText: {
    fontSize: 13,
    color: '#fff',
    fontWeight: '600',
    textAlign: 'center',
  },
  noPhotoButton: {
    backgroundColor: '#f8f9fa',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e9ecef',
    flex: 1,
    minWidth: 120,
  },
  noPhotoButtonText: {
    fontSize: 12,
    color: '#6c757d',
    fontWeight: '500',
    textAlign: 'center',
  },
  // Photo Modal Styles
  photoModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.9)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  photoModalContainer: {
    width: '90%',
    height: '80%',
    backgroundColor: '#fff',
    borderRadius: 12,
    overflow: 'hidden',
  },
  photoModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#f8f9fa',
    borderBottomWidth: 1,
    borderBottomColor: '#e9ecef',
  },
  photoModalTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#212529',
    flex: 1,
  },
  photoModalCloseButton: {
    padding: 8,
    borderRadius: 20,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#e9ecef',
  },
  photoModalCloseText: {
    fontSize: 16,
    color: '#6c757d',
    fontWeight: 'bold',
  },
  photoModalImageContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  photoModalImage: {
    width: '100%',
    height: '100%',
  },
  vehicleInfo: {
    flex: 1,
  },
  licensePlate: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 8,
  },
  vehicleDetail: {
    fontSize: 14,
    color: '#666',
    marginBottom: 4,
  },
  phoneNumber: {
    fontSize: 14,
    color: '#4a90e2',
    marginBottom: 4,
    fontWeight: '600',
    fontFamily: 'monospace',
  },
  editButton: {
    backgroundColor: '#28a745',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 25,
    alignSelf: 'flex-start',
    marginTop: 12,
    shadowColor: '#28a745',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 3,
    elevation: 2,
  },
  editButtonText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '700',
  },
  addButton: {
    backgroundColor: '#28a745',
    margin: 20,
    paddingVertical: 16,
    borderRadius: 25,
    alignItems: 'center',
    shadowColor: '#28a745',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 4,
  },
  addButtonText: {
    color: '#fff',
    fontSize: 17,
    fontWeight: '700',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    padding: 20,
  },
  modalView: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 20,
    maxHeight: '80%',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 20,
    textAlign: 'center',
    color: '#333',
  },
  modalInput: {
    borderWidth: 1,
    borderColor: '#ddd',
    padding: 12,
    borderRadius: 8,
    fontSize: 16,
    marginBottom: 15,
    backgroundColor: '#f9f9f9',
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 20,
  },
  modalButton: {
    flex: 1,
    padding: 15,
    borderRadius: 8,
    marginHorizontal: 5,
    alignItems: 'center',
  },
  saveButton: {
    backgroundColor: '#28a745',
  },
  cancelButton: {
    backgroundColor: '#6c757d',
  },
  buttonText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 16,
  },
  // Dropdown styles
  dropdownButton: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    marginBottom: 15,
    backgroundColor: '#f9f9f9',
  },
  dropdownText: {
    fontSize: 16,
    color: '#333',
    flex: 1,
  },
  placeholderText: {
    color: '#999',
  },
  dropdownArrow: {
    fontSize: 12,
    color: '#666',
    marginLeft: 10,
  },
  conditionalSection: {
    backgroundColor: '#fff3cd',
    padding: 16,
    borderRadius: 8,
    marginBottom: 15,
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
  phoneSection: {
    backgroundColor: '#e7f3ff',
    padding: 16,
    borderRadius: 12,
    marginBottom: 16,
    borderLeftWidth: 4,
    borderLeftColor: '#4a90e2',
  },
  inputError: {
    borderColor: '#dc3545',
    borderWidth: 2,
  },
  errorText: {
    color: '#dc3545',
    fontSize: 12,
    marginTop: 4,
    marginBottom: 8,
    paddingHorizontal: 4,
    fontWeight: '500',
  },
  // Dropdown modal styles
  dropdownModalOverlay: {
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