import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated, Dimensions } from 'react-native';

const screenWidth = Dimensions.get('window').width;

const COLORS = {
  primary: '#4a90e2',
  light: '#f8f9fa',
  border: '#e9ecef',
  muted: '#6c757d',
  background: '#ffffff',
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
  headerSkeleton: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  titleSkeleton: {
    width: '60%',
    height: 24,
    backgroundColor: COLORS.light,
    borderRadius: 4,
    overflow: 'hidden',
  },
  iconSkeleton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: COLORS.light,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingIcon: {
    fontSize: 20,
    opacity: 0.7,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  statCardSkeleton: {
    width: '48%',
    backgroundColor: COLORS.light,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    alignItems: 'center',
  },
  statIconSkeleton: {
    width: 24,
    height: 24,
    backgroundColor: COLORS.border,
    borderRadius: 4,
    marginBottom: 8,
    overflow: 'hidden',
  },
  statValueSkeleton: {
    width: '60%',
    height: 20,
    backgroundColor: COLORS.border,
    borderRadius: 4,
    marginBottom: 4,
    overflow: 'hidden',
  },
  statLabelSkeleton: {
    width: '40%',
    height: 12,
    backgroundColor: COLORS.border,
    borderRadius: 4,
    overflow: 'hidden',
  },
  shimmerOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(255, 255, 255, 0.8)',
    opacity: 0.5,
  },
  loadingTextContainer: {
    alignItems: 'center',
    paddingVertical: 20,
  },
  loadingText: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.primary,
    marginBottom: 4,
  },
  loadingSubtext: {
    fontSize: 14,
    color: COLORS.muted,
  },
});

export default LoadingStats;

