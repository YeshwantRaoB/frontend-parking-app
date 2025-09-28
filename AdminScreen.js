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
  const [sortOrder, setSortOrder] = useState('asc');
  const [loading, setLoading] = useState(true);
  
  // Simplified filtering states
  const [activeFilters, setActiveFilters] = useState({
    branch: '',
    designation: '',
    staffPosition: '',
    dateRange: '',
    searchField: 'licencePlate'
  });
  const [totalResults, setTotalResults] = useState(0);
  const [quickFilterActive, setQuickFilterActive] = useState('');
  
  // Client-side data management
  const [allVehicles, setAllVehicles] = useState([]);
  const [filteredVehicles, setFilteredVehicles] = useState([]);
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
  const [actionProcessing, setActionProcessing] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [error, setError] = useState('');
  const [showAddAdminModal, setShowAddAdminModal] = useState(false);
  const [adminEmail, setAdminEmail] = useState('');
  const [showPhotoModal, setShowPhotoModal] = useState(false);
  const [selectedPhoto, setSelectedPhoto] = useState(null);
  const [selectedPhotoInfo, setSelectedPhotoInfo] = useState(null);

  // Modal states for edit form dropdowns
  const [showEditBranchModal, setShowEditBranchModal] = useState(false);
  const [showEditDesignationModal, setShowEditDesignationModal] = useState(false);
  const [showEditStaffPositionModal, setShowEditStaffPositionModal] = useState(false);

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
            fetchAllVehicles();
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

  // Fetch all vehicles from backend (using existing API)
  const fetchAllVehicles = async () => {
    setLoading(true);
    try {
      const token = await getToken();
      if (!token) {
        throw new Error('No authentication token available');
      }

      // Fetch with a large limit to get all vehicles
      const params = new URLSearchParams({
        page: '1',
        limit: '1000', // Large number to get all vehicles
        sortBy: 'licencePlate',
      });

      const url = `${API_BASE_URL}/vehicles?${params.toString()}`;
      console.log('Fetching all vehicles from:', url);

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
      setAllVehicles(json.vehicles || []);
      
      // Apply initial filtering and sorting
      applyClientSideFiltering(json.vehicles || [], activeFilters, searchText, sortBy, sortOrder);
      
    } catch (error) {
      console.error('Error fetching vehicles:', error);
      Alert.alert('Error', error.message || 'Failed to load vehicles');
    } finally {
      setLoading(false);
    }
  };

  // Client-side filtering and sorting
  const applyClientSideFiltering = (vehicleData, filters, query, sortField, sortDirection) => {
    let filtered = [...vehicleData];

    // Apply search filter - search across all fields
    if (query && query.trim()) {
      const searchTerm = query.toLowerCase().trim();
      filtered = filtered.filter(vehicle => {
        return (
          vehicle.licencePlate?.toLowerCase().includes(searchTerm) ||
          vehicle.fullName?.toLowerCase().includes(searchTerm) ||
          vehicle.vehicleName?.toLowerCase().includes(searchTerm) ||
          vehicle.branch?.toLowerCase().includes(searchTerm)
        );
      });
    }

    // Apply branch filter
    if (filters.branch) {
      filtered = filtered.filter(vehicle => vehicle.branch === filters.branch);
    }

    // Apply designation filter
    if (filters.designation) {
      filtered = filtered.filter(vehicle => vehicle.designation === filters.designation);
    }

    // Apply staff position filter
    if (filters.staffPosition) {
      filtered = filtered.filter(vehicle => 
        vehicle.staffPosition === filters.staffPosition || 
        vehicle.department === filters.staffPosition
      );
    }

    // Apply date range filter
    if (filters.dateRange) {
      const now = new Date();
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      
      filtered = filtered.filter(vehicle => {
        const vehicleDate = new Date(vehicle.createdAt);
        
        switch (filters.dateRange) {
          case 'today':
            return vehicleDate >= today;
          case 'last7days':
            const last7Days = new Date(today);
            last7Days.setDate(last7Days.getDate() - 7);
            return vehicleDate >= last7Days;
          case 'last30days':
            const last30Days = new Date(today);
            last30Days.setDate(last30Days.getDate() - 30);
            return vehicleDate >= last30Days;
          case 'thisMonth':
            const thisMonth = new Date(now.getFullYear(), now.getMonth(), 1);
            return vehicleDate >= thisMonth;
          default:
            return true;
        }
      });
    }

    // Apply sorting
    filtered.sort((a, b) => {
      let aValue, bValue;
      
      switch (sortField) {
        case 'fullName':
          aValue = a.fullName?.toLowerCase() || '';
          bValue = b.fullName?.toLowerCase() || '';
          break;
        case 'branch':
          aValue = a.branch?.toLowerCase() || '';
          bValue = b.branch?.toLowerCase() || '';
          break;
        case 'designation':
          aValue = a.designation?.toLowerCase() || '';
          bValue = b.designation?.toLowerCase() || '';
          break;
        case 'createdAt':
          aValue = new Date(a.createdAt);
          bValue = new Date(b.createdAt);
          break;
        case 'vehicleName':
          aValue = a.vehicleName?.toLowerCase() || '';
          bValue = b.vehicleName?.toLowerCase() || '';
          break;
        case 'licencePlate':
        default:
          aValue = a.licencePlate?.toLowerCase() || '';
          bValue = b.licencePlate?.toLowerCase() || '';
          break;
      }

      if (sortField === 'createdAt') {
        return sortDirection === 'asc' ? aValue - bValue : bValue - aValue;
      } else {
        if (aValue < bValue) return sortDirection === 'asc' ? -1 : 1;
        if (aValue > bValue) return sortDirection === 'asc' ? 1 : -1;
        return 0;
      }
    });

    // Update state - show all filtered results
    setFilteredVehicles(filtered);
    setTotalResults(filtered.length);
    setVehicles(filtered); // Show all filtered results, no pagination
  };



  const onSearch = () => {
    setPage(1);
    applyClientSideFiltering(allVehicles, activeFilters, searchText.trim(), sortBy, sortOrder);
  };

  const onSortChange = (field) => {
    const newOrder = sortBy === field && sortOrder === 'asc' ? 'desc' : 'asc';
    setSortBy(field);
    setSortOrder(newOrder);
    setPage(1);
    applyClientSideFiltering(allVehicles, activeFilters, searchText.trim(), field, newOrder);
  };

  // Remove pagination - no longer needed
  // const onPageChange = (newPage) => { ... }

  // Simplified filtering functions

  const clearAllFilters = () => {
    const clearedFilters = {
      branch: '',
      designation: '',
      staffPosition: '',
      dateRange: '',
      searchField: 'licencePlate'
    };
    setActiveFilters(clearedFilters);
    setSearchText('');
    setQuickFilterActive('');
    setPage(1);
    applyClientSideFiltering(allVehicles, clearedFilters, '', sortBy, sortOrder);
  };

  const applyQuickFilter = (filterType) => {
    let newFilters = { ...activeFilters };
    
    switch (filterType) {
      case 'students':
        newFilters = { ...newFilters, designation: 'Student', staffPosition: '' };
        break;
      case 'staff':
        newFilters = { ...newFilters, designation: 'Staff', staffPosition: '' };
        break;
      case 'hod':
        newFilters = { ...newFilters, designation: 'Staff', staffPosition: 'HOD' };
        break;
      case 'lecturers':
        newFilters = { ...newFilters, designation: 'Staff', staffPosition: 'Lecturer' };
        break;
      case 'recent':
        newFilters = { ...newFilters, dateRange: 'last7days' };
        break;
      default:
        return;
    }
    
    setQuickFilterActive(filterType);
    setActiveFilters(newFilters);
    setPage(1);
    applyClientSideFiltering(allVehicles, newFilters, searchText.trim(), sortBy, sortOrder);
  };

  const removeFilter = (filterKey) => {
    const newFilters = { ...activeFilters };
    newFilters[filterKey] = '';
    setActiveFilters(newFilters);
    if (filterKey === 'designation' || filterKey === 'staffPosition') {
      setQuickFilterActive('');
    }
    setPage(1);
    applyClientSideFiltering(allVehicles, newFilters, searchText.trim(), sortBy, sortOrder);
  };

  // Simplified - no advanced filter count needed

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

  // Advanced filter modal removed for simplicity

  // Dropdown component for edit modal
  const EditDropdownModal = ({ visible, onClose, options, onSelect, title }) => (
    <Modal visible={visible} animationType="slide" transparent={true}>
      <View style={styles.editDropdownModalOverlay}>
        <View style={styles.editDropdownModal}>
          <View style={styles.editDropdownHeader}>
            <Text style={styles.editDropdownTitle}>{title}</Text>
            <TouchableOpacity onPress={onClose} style={styles.editCloseButton}>
              <Text style={styles.editCloseButtonText}>✕</Text>
            </TouchableOpacity>
          </View>
          <FlatList
            data={options}
            keyExtractor={(item, index) => index.toString()}
            renderItem={({ item }) => (
              <TouchableOpacity
                style={styles.editDropdownItem}
                onPress={() => {
                  onSelect(item);
                  onClose();
                }}
              >
                <Text style={styles.editDropdownItemText}>{item}</Text>
              </TouchableOpacity>
            )}
          />
        </View>
      </View>
    </Modal>
  );

  const updateVehicle = async () => {
    if (!selectedVehicle) return;

    // Enhanced validation
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
      fetchAllVehicles();
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
      fetchAllVehicles();
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

  const showPhoto = (photoUrl, photoType = 'Photo', vehicleInfo = '') => {
    setSelectedPhoto(photoUrl);
    setSelectedPhotoInfo({ type: photoType, vehicle: vehicleInfo });
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
      {item.registerNumber && (
        <Text style={styles.vehicleDetail}>Register No: {item.registerNumber}</Text>
      )}
      {(item.staffPosition || item.department) && (
        <Text style={styles.vehicleDetail}>Position: {item.staffPosition || item.department}</Text>
      )}
      {item.vehicleName && (
        <Text style={styles.vehicleDetail}>Vehicle: {item.vehicleName}</Text>
      )}
      {/* Simplified Photo Section - Performance Optimized */}
      <View style={styles.photoSection}>
        <Text style={styles.photoSectionTitle}>📷 Photos</Text>
        <View style={styles.photoButtonsContainer}>
          {/* Vehicle Photo Button */}
          {(item.vehiclePhotoUrl || (item.photoUrl && !item.ownerPhotoUrl)) ? (
            <TouchableOpacity
              style={styles.photoViewButton}
              onPress={() => showPhoto(item.vehiclePhotoUrl || item.photoUrl, 'Vehicle Photo', `${item.licencePlate} - ${item.fullName}`)}
            >
              <Text style={styles.photoViewButtonText}>🚗 View Vehicle Photo</Text>
            </TouchableOpacity>
          ) : (
            <View style={styles.photoUnavailableButton}>
              <Text style={styles.photoUnavailableText}>🚗 No Vehicle Photo</Text>
            </View>
          )}

          {/* Owner Photo Button */}
          {item.ownerPhotoUrl ? (
            <TouchableOpacity
              style={styles.photoViewButton}
              onPress={() => showPhoto(item.ownerPhotoUrl, 'Owner Photo', `${item.licencePlate} - ${item.fullName}`)}
            >
              <Text style={styles.photoViewButtonText}>👤 View Owner Photo</Text>
            </TouchableOpacity>
          ) : (
            <View style={styles.photoUnavailableButton}>
              <Text style={styles.photoUnavailableText}>👤 No Owner Photo</Text>
            </View>
          )}
        </View>
      </View>
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
      {/* Fixed Header */}
      <View style={styles.fixedHeader}>
        <View style={styles.header}>
          <Text style={styles.title}>Admin Dashboard</Text>
        </View>
        
        <View style={styles.actionButtons}>
          <TouchableOpacity onPress={() => navigation.navigate('Registration')} style={styles.registerButton}>
            <Text style={styles.registerText}>+ Vehicle</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => setShowAddAdminModal(true)} style={styles.addAdminButton}>
            <Text style={styles.addAdminText}>+ Admin</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={handleSignOut} style={styles.signOutButton}>
            <Text style={styles.signOutText}>Sign Out</Text>
          </TouchableOpacity>
        </View>

        {/* Simplified Search Bar */}
        <View style={styles.searchInputContainer}>
          <TextInput
            style={styles.compactSearchInput}
            placeholder="Search by License Plate, Name, or Vehicle Model"
            value={searchText}
            onChangeText={setSearchText}
            onSubmitEditing={onSearch}
            returnKeyType="search"
          />
          <TouchableOpacity style={styles.compactSearchButton} onPress={onSearch}>
            <Text style={styles.searchButtonText}>🔍</Text>
          </TouchableOpacity>
        </View>

        {/* Compact Quick Filters */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.compactQuickFilters}>
          {[
            { key: 'students', label: '🎓 Students' },
            { key: 'staff', label: '👨‍🏫 Staff' },
            { key: 'hod', label: '👑 HODs' },
            { key: 'lecturers', label: '👨‍🏫 Lecturers' },
            { key: 'recent', label: '📅 Recent' }
          ].map((filter) => (
            <TouchableOpacity
              key={filter.key}
              style={[
                styles.compactQuickFilterChip,
                quickFilterActive === filter.key && styles.quickFilterChipActive
              ]}
              onPress={() => applyQuickFilter(filter.key)}
            >
              <Text style={[
                styles.compactQuickFilterText,
                quickFilterActive === filter.key && styles.quickFilterTextActive
              ]}>
                {filter.label}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {/* Active Quick Filter Display */}
        {quickFilterActive && (
          <View style={styles.compactActiveFilters}>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              <View style={styles.activeFiltersRow}>
                <View style={styles.compactActiveFilterChip}>
                  <Text style={styles.compactActiveFilterText}>
                    {quickFilterActive === 'students' && '🎓 Students'}
                    {quickFilterActive === 'staff' && '👨‍🏫 Staff'}
                    {quickFilterActive === 'hod' && '👑 HODs'}
                    {quickFilterActive === 'lecturers' && '👨‍🏫 Lecturers'}
                    {quickFilterActive === 'recent' && '📅 Recent'}
                  </Text>
                  <TouchableOpacity onPress={clearAllFilters}>
                    <Text style={styles.activeFilterRemove}>✕</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </ScrollView>
          </View>
        )}

        {/* Compact Sort & Results */}
        <View style={styles.compactSortContainer}>
          <Text style={styles.compactResultsCount}>
            {totalResults > 0 ? `${totalResults} result${totalResults !== 1 ? 's' : ''}` : 'No results'}
          </Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.compactSortScroll}>
            {[
              { key: 'licencePlate', label: 'License', icon: '🚗' },
              { key: 'fullName', label: 'Name', icon: '👤' },
              { key: 'branch', label: 'Branch', icon: '🏢' },
              { key: 'designation', label: 'Role', icon: '👥' },
              { key: 'createdAt', label: 'Date', icon: '📅' },
              { key: 'vehicleName', label: 'Vehicle', icon: '🚙' }
            ].map((field) => (
              <TouchableOpacity
                key={field.key}
                onPress={() => onSortChange(field.key)}
                style={[
                  styles.compactSortButton,
                  sortBy === field.key && styles.sortButtonActive,
                ]}
              >
                <Text
                  style={sortBy === field.key ? styles.sortTextActive : styles.compactSortText}
                >
                  {field.icon} {field.label}
                  {sortBy === field.key && (
                    <Text style={styles.sortOrderIndicator}>
                      {sortOrder === 'asc' ? ' ↑' : ' ↓'}
                    </Text>
                  )}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      </View>

      {/* Scrollable Content */}
      <View style={styles.scrollableContent}>
        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#4a90e2" />
            <Text style={styles.loadingText}>Loading vehicles...</Text>
          </View>
        ) : vehicles.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Text style={styles.noRecords}>No vehicles found.</Text>
            <Text style={styles.noRecordsSubtext}>
              {getActiveFilterCount() > 0 ? 'Try adjusting your filters' : 'No vehicles registered yet'}
            </Text>
          </View>
        ) : (
          <FlatList
            data={vehicles}
            renderItem={renderVehicle}
            keyExtractor={(item) => item._id}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.listContainer}
          />
        )}
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

      {/* Enhanced Photo Modal */}
      <Modal visible={showPhotoModal} animationType="fade" transparent={true}>
        <View style={styles.photoModalOverlay}>
          <View style={styles.photoModalContent}>
            {/* Enhanced Header with photo info */}
            <View style={styles.photoModalHeader}>
              <View style={styles.photoModalInfo}>
                <Text style={styles.photoModalTitle}>
                  {selectedPhotoInfo?.type || 'Photo'}
                </Text>
                {selectedPhotoInfo?.vehicle && (
                  <Text style={styles.photoModalSubtitle}>
                    {selectedPhotoInfo.vehicle}
                  </Text>
                )}
              </View>
              <View style={styles.photoModalActions}>
                <TouchableOpacity
                  style={styles.photoActionButton}
                  onPress={() => {
                    // Add functionality to download or share photo
                    Alert.alert('Photo Actions', 'Photo viewing options', [
                      { text: 'Close', style: 'cancel' }
                    ]);
                  }}
                >
                  <Text style={styles.photoActionText}>⋯</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.closePhotoButton}
                  onPress={() => setShowPhotoModal(false)}
                >
                  <Text style={styles.closePhotoText}>✕</Text>
                </TouchableOpacity>
              </View>
            </View>
            
            {/* Photo with loading indicator */}
            {selectedPhoto && (
              <View style={styles.photoContainer}>
                <Image
                  source={{ uri: selectedPhoto }}
                  style={styles.fullPhoto}
                  resizeMode="contain"
                  onLoadStart={() => console.log('Loading photo...')}
                  onLoadEnd={() => console.log('Photo loaded')}
                  onError={(error) => console.log('Photo load error:', error)}
                />
              </View>
            )}
            
            {/* Photo Info Footer */}
            <View style={styles.photoModalFooter}>
              <Text style={styles.photoModalFooterText}>
                Tap and hold to save • Pinch to zoom
              </Text>
            </View>
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
              placeholder="Vehicle Name/Model"
              value={formData.vehicleName}
              onChangeText={(val) => handleFormChange('vehicleName', val)}
            />
            {/* Branch/Department Dropdown */}
            <TouchableOpacity
              style={styles.editDropdownButton}
              onPress={() => setShowEditBranchModal(true)}
            >
              <Text style={[styles.editDropdownText, !formData.branch && styles.editPlaceholderText]}>
                {formData.branch || 'Select Branch/Department'}
              </Text>
              <Text style={styles.editDropdownArrow}>▼</Text>
            </TouchableOpacity>

            {/* Designation Dropdown */}
            <TouchableOpacity
              style={styles.editDropdownButton}
              onPress={() => setShowEditDesignationModal(true)}
            >
              <Text style={[styles.editDropdownText, !formData.designation && styles.editPlaceholderText]}>
                {formData.designation || 'Select Designation'}
              </Text>
              <Text style={styles.editDropdownArrow}>▼</Text>
            </TouchableOpacity>

            {/* Conditional fields based on designation */}
            {formData.designation === 'Student' && (
              <View style={styles.editConditionalSection}>
                <Text style={styles.editSectionLabel}>Student Information</Text>
                <TextInput
                  style={styles.modalInput}
                  placeholder={`Register Number (e.g., 103${BRANCH_CODES[formData.branch] || 'XX'}23062)`}
                  value={formData.registerNumber}
                  onChangeText={(val) => handleFormChange('registerNumber', val)}
                  autoCapitalize="characters"
                  maxLength={11}
                />
                <Text style={styles.editHelperText}>
                  Format: 103 + Branch Code + Year + Roll Number{'\n'}
                  Example: 103CS23062 (103=College, CS=Computer Science, 23=Year 2023, 062=Roll No.)
                </Text>
              </View>
            )}

            {formData.designation === 'Staff' && (
              <View style={styles.editConditionalSection}>
                <Text style={styles.editSectionLabel}>Staff Information</Text>
                <TouchableOpacity
                  style={styles.editDropdownButton}
                  onPress={() => setShowEditStaffPositionModal(true)}
                >
                  <Text style={[styles.editDropdownText, !formData.staffPosition && styles.editPlaceholderText]}>
                    {formData.staffPosition || 'Select Position (HOD or Lecturer)'}
                  </Text>
                  <Text style={styles.editDropdownArrow}>▼</Text>
                </TouchableOpacity>
              </View>
            )}

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

      {/* Edit Form Dropdown Modals */}
      <EditDropdownModal
        visible={showEditBranchModal}
        onClose={() => setShowEditBranchModal(false)}
        options={BRANCH_OPTIONS}
        onSelect={(value) => handleFormChange('branch', value)}
        title="Select Branch/Department"
      />

      <EditDropdownModal
        visible={showEditDesignationModal}
        onClose={() => setShowEditDesignationModal(false)}
        options={DESIGNATION_OPTIONS}
        onSelect={(value) => handleFormChange('designation', value)}
        title="Select Designation"
      />

      <EditDropdownModal
        visible={showEditStaffPositionModal}
        onClose={() => setShowEditStaffPositionModal(false)}
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
  },
  fixedHeader: {
    backgroundColor: '#f0f2f5',
    paddingTop: 50,
    paddingHorizontal: 16,
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#e9ecef',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  scrollableContent: {
    flex: 1,
    paddingHorizontal: 16,
  },
  centered: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    backgroundColor: '#fff',
    padding: 15,
    borderRadius: 12,
    marginBottom: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    alignItems: 'center',
  },
  actionButtons: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 10,
    backgroundColor: '#fff',
    padding: 12,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  registerButton: {
    paddingVertical: 12,
    paddingHorizontal: 20,
    backgroundColor: '#4a90e2',
    borderRadius: 10,
    shadowColor: '#4a90e2',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 3,
  },
  registerText: {
    color: 'white',
    fontWeight: '700',
    fontSize: 14,
  },
  addAdminButton: {
    paddingVertical: 12,
    paddingHorizontal: 20,
    backgroundColor: '#28a745',
    borderRadius: 10,
    shadowColor: '#28a745',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 3,
  },
  addAdminText: {
    color: 'white',
    fontWeight: '700',
    fontSize: 14,
  },
  signOutButton: {
    paddingVertical: 12,
    paddingHorizontal: 20,
    backgroundColor: '#f44336',
    borderRadius: 10,
    shadowColor: '#f44336',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 3,
  },
  signOutText: {
    color: 'white',
    fontWeight: '700',
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
    color: '#2c3e50',
    textAlign: 'center',
  },
  
  // Simplified Search Styles
  compactSearchInput: {
    flex: 1,
    padding: 12,
    fontSize: 14,
    borderRadius: 10,
  },
  compactSearchButton: {
    paddingHorizontal: 12,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#4a90e2',
    borderTopRightRadius: 10,
    borderBottomRightRadius: 10,
  },
  
  compactQuickFilters: {
    marginBottom: 8,
    flexGrow: 0,
  },
  compactQuickFilterChip: {
    backgroundColor: '#f8f9fa',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 15,
    marginRight: 6,
    borderWidth: 1,
    borderColor: '#e9ecef',
  },
  compactQuickFilterText: {
    fontSize: 11,
    color: '#495057',
    fontWeight: '500',
  },
  
  compactActiveFilters: {
    marginBottom: 8,
  },
  compactActiveFilterChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff3cd',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    marginRight: 6,
    borderWidth: 1,
    borderColor: '#ffc107',
  },
  compactActiveFilterText: {
    fontSize: 10,
    color: '#856404',
    fontWeight: '500',
    marginRight: 4,
  },
  compactClearAllButton: {
    backgroundColor: '#ffc107',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    marginLeft: 4,
  },
  
  compactSortContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 5,
  },
  compactResultsCount: {
    fontSize: 12,
    color: '#6c757d',
    fontWeight: '500',
    marginRight: 10,
  },
  compactSortScroll: {
    flex: 1,
    flexGrow: 0,
  },
  compactSortButton: {
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 15,
    backgroundColor: '#f8f9fa',
    marginRight: 6,
    borderWidth: 1,
    borderColor: '#e9ecef',
  },
  compactSortText: {
    color: '#495057',
    fontSize: 11,
    fontWeight: '500',
  },
  
  // Content Styles
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 50,
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: '#6c757d',
    fontWeight: '500',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 50,
    paddingHorizontal: 20,
  },
  noRecordsSubtext: {
    fontSize: 14,
    color: '#6c757d',
    textAlign: 'center',
    marginTop: 8,
  },
  listContainer: {
    paddingBottom: 20,
  },
  // Enhanced Search Styles
  searchContainer: {
    flexDirection: 'row',
    marginBottom: 15,
    gap: 10,
  },
  searchInputContainer: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e9ecef',
    marginBottom: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  searchInput: {
    flex: 1,
    padding: 16,
    fontSize: 16,
    borderRadius: 12,
  },
  searchButton: {
    paddingHorizontal: 16,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#4a90e2',
    borderTopRightRadius: 12,
    borderBottomRightRadius: 12,
  },
  searchButtonText: {
    fontSize: 18,
    color: '#fff',
  },
  filterButton: {
    backgroundColor: '#fff',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e9ecef',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  filterButtonActive: {
    backgroundColor: '#4a90e2',
    borderColor: '#4a90e2',
  },
  filterButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#495057',
  },
  // Quick Filters Styles
  quickFiltersContainer: {
    backgroundColor: '#fff',
    padding: 15,
    borderRadius: 12,
    marginBottom: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  quickFiltersLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#495057',
    marginBottom: 10,
  },
  quickFiltersScroll: {
    flexGrow: 0,
  },
  quickFilterChip: {
    backgroundColor: '#f8f9fa',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    marginRight: 8,
    borderWidth: 1,
    borderColor: '#e9ecef',
  },
  quickFilterChipActive: {
    backgroundColor: '#4a90e2',
    borderColor: '#4a90e2',
  },
  quickFilterText: {
    fontSize: 12,
    color: '#495057',
    fontWeight: '500',
  },
  quickFilterTextActive: {
    color: '#fff',
    fontWeight: '600',
  },

  // Active Filters Styles
  activeFiltersContainer: {
    backgroundColor: '#fff3cd',
    padding: 15,
    borderRadius: 12,
    marginBottom: 15,
    borderLeftWidth: 4,
    borderLeftColor: '#ffc107',
  },
  activeFiltersHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  activeFiltersLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#856404',
  },
  clearAllButton: {
    backgroundColor: '#ffc107',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 15,
  },
  clearAllText: {
    fontSize: 12,
    color: '#fff',
    fontWeight: '600',
  },
  activeFiltersRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  activeFilterChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 15,
    marginRight: 8,
    marginBottom: 5,
    borderWidth: 1,
    borderColor: '#ffc107',
  },
  activeFilterText: {
    fontSize: 12,
    color: '#856404',
    fontWeight: '500',
    marginRight: 6,
  },
  activeFilterRemove: {
    fontSize: 12,
    color: '#dc3545',
    fontWeight: 'bold',
  },

  // Enhanced Sort Styles
  sortContainer: {
    backgroundColor: '#fff',
    padding: 15,
    borderRadius: 12,
    marginBottom: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  sortHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  sortLabel: {
    fontWeight: 'bold',
    fontSize: 16,
    color: '#333',
  },
  resultsCount: {
    fontSize: 14,
    color: '#6c757d',
    fontWeight: '500',
  },
  sortScrollView: {
    flexGrow: 0,
  },
  sortButton: {
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 20,
    backgroundColor: '#f8f9fa',
    marginRight: 10,
    borderWidth: 1,
    borderColor: '#e9ecef',
  },
  sortButtonActive: {
    backgroundColor: '#4a90e2',
    borderColor: '#4a90e2',
  },
  sortText: {
    color: '#495057',
    fontSize: 14,
    fontWeight: '500',
  },
  sortTextActive: {
    color: '#fff',
    fontWeight: '700',
  },
  sortOrderIndicator: {
    fontSize: 12,
    fontWeight: 'bold',
  },
  noRecords: {
    textAlign: 'center',
    fontSize: 18,
    color: '#666',
    fontWeight: '600',
  },
  itemContainer: {
    backgroundColor: '#fff',
    borderRadius: 15,
    padding: 18,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.12,
    shadowRadius: 6,
    elevation: 4,
    borderLeftWidth: 4,
    borderLeftColor: '#4a90e2',
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
  // Simplified Photo Section Styles - Performance Optimized
  photoSection: {
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
  photoViewButton: {
    backgroundColor: '#4a90e2',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    shadowColor: '#4a90e2',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 3,
    elevation: 2,
    flex: 1,
    minWidth: 120,
  },
  photoViewButtonText: {
    fontSize: 12,
    color: '#fff',
    fontWeight: '600',
    textAlign: 'center',
  },
  photoUnavailableButton: {
    backgroundColor: '#f8f9fa',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e9ecef',
    flex: 1,
    minWidth: 120,
  },
  photoUnavailableText: {
    fontSize: 12,
    color: '#6c757d',
    fontWeight: '500',
    textAlign: 'center',
  },
  // Pagination removed - showing all results
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
    backgroundColor: 'rgba(0,0,0,0.95)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  photoModalContent: {
    width: '95%',
    height: '85%',
    backgroundColor: '#fff',
    borderRadius: 15,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 10,
  },
  photoModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 15,
    backgroundColor: '#f8f9fa',
    borderBottomWidth: 1,
    borderBottomColor: '#e9ecef',
  },
  photoModalInfo: {
    flex: 1,
  },
  photoModalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#2c3e50',
    marginBottom: 2,
  },
  photoModalSubtitle: {
    fontSize: 14,
    color: '#6c757d',
    fontWeight: '500',
  },
  closePhotoButton: {
    backgroundColor: '#f44336',
    borderRadius: 20,
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#f44336',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 3,
  },
  closePhotoText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  photoContainer: {
    flex: 1,
    padding: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  fullPhoto: {
    width: '100%',
    height: '100%',
    borderRadius: 8,
  },
  // Edit form dropdown styles
  editDropdownButton: {
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
  editDropdownText: {
    fontSize: 16,
    color: '#333',
    flex: 1,
  },
  editPlaceholderText: {
    color: '#999',
  },
  editDropdownArrow: {
    fontSize: 12,
    color: '#666',
    marginLeft: 10,
  },
  editConditionalSection: {
    backgroundColor: '#fff3cd',
    padding: 16,
    borderRadius: 8,
    marginBottom: 15,
    borderLeftWidth: 4,
    borderLeftColor: '#ffc107',
  },
  editSectionLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#495057',
    marginBottom: 12,
  },
  editHelperText: {
    fontSize: 12,
    color: '#6c757d',
    marginTop: -12,
    marginBottom: 16,
    paddingHorizontal: 4,
    lineHeight: 16,
  },
  // Edit dropdown modal styles
  editDropdownModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  editDropdownModal: {
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
  editDropdownHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#e9ecef',
  },
  editDropdownTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#212529',
  },
  editCloseButton: {
    padding: 8,
    borderRadius: 20,
    backgroundColor: '#f8f9fa',
  },
  editCloseButtonText: {
    fontSize: 16,
    color: '#6c757d',
    fontWeight: 'bold',
  },
  editDropdownItem: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f8f9fa',
  },
  editDropdownItemText: {
    fontSize: 16,
    color: '#212529',
  },

  // Enhanced Photo Modal Styles
  photoActionButton: {
    backgroundColor: '#6c757d',
    borderRadius: 20,
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#6c757d',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 3,
  },
  photoActionText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  photoModalFooter: {
    padding: 15,
    borderTopWidth: 1,
    borderTopColor: '#e9ecef',
    alignItems: 'center',
  },
  photoModalFooterText: {
    fontSize: 12,
    color: '#6c757d',
    fontStyle: 'italic',
  },
});
