import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Modal,
  ScrollView,
  Image,
  Dimensions,
} from 'react-native';

const { width: screenWidth } = Dimensions.get('window');

const VehicleDetailsModal = ({ visible, onClose, vehicle, onEdit }) => {
  if (!vehicle) return null;

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-IN', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <Modal visible={visible} animationType="slide" transparent={true}>
      <View style={styles.modalOverlay}>
        <View style={styles.modalContainer}>
          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.headerTitle}>Vehicle Details</Text>
            <TouchableOpacity style={styles.closeButton} onPress={onClose}>
              <Text style={styles.closeButtonText}>✕</Text>
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
            {/* License Plate - Prominent Display */}
            <View style={styles.licensePlateContainer}>
              <Text style={styles.licensePlateLabel}>License Plate</Text>
              <Text style={styles.licensePlateText}>{vehicle.licencePlate}</Text>
            </View>

            {/* Owner Information */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>👤 Owner Information</Text>
              <View style={styles.infoRow}>
                <Text style={styles.label}>Full Name:</Text>
                <Text style={styles.value}>{vehicle.fullName}</Text>
              </View>
              <View style={styles.infoRow}>
                <Text style={styles.label}>Branch:</Text>
                <Text style={styles.value}>{vehicle.branch}</Text>
              </View>
              <View style={styles.infoRow}>
                <Text style={styles.label}>Designation:</Text>
                <Text style={styles.value}>{vehicle.designation}</Text>
              </View>
              {vehicle.registerNumber && (
                <View style={styles.infoRow}>
                  <Text style={styles.label}>Register Number:</Text>
                  <Text style={styles.value}>{vehicle.registerNumber}</Text>
                </View>
              )}
              {(vehicle.staffPosition || vehicle.department) && (
                <View style={styles.infoRow}>
                  <Text style={styles.label}>Position:</Text>
                  <Text style={styles.value}>{vehicle.staffPosition || vehicle.department}</Text>
                </View>
              )}
            </View>

            {/* Vehicle Information */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>🚗 Vehicle Information</Text>
              {vehicle.vehicleName && (
                <View style={styles.infoRow}>
                  <Text style={styles.label}>Vehicle Name:</Text>
                  <Text style={styles.value}>{vehicle.vehicleName}</Text>
                </View>
              )}
              {vehicle.vehicleType && (
                <View style={styles.infoRow}>
                  <Text style={styles.label}>Vehicle Type:</Text>
                  <Text style={styles.value}>{vehicle.vehicleType}</Text>
                </View>
              )}
              <View style={styles.infoRow}>
                <Text style={styles.label}>Registered On:</Text>
                <Text style={styles.value}>{formatDate(vehicle.createdAt)}</Text>
              </View>
            </View>

            {/* Photos Section */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>📷 Photos</Text>
              
              {/* Vehicle Photo */}
              {(vehicle.vehiclePhotoUrl || (vehicle.photoUrl && !vehicle.ownerPhotoUrl)) && (
                <View style={styles.photoContainer}>
                  <Text style={styles.photoLabel}>Vehicle Photo:</Text>
                  <Image
                    source={{ uri: vehicle.vehiclePhotoUrl || vehicle.photoUrl }}
                    style={styles.photo}
                    resizeMode="cover"
                  />
                </View>
              )}

              {/* Owner Photo */}
              {vehicle.ownerPhotoUrl && (
                <View style={styles.photoContainer}>
                  <Text style={styles.photoLabel}>Owner Photo:</Text>
                  <Image
                    source={{ uri: vehicle.ownerPhotoUrl }}
                    style={styles.photo}
                    resizeMode="cover"
                  />
                </View>
              )}

              {!vehicle.vehiclePhotoUrl && !vehicle.photoUrl && !vehicle.ownerPhotoUrl && (
                <Text style={styles.noPhotosText}>No photos available</Text>
              )}
            </View>

            {/* Registration Status */}
            <View style={styles.statusContainer}>
              <View style={styles.statusBadge}>
                <Text style={styles.statusText}>✅ REGISTERED</Text>
              </View>
              <Text style={styles.statusSubtext}>
                This vehicle is properly registered in the college parking system.
              </Text>
            </View>
          </ScrollView>

          {/* Action Buttons */}
          <View style={styles.actionButtons}>
            {onEdit && (
              <TouchableOpacity style={styles.editButton} onPress={() => onEdit(vehicle)}>
                <Text style={styles.editButtonText}>✏️ Edit Details</Text>
              </TouchableOpacity>
            )}
            <TouchableOpacity style={styles.closeActionButton} onPress={onClose}>
              <Text style={styles.closeActionButtonText}>Close</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContainer: {
    backgroundColor: '#fff',
    borderRadius: 15,
    width: screenWidth * 0.95,
    maxHeight: '90%',
    elevation: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 10,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
    backgroundColor: '#f8f9fa',
    borderTopLeftRadius: 15,
    borderTopRightRadius: 15,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  closeButton: {
    padding: 5,
  },
  closeButtonText: {
    fontSize: 18,
    color: '#666',
    fontWeight: 'bold',
  },
  content: {
    paddingHorizontal: 20,
    paddingVertical: 15,
  },
  licensePlateContainer: {
    backgroundColor: '#4a90e2',
    borderRadius: 10,
    padding: 20,
    alignItems: 'center',
    marginBottom: 20,
  },
  licensePlateLabel: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 5,
  },
  licensePlateText: {
    color: '#fff',
    fontSize: 24,
    fontWeight: 'bold',
    letterSpacing: 2,
    fontFamily: 'monospace',
  },
  section: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 12,
    paddingBottom: 5,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  label: {
    fontSize: 14,
    color: '#666',
    fontWeight: '500',
    flex: 1,
  },
  value: {
    fontSize: 14,
    color: '#333',
    fontWeight: '600',
    flex: 2,
    textAlign: 'right',
  },
  photoContainer: {
    marginBottom: 15,
  },
  photoLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  photo: {
    width: '100%',
    height: 200,
    borderRadius: 10,
    backgroundColor: '#f0f0f0',
  },
  noPhotosText: {
    fontSize: 14,
    color: '#999',
    textAlign: 'center',
    fontStyle: 'italic',
    paddingVertical: 20,
  },
  statusContainer: {
    backgroundColor: '#e8f5e8',
    borderRadius: 10,
    padding: 15,
    alignItems: 'center',
    marginBottom: 10,
  },
  statusBadge: {
    backgroundColor: '#28a745',
    paddingHorizontal: 15,
    paddingVertical: 8,
    borderRadius: 20,
    marginBottom: 8,
  },
  statusText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
    letterSpacing: 1,
  },
  statusSubtext: {
    fontSize: 12,
    color: '#28a745',
    textAlign: 'center',
    fontWeight: '500',
  },
  actionButtons: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    paddingVertical: 15,
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
    backgroundColor: '#f8f9fa',
    borderBottomLeftRadius: 15,
    borderBottomRightRadius: 15,
  },
  editButton: {
    flex: 1,
    backgroundColor: '#4a90e2',
    paddingVertical: 12,
    borderRadius: 8,
    marginRight: 10,
    alignItems: 'center',
  },
  editButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: 'bold',
  },
  closeActionButton: {
    flex: 1,
    backgroundColor: '#6c757d',
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  closeActionButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: 'bold',
  },
});

export default VehicleDetailsModal;