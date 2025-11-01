import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Dimensions,
  Animated,
  RefreshControl,
} from 'react-native';
import { BarChart, PieChart, LineChart } from 'react-native-chart-kit';
import { LinearGradient } from 'expo-linear-gradient';
import { useAuth } from '@clerk/clerk-expo';
import { API_BASE_URL } from '../../config';
import * as Haptics from 'expo-haptics';

const screenWidth = Dimensions.get('window').width;

// Modern color palette
const COLORS = {
  primary: '#6366f1',
  secondary: '#10b981',
  accent: '#f59e0b',
  danger: '#ef4444',
  info: '#8b5cf6',
  success: '#22c55e',
  warning: '#f97316',
  light: '#f8fafc',
  dark: '#1e293b',
  muted: '#64748b',
  background: '#ffffff',
  surface: '#f8fafc',
  border: '#e2e8f0',
  cardBg: '#ffffff',
};

const CHART_COLORS = [
  '#6366f1', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6',
  '#22c55e', '#f97316', '#06b6d4', '#ec4899', '#14b8a6'
];

const DetailedStatistics = () => {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState('overview');
  const [fadeAnim] = useState(new Animated.Value(0));
  const { getToken } = useAuth();

  useEffect(() => {
    fetchDetailedStats();
  }, []);

  useEffect(() => {
    if (stats) {
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 600,
        useNativeDriver: true,
      }).start();
    }
  }, [stats]);

  const fetchDetailedStats = async () => {
    try {
      setError(null);
      const token = await getToken();
      if (!token) {
        throw new Error('Authentication required');
      }

      const response = await fetch(`${API_BASE_URL}/statistics/detailed`, {
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
      console.error('Error fetching detailed stats:', error);
      setError(error.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleRefresh = () => {
    setRefreshing(true);
    fetchDetailedStats();
  };

  const handleTabPress = (tab) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setActiveTab(tab);
  };

  // Render loading skeleton
  const renderSkeleton = () => (
    <View style={styles.container}>
      <View style={styles.skeletonHeader}>
        <View style={[styles.skeletonBox, { width: '60%', height: 28 }]} />
        <View style={[styles.skeletonBox, { width: '30%', height: 20 }]} />
      </View>
      <View style={styles.skeletonGrid}>
        {[1, 2, 3, 4].map((_, i) => (
          <View key={i} style={styles.skeletonCard} />
        ))}
      </View>
    </View>
  );

  // Render error state
  const renderError = () => (
    <View style={styles.errorContainer}>
      <Text style={styles.errorIcon}>⚠️</Text>
      <Text style={styles.errorTitle}>Failed to Load Statistics</Text>
      <Text style={styles.errorMessage}>{error}</Text>
      <TouchableOpacity style={styles.retryButton} onPress={fetchDetailedStats}>
        <Text style={styles.retryButtonText}>Retry</Text>
      </TouchableOpacity>
    </View>
  );

  // Render overview cards
  const renderOverviewCards = () => {
    if (!stats) return null;

    const cards = [
      {
        title: 'Total Registered Users',
        value: stats.users.total,
        subtitle: `${stats.users.registered} active`,
        icon: '👥',
        gradient: ['#6366f1', '#8b5cf6'],
        change: stats.users.pending > 0 ? `+${stats.users.pending} pending` : 'All active',
      },
      {
        title: 'Total Students',
        value: stats.users.students,
        subtitle: `${stats.vehicles.students} with vehicles`,
        icon: '🎓',
        gradient: ['#10b981', '#059669'],
        change: `${((stats.vehicles.students / stats.users.students) * 100).toFixed(0)}% registered`,
      },
      {
        title: 'Total Staff',
        value: stats.users.staff,
        subtitle: `${stats.vehicles.staff} with vehicles`,
        icon: '👨‍🏫',
        gradient: ['#f59e0b', '#d97706'],
        change: `${((stats.vehicles.staff / stats.users.staff) * 100).toFixed(0)}% registered`,
      },
      {
        title: 'Vehicle Registration Rate',
        value: `${stats.insights.registrationRate}%`,
        subtitle: `${stats.vehicles.total} vehicles`,
        icon: '🚗',
        gradient: ['#ef4444', '#dc2626'],
        change: `${stats.vehicles.recent} recent`,
      },
    ];

    return (
      <View style={styles.cardsGrid}>
        {cards.map((card, index) => (
          <Animated.View
            key={index}
            style={[
              styles.card,
              {
                opacity: fadeAnim,
                transform: [{
                  translateY: fadeAnim.interpolate({
                    inputRange: [0, 1],
                    outputRange: [20, 0],
                  }),
                }],
              },
            ]}
          >
            <LinearGradient
              colors={card.gradient}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.cardGradient}
            >
              <View style={styles.cardHeader}>
                <Text style={styles.cardIcon}>{card.icon}</Text>
                <View style={styles.cardBadge}>
                  <Text style={styles.cardBadgeText}>{card.change}</Text>
                </View>
              </View>
              <Text style={styles.cardValue}>{card.value}</Text>
              <Text style={styles.cardTitle}>{card.title}</Text>
              <Text style={styles.cardSubtitle}>{card.subtitle}</Text>
            </LinearGradient>
          </Animated.View>
        ))}
      </View>
    );
  };

  // Render student branch distribution chart
  const renderBranchChart = () => {
    if (!stats || !stats.users.studentBranches.length) {
      return renderNoData('No branch data available');
    }

    const topBranches = stats.users.studentBranches.slice(0, 10);
    const chartData = {
      labels: topBranches.map(b => {
        const name = b.branch || 'N/A';
        return name.length > 8 ? name.substring(0, 6) + '..' : name;
      }),
      datasets: [{
        data: topBranches.map(b => b.count),
      }]
    };

    return (
      <View style={styles.chartContainer}>
        <View style={styles.chartHeader}>
          <Text style={styles.chartTitle}>📊 Student Distribution by Branch</Text>
          <Text style={styles.chartSubtitle}>Total Students: {stats.users.students}</Text>
        </View>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          <BarChart
            data={chartData}
            width={Math.max(screenWidth - 40, topBranches.length * 60)}
            height={260}
            yAxisLabel=""
            yAxisSuffix=""
            chartConfig={{
              backgroundColor: '#ffffff',
              backgroundGradientFrom: '#ffffff',
              backgroundGradientTo: '#f8fafc',
              decimalPlaces: 0,
              color: (opacity = 1) => `rgba(99, 102, 241, ${opacity})`,
              labelColor: (opacity = 1) => `rgba(30, 41, 59, ${opacity})`,
              style: { borderRadius: 16 },
              barPercentage: 0.7,
              propsForLabels: {
                fontSize: 11,
              },
            }}
            style={styles.chart}
            showValuesOnTopOfBars={true}
            fromZero={true}
          />
        </ScrollView>
        {stats.users.studentBranches.length > 10 && (
          <Text style={styles.chartNote}>
            Showing top 10 of {stats.users.studentBranches.length} branches
          </Text>
        )}
      </View>
    );
  };

  // Render staff department distribution chart
  const renderDepartmentChart = () => {
    if (!stats || !stats.users.staffDepartments.length) {
      return renderNoData('No department data available');
    }

    const topDepartments = stats.users.staffDepartments.slice(0, 8);
    const pieData = topDepartments.map((dept, index) => ({
      name: dept.department && dept.department !== 'Not Specified' 
        ? (dept.department.length > 12 ? dept.department.substring(0, 10) + '..' : dept.department)
        : 'Other',
      population: dept.count,
      color: CHART_COLORS[index % CHART_COLORS.length],
      legendFontColor: COLORS.dark,
      legendFontSize: 12,
    }));

    return (
      <View style={styles.chartContainer}>
        <View style={styles.chartHeader}>
          <Text style={styles.chartTitle}>🏢 Staff Distribution by Department</Text>
          <Text style={styles.chartSubtitle}>Total Staff: {stats.users.staff}</Text>
        </View>
        <PieChart
          data={pieData}
          width={screenWidth - 40}
          height={240}
          chartConfig={{
            color: (opacity = 1) => `rgba(99, 102, 241, ${opacity})`,
          }}
          accessor="population"
          backgroundColor="transparent"
          paddingLeft="15"
          absolute
          style={styles.chart}
        />
      </View>
    );
  };

  // Render vehicle type distribution
  const renderVehicleTypeChart = () => {
    if (!stats) return null;

    const vehicleData = [
      {
        name: '2-Wheeler',
        population: stats.vehicles.twoWheelers,
        color: '#10b981',
        legendFontColor: COLORS.dark,
        legendFontSize: 14,
      },
      {
        name: '4-Wheeler',
        population: stats.vehicles.fourWheelers,
        color: '#f59e0b',
        legendFontColor: COLORS.dark,
        legendFontSize: 14,
      },
    ];

    return (
      <View style={styles.chartContainer}>
        <View style={styles.chartHeader}>
          <Text style={styles.chartTitle}>🚗 Vehicle Type Distribution</Text>
          <Text style={styles.chartSubtitle}>Total Vehicles: {stats.vehicles.total}</Text>
        </View>
        <PieChart
          data={vehicleData}
          width={screenWidth - 40}
          height={220}
          chartConfig={{
            color: (opacity = 1) => `rgba(99, 102, 241, ${opacity})`,
          }}
          accessor="population"
          backgroundColor="transparent"
          paddingLeft="15"
          absolute
          style={styles.chart}
        />
      </View>
    );
  };

  // Render monthly trend chart
  const renderTrendChart = () => {
    if (!stats || !stats.vehicles.monthlyTrend.length) {
      return renderNoData('No trend data available');
    }

    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const chartData = {
      labels: stats.vehicles.monthlyTrend.map(m => monthNames[m.monthNumber - 1] || 'N/A'),
      datasets: [{
        data: stats.vehicles.monthlyTrend.map(m => m.count),
        color: (opacity = 1) => `rgba(99, 102, 241, ${opacity})`,
        strokeWidth: 3,
      }]
    };

    return (
      <View style={styles.chartContainer}>
        <View style={styles.chartHeader}>
          <Text style={styles.chartTitle}>📈 Registration Trend (Last 6 Months)</Text>
          <Text style={styles.chartSubtitle}>
            Total: {stats.vehicles.monthlyTrend.reduce((sum, m) => sum + m.count, 0)} registrations
          </Text>
        </View>
        <LineChart
          data={chartData}
          width={screenWidth - 40}
          height={240}
          chartConfig={{
            backgroundColor: '#ffffff',
            backgroundGradientFrom: '#ffffff',
            backgroundGradientTo: '#f8fafc',
            decimalPlaces: 0,
            color: (opacity = 1) => `rgba(99, 102, 241, ${opacity})`,
            labelColor: (opacity = 1) => `rgba(30, 41, 59, ${opacity})`,
            style: { borderRadius: 16 },
            propsForDots: {
              r: "6",
              strokeWidth: "2",
              stroke: COLORS.primary,
            },
          }}
          bezier
          style={styles.chart}
        />
      </View>
    );
  };

  // Render detailed breakdown table
  const renderDetailedBreakdown = () => {
    if (!stats) return null;

    return (
      <View style={styles.tableContainer}>
        <Text style={styles.tableTitle}>📋 Detailed Branch/Department Breakdown</Text>
        
        {/* Student Branches */}
        <View style={styles.tableSection}>
          <Text style={styles.tableSectionTitle}>Student Branches</Text>
          <View style={styles.tableHeader}>
            <Text style={[styles.tableHeaderText, { flex: 2 }]}>Branch</Text>
            <Text style={styles.tableHeaderText}>Total</Text>
            <Text style={styles.tableHeaderText}>2W</Text>
            <Text style={styles.tableHeaderText}>4W</Text>
          </View>
          {stats.insights.branchDetails.map((branch, index) => (
            <View key={index} style={styles.tableRow}>
              <Text style={[styles.tableCell, { flex: 2 }]} numberOfLines={1}>
                {branch.branch}
              </Text>
              <Text style={[styles.tableCell, styles.tableCellBold]}>
                {branch.totalVehicles}
              </Text>
              <Text style={styles.tableCell}>{branch.twoWheelers}</Text>
              <Text style={styles.tableCell}>{branch.fourWheelers}</Text>
            </View>
          ))}
        </View>

        {/* Staff Departments */}
        <View style={styles.tableSection}>
          <Text style={styles.tableSectionTitle}>Staff Departments</Text>
          <View style={styles.tableHeader}>
            <Text style={[styles.tableHeaderText, { flex: 2 }]}>Department</Text>
            <Text style={styles.tableHeaderText}>Total</Text>
            <Text style={styles.tableHeaderText}>2W</Text>
            <Text style={styles.tableHeaderText}>4W</Text>
          </View>
          {stats.insights.departmentDetails.map((dept, index) => (
            <View key={index} style={styles.tableRow}>
              <Text style={[styles.tableCell, { flex: 2 }]} numberOfLines={1}>
                {dept.department}
              </Text>
              <Text style={[styles.tableCell, styles.tableCellBold]}>
                {dept.totalVehicles}
              </Text>
              <Text style={styles.tableCell}>{dept.twoWheelers}</Text>
              <Text style={styles.tableCell}>{dept.fourWheelers}</Text>
            </View>
          ))}
        </View>
      </View>
    );
  };

  const renderNoData = (message) => (
    <View style={styles.noDataContainer}>
      <Text style={styles.noDataText}>{message}</Text>
    </View>
  );

  if (loading && !stats) return renderSkeleton();
  if (error) return renderError();
  if (!stats) return renderNoData('No data available');

  return (
    <ScrollView
      style={styles.container}
      showsVerticalScrollIndicator={false}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} colors={[COLORS.primary]} />
      }
    >
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.headerTitle}>📊 Detailed Statistics</Text>
          <Text style={styles.headerSubtitle}>
            Comprehensive analysis of registered users and vehicles
          </Text>
        </View>
      </View>

      {/* Overview Cards */}
      {renderOverviewCards()}

      {/* Tab Navigation */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.tabs}
        contentContainerStyle={styles.tabsContent}
      >
        {[
          { key: 'overview', label: 'Overview', icon: '📈' },
          { key: 'branches', label: 'Branches', icon: '🏫' },
          { key: 'departments', label: 'Departments', icon: '🏢' },
          { key: 'vehicles', label: 'Vehicles', icon: '🚗' },
          { key: 'breakdown', label: 'Breakdown', icon: '📋' },
        ].map((tab) => (
          <TouchableOpacity
            key={tab.key}
            style={[styles.tab, activeTab === tab.key && styles.tabActive]}
            onPress={() => handleTabPress(tab.key)}
          >
            <Text style={styles.tabIcon}>{tab.icon}</Text>
            <Text style={[styles.tabText, activeTab === tab.key && styles.tabTextActive]}>
              {tab.label}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Content based on active tab */}
      <View style={styles.content}>
        {activeTab === 'overview' && (
          <>
            {renderTrendChart()}
            {renderVehicleTypeChart()}
          </>
        )}
        {activeTab === 'branches' && renderBranchChart()}
        {activeTab === 'departments' && renderDepartmentChart()}
        {activeTab === 'vehicles' && (
          <>
            {renderVehicleTypeChart()}
            {renderTrendChart()}
          </>
        )}
        {activeTab === 'breakdown' && renderDetailedBreakdown()}
      </View>

      <View style={{ height: 40 }} />
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.light,
  },
  header: {
    padding: 20,
    paddingBottom: 16,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '800',
    color: COLORS.dark,
    marginBottom: 4,
  },
  headerSubtitle: {
    fontSize: 14,
    color: COLORS.muted,
    lineHeight: 20,
  },
  cardsGrid: {
    paddingHorizontal: 16,
    gap: 16,
    marginBottom: 16,
  },
  card: {
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
    marginBottom: 4,
  },
  cardGradient: {
    padding: 20,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  cardIcon: {
    fontSize: 32,
  },
  cardBadge: {
    backgroundColor: 'rgba(255, 255, 255, 0.25)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  cardBadgeText: {
    color: '#ffffff',
    fontSize: 11,
    fontWeight: '600',
  },
  cardValue: {
    fontSize: 36,
    fontWeight: '900',
    color: '#ffffff',
    marginBottom: 4,
  },
  cardTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: 'rgba(255, 255, 255, 0.95)',
    marginBottom: 4,
  },
  cardSubtitle: {
    fontSize: 13,
    color: 'rgba(255, 255, 255, 0.75)',
  },
  tabs: {
    marginTop: 8,
    maxHeight: 56,
  },
  tabsContent: {
    paddingHorizontal: 16,
    gap: 8,
  },
  tab: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 12,
    backgroundColor: COLORS.background,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  tabActive: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  tabIcon: {
    fontSize: 18,
    marginRight: 6,
  },
  tabText: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.dark,
  },
  tabTextActive: {
    color: COLORS.background,
  },
  content: {
    paddingTop: 16,
  },
  chartContainer: {
    backgroundColor: COLORS.cardBg,
    borderRadius: 16,
    padding: 16,
    marginHorizontal: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  chartHeader: {
    marginBottom: 16,
  },
  chartTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: COLORS.dark,
    marginBottom: 4,
  },
  chartSubtitle: {
    fontSize: 13,
    color: COLORS.muted,
  },
  chart: {
    borderRadius: 12,
    marginVertical: 8,
  },
  chartNote: {
    fontSize: 11,
    color: COLORS.muted,
    textAlign: 'center',
    marginTop: 8,
    fontStyle: 'italic',
  },
  tableContainer: {
    backgroundColor: COLORS.cardBg,
    borderRadius: 16,
    padding: 16,
    marginHorizontal: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  tableTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.dark,
    marginBottom: 16,
  },
  tableSection: {
    marginBottom: 24,
  },
  tableSectionTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: COLORS.primary,
    marginBottom: 12,
  },
  tableHeader: {
    flexDirection: 'row',
    paddingVertical: 10,
    paddingHorizontal: 12,
    backgroundColor: COLORS.surface,
    borderRadius: 8,
    marginBottom: 4,
  },
  tableHeaderText: {
    flex: 1,
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.dark,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  tableRow: {
    flexDirection: 'row',
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  tableCell: {
    flex: 1,
    fontSize: 13,
    color: COLORS.dark,
  },
  tableCellBold: {
    fontWeight: '700',
    color: COLORS.primary,
  },
  noDataContainer: {
    padding: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  noDataText: {
    fontSize: 15,
    color: COLORS.muted,
    textAlign: 'center',
  },
  errorContainer: {
    flex: 1,
    padding: 40,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.light,
  },
  errorIcon: {
    fontSize: 48,
    marginBottom: 16,
  },
  errorTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.dark,
    marginBottom: 8,
  },
  errorMessage: {
    fontSize: 14,
    color: COLORS.muted,
    textAlign: 'center',
    marginBottom: 24,
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
  skeletonHeader: {
    padding: 20,
  },
  skeletonBox: {
    backgroundColor: COLORS.border,
    borderRadius: 8,
    marginBottom: 12,
  },
  skeletonGrid: {
    paddingHorizontal: 16,
    gap: 16,
  },
  skeletonCard: {
    height: 150,
    backgroundColor: COLORS.border,
    borderRadius: 16,
  },
});

export default DetailedStatistics;
