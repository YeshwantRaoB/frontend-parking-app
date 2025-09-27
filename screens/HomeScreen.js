import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { useAuth, useUser } from '@clerk/clerk-expo';
import { Ionicons } from '@expo/vector-icons';

export default function HomeScreen({ navigation }) {
  const { signOut } = useAuth();
  const { user } = useUser();

  const handleSignOut = async () => {
    try {
      await signOut();
    } catch (err) {
      console.error('Sign out error:', err);
    }
  };

  const menuItems = [
    {
      id: 'findParking',
      title: 'Find Parking',
      icon: 'car-sport',
      onPress: () => console.log('Find Parking'),
      color: '#4CAF50'
    },
    {
      id: 'myBookings',
      title: 'My Bookings',
      icon: 'calendar',
      onPress: () => console.log('My Bookings'),
      color: '#2196F3'
    },
    {
      id: 'scanPlate',
      title: 'Scan License Plate',
      icon: 'camera',
      onPress: () => console.log('Scan Plate'),
      color: '#FF9800'
    },
    {
      id: 'history',
      title: 'Parking History',
      icon: 'time',
      onPress: () => console.log('Parking History'),
      color: '#9C27B0'
    },
    {
      id: 'profile',
      title: 'My Profile',
      icon: 'person',
      onPress: () => console.log('My Profile'),
      color: '#607D8B'
    },
  ];

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.welcomeText}>Welcome back,</Text>
        <Text style={styles.userName}>{user?.firstName || 'User'}</Text>
      </View>
      
      <ScrollView style={styles.scrollView}>
        <View style={styles.cardsContainer}>
          <View style={[styles.card, styles.parkingStatusCard]}>
            <View style={styles.cardHeader}>
              <Ionicons name="time" size={24} color="#4CAF50" />
              <Text style={styles.cardTitle}>Current Parking</Text>
            </View>
            <Text style={styles.parkingStatus}>No active parking</Text>
            <TouchableOpacity style={styles.actionButton}>
              <Text style={styles.actionButtonText}>Start Parking</Text>
            </TouchableOpacity>
          </View>

          {menuItems.map((item) => (
            <TouchableOpacity
              key={item.id}
              style={[styles.card, styles.menuCard]}
              onPress={item.onPress}
            >
              <View style={[styles.iconContainer, { backgroundColor: item.color + '22' }]}>
                <Ionicons name={item.icon} size={24} color={item.color} />
              </View>
              <Text style={styles.menuItemText}>{item.title}</Text>
              <Ionicons name="chevron-forward" size={20} color="#999" />
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>

      {/* Bottom Navigation */}
      <View style={styles.bottomNav}>
        <TouchableOpacity style={styles.navButton}>
          <Ionicons name="home" size={24} color="#007AFF" />
          <Text style={styles.navButtonText}>Home</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.navButton}>
          <Ionicons name="map" size={24} color="#999" />
          <Text style={styles.navButtonText}>Map</Text>
        </TouchableOpacity>
        <TouchableOpacity 
          style={styles.navButton}
          onPress={handleSignOut}
        >
          <Ionicons name="log-out" size={24} color="#FF3B30" />
          <Text style={[styles.navButtonText, { color: '#FF3B30' }]}>Sign Out</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  header: {
    padding: 20,
    paddingTop: 50,
    backgroundColor: '#fff',
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 20,
    marginBottom: 10,
    elevation: 2,
  },
  welcomeText: {
    fontSize: 18,
    color: '#666',
  },
  userName: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#333',
    marginTop: 5,
  },
  scrollView: {
    flex: 1,
    padding: 15,
  },
  cardsContainer: {
    paddingBottom: 20,
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 20,
    marginBottom: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  parkingStatusCard: {
    alignItems: 'center',
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginLeft: 10,
  },
  parkingStatus: {
    fontSize: 16,
    color: '#666',
    marginVertical: 10,
  },
  actionButton: {
    backgroundColor: '#007AFF',
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 10,
  },
  actionButtonText: {
    color: '#fff',
    fontWeight: '600',
  },
  menuCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 15,
  },
  iconContainer: {
    width: 50,
    height: 50,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 15,
  },
  menuItemText: {
    flex: 1,
    fontSize: 16,
    fontWeight: '500',
    color: '#333',
  },
  bottomNav: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingVertical: 15,
    borderTopWidth: 1,
    borderTopColor: '#eee',
    backgroundColor: '#fff',
  },
  navButton: {
    alignItems: 'center',
  },
  navButtonText: {
    fontSize: 12,
    color: '#999',
    marginTop: 5,
  },
});
