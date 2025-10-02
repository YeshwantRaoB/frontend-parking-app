import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Dimensions,
  Animated,
} from 'react-native';
import { useAuth } from '@clerk/clerk-expo';
import { API_BASE_URL } from '../../config';
import LoadingStats from './LoadingStats';
import * as Haptics from 'expo-haptics';

const screenWidth = Dimensions.get('window').width;

const COLORS = {
  primary: '#4a90e2',
  secondary: '#28a745',
  accent: '#ff6b35',
  warning: '#ffc107',
  danger: '#dc3545',
  info: '#17a2b8',
  light: '#f8f9fa',
  dark: '#343a40',
  muted: '#6c757d',
  background: '#ffffff',
  surface: '#f5f7fa',
  border: '#e9ecef',
};

/**
 * Compact stats overview component for the top of AdminScreen
 * Shows key metrics in a horizontal scrollable layout
 */
const StatsOverview = ({ onFilterSelect, activeFilter, style }) => {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [fadeAnim] = useState(new Animated.Value(0));
  const { getToken } = useAuth();

  useEffect(() => {
    fetchStats();
  }, []);

  useEffect(() => {
    if (stats) {
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }).start();
    }
  }, [stats]);

  const fetchStats = async () => {
    try {
      const token = await getToken();
      if (!token) return;

      const response = await fetch(`${API_BASE_URL}/vehicles/stats`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        const data = await response.json();
        setStats(data);
      }
    } catch (error) {
      console.error('Error fetching stats:', error);
    } finally {
      setLoading(false);
    }
  };

  const isFilterActive = (type, value) => {
    return activeFilter && activeFilter.type === type && activeFilter.value === value;
  };

  if (loading) {
    return <LoadingStats style={style} />;
  }

  if (!stats) return null;

  const quickStats = [
    { 
      label: 'Total', 
      value: stats.total, 
      icon: '🚗', 
      color: COLORS.primary,
      onPress: () => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        onFilterSelect && onFilterSelect('clear');
      },
      active: !activeFilter || activeFilter.type === 'clear'
    },
    { 
      label: 'Students', 
      value: stats.designations.find(d => d.designation === 'Student')?.count || 0, 
      icon: '🎓', 
      color: COLORS.secondary,
      onPress: () => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        onFilterSelect && onFilterSelect('designation', 'Student');
      },
      active: isFilterActive('designation', 'Student')
    },
    { 
      label: 'Staff', 
      value: stats.designations.find(d => d.designation === 'Staff')?.count || 0, 
      icon: '👨‍🏫', 
      color: COLORS.accent,
      onPress: () => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        onFilterSelect && onFilterSelect('designation', 'Staff');
      },
      active: isFilterActive('designation', 'Staff')
    },
    { 
      label: 'Recent', 
      value: stats.recentCount, 
      icon: '📅', 
      color: COLORS.info,
      onPress: () => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        onFilterSelect && onFilterSelect('recent');
      },
      active: isFilterActive('recent')
    },
  ];

  return (
    <Animated.View style={[styles.container, style, { opacity: fadeAnim }]}>
      {quickStats.map((stat, index) => (
        <TouchableOpacity
          key={index}
          style={[
            styles.statCard,
            stat.active && styles.statCardActive,
            { borderLeftColor: stat.color }
          ]}
          onPress={stat.onPress}
          activeOpacity={0.7}
        >
          <View style={styles.statContent}>
            <Text style={styles.statIcon}>{stat.icon}</Text>
            <View style={styles.statInfo}>
              <Text style={[styles.statValue, stat.active && styles.statValueActive]}>
                {stat.value}
              </Text>
              <Text style={[styles.statLabel, stat.active && styles.statLabelActive]}>
                {stat.label}
              </Text>
            </View>
          </View>
          {stat.active && <View style={[styles.activeIndicator, { backgroundColor: stat.color }]} />}
        </TouchableOpacity>
      ))}
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 8,
    gap: 8,
  },
  statCard: {
    flex: 1,
    backgroundColor: COLORS.background,
    borderRadius: 12,
    padding: 12,
    borderLeftWidth: 4,
    borderLeftColor: COLORS.primary,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
    position: 'relative',
  },
  statCardActive: {
    backgroundColor: '#f0f7ff',
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 3,
  },
  statContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statIcon: {
    fontSize: 20,
    marginRight: 8,
  },
  statInfo: {
    flex: 1,
  },
  statValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: COLORS.dark,
    lineHeight: 20,
  },
  statValueActive: {
    color: COLORS.primary,
  },
  statLabel: {
    fontSize: 11,
    color: COLORS.muted,
    fontWeight: '500',
    marginTop: 2,
  },
  statLabelActive: {
    color: COLORS.primary,
    fontWeight: '600',
  },
  activeIndicator: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  // Skeleton loader
  skeletonCard: {
    flex: 1,
    backgroundColor: COLORS.light,
    borderRadius: 12,
    padding: 12,
    flexDirection: 'row',
    alignItems: 'center',
  },
  skeletonIcon: {
    width: 20,
    height: 20,
    backgroundColor: COLORS.border,
    borderRadius: 4,
    marginRight: 8,
  },
  skeletonText: {
    flex: 1,
    height: 12,
    backgroundColor: COLORS.border,
    borderRadius: 4,
  },
});

export default StatsOverview;
