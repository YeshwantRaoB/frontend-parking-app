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
  primary: '#6366f1',
  secondary: '#10b981',
  accent: '#f59e0b',
  warning: '#f59e0b',
  danger: '#ef4444',
  info: '#8b5cf6',
  light: '#f8fafc',
  dark: '#1e293b',
  muted: '#64748b',
  background: '#ffffff',
  surface: '#f8fafc',
  border: '#e2e8f0',
  gradient: ['#6366f1', '#8b5cf6'],
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
    paddingHorizontal: 20,
    paddingVertical: 12,
    gap: 12,
  },
  statCard: {
    flex: 1,
    backgroundColor: COLORS.background,
    borderRadius: 16,
    padding: 16,
    borderLeftWidth: 5,
    borderLeftColor: COLORS.primary,
    shadowColor: '#6366f1',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 4,
    position: 'relative',
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  statCardActive: {
    backgroundColor: '#fefbff',
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 6,
    borderColor: COLORS.primary,
    transform: [{ scale: 1.02 }],
  },
  statContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  statIcon: {
    fontSize: 24,
    marginRight: 12,
  },
  statInfo: {
    flex: 1,
    alignItems: 'flex-end',
  },
  statValue: {
    fontSize: 20,
    fontWeight: '800',
    color: COLORS.dark,
    lineHeight: 24,
    letterSpacing: 0.5,
  },
  statValueActive: {
    color: COLORS.primary,
  },
  statLabel: {
    fontSize: 12,
    color: COLORS.muted,
    fontWeight: '600',
    marginTop: 4,
    letterSpacing: 0.3,
    textTransform: 'uppercase',
  },
  statLabelActive: {
    color: COLORS.primary,
    fontWeight: '700',
  },
  activeIndicator: {
    position: 'absolute',
    top: 12,
    right: 12,
    width: 8,
    height: 8,
    borderRadius: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
    elevation: 2,
  },
  // Skeleton loader
  skeletonCard: {
    flex: 1,
    backgroundColor: COLORS.light,
    borderRadius: 16,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.border,
    shadowColor: '#6366f1',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 3,
  },
  skeletonIcon: {
    width: 24,
    height: 24,
    backgroundColor: COLORS.border,
    borderRadius: 6,
    marginRight: 12,
  },
  skeletonText: {
    flex: 1,
    height: 14,
    backgroundColor: COLORS.border,
    borderRadius: 6,
  },
});

export default StatsOverview;
