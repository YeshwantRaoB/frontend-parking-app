import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Linking, Animated } from 'react-native';

export default function Footer() {
  const glowAnimation = React.useRef(new Animated.Value(0)).current;
  const scaleAnimation = React.useRef(new Animated.Value(1)).current;

  React.useEffect(() => {
    const startGlowAnimation = () => {
      Animated.loop(
        Animated.sequence([
          Animated.timing(glowAnimation, {
            toValue: 1,
            duration: 2000,
            useNativeDriver: false,
          }),
          Animated.timing(glowAnimation, {
            toValue: 0,
            duration: 2000,
            useNativeDriver: false,
          }),
        ])
      ).start();
    };

    startGlowAnimation();
  }, []);

  const handlePortfolioPress = () => {
    // Add press animation
    Animated.sequence([
      Animated.timing(scaleAnimation, {
        toValue: 0.95,
        duration: 100,
        useNativeDriver: true,
      }),
      Animated.timing(scaleAnimation, {
        toValue: 1,
        duration: 100,
        useNativeDriver: true,
      }),
    ]).start();

    Linking.openURL('https://yrb-portfolio.netlify.app/');
  };

  const currentYear = new Date().getFullYear();

  const glowColor = glowAnimation.interpolate({
    inputRange: [0, 1],
    outputRange: ['rgba(74, 144, 226, 0.3)', 'rgba(74, 144, 226, 0.8)'],
  });

  return (
    <View style={styles.footer}>
      <Text style={styles.copyrightText}>
        KPT Parking Manager © {currentYear}
      </Text>
      <View style={styles.developerInfo}>
        <Text style={styles.designedText}>Designed & Developed by </Text>
        <TouchableOpacity onPress={handlePortfolioPress} activeOpacity={0.8}>
          <Animated.View style={[
            styles.nameContainer,
            {
              shadowColor: glowColor,
              transform: [{ scale: scaleAnimation }]
            }
          ]}>
            <Text style={styles.developerName}>Yeshwant Rao B</Text>
          </Animated.View>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  footer: {
    backgroundColor: '#2c3e50',
    paddingVertical: 20,
    paddingHorizontal: 15,
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: '#34495e',
  },
  copyrightText: {
    color: '#ecf0f1',
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
    textAlign: 'center',
  },
  developerInfo: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    justifyContent: 'center',
  },
  designedText: {
    color: '#bdc3c7',
    fontSize: 12,
    textAlign: 'center',
  },
  nameContainer: {
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 1,
    shadowRadius: 10,
    elevation: 8,
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  developerName: {
    color: '#4a90e2',
    fontSize: 12,
    fontWeight: 'bold',
    textDecorationLine: 'underline',
    textShadowColor: 'rgba(74, 144, 226, 0.7)',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 8,
  },
  locationText: {
    color: '#bdc3c7',
    fontSize: 12,
    textAlign: 'center',
  },
});