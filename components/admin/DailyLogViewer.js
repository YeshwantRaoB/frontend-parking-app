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
  const [showFilterMenu, setShowFilterMenu] = useState(false);
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

  const downloadExcel = async () => {
    try {
      const token = await getToken();
      const dateStr = selectedDate.toISOString().split('T')[0];
      
      Alert.alert(
        'Download Excel',
        `Download vehicle logs for ${formatDate(selectedDate)}?`,
        [
          {
            text: 'Cancel',
            style: 'cancel'
          },
          {
            text: 'Download',
            onPress: async () => {
              try {
                // Construct URL with token in query parameter for mobile compatibility
                const downloadUrl = `${API_BASE_URL}/logs/daily/export?date=${dateStr}&token=${encodeURIComponent(token)}`;
                
                const supported = await Linking.canOpenURL(downloadUrl);
                if (supported) {
                  await Linking.openURL(downloadUrl);
                  Alert.alert('Success', 'Excel file download started. Check your downloads folder.');
                } else {
                  Alert.alert('Error', 'Cannot open download link');
                }
              } catch (err) {
                console.error('Error opening download URL:', err);
                Alert.alert('Error', 'Failed to open download link');
              }
            }
          }
        ]
      );
    } catch (error) {
      console.error('Error downloading Excel:', error);
      Alert.alert('Error', 'Failed to download Excel file');
    }
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
          <View style={styles.headerButtons}>
            <TouchableOpacity 
              style={styles.downloadButton} 
              onPress={downloadExcel}
              disabled={loading || logs.length === 0}
            >
              <Text style={styles.downloadButtonText}>📥 Excel</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.closeButton} onPress={onClose}>
              <Text style={styles.closeButtonText}>✕</Text>
            </TouchableOpacity>
          </View>
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

        {/* Filter Bar */}
        <View style={styles.filterBar}>
          <Text style={styles.currentFilterText}>
            {filterType === 'all' && 'Filter: All Logs'}
            {filterType === 'entry' && 'Filter: 🚗 Entries'}
            {filterType === 'exit' && 'Filter: 🚙 Exits'}
            {filterType === 'registered' && 'Filter: ✅ Registered'}
            {filterType === 'unregistered' && 'Filter: ⚠️ Unregistered'}
          </Text>
          <TouchableOpacity
            style={styles.hamburgerButton}
            onPress={() => setShowFilterMenu(true)}
          >
            <Text style={styles.hamburgerIcon}>☰</Text>
          </TouchableOpacity>
        </View>

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

        {/* Filter Menu Modal */}
        <Modal
          visible={showFilterMenu}
          animationType="slide"
          transparent={true}
          onRequestClose={() => setShowFilterMenu(false)}
        >
          <View style={styles.filterMenuOverlay}>
            <View style={styles.filterMenuContainer}>
              <View style={styles.filterMenuHeader}>
                <Text style={styles.filterMenuTitle}>Select Filter</Text>
                <TouchableOpacity
                  style={styles.filterMenuClose}
                  onPress={() => setShowFilterMenu(false)}
                >
                  <Text style={styles.filterMenuCloseText}>✕</Text>
                </TouchableOpacity>
              </View>
              <View style={styles.filterMenuContent}>
                <TouchableOpacity
                  style={[styles.filterMenuItem, filterType === 'all' && styles.filterMenuItemActive]}
                  onPress={() => {
                    setFilterType('all');
                    setShowFilterMenu(false);
                  }}
                >
                  <Text style={[styles.filterMenuItemText, filterType === 'all' && styles.filterMenuItemTextActive]}>
                    All Logs
                  </Text>
                  {filterType === 'all' && <Text style={styles.checkmark}>✓</Text>}
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.filterMenuItem, filterType === 'entry' && styles.filterMenuItemActive]}
                  onPress={() => {
                    setFilterType('entry');
                    setShowFilterMenu(false);
                  }}
                >
                  <Text style={[styles.filterMenuItemText, filterType === 'entry' && styles.filterMenuItemTextActive]}>
                    🚗 Entries
                  </Text>
                  {filterType === 'entry' && <Text style={styles.checkmark}>✓</Text>}
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.filterMenuItem, filterType === 'exit' && styles.filterMenuItemActive]}
                  onPress={() => {
                    setFilterType('exit');
                    setShowFilterMenu(false);
                  }}
                >
                  <Text style={[styles.filterMenuItemText, filterType === 'exit' && styles.filterMenuItemTextActive]}>
                    🚙 Exits
                  </Text>
                  {filterType === 'exit' && <Text style={styles.checkmark}>✓</Text>}
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.filterMenuItem, filterType === 'registered' && styles.filterMenuItemActive]}
                  onPress={() => {
                    setFilterType('registered');
                    setShowFilterMenu(false);
                  }}
                >
                  <Text style={[styles.filterMenuItemText, filterType === 'registered' && styles.filterMenuItemTextActive]}>
                    ✅ Registered
                  </Text>
                  {filterType === 'registered' && <Text style={styles.checkmark}>✓</Text>}
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.filterMenuItem, filterType === 'unregistered' && styles.filterMenuItemActive]}
                  onPress={() => {
                    setFilterType('unregistered');
                    setShowFilterMenu(false);
                  }}
                >
                  <Text style={[styles.filterMenuItemText, filterType === 'unregistered' && styles.filterMenuItemTextActive]}>
                    ⚠️ Unregistered
                  </Text>
                  {filterType === 'unregistered' && <Text style={styles.checkmark}>✓</Text>}
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>

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
  headerButtons: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  downloadButton: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: '#10b981',
    borderRadius: 8,
    shadowColor: '#10b981',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 3,
    elevation: 2,
  },
  downloadButtonText: {
    fontSize: 13,
    color: '#fff',
    fontWeight: '600',
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
    paddingHorizontal: 15,
    paddingVertical: 10,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  dateButton: {
    paddingHorizontal: 20,
    paddingVertical: 12,
    backgroundColor: '#4a90e2',
    borderRadius: 25,
    shadowColor: '#4a90e2',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 3,
    elevation: 2,
  },
  dateButtonDisabled: {
    backgroundColor: '#adb5bd',
    shadowOpacity: 0,
    elevation: 0,
  },
  dateButtonText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '600',
  },
  dateText: {
    fontSize: 18,
    fontWeight: '700',
    color: '#212529',
    backgroundColor: '#f8f9fa',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#e9ecef',
  },
  statsContainer: {
    flexDirection: 'row',
    paddingHorizontal: 15,
    paddingVertical: 8,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  statCard: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 8,
    backgroundColor: '#fff',
    marginHorizontal: 4,
    borderRadius: 12,
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
  unregisteredValue: {
    color: '#dc3545',
  },
  statLabel: {
    fontSize: 13,
    color: '#6c757d',
    marginTop: 6,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  filterBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#fff',
    paddingHorizontal: 15,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  currentFilterText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#212529',
    flex: 1,
  },
  hamburgerButton: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: '#4a90e2',
    borderRadius: 8,
    shadowColor: '#4a90e2',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 3,
    elevation: 2,
  },
  hamburgerIcon: {
    fontSize: 20,
    color: '#fff',
    fontWeight: '600',
  },
  filterMenuOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  filterMenuContainer: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '60%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 10,
  },
  filterMenuHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
    backgroundColor: '#f8f9fa',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
  },
  filterMenuTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  filterMenuClose: {
    padding: 8,
    borderRadius: 20,
    backgroundColor: '#fff',
  },
  filterMenuCloseText: {
    fontSize: 18,
    color: '#666',
    fontWeight: 'bold',
  },
  filterMenuContent: {
    padding: 20,
  },
  filterMenuItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 16,
    backgroundColor: '#f8f9fa',
    borderRadius: 12,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#e9ecef',
  },
  filterMenuItemActive: {
    backgroundColor: '#4a90e2',
    borderColor: '#4a90e2',
  },
  filterMenuItemText: {
    fontSize: 16,
    color: '#495057',
    fontWeight: '600',
  },
  filterMenuItemTextActive: {
    color: '#fff',
    fontWeight: '700',
  },
  checkmark: {
    fontSize: 18,
    color: '#fff',
    fontWeight: 'bold',
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
    paddingHorizontal: 15,
    paddingTop: 8,
    paddingBottom: 15,
  },
  logCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginTop: 8,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    borderLeftWidth: 4,
    borderLeftColor: '#4a90e2',
  },
  unregisteredCard: {
    borderLeftColor: '#dc3545',
    backgroundColor: '#fff5f5',
    borderWidth: 1,
    borderColor: '#f8d7da',
  },
  logHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  logHeaderLeft: {
    flex: 1,
  },
  licensePlate: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#212529',
    marginBottom: 10,
  },
  badges: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  badge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  entryBadge: {
    backgroundColor: '#d4edda',
    borderColor: '#c3e6cb',
  },
  exitBadge: {
    backgroundColor: '#fff3cd',
    borderColor: '#ffeaa7',
  },
  unregisteredBadge: {
    backgroundColor: '#f8d7da',
    borderColor: '#f5c6cb',
  },
  registeredBadge: {
    backgroundColor: '#d4edda',
    borderColor: '#c3e6cb',
  },
  badgeText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#212529',
  },
  time: {
    fontSize: 14,
    color: '#6c757d',
    fontWeight: '600',
    backgroundColor: '#f8f9fa',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  vehicleInfo: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#e9ecef',
    backgroundColor: '#f8f9fa',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    marginHorizontal: -4,
  },
  infoText: {
    fontSize: 14,
    color: '#495057',
    marginBottom: 6,
    fontWeight: '500',
  },
  phoneButton: {
    marginTop: 8,
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: '#28a745',
    borderRadius: 20,
    alignSelf: 'flex-start',
    shadowColor: '#28a745',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 3,
    elevation: 2,
  },
  phoneButtonText: {
    fontSize: 14,
    color: '#fff',
    fontWeight: '600',
  },
  confidence: {
    fontSize: 12,
    color: '#6c757d',
    marginTop: 8,
    fontStyle: 'italic',
    backgroundColor: '#e9ecef',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    alignSelf: 'flex-start',
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
    backgroundColor: '#17a2b8',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 18,
    marginTop: 10,
    alignSelf: 'flex-start',
    shadowColor: '#17a2b8',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 3,
    elevation: 2,
  },
  viewPhotoButtonSmallText: {
    fontSize: 13,
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
