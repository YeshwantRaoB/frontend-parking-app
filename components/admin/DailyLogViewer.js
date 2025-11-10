import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  Modal,
  ScrollView,
  Image,
  Alert,
  Linking
} from 'react-native';
import { useAuth } from '@clerk/clerk-expo';
import { API_BASE_URL } from '../../config';

export default function DailyLogViewer({ visible, onClose }) {
  const [logs, setLogs] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [filterType, setFilterType] = useState('all'); // all, entry, exit, registered, unregistered
  const [selectedLog, setSelectedLog] = useState(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [selectedPhoto, setSelectedPhoto] = useState(null);
  const [selectedPhotoInfo, setSelectedPhotoInfo] = useState(null);
  const [showPhotoModal, setShowPhotoModal] = useState(false);
  const { getToken } = useAuth();

  useEffect(() => {
    if (visible) {
      fetchDailyLogs();
    }
  }, [visible, selectedDate, filterType]);

  const fetchDailyLogs = async (isRefresh = false) => {
    if (isRefresh) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }

    try {
      const token = await getToken();
      const dateStr = selectedDate.toISOString().split('T')[0];
      
      let url = `${API_BASE_URL}/logs/daily?date=${dateStr}`;
      
      if (filterType === 'entry') {
        url += '&eventType=entry';
      } else if (filterType === 'exit') {
        url += '&eventType=exit';
      } else if (filterType === 'registered') {
        url += '&isRegistered=true';
      } else if (filterType === 'unregistered') {
        url += '&isRegistered=false';
      }

      const response = await fetch(url, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error('Failed to fetch logs');
      }

      const data = await response.json();
      setLogs(data.logs || []);
      setStats(data.stats || {});
    } catch (error) {
      console.error('Error fetching daily logs:', error);
      Alert.alert('Error', 'Failed to load daily logs');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    fetchDailyLogs(true);
  };

  const changeDate = (days) => {
    const newDate = new Date(selectedDate);
    newDate.setDate(newDate.getDate() + days);
    setSelectedDate(newDate);
  };

  const formatTime = (timestamp) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: true
    });
  };

  const formatDate = (date) => {
    return date.toLocaleDateString('en-US', {
      weekday: 'short',
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const handleCallOwner = (phoneNumber, vehicleInfo) => {
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

  const renderLogItem = ({ item }) => {
    const isEntry = item.eventType === 'entry';
    const isRegistered = item.isRegistered;

    return (
      <TouchableOpacity
        style={[
          styles.logCard,
          !isRegistered && styles.unregisteredCard
        ]}
        onPress={() => {
          setSelectedLog(item);
          setShowDetailModal(true);
        }}
      >
        <View style={styles.logHeader}>
          <View style={styles.logHeaderLeft}>
            <Text style={styles.licensePlate}>{item.licencePlate}</Text>
            <View style={styles.badges}>
              <View style={[
                styles.badge,
                isEntry ? styles.entryBadge : styles.exitBadge
              ]}>
                <Text style={styles.badgeText}>
                  {isEntry ? '🚗 ENTRY' : '🚙 EXIT'}
                </Text>
              </View>
              {!isRegistered && (
                <View style={[styles.badge, styles.unregisteredBadge]}>
                  <Text style={styles.badgeText}>⚠️ UNREGISTERED</Text>
                </View>
              )}
            </View>
          </View>
          <Text style={styles.time}>{formatTime(item.timestamp)}</Text>
        </View>

        {isRegistered && item.vehicleInfo && (
          <View style={styles.vehicleInfo}>
            <Text style={styles.infoText}>👤 {item.vehicleInfo.fullName}</Text>
            {item.vehicleInfo.vehicleName && (
              <Text style={styles.infoText}>🚗 {item.vehicleInfo.vehicleName}</Text>
            )}
            <Text style={styles.infoText}>
              🏢 {item.vehicleInfo.designation} - {item.vehicleInfo.branch}
            </Text>
            {item.vehicleInfo.phoneNumber && (
              <TouchableOpacity
                style={styles.phoneButton}
                onPress={() => handleCallOwner(
                  item.vehicleInfo.phoneNumber,
                  `${item.vehicleInfo.fullName} - ${item.licencePlate}`
                )}
              >
                <Text style={styles.phoneButtonText}>
                  📞 {item.vehicleInfo.phoneNumber}
                </Text>
              </TouchableOpacity>
            )}
          </View>
        )}

        {item.imageUrl && (
          <TouchableOpacity
            style={styles.viewPhotoButtonSmall}
            onPress={() => {
              setSelectedPhoto(item.imageUrl);
              setSelectedPhotoInfo({
                type: `${item.eventType === 'entry' ? 'Entry' : 'Exit'} Photo`,
                vehicle: `${item.licencePlate} - ${formatTime(item.timestamp)}`
              });
              setShowPhotoModal(true);
            }}
          >
            <Text style={styles.viewPhotoButtonSmallText}>📷 View Photo</Text>
          </TouchableOpacity>
        )}

        {item.confidence && (
          <Text style={styles.confidence}>
            Confidence: {Math.round(item.confidence * 100)}%
          </Text>
        )}
      </TouchableOpacity>
    );
  };

  const renderDetailModal = () => {
    if (!selectedLog) return null;

    return (
      <Modal
        visible={showDetailModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowDetailModal(false)}
      >
        <View style={styles.detailModalOverlay}>
          <View style={styles.detailModalContainer}>
            <View style={styles.detailModalHeader}>
              <Text style={styles.detailModalTitle}>Log Details</Text>
              <TouchableOpacity
                style={styles.detailModalClose}
                onPress={() => setShowDetailModal(false)}
              >
                <Text style={styles.detailModalCloseText}>✕</Text>
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.detailModalContent}>
              <View style={styles.detailSection}>
                <Text style={styles.detailLabel}>License Plate</Text>
                <Text style={styles.detailValue}>{selectedLog.licencePlate}</Text>
              </View>

              <View style={styles.detailSection}>
                <Text style={styles.detailLabel}>Event Type</Text>
                <View style={[
                  styles.badge,
                  selectedLog.eventType === 'entry' ? styles.entryBadge : styles.exitBadge
                ]}>
                  <Text style={styles.badgeText}>
                    {selectedLog.eventType === 'entry' ? '🚗 ENTRY' : '🚙 EXIT'}
                  </Text>
                </View>
              </View>

              <View style={styles.detailSection}>
                <Text style={styles.detailLabel}>Timestamp</Text>
                <Text style={styles.detailValue}>
                  {new Date(selectedLog.timestamp).toLocaleString()}
                </Text>
              </View>

              <View style={styles.detailSection}>
                <Text style={styles.detailLabel}>Registration Status</Text>
                <View style={[
                  styles.badge,
                  selectedLog.isRegistered ? styles.registeredBadge : styles.unregisteredBadge
                ]}>
                  <Text style={styles.badgeText}>
                    {selectedLog.isRegistered ? '✅ REGISTERED' : '⚠️ UNREGISTERED'}
                  </Text>
                </View>
              </View>

              {selectedLog.confidence && (
                <View style={styles.detailSection}>
                  <Text style={styles.detailLabel}>Detection Confidence</Text>
                  <Text style={styles.detailValue}>
                    {Math.round(selectedLog.confidence * 100)}%
                  </Text>
                </View>
              )}

              {selectedLog.cameraId && (
                <View style={styles.detailSection}>
                  <Text style={styles.detailLabel}>Camera ID</Text>
                  <Text style={styles.detailValue}>{selectedLog.cameraId}</Text>
                </View>
              )}

              {selectedLog.isRegistered && selectedLog.vehicleInfo && (
                <>
                  <Text style={styles.sectionTitle}>Vehicle Information</Text>
                  
                  <View style={styles.detailSection}>
                    <Text style={styles.detailLabel}>Owner Name</Text>
                    <Text style={styles.detailValue}>{selectedLog.vehicleInfo.fullName}</Text>
                  </View>

                  {selectedLog.vehicleInfo.vehicleName && (
                    <View style={styles.detailSection}>
                      <Text style={styles.detailLabel}>Vehicle Model</Text>
                      <Text style={styles.detailValue}>{selectedLog.vehicleInfo.vehicleName}</Text>
                    </View>
                  )}

                  <View style={styles.detailSection}>
                    <Text style={styles.detailLabel}>Designation</Text>
                    <Text style={styles.detailValue}>{selectedLog.vehicleInfo.designation}</Text>
                  </View>

                  <View style={styles.detailSection}>
                    <Text style={styles.detailLabel}>Branch/Department</Text>
                    <Text style={styles.detailValue}>{selectedLog.vehicleInfo.branch}</Text>
                  </View>

                  {selectedLog.vehicleInfo.phoneNumber && (
                    <View style={styles.detailSection}>
                      <Text style={styles.detailLabel}>Phone Number</Text>
                      <TouchableOpacity
                        style={styles.phoneButton}
                        onPress={() => handleCallOwner(
                          selectedLog.vehicleInfo.phoneNumber,
                          `${selectedLog.vehicleInfo.fullName} - ${selectedLog.licencePlate}`
                        )}
                      >
                        <Text style={styles.phoneButtonText}>
                          📞 {selectedLog.vehicleInfo.phoneNumber}
                        </Text>
                      </TouchableOpacity>
                    </View>
                  )}
                </>
              )}

              {selectedLog.imageUrl && (
                <View style={styles.detailSection}>
                  <Text style={styles.detailLabel}>Captured Image</Text>
                  <Image
                    source={{ uri: selectedLog.imageUrl }}
                    style={styles.capturedImage}
                    resizeMode="contain"
                  />
                </View>
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>
    );
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      onRequestClose={onClose}
    >
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Daily Vehicle Log</Text>
          <TouchableOpacity style={styles.closeButton} onPress={onClose}>
            <Text style={styles.closeButtonText}>✕</Text>
          </TouchableOpacity>
        </View>

        {/* Date Navigation */}
        <View style={styles.dateNavigation}>
          <TouchableOpacity
            style={styles.dateButton}
            onPress={() => changeDate(-1)}
          >
            <Text style={styles.dateButtonText}>← Previous</Text>
          </TouchableOpacity>
          <Text style={styles.dateText}>{formatDate(selectedDate)}</Text>
          <TouchableOpacity
            style={[
              styles.dateButton,
              selectedDate.toDateString() === new Date().toDateString() && styles.dateButtonDisabled
            ]}
            onPress={() => changeDate(1)}
            disabled={selectedDate.toDateString() === new Date().toDateString()}
          >
            <Text style={styles.dateButtonText}>Next →</Text>
          </TouchableOpacity>
        </View>

        {/* Statistics */}
        {stats && (
          <View style={styles.statsContainer}>
            <View style={styles.statCard}>
              <Text style={styles.statValue}>{stats.totalEntries}</Text>
              <Text style={styles.statLabel}>Entries</Text>
            </View>
            <View style={styles.statCard}>
              <Text style={styles.statValue}>{stats.totalExits}</Text>
              <Text style={styles.statLabel}>Exits</Text>
            </View>
            <View style={styles.statCard}>
              <Text style={styles.statValue}>{stats.uniqueVehicles}</Text>
              <Text style={styles.statLabel}>Unique</Text>
            </View>
            <View style={styles.statCard}>
              <Text style={[styles.statValue, styles.unregisteredValue]}>
                {stats.unregisteredVehicles}
              </Text>
              <Text style={styles.statLabel}>Unregistered</Text>
            </View>
          </View>
        )}

        {/* Filter Buttons */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterContainer}>
          <TouchableOpacity
            style={[styles.filterButton, filterType === 'all' && styles.filterButtonActive]}
            onPress={() => setFilterType('all')}
          >
            <Text style={[styles.filterButtonText, filterType === 'all' && styles.filterButtonTextActive]}>
              All
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.filterButton, filterType === 'entry' && styles.filterButtonActive]}
            onPress={() => setFilterType('entry')}
          >
            <Text style={[styles.filterButtonText, filterType === 'entry' && styles.filterButtonTextActive]}>
              🚗 Entries
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.filterButton, filterType === 'exit' && styles.filterButtonActive]}
            onPress={() => setFilterType('exit')}
          >
            <Text style={[styles.filterButtonText, filterType === 'exit' && styles.filterButtonTextActive]}>
              🚙 Exits
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.filterButton, filterType === 'registered' && styles.filterButtonActive]}
            onPress={() => setFilterType('registered')}
          >
            <Text style={[styles.filterButtonText, filterType === 'registered' && styles.filterButtonTextActive]}>
              ✅ Registered
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.filterButton, filterType === 'unregistered' && styles.filterButtonActive]}
            onPress={() => setFilterType('unregistered')}
          >
            <Text style={[styles.filterButtonText, filterType === 'unregistered' && styles.filterButtonTextActive]}>
              ⚠️ Unregistered
            </Text>
          </TouchableOpacity>
        </ScrollView>

        {/* Logs List */}
        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#4a90e2" />
            <Text style={styles.loadingText}>Loading logs...</Text>
          </View>
        ) : logs.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>No logs found for this date</Text>
          </View>
        ) : (
          <FlatList
            data={logs}
            renderItem={renderLogItem}
            keyExtractor={(item) => item._id}
            style={styles.logsList}
            refreshControl={
              <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
            }
          />
        )}

        {renderDetailModal()}

        {/* Photo Modal */}
        <Modal visible={showPhotoModal} animationType="fade" transparent={true}>
          <View style={styles.photoModalOverlay}>
            <View style={styles.photoModalContainer}>
              <View style={styles.photoModalHeader}>
                <Text style={styles.photoModalTitle}>
                  {selectedPhotoInfo?.type}
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
                  />
                )}
              </View>
              <Text style={styles.photoModalInfo}>{selectedPhotoInfo?.vehicle}</Text>
            </View>
          </View>
        </Modal>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f0f2f5',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    paddingTop: 50,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
  },
  closeButton: {
    padding: 8,
    borderRadius: 20,
    backgroundColor: '#f0f0f0',
  },
  closeButtonText: {
    fontSize: 18,
    color: '#666',
    fontWeight: 'bold',
  },
  dateNavigation: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 15,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  dateButton: {
    paddingHorizontal: 15,
    paddingVertical: 8,
    backgroundColor: '#4a90e2',
    borderRadius: 6,
  },
  dateButtonDisabled: {
    backgroundColor: '#ccc',
  },
  dateButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  dateText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  statsContainer: {
    flexDirection: 'row',
    padding: 15,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  statCard: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 10,
  },
  statValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#4a90e2',
  },
  unregisteredValue: {
    color: '#f44336',
  },
  statLabel: {
    fontSize: 12,
    color: '#666',
    marginTop: 4,
  },
  filterContainer: {
    backgroundColor: '#fff',
    paddingHorizontal: 15,
    paddingVertical: 6,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  filterButton: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    marginRight: 6,
    backgroundColor: '#f0f0f0',
    borderRadius: 12,
    height: 28,
    justifyContent: 'center',
    alignItems: 'center',
  },
  filterButtonActive: {
    backgroundColor: '#4a90e2',
  },
  filterButtonText: {
    fontSize: 11,
    color: '#666',
    fontWeight: '600',
  },
  filterButtonTextActive: {
    color: '#fff',
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
    padding: 40,
  },
  emptyText: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
  },
  logsList: {
    flex: 1,
    padding: 15,
  },
  logCard: {
    backgroundColor: '#fff',
    borderRadius: 10,
    padding: 12,
    marginBottom: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 3,
    elevation: 2,
    borderLeftWidth: 3,
    borderLeftColor: '#4a90e2',
  },
  unregisteredCard: {
    borderLeftColor: '#f44336',
    backgroundColor: '#fff5f5',
  },
  logHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 10,
  },
  logHeaderLeft: {
    flex: 1,
  },
  licensePlate: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 8,
  },
  badges: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  badge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  entryBadge: {
    backgroundColor: '#e8f5e9',
  },
  exitBadge: {
    backgroundColor: '#fff3e0',
  },
  unregisteredBadge: {
    backgroundColor: '#ffebee',
  },
  registeredBadge: {
    backgroundColor: '#e8f5e9',
  },
  badgeText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#333',
  },
  time: {
    fontSize: 14,
    color: '#666',
    fontWeight: '600',
  },
  vehicleInfo: {
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
  },
  infoText: {
    fontSize: 13,
    color: '#666',
    marginBottom: 4,
  },
  phoneButton: {
    marginTop: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: '#4a90e2',
    borderRadius: 6,
    alignSelf: 'flex-start',
  },
  phoneButtonText: {
    fontSize: 13,
    color: '#fff',
    fontWeight: '600',
  },
  confidence: {
    fontSize: 12,
    color: '#999',
    marginTop: 6,
    fontStyle: 'italic',
  },
  detailModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  detailModalContainer: {
    width: '90%',
    maxHeight: '80%',
    backgroundColor: '#fff',
    borderRadius: 12,
    overflow: 'hidden',
  },
  detailModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#f8f9fa',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  detailModalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  detailModalClose: {
    padding: 8,
    borderRadius: 20,
    backgroundColor: '#fff',
  },
  detailModalCloseText: {
    fontSize: 16,
    color: '#666',
    fontWeight: 'bold',
  },
  detailModalContent: {
    padding: 20,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginTop: 20,
    marginBottom: 12,
  },
  detailSection: {
    marginBottom: 16,
  },
  detailLabel: {
    fontSize: 12,
    color: '#999',
    marginBottom: 4,
    textTransform: 'uppercase',
    fontWeight: '600',
  },
  detailValue: {
    fontSize: 16,
    color: '#333',
  },
  capturedImage: {
    width: '100%',
    height: 200,
    borderRadius: 8,
    marginTop: 8,
  },
  viewPhotoButtonSmall: {
    backgroundColor: '#4a90e2',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 6,
    marginTop: 8,
    alignSelf: 'flex-start',
  },
  viewPhotoButtonSmallText: {
    fontSize: 12,
    color: '#fff',
    fontWeight: '600',
  },
  photoModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.95)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  photoModalContainer: {
    width: '95%',
    height: '90%',
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
    borderBottomColor: '#e0e0e0',
  },
  photoModalTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    flex: 1,
  },
  photoModalCloseButton: {
    padding: 8,
    borderRadius: 20,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  photoModalCloseText: {
    fontSize: 16,
    color: '#666',
    fontWeight: 'bold',
  },
  photoModalImageContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#000',
  },
  photoModalImage: {
    width: '100%',
    height: '100%',
  },
  photoModalInfo: {
    padding: 12,
    fontSize: 13,
    color: '#666',
    textAlign: 'center',
    backgroundColor: '#f8f9fa',
  },
});
