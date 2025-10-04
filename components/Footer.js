import React from 'react';
import {
  View,
  Text,
  Pressable,
  StyleSheet,
  Linking,
  Animated,
  Dimensions,
  useColorScheme,
  Platform,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import { FontAwesome, MaterialCommunityIcons } from '@expo/vector-icons';

const { width } = Dimensions.get('window');

export default function Footer() {
  const scheme = useColorScheme();
  const isDark = scheme === 'dark';

  const floatAnim = React.useRef(new Animated.Value(0)).current;
  const pulseAnim = React.useRef(new Animated.Value(1)).current;

  // Glow + press scale animation for the developer name
  const glow = React.useRef(new Animated.Value(0)).current;
  const nameScale = React.useRef(new Animated.Value(1)).current;

  React.useEffect(() => {
    // Floating motion
    Animated.loop(
      Animated.sequence([
        Animated.timing(floatAnim, {
          toValue: -4,
          duration: 2500,
          useNativeDriver: true,
        }),
        Animated.timing(floatAnim, {
          toValue: 0,
          duration: 2500,
          useNativeDriver: true,
        }),
      ])
    ).start();

    // Logo pulse
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.05,
          duration: 1000,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 1000,
          useNativeDriver: true,
        }),
      ])
    ).start();

    // Glow loop for the name
    Animated.loop(
      Animated.sequence([
        Animated.timing(glow, {
          toValue: 1,
          duration: 900,
          useNativeDriver: false,
        }),
        Animated.timing(glow, {
          toValue: 0,
          duration: 900,
          useNativeDriver: false,
        }),
      ])
    ).start();
  }, []);

  const safeOpen = async (url, fallback = null) => {
    try {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    } catch (_) {}

    try {
      const supported = await Linking.canOpenURL(url);
      if (supported) return Linking.openURL(url);
      if (fallback) return Linking.openURL(fallback);
    } catch (_) {}
  };

  const handleRate = async () => {
    const ANDROID_PKG = 'com.your.app.package'; // replace with your package ID
    const play = `market://details?id=${ANDROID_PKG}`;
    const web = `https://play.google.com/store/apps/details?id=${ANDROID_PKG}`;
    await safeOpen(play, web);
  };

  const handleFeedback = () =>
    safeOpen('mailto:yeshwant@example.com?subject=KPT%20Parking%20App%20Feedback');

  const handlePortfolio = () => safeOpen('https://yrb-portfolio.netlify.app/');
  const currentYear = new Date().getFullYear();

  // Glow interpolation
  const devColor = glow.interpolate({
    inputRange: [0, 1],
    outputRange: ['rgba(99,102,241,0.9)', 'rgba(167,139,250,1)'],
  });
  const devShadowRadius = glow.interpolate({
    inputRange: [0, 1],
    outputRange: [2, 14],
  });
  const devShadowColor = glow.interpolate({
    inputRange: [0, 1],
    outputRange: ['rgba(99,102,241,0.45)', 'rgba(167,139,250,0.95)'],
  });

  // Name press feedback
  const onNamePressIn = () =>
    Animated.spring(nameScale, {
      toValue: 0.94,
      useNativeDriver: true,
    }).start();
  const onNamePressOut = () =>
    Animated.spring(nameScale, {
      toValue: 1,
      useNativeDriver: true,
    }).start();
  const onNamePress = async () => {
    try {
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (_) {}
    handlePortfolio();
  };

  return (
    <Animated.View
      style={[styles.wrapper, { transform: [{ translateY: floatAnim }] }]}
      accessible
      accessibilityLabel="App footer with actions"
    >
      <LinearGradient
        colors={isDark ? ['#071029', '#071827'] : ['rgba(255,255,255,0.95)', '#ffffff']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[styles.card, isDark && styles.cardDark]}
      >
        {/* Header Row */}
        <View style={styles.topRow}>
          <Animated.View style={[styles.logoWrap, { transform: [{ scale: pulseAnim }] }]}>
            <LinearGradient colors={['#6366f1', '#8b5cf6']} style={styles.logoInner}>
              <FontAwesome name="car" size={18} color="#fff" />
            </LinearGradient>
          </Animated.View>

          <View style={styles.titleWrap}>
            <Text style={[styles.title, isDark && styles.titleDark]}>
              KPT Parking Manager
            </Text>
            <Text style={[styles.subtitle, isDark && styles.subtitleDark]}>
              v2.10 • Smart Campus Solutions
            </Text>
          </View>

          <View style={styles.actionIcons}>
            <Pressable
              onPress={handleRate}
              accessibilityLabel="Rate this app"
              style={({ pressed }) => [
                styles.iconBtn,
                pressed && { opacity: 0.75, transform: [{ scale: 0.98 }] },
              ]}
            >
              <FontAwesome name="star" size={16} color="#fff" />
            </Pressable>

            <Pressable
              onPress={handleFeedback}
              accessibilityLabel="Send feedback email"
              style={({ pressed }) => [
                styles.iconBtnAlt,
                pressed && { opacity: 0.75, transform: [{ scale: 0.98 }] },
              ]}
            >
              <MaterialCommunityIcons name="email-outline" size={16} color="#fff" />
            </Pressable>
          </View>
        </View>

        <View style={styles.divider} />

        {/* Footer Text */}
        <View style={styles.bottomRow}>
          <Text style={[styles.copy, isDark && styles.copyDark]}>
            © {currentYear} Karnataka (Govt.) Polytechnic, Mangalore
          </Text>

          <Pressable
            onPress={onNamePress}
            onPressIn={onNamePressIn}
            onPressOut={onNamePressOut}
            accessibilityRole="link"
            accessibilityLabel="Open developer portfolio"
            style={({ pressed }) => [{ opacity: pressed ? 0.85 : 1 }]}
          >
            <Animated.View style={{ transform: [{ scale: nameScale }] }}>
              <View style={{ flexDirection: 'row', justifyContent: 'center', alignItems: 'center', marginTop: 2 }}>
                <Text style={[styles.devText, { textAlign: 'center' }]}>
                  Designed by{' '}
                </Text>
                <Animated.Text
                  style={[
                    styles.devName,
                    {
                      color: devColor,
                      textShadowRadius: devShadowRadius,
                      textShadowColor: devShadowColor,
                    },
                  ]}
                >
                  Yeshwant Rao B
                </Animated.Text>
                <Text style={[styles.devText, { textAlign: 'center' }]}>
                  {' '}· CSE 2023–26
                </Text>
              </View>
            </Animated.View>
          </Pressable>
        </View>
      </LinearGradient>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    width: width - 20,
    alignSelf: 'center',
    marginVertical: 8,
  },
  card: {
    borderRadius: 14,
    paddingVertical: 12,
    paddingHorizontal: 14,
    paddingBottom: 16,
    borderWidth: 1,
    borderColor: 'rgba(99,102,241,0.08)',
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowRadius: 10,
    elevation: 5,
    backgroundColor: 'rgba(255,255,255,0.9)',
    overflow: 'visible',
  },
  cardDark: {
    borderColor: 'rgba(139,92,246,0.08)',
    backgroundColor: 'rgba(6,10,20,0.6)',
    overflow: 'visible',
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  logoWrap: {
    width: 40,
    height: 40,
    borderRadius: 10,
    overflow: 'hidden',
    shadowColor: '#6b46c1',
    shadowOpacity: 0.15,
    shadowRadius: 5,
    elevation: 3,
  },
  logoInner: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  titleWrap: {
    marginLeft: 10,
    flex: 1,
  },
  title: {
    fontSize: 15,
    fontWeight: '800',
    color: '#0f172a',
  },
  titleDark: {
    color: '#e6eefc',
  },
  subtitle: {
    marginTop: 1,
    fontSize: 12,
    color: '#64748b',
    fontWeight: '600',
  },
  subtitleDark: {
    color: '#94a3b8',
  },
  actionIcons: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  iconBtn: {
    backgroundColor: '#10b981',
    width: 32,
    height: 32,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconBtnAlt: {
    backgroundColor: '#6366f1',
    width: 32,
    height: 32,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  divider: {
    height: 1,
    backgroundColor: 'rgba(2,6,23,0.06)',
    marginVertical: 10,
    borderRadius: 2,
  },
  bottomRow: {
    flexDirection: 'column',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 2,
  },
  copy: {
    fontSize: 12,
    color: '#64748b',
    textAlign: 'center',
    marginBottom: 2,
  },
  copyDark: {
    color: '#94a3b8',
  },
  devText: {
    fontSize: 12.5,
    fontWeight: '600',
  },
  devName: {
    fontWeight: '900',
  },
});
