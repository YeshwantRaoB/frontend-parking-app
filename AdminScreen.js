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
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useAuth, useUser } from '@clerk/clerk-expo';

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
  
  const navigation = useNavigation();
  const { signOut } = useAuth();
  const { user, isLoaded } = useUser();

  // Check if user is admin when component mounts
  useEffect(() => {
    if (isLoaded && user) {
      const adminStatus = isUserAdmin(user);
      setIsAdmin(adminStatus);
      
      if (adminStatus) {
        fetchVehicles(1, 'licencePlate', '');
      } else {
        setError('You do not have admin privileges.');
        setLoading(false);
      }
    }
  }, [isLoaded, user]);

  // Redirect to home if user is not authenticated or not an admin
  useEffect(() => {
    if (isLoaded && !user) {
      navigation.replace('UserHome');
    }
  }, [isLoaded, user, navigation]);

  const fetchVehicles = async (newPage = page, newSortBy = sortBy, query = searchText) => {
    setLoading(true);
    try {
      const token = await user.getToken();
      const params = new URLSearchParams({
        page: newPage.toString(),
        limit: limit.toString(),
        sortBy: newSortBy,
      });
      if (query) {
        params.append('licencePlate', query);
      }

      const response = await fetch(`http://192.168.156.57:5000/vehicles?${params.toString()}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
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

  useEffect(() => {
    fetchVehicles(1, sortBy, '');
  }, []);

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
      const token = await user.getToken();
      const response = await fetch(`http://192.168.156.57:5000/vehicles/${selectedVehicle._id}`, {
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
      const token = await user.getToken();
      const response = await fetch(`http://192.168.156.57:5000/vehicles/${id}`, {
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
      navigation.replace('UserHome');
    } catch (err) {
      console.error('Error signing out:', err);
      Alert.alert('Error', 'Failed to sign out');
    }
  };

  const renderVehicle = ({ item }) => (
    <View style={styles.itemContainer}>
      <Text style={styles.plate}>{item.licencePlate}</Text>
      <Text>Name: {item.fullName}</Text>
      <Text>Branch: {item.branch}</Text>
      <Text>Designation: {item.designation}</Text>
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
        <Text style={styles.errorText}>{error || 'Access Denied'}</Text>
        <TouchableOpacity style={styles.button} onPress={handleSignOut}>
          <Text style={styles.buttonText}>Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Admin Dashboard</Text>
        <TouchableOpacity onPress={handleSignOut} style={styles.signOutButton}>
          <Text style={styles.signOutText}>Sign Out</Text>
        </TouchableOpacity>
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
    backgroundColor: '#fff' 
  },
  centered: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  signOutButton: {
    padding: 8,
    backgroundColor: '#f44336',
    borderRadius: 4,
  },
  signOutText: {
    color: 'white',
    fontWeight: '500',
  },
  errorText: {
    fontSize: 18,
    color: '#f44336',
    marginBottom: 20,
    textAlign: 'center',
  },
  title: { fontSize: 24, fontWeight: 'bold', marginBottom: 16 },
  input: {
    borderColor: '#ccc',
    borderWidth: 1,
    padding: 10,
    fontSize: 18,
    borderRadius: 6,
    marginBottom: 12,
  },
  sortRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  sortLabel: { marginRight: 8, fontWeight: 'bold' },
  sortButton: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 6,
    backgroundColor: '#eee',
    marginHorizontal: 4,
  },
  sortButtonActive: { backgroundColor: '#cc0000' },
  sortText: { color: '#333' },
  sortTextActive: { color: '#fff' },
  noRecords: { textAlign: 'center', marginTop: 20, fontSize: 18 },
  itemContainer: {
    borderBottomWidth: 1,
    borderBottomColor: '#ddd',
    paddingVertical: 12,
  },
  plate: { fontWeight: 'bold', fontSize: 16, marginBottom: 4 },
  pagination: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 12,
  },
  pageButton: {
    backgroundColor: '#cc0000',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 6,
  },
  pageButtonDisabled: { backgroundColor: '#ddd' },
  pageButtonText: { color: '#fff', fontWeight: 'bold' },
  pageInfo: { fontSize: 16 },
  itemButtons: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginTop: 8,
  },
  editBtn: {
    backgroundColor: '#007BFF',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    marginRight: 8,
  },
  editText: { color: '#fff' },
  deleteBtn: {
    backgroundColor: '#dc3545',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
  },
  deleteText: { color: '#fff' },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    padding: 20,
  },
  modalView: {
    backgroundColor: '#fff',
    borderRadius: 10,
    padding: 20,
    maxHeight: '90%',
  },
  modalTitle: { fontSize: 20, fontWeight: 'bold', marginBottom: 12 },
  modalInput: {
    borderWidth: 1,
    borderColor: '#ccc',
    padding: 10,
    borderRadius: 6,
    fontSize: 16,
    marginBottom: 12,
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 12,
  },
  modalButton: {
    flex: 1,
    padding: 12,
    borderRadius: 8,
    marginHorizontal: 6,
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
  },
});
