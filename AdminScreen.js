import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
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
  Linking,
  Animated,
  SafeAreaView,
  RefreshControl,
  StatusBar,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useAuth, useUser } from '@clerk/clerk-expo';
import { API_BASE_URL } from './config';
import { testNetworkConnection } from './utils/networkTest';
import Footer from './components/Footer';
import LicensePlateScanner from './components/LicensePlateScanner';
import VehicleDetailsModal from './components/VehicleDetailsModal';
import StatsOverview from './components/admin/StatsOverview';
import StatsPanel from './components/admin/StatsPanel';
import DetailedStatistics from './components/admin/DetailedStatistics';
import WhitelistManager from './components/admin/WhitelistManager';
import DailyLogViewer from './components/admin/DailyLogViewer';

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

// Helper function to check if user is admin
const isUserAdmin = (user) => {
  return user?.publicMetadata?.role === 'admin';
};

export default function AdminScreen() {
  // Core state
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearchQuery, setDebouncedSearchQuery] = useState('');
  const [vehicles, setVehicles] = useState([]);
  const [allVehicles, setAllVehicles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [error, setError] = useState('');

  // Filter and sort state
  const [sortBy, setSortBy] = useState('licencePlate');
  const [sortOrder, setSortOrder] = useState('asc');
  const [activeFilters, setActiveFilters] = useState({
    branch: '',
    designation: '',
    staffPosition: '',
    dateRange: '',
  });
  const [totalResults, setTotalResults] = useState(0);

  // UI state
  const [showFilterSheet, setShowFilterSheet] = useState(false);
  const [showLicensePlateScanner, setShowLicensePlateScanner] = useState(false);
  const [showVehicleDetailsModal, setShowVehicleDetailsModal] = useState(false);
  const [showStatsPanel, setShowStatsPanel] = useState(false);
  const [showDetailedStatistics, setShowDetailedStatistics] = useState(false);
  const [showAddAdminModal, setShowAddAdminModal] = useState(false);
  const [showPhotoModal, setShowPhotoModal] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [showEditBranchModal, setShowEditBranchModal] = useState(false);
  const [showEditDesignationModal, setShowEditDesignationModal] = useState(false);
  const [showEditStaffPositionModal, setShowEditStaffPositionModal] = useState(false);
  const [showEditVehicleTypeModal, setShowEditVehicleTypeModal] = useState(false);
  const [showOverflowMenu, setShowOverflowMenu] = useState(false);
  const [showWhitelistManager, setShowWhitelistManager] = useState(false);
  const [showDailyLog, setShowDailyLog] = useState(false);
  const [showBulkUploadModal, setShowBulkUploadModal] = useState(false);

  // Data state
  const [selectedVehicle, setSelectedVehicle] = useState(null);
  const [scannedVehicle, setScannedVehicle] = useState(null);
  const [selectedPhoto, setSelectedPhoto] = useState(null);
  const [selectedPhotoInfo, setSelectedPhotoInfo] = useState(null);
  const [adminEmail, setAdminEmail] = useState('');
  const [statsFilter, setStatsFilter] = useState(null);
  const [actionProcessing, setActionProcessing] = useState(false);

  // Form state
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

  // Animation states
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(50)).current;
  const scaleAnim = useRef(new Animated.Value(0.9)).current;

  const navigation = useNavigation();
  const { signOut, getToken } = useAuth();
  const { user, isLoaded } = useUser();

  // Debounce search query
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchQuery(searchQuery);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

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

  // Apply filtering when search or filters change
  useEffect(() => {
    if (allVehicles.length > 0) {
      applyClientSideFiltering(allVehicles, activeFilters, debouncedSearchQuery, sortBy, sortOrder);
    }
  }, [allVehicles, activeFilters, debouncedSearchQuery, sortBy, sortOrder]);

  // Animation effect when vehicles load
  useEffect(() => {
    if (vehicles.length > 0 && !loading) {
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 600,
          useNativeDriver: true,
        }),
        Animated.timing(slideAnim, {
          toValue: 0,
          duration: 500,
          useNativeDriver: true,
        }),
        Animated.timing(scaleAnim, {
          toValue: 1,
          duration: 400,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [vehicles, loading]);

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

  // Fetch all vehicles from backend (using existing API)
  const fetchAllVehicles = async (isRefresh = false) => {
    if (isRefresh) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }
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
      applyClientSideFiltering(json.vehicles || [], activeFilters, searchQuery, sortBy, sortOrder);

    } catch (error) {
      console.error('Error fetching vehicles:', error);
      if (!isRefresh) {
        Alert.alert('Error', error.message || 'Failed to load vehicles');
      }
    } finally {
      if (isRefresh) {
        setRefreshing(false);
      } else {
        setLoading(false);
      }
    }
  };

  // Handle pull-to-refresh
  const onRefresh = useCallback(() => {
    fetchAllVehicles(true);
  }, []);

  // Unified client-side filtering and sorting
  const applyClientSideFiltering = useCallback((vehicleData, filters, query, sortField, sortDirection) => {
    let filtered = [...vehicleData];

    // Apply unified search filter - search across multiple fields
    if (query && query.trim()) {
      const searchTerm = query.toLowerCase().trim();
      filtered = filtered.filter(vehicle => {
        return (
          vehicle.licencePlate?.toLowerCase().includes(searchTerm) ||
          vehicle.fullName?.toLowerCase().includes(searchTerm) ||
          vehicle.vehicleName?.toLowerCase().includes(searchTerm) ||
          vehicle.branch?.toLowerCase().includes(searchTerm) ||
          vehicle.registerNumber?.toLowerCase().includes(searchTerm) ||
          vehicle.phoneNumber?.toLowerCase().includes(searchTerm)
        );
      });
    }

    // Apply filters
    if (filters.branch) {
      filtered = filtered.filter(vehicle => vehicle.branch === filters.branch);
    }

    if (filters.designation) {
      filtered = filtered.filter(vehicle => vehicle.designation === filters.designation);
    }

    if (filters.staffPosition) {
      filtered = filtered.filter(vehicle =>
        vehicle.staffPosition === filters.staffPosition ||
        vehicle.department === filters.staffPosition
      );
    }

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

    // Update state
    setVehicles(filtered);
    setTotalResults(filtered.length);
  }, []);

  // Filter management
  const clearAllFilters = useCallback(() => {
    const clearedFilters = {
      branch: '',
      designation: '',
      staffPosition: '',
      dateRange: '',
    };
    setActiveFilters(clearedFilters);
    setStatsFilter(null);
    setShowFilterSheet(false);
  }, []);

  const applyFilters = useCallback((newFilters, newSortBy, newSortOrder) => {
    setActiveFilters(newFilters);
    setSortBy(newSortBy);
    setSortOrder(newSortOrder);
    setShowFilterSheet(false);
  }, []);

  const removeFilter = useCallback((filterKey) => {
    const newFilters = { ...activeFilters };
    newFilters[filterKey] = '';
    setActiveFilters(newFilters);
  }, [activeFilters]);

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

  const toggleNotification = async (vehicle) => {
    setActionProcessing(true);
    try {
      const token = await getToken();
      const response = await fetch(`${API_BASE_URL}/vehicles/${vehicle._id}/toggle-notification`, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to toggle notification');
      }

      const result = await response.json();
      Alert.alert(
        'Success', 
        result.message || `Notifications ${result.notifyOnEntry ? 'enabled' : 'disabled'}`
      );
      
      // Update the vehicle in the local state
      setAllVehicles(prevVehicles => 
        prevVehicles.map(v => 
          v._id === vehicle._id 
            ? { ...v, notifyOnEntry: result.notifyOnEntry }
            : v
        )
      );
      
      // Reapply filters to update the displayed list
      applyClientSideFiltering(
        allVehicles.map(v => 
          v._id === vehicle._id 
            ? { ...v, notifyOnEntry: result.notifyOnEntry }
            : v
        ),
        activeFilters,
        searchQuery,
        sortBy,
        sortOrder
      );
    } catch (error) {
      console.error('Error toggling notification:', error);
      Alert.alert('Error', error.message || 'Failed to toggle notification');
    } finally {
      setActionProcessing(false);
    }
  };

  const handleSignOut = useCallback(async () => {
    try {
      await signOut();
    } catch (err) {
      console.error('Error signing out:', err);
      Alert.alert('Error', 'Failed to sign out');
    }
  }, [signOut]);

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

  // Stats filter handler
  const handleStatsFilterSelect = (type, value) => {
    setStatsFilter({ type, value });
    
    // Apply the filter to the existing filter system
    const newFilters = { ...activeFilters };
    
    if (type === 'clear') {
      // Clear all filters
      clearAllFilters();
      setStatsFilter(null);
      return;
    } else if (type === 'designation') {
      newFilters.designation = value;
      newFilters.staffPosition = ''; // Clear staff position when changing designation
    } else if (type === 'branch') {
      newFilters.branch = value;
      newFilters.designation = 'Student'; // Branches are only for students
    } else if (type === 'recent') {
      newFilters.dateRange = 'last30days';
    }
    
    setActiveFilters(newFilters);
    applyClientSideFiltering(allVehicles, newFilters, searchQuery.trim(), sortBy, sortOrder);
  };

  // License plate scanner handlers
  const handleVehicleFound = (vehicle) => {
    setScannedVehicle(vehicle);
    setShowVehicleDetailsModal(true);
  };

  const handleEditScannedVehicle = (vehicle) => {
    setShowVehicleDetailsModal(false);
    openEditModal(vehicle);
  };

  // Direct call function
  const handleDirectCall = (phoneNumber, vehicleInfo = '') => {
    if (!phoneNumber) {
      Alert.alert('No Phone Number', 'No phone number available for this vehicle');
      return;
    }

    Alert.alert(
      'Make Call',
      `Do you want to call ${phoneNumber}${vehicleInfo ? `\n(${vehicleInfo})` : ''}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Call',
          onPress: () => {
            const phoneUrl = `tel:${phoneNumber}`;
            Linking.canOpenURL(phoneUrl)
              .then((supported) => {
                if (supported) {
                  return Linking.openURL(phoneUrl);
                } else {
                  Alert.alert('Error', 'Phone calls are not supported on this device');
                }
              })
              .catch((err) => {
                console.error('Error opening phone dialer:', err);
                Alert.alert('Error', 'Failed to open phone dialer');
              });
          },
        },
      ]
    );
  };

  // Filter Bottom Sheet Component
  const FilterBottomSheet = ({ visible, onClose, filters, sortBy, sortOrder, onApply }) => {
    const [tempFilters, setTempFilters] = useState(filters);
    const [tempSortBy, setTempSortBy] = useState(sortBy);
    const [tempSortOrder, setTempSortOrder] = useState(sortOrder);

    useEffect(() => {
      setTempFilters(filters);
      setTempSortBy(sortBy);
      setTempSortOrder(sortOrder);
    }, [filters, sortBy, sortOrder]);

    const handleApply = () => {
      onApply(tempFilters, tempSortBy, tempSortOrder);
    };

    const handleClear = () => {
      const cleared = { branch: '', designation: '', staffPosition: '', dateRange: '' };
      setTempFilters(cleared);
      setTempSortBy('licencePlate');
      setTempSortOrder('asc');
    };

    return (
      <Modal visible={visible} animationType="slide" transparent={true}>
        <View style={styles.filterSheetOverlay}>
          <View style={styles.filterSheet}>
            <View style={styles.filterSheetHeader}>
              <Text style={styles.filterSheetTitle}>Filters & Sort</Text>
              <TouchableOpacity onPress={onClose} style={styles.filterSheetClose}>
                <Text style={styles.filterSheetCloseText}>✕</Text>
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.filterSheetContent}>
              {/* Sort Options */}
              <View style={styles.filterSection}>
                <Text style={styles.filterSectionTitle}>Sort By</Text>
                {[
                  { key: 'licencePlate', label: 'License Plate' },
                  { key: 'fullName', label: 'Name' },
                  { key: 'branch', label: 'Branch' },
                  { key: 'designation', label: 'Role' },
                  { key: 'createdAt', label: 'Date' },
                  { key: 'vehicleName', label: 'Vehicle' }
                ].map((option) => (
                  <TouchableOpacity
                    key={option.key}
                    style={[
                      styles.filterOption,
                      tempSortBy === option.key && styles.filterOptionActive
                    ]}
                    onPress={() => setTempSortBy(option.key)}
                  >
                    <Text style={[
                      styles.filterOptionText,
                      tempSortBy === option.key && styles.filterOptionTextActive
                    ]}>
                      {option.label}
                    </Text>
                    {tempSortBy === option.key && (
                      <TouchableOpacity
                        style={styles.sortOrderButton}
                        onPress={() => setTempSortOrder(tempSortOrder === 'asc' ? 'desc' : 'asc')}
                      >
                        <Text style={styles.sortOrderText}>
                          {tempSortOrder === 'asc' ? '↑' : '↓'}
                        </Text>
                      </TouchableOpacity>
                    )}
                  </TouchableOpacity>
                ))}
              </View>

              {/* Filter Options */}
              <View style={styles.filterSection}>
                <Text style={styles.filterSectionTitle}>Designation</Text>
                {['Student', 'Staff'].map((designation) => (
                  <TouchableOpacity
                    key={designation}
                    style={[
                      styles.filterOption,
                      tempFilters.designation === designation && styles.filterOptionActive
                    ]}
                    onPress={() => setTempFilters(prev => ({
                      ...prev,
                      designation: prev.designation === designation ? '' : designation,
                      staffPosition: designation === 'Student' ? '' : prev.staffPosition
                    }))}
                  >
                    <Text style={[
                      styles.filterOptionText,
                      tempFilters.designation === designation && styles.filterOptionTextActive
                    ]}>
                      {designation}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              {tempFilters.designation === 'Staff' && (
                <View style={styles.filterSection}>
                  <Text style={styles.filterSectionTitle}>Staff Position</Text>
                  {['HOD', 'Lecturer'].map((position) => (
                    <TouchableOpacity
                      key={position}
                      style={[
                        styles.filterOption,
                        tempFilters.staffPosition === position && styles.filterOptionActive
                      ]}
                      onPress={() => setTempFilters(prev => ({
                        ...prev,
                        staffPosition: prev.staffPosition === position ? '' : position
                      }))}
                    >
                      <Text style={[
                        styles.filterOptionText,
                        tempFilters.staffPosition === position && styles.filterOptionTextActive
                      ]}>
                        {position}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              )}

              <View style={styles.filterSection}>
                <Text style={styles.filterSectionTitle}>Branch</Text>
                {BRANCH_OPTIONS.map((branch) => (
                  <TouchableOpacity
                    key={branch}
                    style={[
                      styles.filterOption,
                      tempFilters.branch === branch && styles.filterOptionActive
                    ]}
                    onPress={() => setTempFilters(prev => ({
                      ...prev,
                      branch: prev.branch === branch ? '' : branch
                    }))}
                  >
                    <Text style={[
                      styles.filterOptionText,
                      tempFilters.branch === branch && styles.filterOptionTextActive
                    ]}>
                      {branch}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              <View style={styles.filterSection}>
                <Text style={styles.filterSectionTitle}>Date Range</Text>
                {[
                  { key: 'today', label: 'Today' },
                  { key: 'last7days', label: 'Last 7 Days' },
                  { key: 'last30days', label: 'Last 30 Days' },
                  { key: 'thisMonth', label: 'This Month' }
                ].map((range) => (
                  <TouchableOpacity
                    key={range.key}
                    style={[
                      styles.filterOption,
                      tempFilters.dateRange === range.key && styles.filterOptionActive
                    ]}
                    onPress={() => setTempFilters(prev => ({
                      ...prev,
                      dateRange: prev.dateRange === range.key ? '' : range.key
                    }))}
                  >
                    <Text style={[
                      styles.filterOptionText,
                      tempFilters.dateRange === range.key && styles.filterOptionTextActive
                    ]}>
                      {range.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </ScrollView>

            <View style={styles.filterSheetActions}>
              <TouchableOpacity style={styles.filterClearButton} onPress={handleClear}>
                <Text style={styles.filterClearText}>Clear All</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.filterApplyButton} onPress={handleApply}>
                <Text style={styles.filterApplyText}>Apply Filters</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    );
  };

  const renderVehicle = useCallback(({ item, index }) => {
    return (
      <View style={styles.itemContainer}>
        {/* Header Section */}
        <View style={styles.vehicleHeader}>
          <View style={styles.plateSection}>
            <View style={styles.plateBadge}>
              <Text style={styles.plate}>{item.licencePlate}</Text>
            </View>
            <View style={styles.roleIndicator}>
              <Text style={styles.roleText}>
                {item.designation === 'Student' ? '🎓 Student' : '👔 Staff'}
              </Text>
            </View>
          </View>
          <Text style={styles.dateText}>
            {new Date(item.createdAt).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })}
          </Text>
        </View>

        {/* Info Grid */}
        <View style={styles.infoGrid}>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>👤</Text>
            <Text style={styles.infoValue} numberOfLines={1}>{item.fullName}</Text>
          </View>
          
          {item.phoneNumber && (
            <TouchableOpacity 
              style={styles.infoRow}
              onPress={() => handleDirectCall(item.phoneNumber, `${item.licencePlate} - ${item.fullName}`)}
              activeOpacity={0.7}
            >
              <Text style={styles.infoLabel}>📞</Text>
              <Text style={[styles.infoValue, styles.phoneLink]}>{item.phoneNumber}</Text>
            </TouchableOpacity>
          )}

          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>🏛️</Text>
            <Text style={styles.infoValue} numberOfLines={1}>{item.branch}</Text>
          </View>

          {item.designation === 'Student' && item.registerNumber && (
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>🎫</Text>
              <Text style={styles.infoValue}>{item.registerNumber}</Text>
            </View>
          )}

          {item.designation === 'Staff' && (item.staffPosition || item.department) && (
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>💼</Text>
              <Text style={styles.infoValue}>{item.staffPosition || item.department}</Text>
            </View>
          )}

          {item.vehicleName && (
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>🚗</Text>
              <Text style={styles.infoValue} numberOfLines={1}>
                {item.vehicleName} {item.vehicleType && `• ${item.vehicleType}`}
              </Text>
            </View>
          )}
        </View>

        {/* Action Row */}
        <View style={styles.actionRow}>
          {/* Photo Buttons */}
          <View style={styles.photoActions}>
            {(item.vehiclePhotoUrl || (item.photoUrl && !item.ownerPhotoUrl)) && (
              <TouchableOpacity
                style={styles.photoBtn}
                onPress={() => showPhoto(item.vehiclePhotoUrl || item.photoUrl, 'Vehicle Photo', `${item.licencePlate} - ${item.fullName}`)}
              >
                <Text style={styles.photoBtnText}>🚗</Text>
              </TouchableOpacity>
            )}
            {item.drivingLicensePhotoUrl && (
              <TouchableOpacity
                style={styles.photoBtn}
                onPress={() => showPhoto(item.drivingLicensePhotoUrl, 'Driving License', `${item.licencePlate} - ${item.fullName}`)}
              >
                <Text style={styles.photoBtnText}>🪪</Text>
              </TouchableOpacity>
            )}
            {item.ownerPhotoUrl && (
              <TouchableOpacity
                style={styles.photoBtn}
                onPress={() => showPhoto(item.ownerPhotoUrl, 'Owner Photo', `${item.licencePlate} - ${item.fullName}`)}
              >
                <Text style={styles.photoBtnText}>👤</Text>
              </TouchableOpacity>
            )}
            <TouchableOpacity
              style={[
                styles.photoBtn,
                item.notifyOnEntry && styles.photoBtnActive
              ]}
              onPress={() => toggleNotification(item)}
            >
              <Text style={styles.photoBtnText}>🔔</Text>
            </TouchableOpacity>
          </View>

          {/* Edit/Delete Buttons */}
          <View style={styles.itemButtons}>
            <TouchableOpacity onPress={() => openEditModal(item)} style={styles.editBtn}>
              <Text style={styles.editText}>✏️ Edit</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => deleteVehicle(item)} style={styles.deleteBtn}>
              <Text style={styles.deleteText}>🗑️</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    );
  }, []);

  if (!isLoaded) {
    return (
      <View style={[styles.container, styles.centered]}>
        <View style={styles.loadingCard}>
          <ActivityIndicator size="large" color="#6366f1" />
          <Text style={styles.loadingCardText}>Initializing Admin Panel</Text>
          <Text style={styles.loadingCardSubtext}>Please wait...</Text>
        </View>
      </View>
    );
  }

  if (!isAdmin) {
    return (
      <View style={[styles.container, styles.centered]}>
        <View style={styles.errorCard}>
          <Text style={styles.errorIcon}>🚫</Text>
          <Text style={styles.errorText}>Access Restricted</Text>
          <Text style={styles.errorSubText}>
            This area is restricted to college management only.
          </Text>
          <TouchableOpacity style={styles.backButton} onPress={handleSignOut}>
            <Text style={styles.backButtonText}>Back to Login</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.mainContainer}>
      <StatusBar barStyle="dark-content" backgroundColor="#ffffff" />
      <View style={styles.container}>
      {/* Header - Row 1: Title and Results Count */}
      <View style={styles.headerRow1}>
        <View style={styles.headerLeft}>
          <Text style={styles.headerTitle}>Admin Dashboard</Text>
          <Text style={styles.headerSubtitle}>
            {totalResults > 0 ? `${totalResults} result${totalResults !== 1 ? 's' : ''}` : 'No results'}
          </Text>
        </View>
        <View style={styles.headerRight}>
          <TouchableOpacity
            style={styles.headerIconButton}
            onPress={() => setShowFilterSheet(true)}
          >
            <Text style={styles.headerIconText}>🔽</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.headerIconButton}
            onPress={() => setShowDetailedStatistics(true)}
            title="Detailed Statistics"
          >
            <Text style={styles.headerIconText}>📈</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.overflowMenuButton}
            onPress={() => setShowOverflowMenu(true)}
          >
            <Text style={styles.headerIconText}>⋯</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Header - Row 2: Unified Search */}
      <View style={styles.headerRow2}>
        <View style={styles.searchContainer}>
          <TextInput
            style={styles.searchInput}
            placeholder="Search by plate, name, register no., or phone"
            value={searchQuery}
            onChangeText={setSearchQuery}
            returnKeyType="search"
          />
          <TouchableOpacity style={styles.searchIcon}>
            <Text style={styles.searchIconText}>🔍</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Active Filters Display */}
      {Object.values(activeFilters).some(v => v) && (
        <View style={styles.activeFiltersContainer}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            {activeFilters.designation && (
              <View style={styles.activeFilterChip}>
                <Text style={styles.activeFilterText}>
                  {activeFilters.designation}
                </Text>
                <TouchableOpacity onPress={() => removeFilter('designation')}>
                  <Text style={styles.activeFilterRemove}>✕</Text>
                </TouchableOpacity>
              </View>
            )}
            {activeFilters.staffPosition && (
              <View style={styles.activeFilterChip}>
                <Text style={styles.activeFilterText}>
                  {activeFilters.staffPosition}
                </Text>
                <TouchableOpacity onPress={() => removeFilter('staffPosition')}>
                  <Text style={styles.activeFilterRemove}>✕</Text>
                </TouchableOpacity>
              </View>
            )}
            {activeFilters.branch && (
              <View style={styles.activeFilterChip}>
                <Text style={styles.activeFilterText}>
                  {activeFilters.branch}
                </Text>
                <TouchableOpacity onPress={() => removeFilter('branch')}>
                  <Text style={styles.activeFilterRemove}>✕</Text>
                </TouchableOpacity>
              </View>
            )}
            {activeFilters.dateRange && (
              <View style={styles.activeFilterChip}>
                <Text style={styles.activeFilterText}>
                  {activeFilters.dateRange === 'today' && 'Today'}
                  {activeFilters.dateRange === 'last7days' && 'Last 7 Days'}
                  {activeFilters.dateRange === 'last30days' && 'Last 30 Days'}
                  {activeFilters.dateRange === 'thisMonth' && 'This Month'}
                </Text>
                <TouchableOpacity onPress={() => removeFilter('dateRange')}>
                  <Text style={styles.activeFilterRemove}>✕</Text>
                </TouchableOpacity>
              </View>
            )}
            <TouchableOpacity style={styles.clearAllChip} onPress={clearAllFilters}>
              <Text style={styles.clearAllText}>Clear All</Text>
            </TouchableOpacity>
          </ScrollView>
        </View>
      )}

      {/* Content */}
      <View style={styles.contentContainer}>
        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#6366f1" />
            <Text style={styles.loadingText}>Loading vehicles...</Text>
          </View>
        ) : vehicles.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Text style={styles.noRecords}>No vehicles found.</Text>
            <Text style={styles.noRecordsSubtext}>
              {Object.values(activeFilters).some(v => v) || searchQuery ?
                'Try adjusting your search or filters' :
                'No vehicles registered yet'
              }
            </Text>
          </View>
        ) : (
          <Animated.View
            style={{
              flex: 1,
              opacity: fadeAnim,
              transform: [
                { translateY: slideAnim },
                { scale: scaleAnim }
              ]
            }}
          >
            <FlatList
              data={vehicles}
              renderItem={renderVehicle}
              keyExtractor={(item) => item._id}
              showsVerticalScrollIndicator={false}
              contentContainerStyle={styles.listContainer}
              refreshControl={
                <RefreshControl
                  refreshing={refreshing}
                  onRefresh={onRefresh}
                  colors={['#6366f1']}
                  tintColor="#6366f1"
                />
              }
            />
          </Animated.View>
        )}
      </View>

      {/* FAB for Scan Plate */}
      <TouchableOpacity
        style={styles.fab}
        onPress={() => setShowLicensePlateScanner(true)}
      >
        <Text style={styles.fabText}>📷</Text>
      </TouchableOpacity>

      {/* Filter Bottom Sheet */}
      <FilterBottomSheet
        visible={showFilterSheet}
        onClose={() => setShowFilterSheet(false)}
        filters={activeFilters}
        sortBy={sortBy}
        sortOrder={sortOrder}
        onApply={applyFilters}
      />

      {/* Modals */}
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
                  style={styles.closePhotoButton}
                  onPress={() => setShowPhotoModal(false)}
                >
                  <Text style={styles.closePhotoText}>✕</Text>
                </TouchableOpacity>
              </View>
            </View>

            {selectedPhoto && (
              <View style={styles.photoContainer}>
                <Image
                  source={{ uri: selectedPhoto }}
                  style={styles.fullPhoto}
                  resizeMode="contain"
                />
              </View>
            )}

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

            <TouchableOpacity
              style={styles.editDropdownButton}
              onPress={() => setShowEditVehicleTypeModal(true)}
            >
              <Text style={[styles.editDropdownText, !formData.vehicleType && styles.editPlaceholderText]}>
                {formData.vehicleType || 'Select Vehicle Type'}
              </Text>
              <Text style={styles.editDropdownArrow}>▼</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.editDropdownButton}
              onPress={() => setShowEditBranchModal(true)}
            >
              <Text style={[styles.editDropdownText, !formData.branch && styles.editPlaceholderText]}>
                {formData.branch || 'Select Branch/Department'}
              </Text>
              <Text style={styles.editDropdownArrow}>▼</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.editDropdownButton}
              onPress={() => setShowEditDesignationModal(true)}
            >
              <Text style={[styles.editDropdownText, !formData.designation && styles.editPlaceholderText]}>
                {formData.designation || 'Select Designation'}
              </Text>
              <Text style={styles.editDropdownArrow}>▼</Text>
            </TouchableOpacity>

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

      <EditDropdownModal
        visible={showEditVehicleTypeModal}
        onClose={() => setShowEditVehicleTypeModal(false)}
        options={VEHICLE_TYPE_OPTIONS}
        onSelect={(value) => handleFormChange('vehicleType', value)}
        title="Select Vehicle Type"
      />

      <LicensePlateScanner
        visible={showLicensePlateScanner}
        onClose={() => setShowLicensePlateScanner(false)}
        onVehicleFound={handleVehicleFound}
      />

      <VehicleDetailsModal
        visible={showVehicleDetailsModal}
        onClose={() => setShowVehicleDetailsModal(false)}
        vehicle={scannedVehicle}
        onEdit={handleEditScannedVehicle}
      />

      <Modal visible={showStatsPanel} animationType="slide" transparent={false}>
        <View style={styles.statsModalContainer}>
          <View style={styles.statsModalHeader}>
            <Text style={styles.statsModalTitle}>Quick Statistics</Text>
            <TouchableOpacity
              style={styles.statsModalCloseButton}
              onPress={() => setShowStatsPanel(false)}
            >
              <Text style={styles.statsModalCloseText}>✕</Text>
            </TouchableOpacity>
          </View>
          <StatsPanel
            onFilterSelect={(type, value) => {
              handleStatsFilterSelect(type, value);
              setShowStatsPanel(false);
            }}
            activeFilter={statsFilter}
          />
        </View>
      </Modal>

      {/* Detailed Statistics Modal */}
      <Modal visible={showDetailedStatistics} animationType="slide" transparent={false}>
        <SafeAreaView style={styles.detailedStatsModalContainer}>
          <View style={styles.detailedStatsModalHeader}>
            <Text style={styles.detailedStatsModalTitle}>Detailed Statistics Dashboard</Text>
            <TouchableOpacity
              style={styles.detailedStatsModalCloseButton}
              onPress={() => setShowDetailedStatistics(false)}
            >
              <Text style={styles.detailedStatsModalCloseText}>✕ Close</Text>
            </TouchableOpacity>
          </View>
          <DetailedStatistics />
        </SafeAreaView>
      </Modal>

      {/* Overflow Menu Modal */}
      <Modal visible={showOverflowMenu} animationType="fade" transparent={true}>
        <View style={styles.overflowMenuOverlay}>
          <View style={styles.overflowMenu}>
            <View style={styles.overflowMenuHeader}>
              <Text style={styles.overflowMenuTitle}>Menu</Text>
              <TouchableOpacity
                style={styles.overflowMenuClose}
                onPress={() => setShowOverflowMenu(false)}
              >
                <Text style={styles.overflowMenuCloseText}>✕</Text>
              </TouchableOpacity>
            </View>
            <View style={styles.overflowMenuContent}>
              <TouchableOpacity
                style={styles.overflowMenuItem}
                onPress={() => {
                  setShowOverflowMenu(false);
                  setShowDailyLog(true);
                }}
              >
                <Text style={styles.overflowMenuItemIcon}>📅</Text>
                <View style={styles.overflowMenuItemContent}>
                  <Text style={styles.overflowMenuItemTitle}>Daily Vehicle Log</Text>
                  <Text style={styles.overflowMenuItemSubtitle}>View entry/exit records</Text>
                </View>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.overflowMenuItem}
                onPress={() => {
                  setShowOverflowMenu(false);
                  setShowWhitelistManager(true);
                }}
              >
                <Text style={styles.overflowMenuItemIcon}>📧</Text>
                <View style={styles.overflowMenuItemContent}>
                  <Text style={styles.overflowMenuItemTitle}>Manage Email Whitelist</Text>
                  <Text style={styles.overflowMenuItemSubtitle}>Control who can access the app</Text>
                </View>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.overflowMenuItem}
                onPress={() => {
                  setShowOverflowMenu(false);
                  setShowBulkUploadModal(true);
                }}
              >
                <Text style={styles.overflowMenuItemIcon}>📤</Text>
                <View style={styles.overflowMenuItemContent}>
                  <Text style={styles.overflowMenuItemTitle}>Bulk Upload Users</Text>
                  <Text style={styles.overflowMenuItemSubtitle}>Upload students/staff via Excel</Text>
                </View>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.overflowMenuItem}
                onPress={() => {
                  setShowOverflowMenu(false);
                  setShowAddAdminModal(true);
                }}
              >
                <Text style={styles.overflowMenuItemIcon}>👑</Text>
                <View style={styles.overflowMenuItemContent}>
                  <Text style={styles.overflowMenuItemTitle}>Add Admin</Text>
                  <Text style={styles.overflowMenuItemSubtitle}>Grant admin privileges to a user</Text>
                </View>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.overflowMenuItem}
                onPress={() => {
                  setShowOverflowMenu(false);
                  debugToken();
                }}
              >
                <Text style={styles.overflowMenuItemIcon}>🔧</Text>
                <View style={styles.overflowMenuItemContent}>
                  <Text style={styles.overflowMenuItemTitle}>Debug Token</Text>
                  <Text style={styles.overflowMenuItemSubtitle}>Check authentication status</Text>
                </View>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.overflowMenuItem}
                onPress={() => {
                  setShowOverflowMenu(false);
                  handleSignOut();
                }}
              >
                <Text style={styles.overflowMenuItemIcon}>🚪</Text>
                <View style={styles.overflowMenuItemContent}>
                  <Text style={styles.overflowMenuItemTitle}>Sign Out</Text>
                  <Text style={styles.overflowMenuItemSubtitle}>Log out of admin panel</Text>
                </View>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Whitelist Manager Modal */}
      <WhitelistManager
        visible={showWhitelistManager}
        onClose={() => setShowWhitelistManager(false)}
      />

      {/* Daily Log Viewer Modal */}
      <DailyLogViewer
        visible={showDailyLog}
        onClose={() => setShowDailyLog(false)}
      />

      {/* Bulk Upload Users Modal */}
      <Modal visible={showBulkUploadModal} animationType="slide" transparent={true}>
        <View style={styles.bulkUploadOverlay}>
          <View style={styles.bulkUploadContainer}>
            <View style={styles.bulkUploadHeader}>
              <Text style={styles.bulkUploadTitle}>Bulk Upload Users</Text>
              <TouchableOpacity
                style={styles.bulkUploadClose}
                onPress={() => setShowBulkUploadModal(false)}
              >
                <Text style={styles.bulkUploadCloseText}>✕</Text>
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.bulkUploadContent}>
              <View style={styles.bulkUploadInfo}>
                <Text style={styles.bulkUploadInfoIcon}>📋</Text>
                <Text style={styles.bulkUploadInfoTitle}>Upload Excel File</Text>
                <Text style={styles.bulkUploadInfoText}>
                  Upload an Excel file (.xlsx) containing student or staff information to add them to the whitelist.
                </Text>
              </View>

              <View style={styles.bulkUploadInstructions}>
                <Text style={styles.bulkUploadInstructionsTitle}>Required Columns:</Text>
                <Text style={styles.bulkUploadInstructionsText}>• Email</Text>
                <Text style={styles.bulkUploadInstructionsText}>• User Type (Student/Staff)</Text>
                <Text style={styles.bulkUploadInstructionsText}>• Branch (for Students)</Text>
                <Text style={styles.bulkUploadInstructionsText}>• Department (for Staff)</Text>
              </View>

              <TouchableOpacity
                style={styles.bulkUploadButton}
                onPress={() => {
                  Alert.alert(
                    'Feature Coming Soon',
                    'Bulk upload functionality will be implemented soon. This is a placeholder for now.',
                    [{ text: 'OK' }]
                  );
                }}
              >
                <Text style={styles.bulkUploadButtonIcon}>📤</Text>
                <Text style={styles.bulkUploadButtonText}>Select Excel File</Text>
              </TouchableOpacity>

              <View style={styles.bulkUploadNote}>
                <Text style={styles.bulkUploadNoteIcon}>ℹ️</Text>
                <Text style={styles.bulkUploadNoteText}>
                  This feature is currently under development. You'll be able to upload Excel files to bulk add users to the whitelist.
                </Text>
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>

      </View>
      <Footer />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  mainContainer: {
    flex: 1,
  },
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  contentContainer: {
    flex: 1,
  },
  // Header Row 1 Styles
  headerRow1: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 28,
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
    shadowColor: '#6366f1',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 6,
  },
  headerLeft: {
    flex: 1,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '900',
    color: '#1e293b',
    letterSpacing: 0.8,
    textTransform: 'uppercase',
    marginBottom: 4,
  },
  headerSubtitle: {
    fontSize: 16,
    color: '#64748b',
    fontWeight: '600',
    letterSpacing: 0.3,
  },
  headerIconButton: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: '#f8fafc',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#6366f1',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  headerIconText: {
    fontSize: 20,
    color: '#6366f1',
    fontWeight: '700',
  },
  overflowMenuButton: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: '#f8fafc',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#6366f1',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },

  // Header Row 2 Styles
  headerRow2: {
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    borderRadius: 14,
    borderWidth: 2,
    borderColor: '#e2e8f0',
    shadowColor: '#6366f1',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  searchInput: {
    flex: 1,
    paddingVertical: 13,
    paddingHorizontal: 16,
    fontSize: 15,
    color: '#1e293b',
    fontWeight: '600',
    letterSpacing: 0.3,
  },
  searchIcon: {
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  searchIconText: {
    fontSize: 18,
    color: '#6366f1',
    fontWeight: '700',
  },

  // Active Filters Styles
  activeFiltersContainer: {
    paddingHorizontal: 20,
    paddingVertical: 12,
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
  },
  activeFilterChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fef3c7',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 16,
    marginRight: 8,
    borderWidth: 1,
    borderColor: '#f59e0b',
    shadowColor: '#f59e0b',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 3,
  },
  activeFilterText: {
    fontSize: 13,
    color: '#92400e',
    fontWeight: '700',
    marginRight: 6,
    letterSpacing: 0.3,
    textTransform: 'uppercase',
  },
  activeFilterRemove: {
    fontSize: 16,
    color: '#92400e',
    fontWeight: '800',
  },
  clearAllChip: {
    backgroundColor: '#ef4444',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 16,
    shadowColor: '#ef4444',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  clearAllText: {
    fontSize: 13,
    color: '#ffffff',
    fontWeight: '800',
    letterSpacing: 0.3,
    textTransform: 'uppercase',
  },

  // FAB Styles
  fab: {
    position: 'absolute',
    bottom: 100,
    right: 20,
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#f59e0b',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#f59e0b',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 8,
  },
  fabText: {
    fontSize: 24,
    color: '#ffffff',
    fontWeight: '800',
  },

  // Filter Sheet Styles
  filterSheetOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  filterSheet: {
    backgroundColor: '#ffffff',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '80%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 16,
  },
  filterSheetHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingVertical: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
    backgroundColor: '#f8fafc',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
  },
  filterSheetTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: '#1e293b',
    letterSpacing: 0.4,
    textTransform: 'uppercase',
  },
  filterSheetClose: {
    padding: 8,
  },
  filterSheetCloseText: {
    fontSize: 24,
    color: '#64748b',
    fontWeight: '800',
  },
  filterSheetContent: {
    padding: 20,
    maxHeight: 400,
  },
  filterSection: {
    marginBottom: 24,
  },
  filterSectionTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#1e293b',
    marginBottom: 16,
    letterSpacing: 0.4,
    textTransform: 'uppercase',
  },
  filterOption: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 8,
    backgroundColor: '#f8fafc',
    marginBottom: 6,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    shadowColor: '#6366f1',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 2,
    elevation: 1,
  },
  filterOptionActive: {
    backgroundColor: '#6366f1',
    borderColor: '#6366f1',
    shadowColor: '#6366f1',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  filterOptionText: {
    fontSize: 13,
    color: '#64748b',
    fontWeight: '600',
    letterSpacing: 0.2,
  },
  filterOptionTextActive: {
    color: '#ffffff',
    fontWeight: '700',
  },
  sortOrderButton: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderRadius: 8,
  },
  sortOrderText: {
    fontSize: 14,
    color: '#ffffff',
    fontWeight: '800',
  },
  filterSheetActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderTopWidth: 1,
    borderTopColor: '#e2e8f0',
    backgroundColor: '#f8fafc',
    gap: 12,
  },
  filterClearButton: {
    flex: 1,
    backgroundColor: '#64748b',
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 12,
    alignItems: 'center',
    shadowColor: '#64748b',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
    elevation: 4,
  },
  filterClearText: {
    fontSize: 15,
    color: '#ffffff',
    fontWeight: '800',
    letterSpacing: 0.3,
    textTransform: 'uppercase',
  },
  filterApplyButton: {
    flex: 1,
    backgroundColor: '#10b981',
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 12,
    alignItems: 'center',
    shadowColor: '#10b981',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  filterApplyText: {
    fontSize: 15,
    color: '#ffffff',
    fontWeight: '800',
    letterSpacing: 0.3,
    textTransform: 'uppercase',
  },
  fixedHeader: {
    backgroundColor: '#ffffff',
    paddingTop: 50,
    paddingHorizontal: 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 6,
  },
  scrollableContent: {
    flex: 1,
    paddingHorizontal: 20,
  },
  centered: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    backgroundColor: '#ffffff',
    padding: 20,
    borderRadius: 16,
    marginBottom: 16,
    shadowColor: '#6366f1',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 8,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  actionButtons: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 16,
    backgroundColor: '#ffffff',
    padding: 16,
    borderRadius: 16,
    shadowColor: '#6366f1',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 4,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  statsOverview: {
    marginBottom: 16,
  },
  scanButton: {
    paddingVertical: 14,
    paddingHorizontal: 24,
    backgroundColor: '#f59e0b',
    borderRadius: 12,
    shadowColor: '#f59e0b',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 6,
    minWidth: 80,
    alignItems: 'center',
  },
  scanButtonText: {
    color: '#ffffff',
    fontWeight: '700',
    fontSize: 13,
    textAlign: 'center',
  },
  registerButton: {
    paddingVertical: 14,
    paddingHorizontal: 24,
    backgroundColor: '#6366f1',
    borderRadius: 12,
    shadowColor: '#6366f1',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 6,
    minWidth: 80,
    alignItems: 'center',
  },
  registerText: {
    color: '#ffffff',
    fontWeight: '700',
    fontSize: 13,
    textAlign: 'center',
  },
  addAdminButton: {
    paddingVertical: 14,
    paddingHorizontal: 24,
    backgroundColor: '#10b981',
    borderRadius: 12,
    shadowColor: '#10b981',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 6,
    minWidth: 80,
    alignItems: 'center',
  },
  addAdminText: {
    color: '#ffffff',
    fontWeight: '700',
    fontSize: 13,
    textAlign: 'center',
  },
  statsButton: {
    paddingVertical: 14,
    paddingHorizontal: 24,
    backgroundColor: '#8b5cf6',
    borderRadius: 12,
    shadowColor: '#8b5cf6',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 6,
    minWidth: 80,
    alignItems: 'center',
  },
  statsButtonText: {
    color: '#ffffff',
    fontWeight: '700',
    fontSize: 13,
    textAlign: 'center',
  },
  signOutButton: {
    paddingVertical: 14,
    paddingHorizontal: 24,
    backgroundColor: '#ef4444',
    borderRadius: 12,
    shadowColor: '#ef4444',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 6,
    minWidth: 80,
    alignItems: 'center',
  },
  signOutText: {
    color: '#ffffff',
    fontWeight: '700',
    fontSize: 13,
    textAlign: 'center',
  },
  errorText: {
    fontSize: 24,
    color: '#ef4444',
    marginBottom: 16,
    textAlign: 'center',
    fontWeight: '800',
    letterSpacing: 0.8,
    textTransform: 'uppercase',
  },
  errorSubText: {
    fontSize: 17,
    color: '#64748b',
    marginBottom: 32,
    textAlign: 'center',
    paddingHorizontal: 24,
    lineHeight: 26,
    fontWeight: '600',
  },
  backButton: {
    backgroundColor: '#6366f1',
    paddingHorizontal: 32,
    paddingVertical: 14,
    borderRadius: 12,
    shadowColor: '#6366f1',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 6,
  },
  backButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
    letterSpacing: 0.5,
  },
  loadingCard: {
    backgroundColor: '#ffffff',
    borderRadius: 24,
    padding: 32,
    alignItems: 'center',
    shadowColor: '#6366f1',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 16,
    elevation: 8,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  loadingCardText: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1e293b',
    marginTop: 16,
    letterSpacing: 0.5,
    textAlign: 'center',
  },
  loadingCardSubtext: {
    fontSize: 14,
    color: '#64748b',
    marginTop: 8,
    fontWeight: '500',
    textAlign: 'center',
  },
  errorCard: {
    backgroundColor: '#ffffff',
    borderRadius: 24,
    padding: 32,
    alignItems: 'center',
    shadowColor: '#ef4444',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 16,
    elevation: 8,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  errorIcon: {
    fontSize: 48,
    marginBottom: 16,
  },
  title: {
    fontSize: 28,
    fontWeight: '900',
    color: '#1e293b',
    textAlign: 'center',
    letterSpacing: 1.2,
    marginBottom: 4,
    textTransform: 'uppercase',
  },

  // Enhanced Search Styles
  searchInputContainer: {
    flexDirection: 'row',
    backgroundColor: '#ffffff',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    marginBottom: 20,
    shadowColor: '#6366f1',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 4,
  },
  compactSearchInput: {
    flex: 1,
    padding: 18,
    fontSize: 16,
    color: '#1e293b',
    fontWeight: '500',
    letterSpacing: 0.2,
  },
  compactSearchButton: {
    paddingHorizontal: 24,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#6366f1',
    borderTopRightRadius: 20,
    borderBottomRightRadius: 20,
    shadowColor: '#6366f1',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  searchButtonText: {
    fontSize: 18,
    color: '#ffffff',
    fontWeight: '700',
  },

  compactQuickFilters: {
    marginBottom: 20,
    flexGrow: 0,
  },
  compactQuickFilterChip: {
    backgroundColor: '#f8fafc',
    paddingHorizontal: 18,
    paddingVertical: 12,
    borderRadius: 24,
    marginRight: 10,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    shadowColor: '#6366f1',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
  },
  quickFilterChipActive: {
    backgroundColor: '#6366f1',
    borderColor: '#6366f1',
    shadowColor: '#6366f1',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
    transform: [{ scale: 1.05 }],
  },
  compactQuickFilterText: {
    fontSize: 14,
    color: '#64748b',
    fontWeight: '700',
    letterSpacing: 0.4,
    textTransform: 'uppercase',
  },
  quickFilterTextActive: {
    color: '#ffffff',
  },

  compactActiveFilters: {
    marginBottom: 20,
  },
  compactActiveFilterChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fef3c7',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 20,
    marginRight: 10,
    borderWidth: 1,
    borderColor: '#f59e0b',
    shadowColor: '#f59e0b',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 3,
  },
  compactActiveFilterText: {
    fontSize: 13,
    color: '#92400e',
    fontWeight: '700',
    marginRight: 8,
    letterSpacing: 0.3,
    textTransform: 'uppercase',
  },
  activeFilterRemove: {
    fontSize: 18,
    color: '#92400e',
    fontWeight: '800',
  },

  compactSortContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 20,
    backgroundColor: '#ffffff',
    padding: 18,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    shadowColor: '#6366f1',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 4,
  },
  compactResultsCount: {
    fontSize: 15,
    color: '#64748b',
    fontWeight: '700',
    marginRight: 16,
    letterSpacing: 0.4,
    textTransform: 'uppercase',
  },
  compactSortScroll: {
    flex: 1,
    flexGrow: 0,
  },
  compactSortButton: {
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 24,
    backgroundColor: '#f8fafc',
    marginRight: 10,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    shadowColor: '#6366f1',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
  },
  sortButtonActive: {
    backgroundColor: '#6366f1',
    borderColor: '#6366f1',
    shadowColor: '#6366f1',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
    transform: [{ scale: 1.05 }],
  },
  compactSortText: {
    color: '#64748b',
    fontSize: 13,
    fontWeight: '700',
    letterSpacing: 0.3,
    textTransform: 'uppercase',
  },
  sortTextActive: {
    color: '#ffffff',
    fontWeight: '800',
  },
  sortOrderIndicator: {
    fontSize: 11,
    fontWeight: 'bold',
  },

  // Content Styles
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 18,
    color: '#64748b',
    fontWeight: '700',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
    paddingHorizontal: 24,
  },
  noRecords: {
    textAlign: 'center',
    fontSize: 22,
    color: '#1e293b',
    fontWeight: '800',
    marginBottom: 12,
    letterSpacing: 0.8,
    textTransform: 'uppercase',
  },
  noRecordsSubtext: {
    fontSize: 16,
    color: '#64748b',
    textAlign: 'center',
    marginTop: 8,
    lineHeight: 24,
    letterSpacing: 0.3,
    fontWeight: '600',
  },
  listContainer: {
    paddingBottom: 24,
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
  // Unused filter button styles removed
  // Simplified filter styles - unused complex styles removed
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
  // Compact Vehicle Card Styles
  itemContainer: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    marginHorizontal: 2,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  vehicleHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  plateSection: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flex: 1,
  },
  plateBadge: {
    backgroundColor: '#6366f1',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  plate: {
    fontWeight: '900',
    fontSize: 15,
    color: '#ffffff',
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  roleIndicator: {
    backgroundColor: '#f1f5f9',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  roleText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#64748b',
  },
  dateText: {
    fontSize: 11,
    color: '#94a3b8',
    fontWeight: '600',
  },
  infoGrid: {
    gap: 8,
    marginBottom: 12,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  infoLabel: {
    fontSize: 16,
    width: 24,
  },
  infoValue: {
    fontSize: 14,
    color: '#334155',
    fontWeight: '600',
    flex: 1,
  },
  phoneLink: {
    color: '#6366f1',
    textDecorationLine: 'underline',
  },
  actionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 4,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
  },
  photoActions: {
    flexDirection: 'row',
    gap: 8,
  },
  photoBtn: {
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
  },
  photoBtnActive: {
    backgroundColor: '#fef3c7',
    borderColor: '#fbbf24',
    shadowColor: '#fbbf24',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 3,
  },
  photoBtnText: {
    fontSize: 18,
  },
  itemButtons: {
    flexDirection: 'row',
    gap: 8,
    alignItems: 'center',
  },
  editBtn: {
    backgroundColor: '#10b981',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
    shadowColor: '#10b981',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 2,
  },
  editText: {
    color: '#ffffff',
    fontWeight: '700',
    fontSize: 13,
  },
  deleteBtn: {
    backgroundColor: '#ef4444',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    shadowColor: '#ef4444',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 2,
  },
  deleteText: {
    color: '#ffffff',
    fontWeight: '800',
    fontSize: 15,
  },
  // Photo Section Styles - Button Only
  photoSection: {
    marginTop: 20,
    marginBottom: 16,
  },
  photoSectionTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: '#1e293b',
    marginBottom: 14,
    letterSpacing: 0.4,
    textTransform: 'uppercase',
  },
  photoButtonsContainer: {
    flexDirection: 'row',
    gap: 14,
    flexWrap: 'wrap',
  },
  photoViewButton: {
    backgroundColor: '#6366f1',
    paddingHorizontal: 18,
    paddingVertical: 14,
    borderRadius: 16,
    shadowColor: '#6366f1',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
    flex: 1,
    minWidth: 150,
    alignItems: 'center',
  },
  photoViewButtonText: {
    fontSize: 14,
    color: '#ffffff',
    fontWeight: '800',
    textAlign: 'center',
    letterSpacing: 0.4,
  },
  photoUnavailableButton: {
    backgroundColor: '#f8fafc',
    paddingHorizontal: 18,
    paddingVertical: 14,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    flex: 1,
    minWidth: 150,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  photoUnavailableText: {
    fontSize: 14,
    color: '#94a3b8',
    fontWeight: '700',
    textAlign: 'center',
    letterSpacing: 0.3,
  },
  // Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.8)',
    justifyContent: 'center',
    padding: 28,
  },
  modalView: {
    backgroundColor: '#ffffff',
    borderRadius: 24,
    padding: 28,
    maxHeight: '90%',
    shadowColor: '#6366f1',
    shadowOffset: { width: 0, height: 24 },
    shadowOpacity: 0.4,
    shadowRadius: 32,
    elevation: 20,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  modalTitle: {
    fontSize: 26,
    fontWeight: '900',
    marginBottom: 16,
    textAlign: 'center',
    color: '#1e293b',
    letterSpacing: 0.6,
    textTransform: 'uppercase',
  },
  modalSubtitle: {
    fontSize: 16,
    color: '#64748b',
    textAlign: 'center',
    marginBottom: 28,
    paddingHorizontal: 16,
    lineHeight: 24,
    fontWeight: '600',
  },
  modalInput: {
    borderWidth: 1,
    borderColor: '#e2e8f0',
    padding: 18,
    borderRadius: 16,
    fontSize: 16,
    marginBottom: 18,
    backgroundColor: '#f8fafc',
    color: '#1e293b',
    fontWeight: '600',
    shadowColor: '#6366f1',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 28,
    gap: 16,
  },
  modalButton: {
    flex: 1,
    padding: 18,
    borderRadius: 16,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 4,
  },
  saveButton: {
    backgroundColor: '#10b981',
    shadowColor: '#10b981',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 8,
  },
  cancelButton: {
    backgroundColor: '#64748b',
    shadowColor: '#64748b',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 8,
  },
  buttonText: {
    color: '#ffffff',
    fontWeight: '800',
    textAlign: 'center',
    fontSize: 16,
    letterSpacing: 0.4,
    textTransform: 'uppercase',
  },
  photoModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.95)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  photoModalContent: {
    width: '95%',
    height: '90%',
    backgroundColor: '#ffffff',
    borderRadius: 24,
    overflow: 'hidden',
    shadowColor: '#6366f1',
    shadowOffset: { width: 0, height: 20 },
    shadowOpacity: 0.5,
    shadowRadius: 32,
    elevation: 20,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  photoModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 28,
    paddingVertical: 20,
    backgroundColor: '#f8fafc',
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
  },
  photoModalInfo: {
    flex: 1,
  },
  photoModalTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: '#1e293b',
    marginBottom: 6,
    letterSpacing: 0.4,
    textTransform: 'uppercase',
  },
  photoModalSubtitle: {
    fontSize: 16,
    color: '#64748b',
    fontWeight: '600',
    letterSpacing: 0.3,
  },
  closePhotoButton: {
    backgroundColor: '#ef4444',
    borderRadius: 24,
    width: 48,
    height: 48,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#ef4444',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 8,
  },
  closePhotoText: {
    color: '#ffffff',
    fontSize: 20,
    fontWeight: '800',
  },
  photoContainer: {
    flex: 1,
    padding: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  fullPhoto: {
    width: '100%',
    height: '100%',
    borderRadius: 12,
  },
  // Edit form dropdown styles
  editDropdownButton: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    backgroundColor: '#f8fafc',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  editDropdownText: {
    fontSize: 16,
    color: '#1e293b',
    flex: 1,
    fontWeight: '500',
  },
  editPlaceholderText: {
    color: '#94a3b8',
    fontWeight: '400',
  },
  editDropdownArrow: {
    fontSize: 14,
    color: '#64748b',
    marginLeft: 12,
    fontWeight: '600',
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
  phoneSection: {
    backgroundColor: '#e7f3ff',
    padding: 16,
    borderRadius: 12,
    marginBottom: 16,
    borderLeftWidth: 4,
    borderLeftColor: '#4a90e2',
  },
  sectionLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#495057',
    marginBottom: 12,
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
  helperText: {
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
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  editDropdownModal: {
    backgroundColor: '#ffffff',
    borderRadius: 24,
    width: '90%',
    maxHeight: '75%',
    shadowColor: '#6366f1',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 16,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  editDropdownHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 28,
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
    backgroundColor: '#f8fafc',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
  },
  editDropdownTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: '#1e293b',
    letterSpacing: 0.4,
    textTransform: 'uppercase',
  },
  editCloseButton: {
    padding: 12,
    borderRadius: 24,
    backgroundColor: '#f1f5f9',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 3,
  },
  editCloseButtonText: {
    fontSize: 18,
    color: '#64748b',
    fontWeight: '800',
  },
  editDropdownItem: {
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  editDropdownItemText: {
    fontSize: 17,
    color: '#1e293b',
    fontWeight: '600',
    letterSpacing: 0.2,
  },

  // Enhanced Photo Modal Styles
  photoActionButton: {
    backgroundColor: '#64748b',
    borderRadius: 20,
    width: 44,
    height: 44,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#64748b',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 4,
  },
  photoActionText: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: '700',
  },
  photoModalFooter: {
    padding: 18,
    borderTopWidth: 1,
    borderTopColor: '#e2e8f0',
    alignItems: 'center',
    backgroundColor: '#f8fafc',
  },
  photoModalFooterText: {
    fontSize: 13,
    color: '#64748b',
    fontStyle: 'italic',
    textAlign: 'center',
    lineHeight: 18,
    letterSpacing: 0.2,
  },
  // Stats modal styles
  statsModalContainer: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  statsModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 16,
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
  },
  statsModalTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: '#1e293b',
  },
  statsModalCloseButton: {
    padding: 8,
    borderRadius: 8,
    backgroundColor: '#f1f5f9',
    height: 44,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#ef4444',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 6,
  },
  statsModalCloseText: {
    fontSize: 20,
    color: '#64748b',
    fontWeight: '600',
  },
  // Detailed stats modal styles
  detailedStatsModalContainer: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  detailedStatsModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 12,
    backgroundColor: '#ffffff',
    borderBottomWidth: 2,
    borderBottomColor: '#6366f1',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  detailedStatsModalTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: '#1e293b',
    letterSpacing: 0.3,
  },
  detailedStatsModalCloseButton: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 8,
    backgroundColor: '#6366f1',
  },
  detailedStatsModalCloseText: {
    fontSize: 14,
    color: '#ffffff',
    fontWeight: '700',
  },

  // Overflow Menu Styles
  overflowMenuOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  overflowMenu: {
    backgroundColor: '#ffffff',
    borderRadius: 20,
    width: '85%',
    maxWidth: 320,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 15,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  overflowMenuHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
    backgroundColor: '#f8fafc',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
  },
  overflowMenuTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: '#1e293b',
    letterSpacing: 0.4,
    textTransform: 'uppercase',
  },
  overflowMenuClose: {
    padding: 8,
  },
  overflowMenuCloseText: {
    fontSize: 20,
    color: '#64748b',
    fontWeight: '800',
  },
  overflowMenuContent: {
    paddingVertical: 8,
  },
  overflowMenuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  overflowMenuItemIcon: {
    fontSize: 24,
    marginRight: 16,
    width: 32,
    textAlign: 'center',
  },
  overflowMenuItemContent: {
    flex: 1,
  },
  overflowMenuItemTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1e293b',
    letterSpacing: 0.2,
  },
  overflowMenuItemSubtitle: {
    fontSize: 13,
    color: '#64748b',
    fontWeight: '500',
    marginTop: 2,
    lineHeight: 16,
  },

  // Bulk Upload Modal Styles
  bulkUploadOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  bulkUploadContainer: {
    width: '90%',
    maxHeight: '80%',
    backgroundColor: '#fff',
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  bulkUploadHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#f8f9fa',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  bulkUploadTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
  },
  bulkUploadClose: {
    padding: 8,
    borderRadius: 20,
    backgroundColor: '#fff',
  },
  bulkUploadCloseText: {
    fontSize: 18,
    color: '#666',
    fontWeight: 'bold',
  },
  bulkUploadContent: {
    padding: 20,
  },
  bulkUploadInfo: {
    alignItems: 'center',
    marginBottom: 24,
  },
  bulkUploadInfoIcon: {
    fontSize: 48,
    marginBottom: 12,
  },
  bulkUploadInfoTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  bulkUploadInfoText: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    lineHeight: 20,
  },
  bulkUploadInstructions: {
    backgroundColor: '#f8f9fa',
    padding: 16,
    borderRadius: 8,
    marginBottom: 24,
  },
  bulkUploadInstructionsTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  bulkUploadInstructionsText: {
    fontSize: 14,
    color: '#666',
    marginBottom: 4,
  },
  bulkUploadButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#4a90e2',
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 12,
    marginBottom: 20,
    shadowColor: '#4a90e2',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 3,
  },
  bulkUploadButtonIcon: {
    fontSize: 20,
    marginRight: 8,
  },
  bulkUploadButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
  bulkUploadNote: {
    flexDirection: 'row',
    backgroundColor: '#fff3cd',
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#ffc107',
  },
  bulkUploadNoteIcon: {
    fontSize: 16,
    marginRight: 8,
  },
  bulkUploadNoteText: {
    flex: 1,
    fontSize: 13,
    color: '#856404',
    lineHeight: 18,
  },
});
