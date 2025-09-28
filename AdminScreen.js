import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Modal,
  Alert,
  ScrollView,
  Image,
  Dimensions,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useAuth, useUser } from '@clerk/clerk-expo';
import { API_BASE_URL } from './config';
import { testNetworkConnection } from './utils/networkTest';

// Helper function to check if user is admin
const isUserAdmin = (user) => {
  return user?.publicMetadata?.role === 'admin';
};

export default function AdminScreen() {
  const [searchText, setSearchText] = useState('');
  const [vehicles, setVehicles] = useState([]);
  const [page, setPage] = useState(1);
  const [limit] = useState(10);
  const [totalPages, setTotalPages] = useState(1);
  const [sortBy, setSortBy] = useState('licencePlate');
  const [loading, setLoading] = useState(true);
  const [modalVisible, setModalVisible] = useState(false);
  const [selectedVehicle, setSelectedVehicle] = useState(null);
  const [formData, setFormData] = useState({
    licencePlate: '',
    fullName: '',
    branch: '',
    designation: '',
  });
  const [actionProcessing, setActionProcessing] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [error, setError] = useState('');
  const [showAddAdminModal, setShowAddAdminModal] = useState(false);
  const [adminEmail, setAdminEmail] = useState('');
  const [showPhotoModal, setShowPhotoModal] = useState(false);
  const [selectedPhoto, setSelectedPhoto] = useState(null);

  const navigation = useNavigation();
  const { signOut, getToken } = useAuth();
  const { user, isLoaded } = useUser();

  // Check if user is admin when component mounts
  useEffect(() => {
    if (isLoaded && user) {
      const adminStatus = isUserAdmin(user);
      setIsAdmin(adminStatus);

      if (adminStatus) {
        // Test network connection first
        testNetworkConnection().then(result => {
          if (result.success) {
            fetchVehicles(1, 'licencePlate', '');
          } else {
            setError(`Network connection failed: ${result.error}`);
            setLoading(false);
          }
        });
      } else {
        setError('Sorry, you don\'t have admin privileges.');
        setLoading(false);
      }
    }
  }, [isLoaded, user]);

  const fetchVehicles = async (newPage = page, newSortBy = sortBy, query = searchText) => {
    setLoading(true);
    try {
      const token = await getToken();
      if (!token) {
        throw new Error('No authentication token available');
      }

      const params = new URLSearchParams({
        page: newPage.toString(),
        limit: limit.toString(),
        sortBy: newSortBy,
      });
      if (query) {
        params.append('licencePlate', query);
      }

      const url = `${API_BASE_URL}/vehicles?${params.toString()}`;
      console.log('Fetching vehicles from:', url);

      const response = await fetch(url, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to fetch vehicles');
      }

      const json = await response.json();
      setVehicles(json.vehicles);
      setPage(json.page);
      setTotalPages(json.totalPages);
    } catch (error) {
      console.error('Error fetching vehicles:', error);
      Alert.alert('Error', error.message || 'Failed to load vehicles');
    } finally {
      setLoading(false);
    }
  };



  const onSearch = () => {
    fetchVehicles(1, sortBy, searchText.trim());
  };

  const onSortChange = (field) => {
    setSortBy(field);
    fetchVehicles(1, field, searchText.trim());
  };

  const onPageChange = (newPage) => {
    if (newPage >= 1 && newPage <= totalPages) {
      fetchVehicles(newPage, sortBy, searchText.trim());
    }
  };

  const openEditModal = (vehicle) => {
    setSelectedVehicle(vehicle);
    setFormData({
      licencePlate: vehicle.licencePlate,
      fullName: vehicle.fullName,
      branch: vehicle.branch,
      designation: vehicle.designation,
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
    });
  };

  const handleFormChange = (field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const updateVehicle = async () => {
    if (!selectedVehicle) return;
    setActionProcessing(true);
    try {
      const token = await getToken();
      const response = await fetch(`${API_BASE_URL}/vehicles/${selectedVehicle._id}`, {
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
      fetchVehicles(page, sortBy, searchText.trim());
    } catch (error) {
      console.error('Error updating vehicle:', error);
      Alert.alert('Error', error.message || 'Failed to update vehicle');
    } finally {
      setActionProcessing(false);
    }
  };

  const deleteVehicle = (vehicle) => {
    Alert.alert(
      'Confirm Delete',
      `Are you sure you want to delete vehicle ${vehicle.licencePlate}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => confirmDeleteVehicle(vehicle._id),
        },
      ]
    );
  };

  const confirmDeleteVehicle = async (id) => {
    setActionProcessing(true);
    try {
      const token = await getToken();
      const response = await fetch(`${API_BASE_URL}/vehicles/${id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Delete failed');
      }

      Alert.alert('Success', 'Vehicle deleted successfully');
      fetchVehicles(page, sortBy, searchText.trim());
    } catch (error) {
      console.error('Error deleting vehicle:', error);
      Alert.alert('Error', error.message || 'Failed to delete vehicle');
    } finally {
      setActionProcessing(false);
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

  const showPhoto = (photoUrl) => {
    setSelectedPhoto(photoUrl);
    setShowPhotoModal(true);
  };

  const debugToken = async () => {
    try {
      const token = await getToken();
      console.log('Token:', token);

      const response = await fetch(`${API_BASE_URL}/debug-token`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      const result = await response.json();
      console.log('Debug token result:', JSON.stringify(result, null, 2));
      Alert.alert('Debug Info', JSON.stringify(result, null, 2));
    } catch (error) {
      console.error('Debug error:', error);
      Alert.alert('Debug Error', error.message);
    }
  };

  const addAdmin = async () => {
    if (!adminEmail.trim()) {
      Alert.alert('Error', 'Please enter an email address');
      return;
    }

    setActionProcessing(true);
    try {
      const token = await getToken();
      const response = await fetch(`${API_BASE_URL}/add-admin`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ email: adminEmail.trim() }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to add admin');
      }

      Alert.alert('Success', result.message || 'Admin privileges granted successfully');
      setShowAddAdminModal(false);
      setAdminEmail('');
    } catch (error) {
      console.error('Error adding admin:', error);
      Alert.alert('Error', error.message || 'Failed to add admin');
    } finally {
      setActionProcessing(false);
    }
  };

  const renderVehicle = ({ item }) => (
    <View style={styles.itemContainer}>
      <View style={styles.vehicleHeader}>
        <Text style={styles.plate}>{item.licencePlate}</Text>
        <Text style={styles.dateText}>
          {new Date(item.createdAt).toLocaleDateString()}
        </Text>
      </View>
      <Text style={styles.vehicleDetail}>Name: {item.fullName}</Text>
      <Text style={styles.vehicleDetail}>Branch: {item.branch}</Text>
      <Text style={styles.vehicleDetail}>Designation: {item.designation}</Text>
      {item.photoUrl && (
        <TouchableOpacity
          onPress={() => showPhoto(item.photoUrl)}
        >
          <Text style={styles.photoLink}>📷 View Photo</Text>
        </TouchableOpacity>
      )}
      <View style={styles.itemButtons}>
        <TouchableOpacity onPress={() => openEditModal(item)} style={styles.editBtn}>
          <Text style={styles.editText}>Edit</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={() => deleteVehicle(item)} style={styles.deleteBtn}>
          <Text style={styles.deleteText}>Delete</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  if (!isLoaded) {
    return (
      <View style={[styles.container, styles.centered]}>
        <ActivityIndicator size="large" color="#4a90e2" />
      </View>
    );
  }

  if (!isAdmin) {
    return (
      <View style={[styles.container, styles.centered]}>
        <Text style={styles.errorText}>Sorry, you don't have admin privileges</Text>
        <Text style={styles.errorSubText}>
          This area is restricted to college management only.
        </Text>
        <TouchableOpacity style={styles.backButton} onPress={handleSignOut}>
          <Text style={styles.backButtonText}>Back to Login</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Admin Dashboard</Text>
        <View style={styles.headerButtons}>
          <TouchableOpacity onPress={() => navigation.navigate('Registration')} style={styles.registerButton}>
            <Text style={styles.registerText}>+ Vehicle</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => setShowAddAdminModal(true)} style={styles.addAdminButton}>
            <Text style={styles.addAdminText}>+ Admin</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={debugToken} style={[styles.addAdminButton, { backgroundColor: '#ff9800' }]}>
            <Text style={styles.addAdminText}>Debug</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={handleSignOut} style={styles.signOutButton}>
            <Text style={styles.signOutText}>Sign Out</Text>
          </TouchableOpacity>
        </View>
      </View>

      <TextInput
        style={styles.input}
        placeholder="Search by Licence Plate"
        value={searchText}
        onChangeText={setSearchText}
        onSubmitEditing={onSearch}
        returnKeyType="search"
      />
      <View style={styles.sortRow}>
        <Text style={styles.sortLabel}>Sort by:</Text>
        {['licencePlate', 'fullName', 'branch'].map((field) => (
          <TouchableOpacity
            key={field}
            onPress={() => onSortChange(field)}
            style={[
              styles.sortButton,
              sortBy === field && styles.sortButtonActive,
            ]}
          >
            <Text
              style={sortBy === field ? styles.sortTextActive : styles.sortText}
            >
              {field.charAt(0).toUpperCase() + field.slice(1)}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {loading ? (
        <ActivityIndicator size="large" color="#cc0000" />
      ) : vehicles.length === 0 ? (
        <Text style={styles.noRecords}>No vehicles found.</Text>
      ) : (
        <FlatList
          data={vehicles}
          renderItem={renderVehicle}
          keyExtractor={(item) => item._id}
          style={{ marginBottom: 10 }}
        />
      )}

      <View style={styles.pagination}>
        <TouchableOpacity
          onPress={() => onPageChange(page - 1)}
          disabled={page <= 1}
          style={[styles.pageButton, page <= 1 && styles.pageButtonDisabled]}
        >
          <Text style={styles.pageButtonText}>Previous</Text>
        </TouchableOpacity>
        <Text style={styles.pageInfo}>
          Page {page} of {totalPages}
        </Text>
        <TouchableOpacity
          onPress={() => onPageChange(page + 1)}
          disabled={page >= totalPages}
          style={[styles.pageButton, page >= totalPages && styles.pageButtonDisabled]}
        >
          <Text style={styles.pageButtonText}>Next</Text>
        </TouchableOpacity>
      </View>

      {/* Add Admin Modal */}
      <Modal visible={showAddAdminModal} animationType="slide" transparent={true}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalView}>
            <Text style={styles.modalTitle}>Add New Admin</Text>
            <Text style={styles.modalSubtitle}>
              Enter the email address of the user you want to make an admin.
              {'\n\n'}Note: The user will need to sign out and sign back in for the changes to take effect.
            </Text>

            <TextInput
              style={styles.modalInput}
              placeholder="Email Address"
              value={adminEmail}
              onChangeText={setAdminEmail}
              keyboardType="email-address"
              autoCapitalize="none"
            />

            <View style={styles.modalButtons}>
              <TouchableOpacity
                onPress={addAdmin}
                style={[styles.modalButton, styles.saveButton]}
                disabled={actionProcessing}
              >
                {actionProcessing ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={styles.buttonText}>Grant Admin Access</Text>
                )}
              </TouchableOpacity>

              <TouchableOpacity
                onPress={() => {
                  setShowAddAdminModal(false);
                  setAdminEmail('');
                }}
                style={[styles.modalButton, styles.cancelButton]}
                disabled={actionProcessing}
              >
                <Text style={styles.buttonText}>Cancel</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Photo Modal */}
      <Modal visible={showPhotoModal} animationType="fade" transparent={true}>
        <View style={styles.photoModalOverlay}>
          <View style={styles.photoModalContent}>
            <TouchableOpacity
              style={styles.closePhotoButton}
              onPress={() => setShowPhotoModal(false)}
            >
              <Text style={styles.closePhotoText}>✕</Text>
            </TouchableOpacity>
            {selectedPhoto && (
              <Image
                source={{ uri: selectedPhoto }}
                style={styles.fullPhoto}
                resizeMode="contain"
              />
            )}
          </View>
        </View>
      </Modal>

      {/* Edit Vehicle Modal */}
      <Modal visible={modalVisible} animationType="slide" transparent={true}>
        <View style={styles.modalOverlay}>
          <ScrollView style={styles.modalView}>
            <Text style={styles.modalTitle}>Edit Vehicle</Text>

            <TextInput
              style={styles.modalInput}
              placeholder="Licence Plate"
              value={formData.licencePlate}
              onChangeText={(val) => handleFormChange('licencePlate', val)}
            />
            <TextInput
              style={styles.modalInput}
              placeholder="Full Name"
              value={formData.fullName}
              onChangeText={(val) => handleFormChange('fullName', val)}
            />
            <TextInput
              style={styles.modalInput}
              placeholder="Branch"
              value={formData.branch}
              onChangeText={(val) => handleFormChange('branch', val)}
            />
            <TextInput
              style={styles.modalInput}
              placeholder="Designation"
              value={formData.designation}
              onChangeText={(val) => handleFormChange('designation', val)}
            />

            <View style={styles.modalButtons}>
              <TouchableOpacity
                onPress={updateVehicle}
                style={[styles.modalButton, styles.saveButton]}
                disabled={actionProcessing}
              >
                {actionProcessing ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={styles.buttonText}>Save</Text>
                )}
              </TouchableOpacity>

              <TouchableOpacity
                onPress={closeModal}
                style={[styles.modalButton, styles.cancelButton]}
              >
                <Text style={styles.buttonText}>Cancel</Text>
              </TouchableOpacity>
            </View>
          </ScrollView>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
    backgroundColor: '#f5f5f5',
    paddingTop: 50,
  },
  centered: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
    backgroundColor: '#fff',
    padding: 15,
    borderRadius: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  headerButtons: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  registerButton: {
    padding: 10,
    backgroundColor: '#4a90e2',
    borderRadius: 6,
    marginRight: 10,
  },
  registerText: {
    color: 'white',
    fontWeight: '600',
    fontSize: 14,
  },
  addAdminButton: {
    padding: 10,
    backgroundColor: '#28a745',
    borderRadius: 6,
    marginRight: 10,
  },
  addAdminText: {
    color: 'white',
    fontWeight: '600',
    fontSize: 14,
  },
  signOutButton: {
    padding: 10,
    backgroundColor: '#f44336',
    borderRadius: 6,
  },
  signOutText: {
    color: 'white',
    fontWeight: '600',
    fontSize: 14,
  },
  errorText: {
    fontSize: 20,
    color: '#f44336',
    marginBottom: 10,
    textAlign: 'center',
    fontWeight: '600',
  },
  errorSubText: {
    fontSize: 16,
    color: '#666',
    marginBottom: 30,
    textAlign: 'center',
    paddingHorizontal: 20,
  },
  backButton: {
    backgroundColor: '#4a90e2',
    paddingHorizontal: 30,
    paddingVertical: 12,
    borderRadius: 8,
  },
  backButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
  },
  input: {
    borderColor: '#ddd',
    borderWidth: 1,
    padding: 12,
    fontSize: 16,
    borderRadius: 8,
    marginBottom: 15,
    backgroundColor: '#fff',
  },
  sortRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 15,
    backgroundColor: '#fff',
    padding: 10,
    borderRadius: 8,
  },
  sortLabel: {
    marginRight: 10,
    fontWeight: 'bold',
    fontSize: 16,
  },
  sortButton: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 6,
    backgroundColor: '#f0f0f0',
    marginHorizontal: 4,
  },
  sortButtonActive: {
    backgroundColor: '#4a90e2',
  },
  sortText: {
    color: '#333',
    fontSize: 14,
  },
  sortTextActive: {
    color: '#fff',
    fontWeight: '600',
  },
  noRecords: {
    textAlign: 'center',
    marginTop: 40,
    fontSize: 18,
    color: '#666',
  },
  itemContainer: {
    backgroundColor: '#fff',
    borderRadius: 10,
    padding: 15,
    marginBottom: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  vehicleHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  plate: {
    fontWeight: 'bold',
    fontSize: 18,
    color: '#333',
  },
  dateText: {
    fontSize: 12,
    color: '#999',
  },
  vehicleDetail: {
    fontSize: 14,
    color: '#666',
    marginBottom: 3,
  },
  photoLink: {
    fontSize: 14,
    color: '#4a90e2',
    marginTop: 5,
    marginBottom: 5,
  },
  pagination: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 15,
    backgroundColor: '#fff',
    padding: 15,
    borderRadius: 8,
  },
  pageButton: {
    backgroundColor: '#4a90e2',
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 6,
  },
  pageButtonDisabled: {
    backgroundColor: '#ddd',
  },
  pageButtonText: {
    color: '#fff',
    fontWeight: 'bold',
  },
  pageInfo: {
    fontSize: 16,
    fontWeight: '600',
  },
  itemButtons: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginTop: 10,
  },
  editBtn: {
    backgroundColor: '#28a745',
    paddingHorizontal: 15,
    paddingVertical: 8,
    borderRadius: 6,
    marginRight: 8,
  },
  editText: {
    color: '#fff',
    fontWeight: '600',
  },
  deleteBtn: {
    backgroundColor: '#dc3545',
    paddingHorizontal: 15,
    paddingVertical: 8,
    borderRadius: 6,
  },
  deleteText: {
    color: '#fff',
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
    marginBottom: 10,
    textAlign: 'center',
    color: '#333',
  },
  modalSubtitle: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    marginBottom: 20,
    paddingHorizontal: 10,
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
    textAlign: 'center',
    fontSize: 16,
  },
  photoModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.9)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  photoModalContent: {
    width: '90%',
    height: '80%',
    backgroundColor: '#fff',
    borderRadius: 10,
    padding: 10,
    position: 'relative',
  },
  closePhotoButton: {
    position: 'absolute',
    top: 10,
    right: 15,
    zIndex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    borderRadius: 15,
    width: 30,
    height: 30,
    justifyContent: 'center',
    alignItems: 'center',
  },
  closePhotoText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  fullPhoto: {
    width: '100%',
    height: '100%',
    borderRadius: 8,
  },
});
