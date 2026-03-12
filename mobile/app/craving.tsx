import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated,
  Easing,
  Platform,
  Modal,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { useApp } from '@/contexts/AppContext';
import { TriggerReason } from '@/utils/types';
import Colors from '@/constants/colors';

const BARRIER_SECONDS = 90;
const CANCEL_WINDOW = 3;
const BREATHING_PHASES = [
  { labelKey: 'craving.breathing.phase1.label', instructionKey: 'craving.breathing.phase1.instruction', duration: 4000, scale: 1 },
  { labelKey: 'craving.breathing.phase2.label', instructionKey: 'craving.breathing.phase2.instruction', duration: 7000, scale: 1 },
  { labelKey: 'craving.breathing.phase3.label', instructionKey: 'craving.breathing.phase3.instruction', duration: 8000, scale: 0.55 },
];

const TRIGGER_OPTIONS: { key: TriggerReason; labelKey: string }[] = [
  { key: 'stress', labelKey: 'craving.triggers.stress' },
  { key: 'caffeine', labelKey: 'craving.triggers.caffeine' },
  { key: 'after_meal', labelKey: 'craving.triggers.after_meal' },
  { key: 'anxiety', labelKey: 'craving.triggers.anxiety' },
  { key: 'boredom', labelKey: 'craving.triggers.boredom' },
  { key: 'social', labelKey: 'craving.triggers.social' },
  { key: 'other', labelKey: 'craving.triggers.other' },
];

type ScreenPhase = 'cancel_window' | 'barrier' | 'trigger_select' | 'result';

export default function CravingScreen() {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const { logSmoke } = useApp();

  const [screenPhase, setScreenPhase] = useState<ScreenPhase>('cancel_window');
  const [cancelCountdown, setCancelCountdown] = useState(CANCEL_WINDOW);
  const [barrierCountdown, setBarrierCountdown] = useState(BARRIER_SECONDS);
  const [breathingPhaseIdx, setBreathingPhaseIdx] = useState(0);
  const [breathingProgress, setBreathingProgress] = useState(0);
  const [selectedTrigger, setSelectedTrigger] = useState<TriggerReason | null>(null);
  const [intensity, setIntensity] = useState(5);
  const [survived, setSurvived] = useState(false);

  const circleScale = useRef(new Animated.Value(0.55)).current;
  const circleOpacity = useRef(new Animated.Value(0.4)).current;
  const pulseRing = useRef(new Animated.Value(0)).current;
  const bgOpacity = useRef(new Animated.Value(0)).current;

  const breathingAnimRef = useRef<Animated.CompositeAnimation | null>(null);
  const hapticIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    Animated.timing(bgOpacity, {
      toValue: 1,
      duration: 400,
      useNativeDriver: true,
    }).start();
  }, [bgOpacity]);

  useEffect(() => {
    if (screenPhase !== 'cancel_window') return;
    const interval = setInterval(() => {
      setCancelCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          setScreenPhase('barrier');
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [screenPhase]);

  const startBreathingCycle = useCallback((phaseIdx: number) => {
    const phase = BREATHING_PHASES[phaseIdx];
    const isInhale = phaseIdx === 0;
    const targetScale = isInhale ? 1.0 : phase.scale;

    breathingAnimRef.current?.stop();
    breathingAnimRef.current = Animated.parallel([
      Animated.timing(circleScale, {
        toValue: targetScale,
        duration: phase.duration,
        easing: Easing.inOut(Easing.sin),
        useNativeDriver: true,
      }),
      Animated.timing(circleOpacity, {
        toValue: isInhale ? 0.9 : 0.45,
        duration: phase.duration,
        useNativeDriver: true,
      }),
    ]);
    breathingAnimRef.current.start();

    if (hapticIntervalRef.current) clearInterval(hapticIntervalRef.current);
    if (isInhale) {
      let count = 0;
      const maxCount = Math.floor(phase.duration / 400);
      hapticIntervalRef.current = setInterval(() => {
        if (count >= maxCount) {
          if (hapticIntervalRef.current) clearInterval(hapticIntervalRef.current);
          return;
        }
        const ratio = count / maxCount;
        if (ratio < 0.33) {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        } else if (ratio < 0.66) {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        } else {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
        }
        count++;
      }, 400);
    }

    const phaseTimer = setTimeout(() => {
      const next = (phaseIdx + 1) % BREATHING_PHASES.length;
      setBreathingPhaseIdx(next);
      startBreathingCycle(next);
    }, phase.duration);

    return () => {
      clearTimeout(phaseTimer);
      if (hapticIntervalRef.current) clearInterval(hapticIntervalRef.current);
    };
  }, [circleScale, circleOpacity]);

  useEffect(() => {
    if (screenPhase !== 'barrier') return;

    startBreathingCycle(0);

    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseRing, { toValue: 1, duration: 1500, useNativeDriver: true }),
        Animated.timing(pulseRing, { toValue: 0, duration: 1500, useNativeDriver: true }),
      ]),
    ).start();

    const barrierInterval = setInterval(() => {
      setBarrierCountdown((prev) => {
        const next = prev - 1;
        setBreathingProgress(1 - next / BARRIER_SECONDS);
        if (next <= 0) {
          clearInterval(barrierInterval);
          setScreenPhase('trigger_select');
          return 0;
        }
        return next;
      });
    }, 1000);

    return () => {
      clearInterval(barrierInterval);
      breathingAnimRef.current?.stop();
      if (hapticIntervalRef.current) clearInterval(hapticIntervalRef.current);
    };
  }, [screenPhase, startBreathingCycle, pulseRing]);

  const handleSurvived = async () => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    setSurvived(true);
    await logSmoke('craving_survived', selectedTrigger ?? undefined, intensity);
    setScreenPhase('result');
  };

  const handleFailed = async () => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
    setSurvived(false);
    await logSmoke('craving_failed', selectedTrigger ?? undefined, intensity);
    setScreenPhase('result');
  };

  const ringScale = pulseRing.interpolate({
    inputRange: [0, 1],
    outputRange: [1, 1.12],
  });
  const ringOpacity = pulseRing.interpolate({
    inputRange: [0, 0.5, 1],
    outputRange: [0.3, 0.1, 0.3],
  });

  const currentPhase = BREATHING_PHASES[breathingPhaseIdx];
  const topInset = insets.top + (Platform.OS === 'web' ? 67 : 0);
  const bottomInset = insets.bottom + (Platform.OS === 'web' ? 34 : 0);

    if (screenPhase === 'cancel_window') {
    return (
      <Animated.View style={[styles.container, { opacity: bgOpacity }]}>
        <View style={[styles.cancelScreen, { paddingTop: topInset + 20, paddingBottom: bottomInset + 20 }]}>
          <View style={styles.cancelIcon}>
            <Ionicons name="pulse" size={40} color={Colors.danger} />
          </View>
          <Text style={styles.cancelTitle}>{t('craving.cancel.title')}</Text>
          <Text style={styles.cancelSubtitle}>
            {t('craving.cancel.subtitle', { countdown: cancelCountdown })}
          </Text>
          <TouchableOpacity
            style={styles.cancelBtn}
            onPress={() => router.back()}
          >
            <Text style={styles.cancelBtnText}>{t('craving.cancel.btn', { countdown: cancelCountdown })}</Text>
          </TouchableOpacity>
        </View>
      </Animated.View>
    );
  }

  if (screenPhase === 'barrier') {
    return (
      <Animated.View style={[styles.container, { opacity: bgOpacity }]}>
        <View style={[styles.barrierScreen, { paddingTop: topInset + 16, paddingBottom: bottomInset + 16 }]}>
          <View style={styles.barrierHeader}>
            <Text style={styles.barrierTimer}>{barrierCountdown}s</Text>
            <View style={styles.barrierProgressBg}>
              <View style={[styles.barrierProgressFill, { width: `${breathingProgress * 100}%` }]} />
            </View>
          </View>

          <View style={styles.breathingContainer}>
            <Animated.View
              style={[
                styles.breathingRing,
                { transform: [{ scale: ringScale }], opacity: ringOpacity },
              ]}
            />
            <Animated.View
              style={[
                styles.breathingCircle,
                { transform: [{ scale: circleScale }], opacity: circleOpacity },
              ]}
            />
            <View style={styles.breathingCenter}>
              <Text style={styles.breathingLabel}>{t(currentPhase.labelKey)}</Text>
              <Text style={styles.breathingCount}>
                {breathingPhaseIdx === 0 ? '4s' : breathingPhaseIdx === 1 ? '7s' : '8s'}
              </Text>
            </View>
          </View>

          <View style={styles.barrierFooter}>
            <Text style={styles.breathingInstruction}>{t(currentPhase.instructionKey)}</Text>
            <Text style={styles.breathingProtocol}>{t('craving.barrier.protocol')}</Text>
          </View>
        </View>
      </Animated.View>
    );
  }

  if (screenPhase === 'trigger_select') {
    return (
      <Animated.View style={[styles.container, { opacity: bgOpacity }]}>
        <View style={[styles.triggerScreen, { paddingTop: topInset + 16, paddingBottom: bottomInset + 16 }]}>
          <View style={styles.successIcon}>
            <Ionicons name="timer-outline" size={36} color={Colors.success} />
          </View>
          <Text style={styles.triggerTitle}>{t('craving.triggerSelect.title')}</Text>
          <Text style={styles.triggerSubtitle}>
            {t('craving.triggerSelect.subtitle')}
          </Text>

          <View style={styles.triggerGrid}>
            {TRIGGER_OPTIONS.map((opt) => (
              <TouchableOpacity
                key={opt.key}
                style={[styles.triggerChip, selectedTrigger === opt.key && styles.triggerChipActive]}
                onPress={() => { setSelectedTrigger(opt.key); Haptics.selectionAsync(); }}
              >
                <Text style={[styles.triggerChipText, selectedTrigger === opt.key && styles.triggerChipTextActive]}>
                  {t(opt.labelKey)}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          <View style={styles.intensitySection}>
            <Text style={styles.intensityLabel}>{t('craving.triggerSelect.intensity', { intensity })}</Text>
            <View style={styles.intensityRow}>
              {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((n) => (
                <TouchableOpacity
                  key={n}
                  style={[
                    styles.intensityDot,
                    n <= intensity && { backgroundColor: n <= 3 ? Colors.success : n <= 6 ? Colors.warning : Colors.danger },
                  ]}
                  onPress={() => { setIntensity(n); Haptics.selectionAsync(); }}
                />
              ))}
            </View>
          </View>

          <View style={styles.resultActions}>
            <TouchableOpacity style={styles.survivedBtn} onPress={handleSurvived}>
              <Ionicons name="shield-checkmark" size={18} color={Colors.text} />
              <Text style={styles.survivedBtnText}>{t('craving.triggerSelect.survived')}</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.failedBtn} onPress={handleFailed}>
              <Text style={styles.failedBtnText}>{t('craving.triggerSelect.failed')}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Animated.View>
    );
  }

  return (
    <Animated.View style={[styles.container, { opacity: bgOpacity }]}>
      <View style={[styles.resultScreen, { paddingTop: topInset + 20, paddingBottom: bottomInset + 20 }]}>
        <View style={[styles.resultIcon, { backgroundColor: survived ? Colors.successDim : Colors.dangerDim }]}>
          <Ionicons
            name={survived ? 'shield-checkmark' : 'close-circle'}
            size={48}
            color={survived ? Colors.success : Colors.danger}
          />
        </View>

        {survived ? (
          <>
            <Text style={styles.resultTitle}>{t('craving.result.successTitle')}</Text>
            <Text style={styles.resultText}>
              {t('craving.result.successDesc')}
            </Text>
          </>
        ) : (
          <>
            <Text style={styles.resultTitle}>{t('craving.result.failTitle')}</Text>
            <Text style={styles.resultText}>
              {t('craving.result.failDesc')}
            </Text>
          </>
        )}

        <TouchableOpacity
          style={[styles.resultBtn, { backgroundColor: survived ? Colors.success : Colors.elevated }]}
          onPress={() => router.back()}
        >
          <Text style={[styles.resultBtnText, !survived && { color: Colors.textSub }]}>
            {t('craving.result.returnBtn')}
          </Text>
        </TouchableOpacity>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#07080E',
  },
  cancelScreen: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
    gap: 16,
  },
  cancelIcon: {
    width: 80,
    height: 80,
    borderRadius: 24,
    backgroundColor: Colors.dangerDim,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  cancelTitle: {
    fontFamily: 'Inter_700Bold',
    fontSize: 26,
    color: Colors.text,
    textAlign: 'center',
  },
  cancelSubtitle: {
    fontFamily: 'Inter_400Regular',
    fontSize: 15,
    color: Colors.textSub,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 8,
  },
  cancelBtn: {
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 14,
    paddingHorizontal: 32,
    paddingVertical: 14,
    marginTop: 16,
  },
  cancelBtnText: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 15,
    color: Colors.textSub,
  },
  barrierScreen: {
    flex: 1,
    paddingHorizontal: 24,
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  barrierHeader: {
    width: '100%',
    alignItems: 'center',
    gap: 12,
  },
  barrierTimer: {
    fontFamily: 'Inter_700Bold',
    fontSize: 48,
    color: Colors.text,
    letterSpacing: -2,
  },
  barrierProgressBg: {
    width: '100%',
    height: 3,
    backgroundColor: Colors.border,
    borderRadius: 2,
    overflow: 'hidden',
  },
  barrierProgressFill: {
    height: 3,
    backgroundColor: Colors.teal,
    borderRadius: 2,
  },
  breathingContainer: {
    width: 260,
    height: 260,
    alignItems: 'center',
    justifyContent: 'center',
  },
  breathingRing: {
    position: 'absolute',
    width: 260,
    height: 260,
    borderRadius: 130,
    borderWidth: 2,
    borderColor: Colors.teal,
  },
  breathingCircle: {
    position: 'absolute',
    width: 220,
    height: 220,
    borderRadius: 110,
    backgroundColor: Colors.teal,
  },
  breathingCenter: {
    alignItems: 'center',
    zIndex: 10,
  },
  breathingLabel: {
    fontFamily: 'Inter_700Bold',
    fontSize: 20,
    color: Colors.text,
    textAlign: 'center',
  },
  breathingCount: {
    fontFamily: 'Inter_400Regular',
    fontSize: 14,
    color: 'rgba(255,255,255,0.7)',
    marginTop: 4,
  },
  barrierFooter: {
    alignItems: 'center',
    gap: 8,
  },
  breathingInstruction: {
    fontFamily: 'Inter_500Medium',
    fontSize: 15,
    color: Colors.textSub,
    textAlign: 'center',
  },
  breathingProtocol: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 12,
    color: Colors.textTertiary,
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  triggerScreen: {
    flex: 1,
    paddingHorizontal: 24,
    alignItems: 'center',
    gap: 20,
  },
  successIcon: {
    width: 72,
    height: 72,
    borderRadius: 20,
    backgroundColor: Colors.successDim,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
  },
  triggerTitle: {
    fontFamily: 'Inter_700Bold',
    fontSize: 26,
    color: Colors.text,
    textAlign: 'center',
  },
  triggerSubtitle: {
    fontFamily: 'Inter_400Regular',
    fontSize: 15,
    color: Colors.textSub,
    textAlign: 'center',
    lineHeight: 22,
  },
  triggerGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    justifyContent: 'center',
    width: '100%',
  },
  triggerChip: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: Colors.card,
  },
  triggerChipActive: {
    backgroundColor: Colors.accentDim,
    borderColor: Colors.accent,
  },
  triggerChipText: {
    fontFamily: 'Inter_500Medium',
    fontSize: 14,
    color: Colors.textSub,
  },
  triggerChipTextActive: {
    color: Colors.accent,
  },
  intensitySection: {
    width: '100%',
    gap: 10,
  },
  intensityLabel: {
    fontFamily: 'Inter_500Medium',
    fontSize: 14,
    color: Colors.textSub,
    textAlign: 'center',
  },
  intensityRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
  },
  intensityDot: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: Colors.elevated,
  },
  resultActions: {
    width: '100%',
    gap: 10,
    marginTop: 'auto',
  },
  survivedBtn: {
    backgroundColor: Colors.success,
    borderRadius: 14,
    paddingVertical: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  survivedBtnText: {
    fontFamily: 'Inter_700Bold',
    fontSize: 16,
    color: Colors.text,
  },
  failedBtn: {
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.border,
  },
  failedBtnText: {
    fontFamily: 'Inter_500Medium',
    fontSize: 15,
    color: Colors.textSub,
  },
  resultScreen: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
    gap: 20,
  },
  resultIcon: {
    width: 96,
    height: 96,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  resultTitle: {
    fontFamily: 'Inter_700Bold',
    fontSize: 30,
    color: Colors.text,
    textAlign: 'center',
  },
  resultText: {
    fontFamily: 'Inter_400Regular',
    fontSize: 15,
    color: Colors.textSub,
    textAlign: 'center',
    lineHeight: 23,
  },
  resultBtn: {
    borderRadius: 14,
    paddingVertical: 16,
    paddingHorizontal: 40,
    marginTop: 16,
    minWidth: 240,
    alignItems: 'center',
  },
  resultBtnText: {
    fontFamily: 'Inter_700Bold',
    fontSize: 16,
    color: Colors.text,
  },
});
