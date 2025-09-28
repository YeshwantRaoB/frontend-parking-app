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
  'Automobile Engg.': 'AU',
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
  });
  const [updating, setUpdating] = useState(false);

  // Modal states for dropdowns
  const [showBranchModal, setShowBranchModal] = useState(false);
  const [showDesignationModal, setShowDesignationModal] = useState(false);
  const [showStaffPositionModal, setShowStaffPositionModal] = useState(false);

  useEffect(() => {
    fetchMyVehicles();
  }, []);

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
    });
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
    });
  };

  const handleFormChange = (field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
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
    if (!formData.licencePlate.trim() || !formData.fullName.trim() || !formData.branch.trim() || !formData.designation.trim() || !formData.vehicleName.trim()) {
      Alert.alert('Validation error', 'Please fill all required fields');
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

  const renderVehicle = ({ item }) => (
    <View style={styles.vehicleCard}>
      <View style={styles.imageContainer}>
        {item.vehiclePhotoUrl && (
          <Image source={{ uri: item.vehiclePhotoUrl }} style={styles.vehicleImage} />
        )}
        {item.ownerPhotoUrl && (
          <Image source={{ uri: item.ownerPhotoUrl }} style={styles.ownerImage} />
        )}
        {/* Legacy support */}
        {item.photoUrl && !item.vehiclePhotoUrl && (
          <Image source={{ uri: item.photoUrl }} style={styles.vehicleImage} />
        )}
      </View>
      <View style={styles.vehicleInfo}>
        <Text style={styles.licensePlate}>{item.licencePlate}</Text>
        <Text style={styles.vehicleDetail}>Name: {item.fullName}</Text>
        {item.vehicleName && (
          <Text style={styles.vehicleDetail}>Vehicle: {item.vehicleName}</Text>
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

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.welcomeText}>
          Welcome, {user?.firstName || 'User'}!
        </Text>
        <TouchableOpacity 
          style={styles.signOutButton}
          onPress={handleSignOut}
        >
          <Text style={styles.signOutText}>Sign Out</Text>
        </TouchableOpacity>
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
            <TextInput
              style={styles.modalInput}
              placeholder="Vehicle Name/Model"
              value={formData.vehicleName}
              onChangeText={(val) => handleFormChange('vehicleName', val)}
            />
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
    borderRadius: 15,
    padding: 18,
    marginBottom: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.12,
    shadowRadius: 6,
    elevation: 4,
    borderLeftWidth: 4,
    borderLeftColor: '#28a745',
  },
  imageContainer: {
    flexDirection: 'row',
    marginBottom: 10,
  },
  vehicleImage: {
    width: '60%',
    height: 120,
    borderRadius: 8,
    marginRight: 8,
    resizeMode: 'cover',
  },
  ownerImage: {
    width: '35%',
    height: 120,
    borderRadius: 8,
    resizeMode: 'cover',
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
  editButton: {
    backgroundColor: '#4a90e2',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 6,
    alignSelf: 'flex-start',
    marginTop: 10,
  },
  editButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  addButton: {
    backgroundColor: '#28a745',
    margin: 20,
    paddingVertical: 15,
    borderRadius: 8,
    alignItems: 'center',
  },
  addButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
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