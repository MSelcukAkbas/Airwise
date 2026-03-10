import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Platform,
  Animated,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { Ionicons } from '@expo/vector-icons';
import { useApp } from '@/contexts/AppContext';
import Colors from '@/constants/colors';
import { formatCountdown, getDaysSinceStart } from '@/utils/algorithm';

const PHASE_INFO = {
  control: { label: 'Control Phase', color: Colors.phaseControl, icon: 'shield-checkmark' as const },
  reduction: { label: 'Reduction Phase', color: Colors.phaseReduction, icon: 'trending-down' as const },
  delay: { label: 'Delay Phase', color: Colors.phaseDelay, icon: 'time' as const },
  freedom: { label: 'Freedom Phase', color: Colors.phaseFreedom, icon: 'leaf' as const },
};

function greet(): string {
  const h = new Date().getHours();
  if (h < 12) return 'Good morning';
  if (h < 18) return 'Good afternoon';
  return 'Good evening';
}

export default function HomeScreen() {
  const insets = useSafeAreaInsets();
  const {
    profile,
    isLoading,
    nextPermissionTime,
    isPermissionReady,
    logSmoke,
    skipPermission,
    skipCount,
    getTodaySmokeCount,
    getTodayExtraCount,
  } = useApp();

  const [countdown, setCountdown] = useState('');
  const [msLeft, setMsLeft] = useState(0);
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const glowAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!profile) return;
    const interval = setInterval(() => {
      if (!nextPermissionTime || isPermissionReady) {
        setCountdown('00:00');
        setMsLeft(0);
        return;
      }
      const diff = nextPermissionTime.getTime() - Date.now();
      setMsLeft(Math.max(0, diff));
      setCountdown(formatCountdown(Math.max(0, diff)));
    }, 1000);
    return () => clearInterval(interval);
  }, [nextPermissionTime, isPermissionReady, profile]);

  useEffect(() => {
    if (isPermissionReady) {
      Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, { toValue: 1.04, duration: 900, useNativeDriver: true }),
          Animated.timing(pulseAnim, { toValue: 1, duration: 900, useNativeDriver: true }),
        ]),
      ).start();
      Animated.loop(
        Animated.sequence([
          Animated.timing(glowAnim, { toValue: 1, duration: 1200, useNativeDriver: false }),
          Animated.timing(glowAnim, { toValue: 0, duration: 1200, useNativeDriver: false }),
        ]),
      ).start();
    } else {
      pulseAnim.stopAnimation();
      glowAnim.stopAnimation();
      Animated.timing(pulseAnim, { toValue: 1, duration: 200, useNativeDriver: true }).start();
      Animated.timing(glowAnim, { toValue: 0, duration: 200, useNativeDriver: false }).start();
    }
  }, [isPermissionReady, pulseAnim, glowAnim]);

  useEffect(() => {
    if (!isLoading && !profile) {
      router.replace('/onboarding');
    }
  }, [isLoading, profile]);

  if (isLoading || !profile) return null;

  const phase = PHASE_INFO[profile.currentPhase];
  const dayCount = getDaysSinceStart(profile);
  const smokeCount = getTodaySmokeCount();
  const extraCount = getTodayExtraCount();
  const progress = Math.min(1, smokeCount / profile.currentDailyLimit);
  const isOverLimit = smokeCount >= profile.currentDailyLimit;

  const handleSmokeNow = async () => {
    if (!isPermissionReady) return;
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    await logSmoke('allowed');
  };

  const handleExtraSmoke = async () => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
    await logSmoke('extra');
  };

  const handleSkip = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    skipPermission();
  };

  const glowColor = glowAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [Colors.accentDim, 'rgba(91,138,245,0.35)'],
  });

  return (
    <View style={[styles.container, { paddingTop: insets.top + (Platform.OS === 'web' ? 67 : 0) }]}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[
          styles.scrollContent,
          { paddingBottom: insets.bottom + (Platform.OS === 'web' ? 34 : 84) },
        ]}
      >
        <View style={styles.header}>
          <View>
            <Text style={styles.greeting}>{greet()}, {profile.name}</Text>
            <Text style={styles.dayCount}>Day {dayCount + 1} of your journey</Text>
          </View>
          <View style={[styles.phaseBadge, { backgroundColor: `${phase.color}20` }]}>
            <Ionicons name={phase.icon} size={13} color={phase.color} />
            <Text style={[styles.phaseLabel, { color: phase.color }]}>{phase.label}</Text>
          </View>
        </View>

        <Animated.View
          style={[
            styles.timerCard,
            isPermissionReady && { borderColor: Colors.accent, borderWidth: 1.5 },
            !isPermissionReady && { borderColor: Colors.border, borderWidth: 1 },
            Platform.OS !== 'web' && isPermissionReady && { transform: [{ scale: pulseAnim }] },
          ]}
        >
          {isPermissionReady ? (
            <>
              <Animated.View style={[styles.timerGlow, { backgroundColor: glowColor }]} />
              <View style={styles.readyIconWrap}>
                <Ionicons name="checkmark-circle" size={40} color={Colors.accent} />
              </View>
              <Text style={styles.readyLabel}>Permission Window Open</Text>
              <Text style={styles.readySubLabel}>You may smoke now</Text>
              <TouchableOpacity style={styles.smokeBtn} onPress={handleSmokeNow} activeOpacity={0.8}>
                <Ionicons name="flame" size={20} color={Colors.text} />
                <Text style={styles.smokeBtnText}>Smoke Now</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.skipBtn} onPress={handleSkip} activeOpacity={0.8}>
                <Ionicons name="arrow-forward-circle-outline" size={18} color={Colors.teal} />
                <Text style={styles.skipBtnText}>Skip (+bonus)</Text>
              </TouchableOpacity>
            </>
          ) : (
            <>
              <Text style={styles.timerTitle}>NEXT PERMISSION</Text>
              <Text style={styles.timerValue}>{countdown}</Text>
              <Text style={styles.timerSub}>
                Every ~{Math.round(
                  (() => {
                    const [wh, wm] = profile.wakeUpTime.split(':').map(Number);
                    const [sh, sm] = profile.sleepTime.split(':').map(Number);
                    let s = sh * 60 + sm;
                    const w = wh * 60 + wm;
                    if (s <= w) s += 1440;
                    return (s - w) / profile.currentDailyLimit;
                  })(),
                )} min today
              </Text>
              <View style={styles.progressWrap}>
                <View style={styles.progressBg}>
                  <Animated.View
                    style={[
                      styles.progressFill,
                      {
                        width: `${(1 - Math.min(1, msLeft / (3600000))) * 100}%`,
                        backgroundColor: Colors.accent,
                      },
                    ]}
                  />
                </View>
              </View>
            </>
          )}
        </Animated.View>

        {!isPermissionReady && (
          <TouchableOpacity
            style={styles.extraBtn}
            onPress={handleExtraSmoke}
            activeOpacity={0.8}
          >
            <Ionicons name="add-circle-outline" size={18} color={Colors.warning} />
            <Text style={styles.extraBtnText}>Smoke anyway (counts as extra)</Text>
          </TouchableOpacity>
        )}

        <View style={styles.streaksRow}>
          <View style={[styles.streakCard, { borderColor: Colors.phaseControl + '40' }]}>
            <View style={styles.streakHeader}>
              <Ionicons name="shield-checkmark" size={16} color={Colors.phaseControl} />
              <Text style={[styles.streakType, { color: Colors.phaseControl }]}>Control</Text>
            </View>
            <Text style={styles.streakNum}>{profile.controlStreak}</Text>
            <Text style={styles.streakDays}>day streak</Text>
            <Text style={styles.streakBest}>Best: {profile.longestControlStreak}</Text>
          </View>

          <View style={[styles.streakCard, { borderColor: Colors.teal + '40' }]}>
            <View style={styles.streakHeader}>
              <Ionicons name="trophy" size={16} color={Colors.teal} />
              <Text style={[styles.streakType, { color: Colors.teal }]}>Target</Text>
            </View>
            <Text style={styles.streakNum}>{profile.targetStreak}</Text>
            <Text style={styles.streakDays}>day streak</Text>
            <Text style={styles.streakBest}>Best: {profile.longestTargetStreak}</Text>
          </View>
        </View>

        <View style={styles.todayCard}>
          <View style={styles.todayHeader}>
            <Text style={styles.todayTitle}>Today</Text>
            <View style={styles.todayBadges}>
              {extraCount > 0 && (
                <View style={styles.extraBadge}>
                  <Text style={styles.extraBadgeText}>+{extraCount} extra</Text>
                </View>
              )}
              <Text style={[styles.todayCount, { color: isOverLimit ? Colors.danger : Colors.text }]}>
                {smokeCount}/{profile.currentDailyLimit}
              </Text>
            </View>
          </View>
          <View style={styles.progressBarBg}>
            <View
              style={[
                styles.progressBarFill,
                {
                  width: `${progress * 100}%`,
                  backgroundColor: isOverLimit ? Colors.danger : progress > 0.8 ? Colors.warning : Colors.teal,
                },
              ]}
            />
          </View>
          <View style={styles.todayFooter}>
            <Text style={styles.todaySubtext}>{profile.currentDailyLimit - smokeCount > 0 ? `${profile.currentDailyLimit - smokeCount} remaining` : 'Limit reached'}</Text>
            <Text style={styles.todaySubtext}>{skipCount} skipped today</Text>
          </View>
        </View>

        <TouchableOpacity
          style={styles.cravingBtn}
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
            router.push('/craving');
          }}
          activeOpacity={0.85}
        >
          <View style={styles.cravingInner}>
            <View style={styles.cravingLeft}>
              <Ionicons name="pulse" size={22} color={Colors.danger} />
              <View>
                <Text style={styles.cravingTitle}>Craving Emergency</Text>
                <Text style={styles.cravingSubtitle}>90-second barrier protocol</Text>
              </View>
            </View>
            <Ionicons name="chevron-forward" size={18} color={Colors.textSub} />
          </View>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 8,
    gap: 16,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingTop: 12,
  },
  greeting: {
    fontFamily: 'Inter_700Bold',
    fontSize: 22,
    color: Colors.text,
  },
  dayCount: {
    fontFamily: 'Inter_400Regular',
    fontSize: 13,
    color: Colors.textSub,
    marginTop: 2,
  },
  phaseBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 20,
  },
  phaseLabel: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 11,
    letterSpacing: 0.3,
  },
  timerCard: {
    backgroundColor: Colors.card,
    borderRadius: 20,
    padding: 28,
    alignItems: 'center',
    minHeight: 220,
    justifyContent: 'center',
    overflow: 'hidden',
    position: 'relative',
  },
  timerGlow: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    borderRadius: 20,
  },
  readyIconWrap: {
    marginBottom: 12,
  },
  readyLabel: {
    fontFamily: 'Inter_700Bold',
    fontSize: 20,
    color: Colors.text,
    textAlign: 'center',
  },
  readySubLabel: {
    fontFamily: 'Inter_400Regular',
    fontSize: 14,
    color: Colors.textSub,
    marginTop: 4,
    marginBottom: 20,
  },
  smokeBtn: {
    backgroundColor: Colors.accent,
    paddingHorizontal: 32,
    paddingVertical: 14,
    borderRadius: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    width: '100%',
    justifyContent: 'center',
  },
  smokeBtnText: {
    fontFamily: 'Inter_700Bold',
    fontSize: 16,
    color: Colors.text,
  },
  skipBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 12,
    paddingVertical: 8,
  },
  skipBtnText: {
    fontFamily: 'Inter_500Medium',
    fontSize: 14,
    color: Colors.teal,
  },
  timerTitle: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 11,
    color: Colors.textSub,
    letterSpacing: 2,
    marginBottom: 12,
  },
  timerValue: {
    fontFamily: 'Inter_700Bold',
    fontSize: 56,
    color: Colors.text,
    letterSpacing: -2,
    lineHeight: 64,
  },
  timerSub: {
    fontFamily: 'Inter_400Regular',
    fontSize: 13,
    color: Colors.textSub,
    marginTop: 8,
    marginBottom: 16,
  },
  progressWrap: {
    width: '100%',
  },
  progressBg: {
    height: 4,
    backgroundColor: Colors.border,
    borderRadius: 2,
    overflow: 'hidden',
  },
  progressFill: {
    height: 4,
    borderRadius: 2,
  },
  extraBtn: {
    backgroundColor: Colors.warningDim,
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderWidth: 1,
    borderColor: Colors.warning + '30',
  },
  extraBtnText: {
    fontFamily: 'Inter_500Medium',
    fontSize: 14,
    color: Colors.warning,
  },
  streaksRow: {
    flexDirection: 'row',
    gap: 14,
  },
  streakCard: {
    flex: 1,
    backgroundColor: Colors.card,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
  },
  streakHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 8,
  },
  streakType: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 12,
    letterSpacing: 0.3,
    textTransform: 'uppercase',
  },
  streakNum: {
    fontFamily: 'Inter_700Bold',
    fontSize: 42,
    color: Colors.text,
    lineHeight: 48,
  },
  streakDays: {
    fontFamily: 'Inter_400Regular',
    fontSize: 12,
    color: Colors.textSub,
    marginBottom: 6,
  },
  streakBest: {
    fontFamily: 'Inter_500Medium',
    fontSize: 11,
    color: Colors.textTertiary,
  },
  todayCard: {
    backgroundColor: Colors.card,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  todayHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  todayTitle: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 15,
    color: Colors.text,
  },
  todayBadges: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  extraBadge: {
    backgroundColor: Colors.warningDim,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
  },
  extraBadgeText: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 11,
    color: Colors.warning,
  },
  todayCount: {
    fontFamily: 'Inter_700Bold',
    fontSize: 17,
  },
  progressBarBg: {
    height: 6,
    backgroundColor: Colors.border,
    borderRadius: 3,
    overflow: 'hidden',
    marginBottom: 10,
  },
  progressBarFill: {
    height: 6,
    borderRadius: 3,
  },
  todayFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  todaySubtext: {
    fontFamily: 'Inter_400Regular',
    fontSize: 12,
    color: Colors.textSub,
  },
  cravingBtn: {
    backgroundColor: Colors.dangerDim,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: Colors.danger + '30',
    overflow: 'hidden',
  },
  cravingInner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
  },
  cravingLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  cravingTitle: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 15,
    color: Colors.text,
  },
  cravingSubtitle: {
    fontFamily: 'Inter_400Regular',
    fontSize: 12,
    color: Colors.textSub,
    marginTop: 2,
  },
});
