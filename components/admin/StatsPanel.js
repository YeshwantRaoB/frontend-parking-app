import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  ScrollView,
  TouchableOpacity,
  Dimensions,
  Animated,
} from 'react-native';
import { BarChart, PieChart, LineChart } from 'react-native-chart-kit';
import { useAuth } from '@clerk/clerk-expo';
import { API_BASE_URL } from '../../config';
import ErrorStats from './ErrorStats';
import * as Haptics from 'expo-haptics';

const screenWidth = Dimensions.get('window').width;

// Color palette for modern professional look
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

// Chart color schemes
const CHART_COLORS = [
  '#4a90e2', '#28a745', '#ff6b35', '#ffc107', '#dc3545', 
  '#17a2b8', '#6f42c1', '#e83e8c', '#20c997', '#fd7e14'
];

const StatsPanel = ({ onFilterSelect, activeFilter }) => {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedChart, setSelectedChart] = useState('overview');
  const [fadeAnim] = useState(new Animated.Value(0));
  const { getToken } = useAuth();

  useEffect(() => {
    fetchStats();
  }, []);

  useEffect(() => {
    if (stats) {
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 500,
        useNativeDriver: true,
      }).start();
    }
  }, [stats]);

  const fetchStats = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const token = await getToken();
      if (!token) {
        throw new Error('No authentication token available');
      }

      const response = await fetch(`${API_BASE_URL}/vehicles/stats`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to fetch statistics');
      }

      const data = await response.json();
      setStats(data);
    } catch (error) {
      console.error('Error fetching stats:', error);
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = () => {
    fetchStats();
  };

  const handleChartPress = (data, index) => {
    if (onFilterSelect && data) {
      // Haptic feedback for chart interaction
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      
      // Handle different chart interactions
      if (selectedChart === 'designations') {
        onFilterSelect('designation', data.designation);
      } else if (selectedChart === 'branches') {
        onFilterSelect('branch', data.branch);
      }
    }
  };

  const renderSkeletonLoader = () => (
    <View style={styles.skeletonContainer}>
      <View style={styles.skeletonHeader}>
        <View style={[styles.skeletonBox, { width: '60%', height: 24 }]} />
        <View style={[styles.skeletonBox, { width: '30%', height: 20 }]} />
      </View>
      <View style={styles.skeletonChart} />
      <View style={styles.skeletonStats}>
        {[1, 2, 3].map((_, i) => (
          <View key={i} style={styles.skeletonStatItem}>
            <View style={[styles.skeletonBox, { width: '40%', height: 16 }]} />
            <View style={[styles.skeletonBox, { width: '20%', height: 20 }]} />
          </View>
        ))}
      </View>
    </View>
  );

  const renderOverviewStats = () => {
    if (!stats) return null;

    const quickStats = [
      { 
        label: 'Total Vehicles', 
        value: stats.total, 
        icon: '🚗', 
        color: COLORS.primary,
        onPress: () => onFilterSelect && onFilterSelect('clear')
      },
      { 
        label: 'Students', 
        value: stats.designations.find(d => d.designation === 'Student')?.count || 0, 
        icon: '🎓', 
        color: COLORS.secondary,
        onPress: () => onFilterSelect && onFilterSelect('designation', 'Student')
      },
      { 
        label: 'Staff', 
        value: stats.designations.find(d => d.designation === 'Staff')?.count || 0, 
        icon: '👨‍🏫', 
        color: COLORS.accent,
        onPress: () => onFilterSelect && onFilterSelect('designation', 'Staff')
      },
      { 
        label: 'Recent (30d)', 
        value: stats.recentCount, 
        icon: '📅', 
        color: COLORS.info,
        onPress: () => onFilterSelect && onFilterSelect('recent')
      },
    ];

    return (
      <View style={styles.overviewContainer}>
        <View style={styles.quickStatsGrid}>
          {quickStats.map((stat, index) => (
            <TouchableOpacity
              key={index}
              style={[
                styles.statCard,
                activeFilter && activeFilter.type === 'designation' && 
                activeFilter.value === (stat.label === 'Students' ? 'Student' : stat.label === 'Staff' ? 'Staff' : null) && 
                styles.statCardActive
              ]}
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                stat.onPress && stat.onPress();
              }}
              activeOpacity={0.7}
            >
              <View style={styles.statCardHeader}>
                <Text style={styles.statIcon}>{stat.icon}</Text>
                <View style={[styles.statIndicator, { backgroundColor: stat.color }]} />
              </View>
              <Text style={styles.statValue}>{stat.value}</Text>
              <Text style={styles.statLabel}>{stat.label}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>
    );
  };

  const renderDesignationChart = () => {
    console.log('📊 [renderDesignationChart] Checking stats:', stats);
    console.log('📊 [renderDesignationChart] Designations:', stats?.designations);
    
    if (!stats || !stats.designations || !Array.isArray(stats.designations)) {
      console.warn('📊 [renderDesignationChart] No valid designations data');
      return (
        <View style={styles.chartContainer}>
          <Text style={styles.chartTitle}>Vehicle Distribution by Designation</Text>
          <View style={styles.noDataContainer}>
            <Text style={styles.noDataText}>No designation data available</Text>
            <Text style={styles.noDataSubtext}>Register some vehicles to see statistics</Text>
          </View>
        </View>
      );
    }
    
    if (stats.designations.length === 0) {
      console.warn('📊 [renderDesignationChart] Empty designations array');
      return (
        <View style={styles.chartContainer}>
          <Text style={styles.chartTitle}>Vehicle Distribution by Designation</Text>
          <View style={styles.noDataContainer}>
            <Text style={styles.noDataText}>No vehicles registered yet</Text>
          </View>
        </View>
      );
    }

    const chartData = {
      labels: stats.designations.map(d => d.designation),
      datasets: [{
        data: stats.designations.map(d => d.count)
      }]
    };
    
    console.log('📊 [renderDesignationChart] Chart data:', chartData);

    return (
      <View style={styles.chartContainer}>
        <Text style={styles.chartTitle}>Vehicle Distribution by Designation</Text>
        <BarChart
          data={chartData}
          width={screenWidth - 32}
          height={220}
          chartConfig={{
            backgroundColor: COLORS.background,
            backgroundGradientFrom: COLORS.background,
            backgroundGradientTo: COLORS.background,
            decimalPlaces: 0,
            color: (opacity = 1) => `rgba(74, 144, 226, ${opacity})`,
            labelColor: (opacity = 1) => `rgba(52, 58, 64, ${opacity})`,
            style: {
              borderRadius: 16,
            },
            propsForDots: {
              r: "6",
              strokeWidth: "2",
              stroke: COLORS.primary
            },
            propsForBackgroundLines: {
              strokeDasharray: "", // solid background lines
            },
          }}
          style={styles.chart}
          showValuesOnTopOfBars={true}
          fromZero={true}
        />
      </View>
    );
  };

  const renderBranchChart = () => {
    console.log('📊 [renderBranchChart] Checking stats:', stats);
    console.log('📊 [renderBranchChart] Branches:', stats?.branches);
    
    if (!stats || !stats.branches || !Array.isArray(stats.branches)) {
      console.warn('📊 [renderBranchChart] No valid branches data');
      return (
        <View style={styles.chartContainer}>
          <Text style={styles.chartTitle}>Student Distribution by Branch</Text>
          <View style={styles.noDataContainer}>
            <Text style={styles.noDataText}>No branch data available</Text>
            <Text style={styles.noDataSubtext}>Register some students to see branch distribution</Text>
          </View>
        </View>
      );
    }
    
    if (stats.branches.length === 0) {
      console.warn('📊 [renderBranchChart] Empty branches array');
      return (
        <View style={styles.chartContainer}>
          <Text style={styles.chartTitle}>Student Distribution by Branch</Text>
          <View style={styles.noDataContainer}>
            <Text style={styles.noDataText}>No students registered yet</Text>
          </View>
        </View>
      );
    }

    // Prepare data for pie chart
    const pieData = stats.branches.slice(0, 8).map((branch, index) => ({
      name: branch.branch.length > 15 ? branch.branch.substring(0, 12) + '...' : branch.branch,
      population: branch.count,
      color: CHART_COLORS[index % CHART_COLORS.length],
      legendFontColor: COLORS.dark,
      legendFontSize: 12,
      branch: branch.branch, // Keep full name for filtering
    }));

    return (
      <View style={styles.chartContainer}>
        <Text style={styles.chartTitle}>Student Distribution by Branch</Text>
        <PieChart
          data={pieData}
          width={screenWidth - 32}
          height={220}
          chartConfig={{
            backgroundColor: COLORS.background,
            backgroundGradientFrom: COLORS.background,
            backgroundGradientTo: COLORS.background,
            color: (opacity = 1) => `rgba(74, 144, 226, ${opacity})`,
            labelColor: (opacity = 1) => `rgba(52, 58, 64, ${opacity})`,
          }}
          accessor="population"
          backgroundColor="transparent"
          paddingLeft="15"
          absolute
          style={styles.chart}
          onDataPointPress={(data) => handleChartPress(data, data.index)}
        />
        {stats.branches.length > 8 && (
          <Text style={styles.chartNote}>
            Showing top 8 branches. Total branches: {stats.branches.length}
          </Text>
        )}
      </View>
    );
  };

  const renderTrendChart = () => {
    console.log('📊 [renderTrendChart] Checking stats:', stats);
    console.log('📊 [renderTrendChart] Monthly trend:', stats?.monthlyTrend);
    
    if (!stats || !stats.monthlyTrend || !Array.isArray(stats.monthlyTrend)) {
      console.warn('📊 [renderTrendChart] No valid monthly trend data');
      return (
        <View style={styles.chartContainer}>
          <Text style={styles.chartTitle}>Registration Trend (Last 6 Months)</Text>
          <View style={styles.noDataContainer}>
            <Text style={styles.noDataText}>No trend data available</Text>
            <Text style={styles.noDataSubtext}>Registration history will appear here</Text>
          </View>
        </View>
      );
    }
    
    if (stats.monthlyTrend.length === 0) {
      console.warn('📊 [renderTrendChart] Empty monthly trend array');
      return (
        <View style={styles.chartContainer}>
          <Text style={styles.chartTitle}>Registration Trend (Last 6 Months)</Text>
          <View style={styles.noDataContainer}>
            <Text style={styles.noDataText}>No registrations in the last 6 months</Text>
          </View>
        </View>
      );
    }

    const chartData = {
      labels: stats.monthlyTrend.map(m => m.month.split('-')[1]), // Show only month
      datasets: [{
        data: stats.monthlyTrend.map(m => m.count),
        color: (opacity = 1) => `rgba(74, 144, 226, ${opacity})`,
        strokeWidth: 3
      }]
    };

    return (
      <View style={styles.chartContainer}>
        <Text style={styles.chartTitle}>Registration Trend (Last 6 Months)</Text>
        <LineChart
          data={chartData}
          width={screenWidth - 32}
          height={220}
          chartConfig={{
            backgroundColor: COLORS.background,
            backgroundGradientFrom: COLORS.background,
            backgroundGradientTo: COLORS.background,
            decimalPlaces: 0,
            color: (opacity = 1) => `rgba(74, 144, 226, ${opacity})`,
            labelColor: (opacity = 1) => `rgba(52, 58, 64, ${opacity})`,
            style: {
              borderRadius: 16,
            },
            propsForDots: {
              r: "6",
              strokeWidth: "2",
              stroke: COLORS.primary
            },
          }}
          bezier
          style={styles.chart}
        />
      </View>
    );
  };

  if (loading) {
    return renderSkeletonLoader();
  }

  if (error) {
    return <ErrorStats error={error} onRetry={handleRefresh} />;
  }

  return (
    <Animated.View style={[styles.container, { opacity: fadeAnim }]}>
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Text style={styles.title}>📊 Dashboard Statistics</Text>
          <Text style={styles.subtitle}>Live vehicle registration data</Text>
        </View>
        <TouchableOpacity style={styles.refreshButton} onPress={handleRefresh}>
          <Text style={styles.refreshIcon}>🔄</Text>
        </TouchableOpacity>
      </View>

      {/* Chart Navigation */}
      <ScrollView 
        horizontal 
        showsHorizontalScrollIndicator={false} 
        style={styles.chartTabs}
        contentContainerStyle={styles.chartTabsContent}
      >
        {[
          { key: 'overview', label: 'Overview', icon: '📈' },
          { key: 'designations', label: 'Roles', icon: '👥' },
          { key: 'branches', label: 'Branches', icon: '🏢' },
          { key: 'trend', label: 'Trend', icon: '📊' },
        ].map((tab) => (
          <TouchableOpacity
            key={tab.key}
            style={[
              styles.chartTab,
              selectedChart === tab.key && styles.chartTabActive
            ]}
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              setSelectedChart(tab.key);
            }}
          >
            <Text style={styles.chartTabIcon}>{tab.icon}</Text>
            <Text style={[
              styles.chartTabText,
              selectedChart === tab.key && styles.chartTabTextActive
            ]}>
              {tab.label}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Chart Content */}
      <ScrollView 
        style={styles.chartsContainer}
        showsVerticalScrollIndicator={false}
      >
        {selectedChart === 'overview' && renderOverviewStats()}
        {selectedChart === 'designations' && renderDesignationChart()}
        {selectedChart === 'branches' && renderBranchChart()}
        {selectedChart === 'trend' && renderTrendChart()}
      </ScrollView>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: COLORS.background,
    borderRadius: 16,
    margin: 16,
    marginTop: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    padding: 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  headerLeft: {
    flex: 1,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: COLORS.dark,
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 14,
    color: COLORS.muted,
  },
  refreshButton: {
    padding: 8,
    borderRadius: 8,
    backgroundColor: COLORS.light,
  },
  refreshIcon: {
    fontSize: 18,
  },
  chartTabs: {
    maxHeight: 60,
  },
  chartTabsContent: {
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  chartTab: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: COLORS.light,
    marginRight: 8,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  chartTabActive: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  chartTabIcon: {
    fontSize: 16,
    marginRight: 6,
  },
  chartTabText: {
    fontSize: 14,
    fontWeight: '500',
    color: COLORS.dark,
  },
  chartTabTextActive: {
    color: COLORS.background,
    fontWeight: '600',
  },
  chartsContainer: {
    flex: 1,
  },
  overviewContainer: {
    padding: 16,
  },
  quickStatsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  statCard: {
    width: '48%',
    backgroundColor: COLORS.surface,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  statCardActive: {
    borderColor: COLORS.primary,
    borderWidth: 2,
    backgroundColor: '#f0f7ff',
  },
  statCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  statIcon: {
    fontSize: 24,
  },
  statIndicator: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  statValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: COLORS.dark,
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    color: COLORS.muted,
    fontWeight: '500',
  },
  chartContainer: {
    padding: 16,
  },
  chartTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.dark,
    marginBottom: 16,
    textAlign: 'center',
  },
  chart: {
    borderRadius: 16,
    marginVertical: 8,
  },
  chartNote: {
    fontSize: 12,
    color: COLORS.muted,
    textAlign: 'center',
    marginTop: 8,
    fontStyle: 'italic',
  },
  // No data container styles
  noDataContainer: {
    padding: 40,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.light,
    borderRadius: 12,
    marginVertical: 8,
  },
  noDataText: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.muted,
    marginBottom: 8,
    textAlign: 'center',
  },
  noDataSubtext: {
    fontSize: 14,
    color: COLORS.muted,
    textAlign: 'center',
    lineHeight: 20,
  },
  // Skeleton loader styles
  skeletonContainer: {
    backgroundColor: COLORS.background,
    borderRadius: 16,
    margin: 16,
    marginTop: 8,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  skeletonHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  skeletonBox: {
    backgroundColor: COLORS.light,
    borderRadius: 4,
  },
  skeletonChart: {
    height: 200,
    backgroundColor: COLORS.light,
    borderRadius: 12,
    marginBottom: 20,
  },
  skeletonStats: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  skeletonStatItem: {
    flex: 1,
    alignItems: 'center',
    gap: 8,
  },
  // Error states
  errorContainer: {
    backgroundColor: COLORS.background,
    borderRadius: 16,
    margin: 16,
    marginTop: 8,
    padding: 40,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  errorIcon: {
    fontSize: 48,
    marginBottom: 16,
  },
  errorTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: COLORS.dark,
    marginBottom: 8,
    textAlign: 'center',
  },
  errorMessage: {
    fontSize: 14,
    color: COLORS.muted,
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 20,
  },
  retryButton: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  retryButtonText: {
    color: COLORS.background,
    fontSize: 14,
    fontWeight: '600',
  },
});

export default StatsPanel;
