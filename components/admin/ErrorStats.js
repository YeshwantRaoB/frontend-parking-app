import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Animated } from 'react-native';

const COLORS = {
  primary: '#4a90e2',
  danger: '#dc3545',
  warning: '#ffc107',
  light: '#f8f9fa',
  dark: '#343a40',
  muted: '#6c757d',
  background: '#ffffff',
};

/**
 * Beautiful error state component for stats
 */
const ErrorStats = ({ error, onRetry, style }) => {
  const getErrorIcon = (errorMessage) => {
    if (errorMessage?.toLowerCase().includes('network')) return '📡';
    if (errorMessage?.toLowerCase().includes('unauthorized')) return '🔒';
    if (errorMessage?.toLowerCase().includes('timeout')) return '⏱️';
    return '📊';
  };

  const getErrorTitle = (errorMessage) => {
    if (errorMessage?.toLowerCase().includes('network')) return 'Connection Issue';
    if (errorMessage?.toLowerCase().includes('unauthorized')) return 'Access Denied';
    if (errorMessage?.toLowerCase().includes('timeout')) return 'Request Timeout';
    return 'Unable to Load Statistics';
  };

  const getErrorDescription = (errorMessage) => {
    if (errorMessage?.toLowerCase().includes('network')) {
      return 'Please check your internet connection and try again.';
    }
    if (errorMessage?.toLowerCase().includes('unauthorized')) {
      return 'You may need to sign in again to access statistics.';
    }
    if (errorMessage?.toLowerCase().includes('timeout')) {
      return 'The request took too long. Please try again.';
    }
    return 'We encountered an issue loading the dashboard statistics.';
  };

  return (
    <View style={[styles.container, style]}>
      <View style={styles.errorContent}>
        <Text style={styles.errorIcon}>{getErrorIcon(error)}</Text>
        <Text style={styles.errorTitle}>{getErrorTitle(error)}</Text>
        <Text style={styles.errorDescription}>{getErrorDescription(error)}</Text>
        
        {error && (
          <View style={styles.errorDetails}>
            <Text style={styles.errorDetailsLabel}>Technical Details:</Text>
            <Text style={styles.errorDetailsText}>{error}</Text>
          </View>
        )}

        <TouchableOpacity style={styles.retryButton} onPress={onRetry}>
          <Text style={styles.retryButtonIcon}>🔄</Text>
          <Text style={styles.retryButtonText}>Try Again</Text>
        </TouchableOpacity>

        <View style={styles.helpSection}>
          <Text style={styles.helpTitle}>Need Help?</Text>
          <Text style={styles.helpText}>
            • Check your internet connection{'\n'}
            • Ensure you have admin privileges{'\n'}
            • Contact support if the issue persists
          </Text>
        </View>
      </View>
    </View>
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
    minHeight: 300,
    justifyContent: 'center',
  },
  errorContent: {
    alignItems: 'center',
    padding: 40,
  },
  errorIcon: {
    fontSize: 64,
    marginBottom: 20,
    opacity: 0.8,
  },
  errorTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: COLORS.dark,
    marginBottom: 12,
    textAlign: 'center',
  },
  errorDescription: {
    fontSize: 16,
    color: COLORS.muted,
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 22,
    paddingHorizontal: 20,
  },
  errorDetails: {
    backgroundColor: '#fff3cd',
    borderRadius: 8,
    padding: 16,
    marginBottom: 24,
    width: '100%',
    borderLeftWidth: 4,
    borderLeftColor: COLORS.warning,
  },
  errorDetailsLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#856404',
    marginBottom: 6,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  errorDetailsText: {
    fontSize: 14,
    color: '#856404',
    fontFamily: 'monospace',
    lineHeight: 18,
  },
  retryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.primary,
    paddingHorizontal: 24,
    paddingVertical: 14,
    borderRadius: 12,
    marginBottom: 24,
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 4,
  },
  retryButtonIcon: {
    fontSize: 16,
    marginRight: 8,
  },
  retryButtonText: {
    color: COLORS.background,
    fontSize: 16,
    fontWeight: '600',
  },
  helpSection: {
    backgroundColor: COLORS.light,
    borderRadius: 8,
    padding: 16,
    width: '100%',
    borderWidth: 1,
    borderColor: '#e9ecef',
  },
  helpTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.dark,
    marginBottom: 8,
  },
  helpText: {
    fontSize: 13,
    color: COLORS.muted,
    lineHeight: 18,
  },
});

export default ErrorStats;

