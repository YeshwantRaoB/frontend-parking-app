import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  ActivityIndicator,
  Platform,
} from 'react-native';
import { useAuth } from '@clerk/clerk-expo';
import { API_BASE_URL } from '../../config';
import * as DocumentPicker from 'expo-document-picker';

const WhitelistManager = ({ visible, onClose }) => {
  const [loading, setLoading] = useState(false);
  const [entries, setEntries] = useState([]);
  const [counts, setCounts] = useState({});
  const [showAddModal, setShowAddModal] = useState(false);
  const [filterStatus, setFilterStatus] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  
  // Add email form
  const [email, setEmail] = useState('');
  const [userType, setUserType] = useState('Student');
  const [branch, setBranch] = useState('');
  const [department, setDepartment] = useState('');
  const [notes, setNotes] = useState('');
  
  const { getToken } = useAuth();

  useEffect(() => {
    if (visible) {
      fetchWhitelist();
    }
  }, [visible, filterStatus]);

  const fetchWhitelist = async () => {
    setLoading(true);
    try {
      const token = await getToken();
      const params = new URLSearchParams();
      if (filterStatus !== 'all') params.append('status', filterStatus);
      if (searchQuery) params.append('search', searchQuery);
      
      const url = `${API_BASE_URL}/whitelist?${params.toString()}`;
      const response = await fetch(url, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      const data = await response.json();
      if (data.success) {
        setEntries(data.entries || []);
        setCounts(data.counts || {});
      } else {
        Alert.alert('Error', data.error || 'Failed to fetch whitelist');
      }
    } catch (error) {
      console.error('Fetch whitelist error:', error);
      Alert.alert('Error', 'Failed to fetch whitelist');
    } finally {
      setLoading(false);
    }
  };

  const handleAddEmail = async () => {
    if (!email || !email.includes('@')) {
      Alert.alert('Invalid Email', 'Please enter a valid email address');
      return;
    }

    setLoading(true);
    try {
      const token = await getToken();
      const response = await fetch(`${API_BASE_URL}/whitelist/add`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: email.trim().toLowerCase(),
          userType,
          branch: userType === 'Student' ? branch : undefined,
          department: userType === 'Staff' ? department : undefined,
          notes,
        }),
      });

      const data = await response.json();
      if (data.success) {
        Alert.alert('Success', 'Email added to whitelist successfully');
        setShowAddModal(false);
        resetAddForm();
        fetchWhitelist();
      } else {
        Alert.alert('Error', data.error || 'Failed to add email');
      }
    } catch (error) {
      console.error('Add email error:', error);
      Alert.alert('Error', 'Failed to add email to whitelist');
    } finally {
      setLoading(false);
    }
  };

  const handleBulkUpload = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: [
          'application/vnd.ms-excel',
          'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
          'application/vnd.oasis.opendocument.spreadsheet',
          'text/csv',
        ],
        copyToCacheDirectory: true,
      });

      if (result.canceled) {
        return;
      }

      const file = result.assets[0];
      console.log('Selected file:', file);

      setLoading(true);

      const token = await getToken();
      const formData = new FormData();
      
      formData.append('file', {
        uri: Platform.OS === 'ios' ? file.uri.replace('file://', '') : file.uri,
        name: file.name || 'upload.xlsx',
        type: file.mimeType || 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      });

      const response = await fetch(`${API_BASE_URL}/whitelist/bulk-upload`, {
        method: 'POST',
        body: formData,
        headers: {
          'Authorization': `Bearer ${token}`,
          'Accept': 'application/json',
        },
      });

      const data = await response.json();
      
      if (data.success) {
        const { added, failed, skipped } = data.results;
        Alert.alert(
          'Bulk Upload Complete',
          `✅ Added: ${added}\n⏭️ Skipped: ${skipped}\n❌ Failed: ${failed}\n\n${data.message}`,
          [{ text: 'OK', onPress: () => fetchWhitelist() }]
        );
      } else {
        Alert.alert('Error', data.error || 'Failed to upload file');
      }
    } catch (error) {
      console.error('Bulk upload error:', error);
      Alert.alert('Error', 'Failed to upload file: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteEmail = async (id, email) => {
    Alert.alert(
      'Confirm Delete',
      `Are you sure you want to remove ${email} from the whitelist?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              const token = await getToken();
              const response = await fetch(`${API_BASE_URL}/whitelist/${id}`, {
                method: 'DELETE',
                headers: {
                  'Authorization': `Bearer ${token}`,
                },
              });

              const data = await response.json();
              if (data.success) {
                Alert.alert('Success', 'Email removed from whitelist');
                fetchWhitelist();
              } else {
                Alert.alert('Error', data.error || 'Failed to delete email');
              }
            } catch (error) {
              console.error('Delete email error:', error);
              Alert.alert('Error', 'Failed to delete email');
            }
          },
        },
      ]
    );
  };

  const resetAddForm = () => {
    setEmail('');
    setUserType('Student');
    setBranch('');
    setDepartment('');
    setNotes('');
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'registered': return '#28a745';
      case 'pending': return '#ffc107';
      case 'rejected': return '#dc3545';
      default: return '#6c757d';
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'registered': return '✅';
      case 'pending': return '⏳';
      case 'rejected': return '❌';
      default: return '❓';
    }
  };

  return (
    <Modal visible={visible} animationType="slide" transparent={false}>
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={styles.headerTitle}>📧 Email Whitelist Manager</Text>
            <Text style={styles.headerSubtitle}>Manage authorized users for KPT Mangalore</Text>
          </View>
          <TouchableOpacity style={styles.closeButton} onPress={onClose}>
            <Text style={styles.closeButtonText}>✕</Text>
          </TouchableOpacity>
        </View>

        {/* Stats Cards */}
        <View style={styles.statsContainer}>
          <View style={styles.statCard}>
            <Text style={styles.statValue}>{counts.total || 0}</Text>
            <Text style={styles.statLabel}>Total</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={[styles.statValue, { color: '#28a745' }]}>{counts.registered || 0}</Text>
            <Text style={styles.statLabel}>Registered</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={[styles.statValue, { color: '#ffc107' }]}>{counts.pending || 0}</Text>
            <Text style={styles.statLabel}>Pending</Text>
          </View>
        </View>

        {/* Action Buttons */}
        <View style={styles.actionsContainer}>
          <TouchableOpacity
            style={[styles.actionButton, styles.addButton]}
            onPress={() => setShowAddModal(true)}
          >
            <Text style={styles.actionButtonText}>➕ Add Email</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.actionButton, styles.uploadButton]}
            onPress={handleBulkUpload}
            disabled={loading}
          >
            <Text style={styles.actionButtonText}>📤 Bulk Upload</Text>
          </TouchableOpacity>
        </View>

        {/* Filter Tabs */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterContainer}>
          {['all', 'pending', 'registered'].map((filter) => (
            <TouchableOpacity
              key={filter}
              style={[styles.filterTab, filterStatus === filter && styles.filterTabActive]}
              onPress={() => setFilterStatus(filter)}
            >
              <Text style={[styles.filterTabText, filterStatus === filter && styles.filterTabTextActive]}>
                {filter.charAt(0).toUpperCase() + filter.slice(1)}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {/* Search */}
        <View style={styles.searchContainer}>
          <TextInput
            style={styles.searchInput}
            placeholder="Search emails, branches, departments..."
            value={searchQuery}
            onChangeText={setSearchQuery}
            onSubmitEditing={fetchWhitelist}
          />
          <TouchableOpacity style={styles.searchButton} onPress={fetchWhitelist}>
            <Text style={styles.searchButtonText}>🔍</Text>
          </TouchableOpacity>
        </View>

        {/* Whitelist Entries */}
        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#4a90e2" />
            <Text style={styles.loadingText}>Loading whitelist...</Text>
          </View>
        ) : (
          <ScrollView style={styles.listContainer}>
            {entries.length === 0 ? (
              <View style={styles.emptyContainer}>
                <Text style={styles.emptyIcon}>📭</Text>
                <Text style={styles.emptyText}>No entries found</Text>
                <Text style={styles.emptySubtext}>Add emails to get started</Text>
              </View>
            ) : (
              entries.map((entry) => (
                <View key={entry._id} style={styles.entryCard}>
                  <View style={styles.entryHeader}>
                    <Text style={styles.entryEmail}>{entry.email}</Text>
                    <View style={[styles.statusBadge, { backgroundColor: getStatusColor(entry.status) }]}>
                      <Text style={styles.statusText}>
                        {getStatusIcon(entry.status)} {entry.status}
                      </Text>
                    </View>
                  </View>
                  
                  <View style={styles.entryDetails}>
                    <Text style={styles.entryDetailText}>
                      👤 {entry.userType} {entry.branch && `• ${entry.branch}`} {entry.department && `• ${entry.department}`}
                    </Text>
                    <Text style={styles.entryDate}>
                      Added: {new Date(entry.createdAt).toLocaleDateString()}
                    </Text>
                  </View>

                  {entry.notes && (
                    <Text style={styles.entryNotes}>📝 {entry.notes}</Text>
                  )}

                  <TouchableOpacity
                    style={styles.deleteButton}
                    onPress={() => handleDeleteEmail(entry._id, entry.email)}
                  >
                    <Text style={styles.deleteButtonText}>🗑️ Remove</Text>
                  </TouchableOpacity>
                </View>
              ))
            )}
          </ScrollView>
        )}

        {/* Add Email Modal */}
        <Modal visible={showAddModal} animationType="slide" transparent={true}>
          <View style={styles.modalOverlay}>
            <View style={styles.modalContainer}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Add Email to Whitelist</Text>
                <TouchableOpacity onPress={() => { setShowAddModal(false); resetAddForm(); }}>
                  <Text style={styles.modalClose}>✕</Text>
                </TouchableOpacity>
              </View>

              <ScrollView style={styles.modalContent}>
                <Text style={styles.inputLabel}>Email Address *</Text>
                <TextInput
                  style={styles.input}
                  placeholder="student@example.com"
                  value={email}
                  onChangeText={setEmail}
                  keyboardType="email-address"
                  autoCapitalize="none"
                />

                <Text style={styles.inputLabel}>User Type *</Text>
                <View style={styles.radioGroup}>
                  <TouchableOpacity
                    style={[styles.radioButton, userType === 'Student' && styles.radioButtonActive]}
                    onPress={() => setUserType('Student')}
                  >
                    <Text style={[styles.radioText, userType === 'Student' && styles.radioTextActive]}>
                      🎓 Student
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.radioButton, userType === 'Staff' && styles.radioButtonActive]}
                    onPress={() => setUserType('Staff')}
                  >
                    <Text style={[styles.radioText, userType === 'Staff' && styles.radioTextActive]}>
                      👨‍🏫 Staff
                    </Text>
                  </TouchableOpacity>
                </View>

                {userType === 'Student' && (
                  <>
                    <Text style={styles.inputLabel}>Branch</Text>
                    <TextInput
                      style={styles.input}
                      placeholder="e.g., Computer Science"
                      value={branch}
                      onChangeText={setBranch}
                    />
                  </>
                )}

                {userType === 'Staff' && (
                  <>
                    <Text style={styles.inputLabel}>Department</Text>
                    <TextInput
                      style={styles.input}
                      placeholder="e.g., Mathematics"
                      value={department}
                      onChangeText={setDepartment}
                    />
                  </>
                )}

                <Text style={styles.inputLabel}>Notes (Optional)</Text>
                <TextInput
                  style={[styles.input, styles.textArea]}
                  placeholder="Additional notes..."
                  value={notes}
                  onChangeText={setNotes}
                  multiline
                  numberOfLines={3}
                />

                <TouchableOpacity
                  style={styles.submitButton}
                  onPress={handleAddEmail}
                  disabled={loading}
                >
                  {loading ? (
                    <ActivityIndicator color="#fff" />
                  ) : (
                    <Text style={styles.submitButtonText}>Add to Whitelist</Text>
                  )}
                </TouchableOpacity>
              </ScrollView>
            </View>
          </View>
        </Modal>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f7fa',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    paddingTop: 50,
    backgroundColor: '#4a90e2',
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#fff',
  },
  headerSubtitle: {
    fontSize: 14,
    color: '#e3f2fd',
    marginTop: 4,
  },
  closeButton: {
    padding: 8,
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderRadius: 20,
  },
  closeButtonText: {
    fontSize: 20,
    color: '#fff',
    fontWeight: 'bold',
  },
  statsContainer: {
    flexDirection: 'row',
    padding: 16,
    justifyContent: 'space-around',
  },
  statCard: {
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    flex: 1,
    marginHorizontal: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  statValue: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#4a90e2',
  },
  statLabel: {
    fontSize: 12,
    color: '#6c757d',
    marginTop: 4,
  },
  actionsContainer: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    marginBottom: 16,
  },
  actionButton: {
    flex: 1,
    padding: 14,
    borderRadius: 10,
    alignItems: 'center',
    marginHorizontal: 4,
  },
  addButton: {
    backgroundColor: '#28a745',
  },
  uploadButton: {
    backgroundColor: '#17a2b8',
  },
  actionButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: 'bold',
  },
  filterContainer: {
    paddingHorizontal: 16,
    marginBottom: 12,
  },
  filterTab: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    backgroundColor: '#fff',
    borderRadius: 20,
    marginRight: 8,
  },
  filterTabActive: {
    backgroundColor: '#4a90e2',
  },
  filterTabText: {
    fontSize: 14,
    color: '#6c757d',
    fontWeight: '600',
  },
  filterTabTextActive: {
    color: '#fff',
  },
  searchContainer: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    marginBottom: 16,
  },
  searchInput: {
    flex: 1,
    backgroundColor: '#fff',
    padding: 12,
    borderRadius: 10,
    fontSize: 14,
    marginRight: 8,
  },
  searchButton: {
    backgroundColor: '#4a90e2',
    padding: 12,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    width: 50,
  },
  searchButtonText: {
    fontSize: 18,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: '#6c757d',
  },
  listContainer: {
    flex: 1,
    paddingHorizontal: 16,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  emptyIcon: {
    fontSize: 60,
    marginBottom: 16,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#6c757d',
    marginBottom: 8,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#adb5bd',
  },
  entryCard: {
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  entryHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  entryEmail: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#212529',
    flex: 1,
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusText: {
    fontSize: 11,
    color: '#fff',
    fontWeight: 'bold',
  },
  entryDetails: {
    marginBottom: 8,
  },
  entryDetailText: {
    fontSize: 14,
    color: '#6c757d',
    marginBottom: 4,
  },
  entryDate: {
    fontSize: 12,
    color: '#adb5bd',
  },
  entryNotes: {
    fontSize: 13,
    color: '#495057',
    fontStyle: 'italic',
    marginBottom: 12,
    padding: 8,
    backgroundColor: '#f8f9fa',
    borderRadius: 6,
  },
  deleteButton: {
    backgroundColor: '#dc3545',
    padding: 10,
    borderRadius: 8,
    alignItems: 'center',
  },
  deleteButtonText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: 'bold',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContainer: {
    backgroundColor: '#fff',
    borderRadius: 15,
    width: '90%',
    maxHeight: '80%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#e9ecef',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#212529',
  },
  modalClose: {
    fontSize: 24,
    color: '#6c757d',
    fontWeight: 'bold',
  },
  modalContent: {
    padding: 20,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#495057',
    marginBottom: 8,
    marginTop: 12,
  },
  input: {
    backgroundColor: '#f8f9fa',
    padding: 12,
    borderRadius: 8,
    fontSize: 14,
    borderWidth: 1,
    borderColor: '#e9ecef',
  },
  textArea: {
    height: 80,
    textAlignVertical: 'top',
  },
  radioGroup: {
    flexDirection: 'row',
    marginBottom: 12,
  },
  radioButton: {
    flex: 1,
    padding: 12,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: '#e9ecef',
    alignItems: 'center',
    marginRight: 8,
    backgroundColor: '#fff',
  },
  radioButtonActive: {
    borderColor: '#4a90e2',
    backgroundColor: '#e7f3ff',
  },
  radioText: {
    fontSize: 14,
    color: '#6c757d',
    fontWeight: '600',
  },
  radioTextActive: {
    color: '#4a90e2',
  },
  submitButton: {
    backgroundColor: '#28a745',
    padding: 16,
    borderRadius: 10,
    alignItems: 'center',
    marginTop: 20,
  },
  submitButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
});

export default WhitelistManager;
