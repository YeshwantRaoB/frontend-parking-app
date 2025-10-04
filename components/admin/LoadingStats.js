import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated, Dimensions } from 'react-native';

const screenWidth = Dimensions.get('window').width;

const COLORS = {
  primary: '#6366f1',
  light: '#f8fafc',
  border: '#e2e8f0',
  muted: '#64748b',
  background: '#ffffff',
  dark: '#1e293b',
};

/**
 * Beautiful animated loading component for stats
 */
const LoadingStats = ({ style }) => {
  const shimmerAnimation = useRef(new Animated.Value(0)).current;
  const pulseAnimation = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    // Shimmer effect
    const shimmer = Animated.loop(
      Animated.sequence([
        Animated.timing(shimmerAnimation, {
          toValue: 1,
          duration: 1500,
          useNativeDriver: true,
        }),
        Animated.timing(shimmerAnimation, {
          toValue: 0,
          duration: 1500,
          useNativeDriver: true,
        }),
      ])
    );

    // Pulse effect
    const pulse = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnimation, {
          toValue: 0.8,
          duration: 1000,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnimation, {
          toValue: 1,
          duration: 1000,
          useNativeDriver: true,
        }),
      ])
    );

    shimmer.start();
    pulse.start();

    return () => {
      shimmer.stop();
      pulse.stop();
    };
  }, []);

  const shimmerTranslateX = shimmerAnimation.interpolate({
    inputRange: [0, 1],
    outputRange: [-screenWidth, screenWidth],
  });

  const ShimmerOverlay = () => (
    <Animated.View
      style={[
        styles.shimmerOverlay,
        {
          transform: [{ translateX: shimmerTranslateX }],
        },
      ]}
    />
  );

  return (
    <View style={[styles.container, style]}>
      {/* Header skeleton */}
      <View style={styles.headerSkeleton}>
        <View style={styles.titleSkeleton}>
          <ShimmerOverlay />
        </View>
        <Animated.View 
          style={[
            styles.iconSkeleton,
            { transform: [{ scale: pulseAnimation }] }
          ]}
        >
          <Text style={styles.loadingIcon}>📊</Text>
        </Animated.View>
      </View>

      {/* Stats grid skeleton */}
      <View style={styles.statsGrid}>
        {[1, 2, 3, 4].map((_, index) => (
          <View key={index} style={styles.statCardSkeleton}>
            <View style={styles.statIconSkeleton}>
              <ShimmerOverlay />
            </View>
            <View style={styles.statValueSkeleton}>
              <ShimmerOverlay />
            </View>
            <View style={styles.statLabelSkeleton}>
              <ShimmerOverlay />
            </View>
          </View>
        ))}
      </View>

      {/* Loading text */}
      <Animated.View 
        style={[
          styles.loadingTextContainer,
          { opacity: pulseAnimation }
        ]}
      >
        <Text style={styles.loadingText}>Loading statistics...</Text>
        <Text style={styles.loadingSubtext}>Analyzing vehicle data</Text>
      </Animated.View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: COLORS.background,
    borderRadius: 20,
    margin: 20,
    marginTop: 12,
    padding: 24,
    shadowColor: '#6366f1',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.12,
    shadowRadius: 12,
    elevation: 6,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  headerSkeleton: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
  },
  titleSkeleton: {
    width: '60%',
    height: 28,
    backgroundColor: COLORS.light,
    borderRadius: 8,
    overflow: 'hidden',
  },
  iconSkeleton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: COLORS.light,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#6366f1',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  loadingIcon: {
    fontSize: 24,
    opacity: 0.8,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginBottom: 24,
  },
  statCardSkeleton: {
    width: '48%',
    backgroundColor: COLORS.light,
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.border,
    shadowColor: '#6366f1',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 3,
  },
  statIconSkeleton: {
    width: 28,
    height: 28,
    backgroundColor: COLORS.border,
    borderRadius: 6,
    marginBottom: 12,
    overflow: 'hidden',
  },
  statValueSkeleton: {
    width: '70%',
    height: 22,
    backgroundColor: COLORS.border,
    borderRadius: 6,
    marginBottom: 6,
    overflow: 'hidden',
  },
  statLabelSkeleton: {
    width: '50%',
    height: 14,
    backgroundColor: COLORS.border,
    borderRadius: 6,
    overflow: 'hidden',
  },
  shimmerOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    opacity: 0.6,
  },
  loadingTextContainer: {
    alignItems: 'center',
    paddingVertical: 24,
  },
  loadingText: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.primary,
    marginBottom: 6,
    letterSpacing: 0.3,
  },
  loadingSubtext: {
    fontSize: 15,
    color: COLORS.muted,
    fontWeight: '500',
    letterSpacing: 0.2,
  },
});

export default LoadingStats;

