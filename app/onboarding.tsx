import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Animated,
  Platform,
  KeyboardAvoidingView,
  useColorScheme,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { Ionicons } from '@expo/vector-icons';
import { useApp } from '@/contexts/AppContext';
import { UserProfile, DifficultyLevel } from '@/utils/types';
import Colors from '@/constants/colors';

const DIFFICULTIES: { key: DifficultyLevel; label: string; desc: string; color: string }[] = [
  { key: 'easy', label: 'Gentle', desc: '-1 cigarette/week', color: Colors.success },
  { key: 'normal', label: 'Steady', desc: '-2 cigarettes/week', color: Colors.warning },
  { key: 'hard', label: 'Intensive', desc: '-3 cigarettes/week', color: Colors.danger },
];

export default function OnboardingScreen() {
  const insets = useSafeAreaInsets();
  const { setupProfile } = useApp();
  const [step, setStep] = useState(0);
  const [name, setName] = useState('');
  const [dailyCount, setDailyCount] = useState('20');
  const [wakeTime, setWakeTime] = useState('08:00');
  const [sleepTime, setSleepTime] = useState('23:00');
  const [pricePerPack, setPricePerPack] = useState('25');
  const [currency, setCurrency] = useState('₺');
  const [difficulty, setDifficulty] = useState<DifficultyLevel>('normal');
  const fadeAnim = useRef(new Animated.Value(1)).current;

  const animateStep = (next: number) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    Animated.sequence([
      Animated.timing(fadeAnim, { toValue: 0, duration: 200, useNativeDriver: true }),
      Animated.timing(fadeAnim, { toValue: 1, duration: 200, useNativeDriver: true }),
    ]).start();
    setTimeout(() => setStep(next), 200);
  };

  const adjustNumber = (setter: (v: string) => void, value: string, delta: number, min: number, max: number) => {
    const n = Math.min(max, Math.max(min, parseInt(value || '0', 10) + delta));
    setter(String(n));
    Haptics.selectionAsync();
  };

  const adjustTime = (timeSetter: (v: string) => void, current: string, part: 'h' | 'm', delta: number) => {
    const [h, m] = current.split(':').map(Number);
    let newH = h;
    let newM = m;
    if (part === 'h') newH = (h + delta + 24) % 24;
    else newM = (m + delta + 60) % 60;
    timeSetter(`${String(newH).padStart(2, '0')}:${String(newM).padStart(2, '0')}`);
    Haptics.selectionAsync();
  };

  const handleStart = async () => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    const profile: UserProfile = {
      name: name.trim() || 'You',
      dailyStartLimit: parseInt(dailyCount, 10) || 20,
      currentDailyLimit: parseInt(dailyCount, 10) || 20,
      difficultyLevel: difficulty,
      wakeUpTime: wakeTime,
      sleepTime: sleepTime,
      cigarettePricePerPack: parseFloat(pricePerPack) || 25,
      cigarettesPerPack: 20,
      currentPhase: 'control',
      startDate: new Date().toISOString(),
      controlStreak: 0,
      longestControlStreak: 0,
      targetStreak: 0,
      longestTargetStreak: 0,
      freezeCount: 1,
      xpPoints: 0,
      lastActiveDate: '',
      currency: currency,
    };
    await setupProfile(profile);
    router.replace('/(tabs)');
  };

  const isStep0Valid = name.trim().length > 0 && parseInt(dailyCount) > 0;

  const TimeAdjuster = ({
    label,
    value,
    setter,
  }: {
    label: string;
    value: string;
    setter: (v: string) => void;
  }) => (
    <View style={styles.timeBlock}>
      <Text style={styles.timeLabel}>{label}</Text>
      <View style={styles.timeRow}>
        <View style={styles.timeUnit}>
          <TouchableOpacity onPress={() => adjustTime(setter, value, 'h', 1)} style={styles.timeBtn}>
            <Ionicons name="chevron-up" size={18} color={Colors.accent} />
          </TouchableOpacity>
          <Text style={styles.timeValue}>{value.split(':')[0]}</Text>
          <TouchableOpacity onPress={() => adjustTime(setter, value, 'h', -1)} style={styles.timeBtn}>
            <Ionicons name="chevron-down" size={18} color={Colors.accent} />
          </TouchableOpacity>
        </View>
        <Text style={styles.timeSep}>:</Text>
        <View style={styles.timeUnit}>
          <TouchableOpacity onPress={() => adjustTime(setter, value, 'm', 5)} style={styles.timeBtn}>
            <Ionicons name="chevron-up" size={18} color={Colors.accent} />
          </TouchableOpacity>
          <Text style={styles.timeValue}>{value.split(':')[1]}</Text>
          <TouchableOpacity onPress={() => adjustTime(setter, value, 'm', -5)} style={styles.timeBtn}>
            <Ionicons name="chevron-down" size={18} color={Colors.accent} />
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );

  return (
    <KeyboardAvoidingView
      style={[styles.container, { paddingTop: insets.top + (Platform.OS === 'web' ? 67 : 0), paddingBottom: insets.bottom + (Platform.OS === 'web' ? 34 : 0) }]}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <View style={styles.progressRow}>
        {[0, 1, 2].map((i) => (
          <View key={i} style={[styles.progressDot, i === step && styles.progressDotActive, i < step && styles.progressDotDone]} />
        ))}
      </View>

      <Animated.View style={[styles.content, { opacity: fadeAnim }]}>
        {step === 0 && (
          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
            <View style={styles.iconRow}>
              <View style={styles.iconWrap}>
                <Ionicons name="flame" size={36} color={Colors.accent} />
              </View>
            </View>
            <Text style={styles.heading}>Take Control</Text>
            <Text style={styles.subheading}>
              SmokePace uses an algorithmic permission system to gradually reduce your smoking — without cold turkey.
            </Text>

            <Text style={styles.fieldLabel}>Your name</Text>
            <TextInput
              style={styles.input}
              value={name}
              onChangeText={setName}
              placeholder="Alex"
              placeholderTextColor={Colors.textTertiary}
              returnKeyType="next"
              autoFocus
            />

            <Text style={styles.fieldLabel}>Current daily cigarettes</Text>
            <View style={styles.counterRow}>
              <TouchableOpacity
                style={styles.counterBtn}
                onPress={() => adjustNumber(setDailyCount, dailyCount, -1, 1, 100)}
              >
                <Ionicons name="remove" size={22} color={Colors.text} />
              </TouchableOpacity>
              <Text style={styles.counterValue}>{dailyCount}</Text>
              <TouchableOpacity
                style={styles.counterBtn}
                onPress={() => adjustNumber(setDailyCount, dailyCount, 1, 1, 100)}
              >
                <Ionicons name="add" size={22} color={Colors.text} />
              </TouchableOpacity>
            </View>
          </ScrollView>
        )}

        {step === 1 && (
          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
            <Text style={styles.heading}>Your Schedule</Text>
            <Text style={styles.subheading}>
              The algorithm spaces your permissions across your active hours.
            </Text>

            <View style={styles.timesRow}>
              <TimeAdjuster label="Wake up" value={wakeTime} setter={setWakeTime} />
              <TimeAdjuster label="Sleep" value={sleepTime} setter={setSleepTime} />
            </View>

            <Text style={styles.fieldLabel}>Pack price ({currency})</Text>
            <View style={styles.counterRow}>
              <TouchableOpacity
                style={styles.counterBtn}
                onPress={() => adjustNumber(setPricePerPack, pricePerPack, -5, 1, 999)}
              >
                <Ionicons name="remove" size={22} color={Colors.text} />
              </TouchableOpacity>
              <Text style={styles.counterValue}>{currency}{pricePerPack}</Text>
              <TouchableOpacity
                style={styles.counterBtn}
                onPress={() => adjustNumber(setPricePerPack, pricePerPack, 5, 1, 999)}
              >
                <Ionicons name="add" size={22} color={Colors.text} />
              </TouchableOpacity>
            </View>

            <Text style={styles.fieldLabel}>Currency symbol</Text>
            <View style={styles.currencyRow}>
              {['₺', '$', '€', '£'].map((c) => (
                <TouchableOpacity
                  key={c}
                  style={[styles.currencyBtn, currency === c && styles.currencyBtnActive]}
                  onPress={() => { setCurrency(c); Haptics.selectionAsync(); }}
                >
                  <Text style={[styles.currencyText, currency === c && styles.currencyTextActive]}>{c}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </ScrollView>
        )}

        {step === 2 && (
          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
            <Text style={styles.heading}>Reduction Speed</Text>
            <Text style={styles.subheading}>
              Choose how aggressively the algorithm reduces your daily limit each week.
            </Text>

            {DIFFICULTIES.map((d) => (
              <TouchableOpacity
                key={d.key}
                style={[styles.diffCard, difficulty === d.key && { borderColor: d.color, borderWidth: 2 }]}
                onPress={() => { setDifficulty(d.key); Haptics.selectionAsync(); }}
              >
                <View style={[styles.diffDot, { backgroundColor: d.color }]} />
                <View style={styles.diffText}>
                  <Text style={styles.diffLabel}>{d.label}</Text>
                  <Text style={styles.diffDesc}>{d.desc}</Text>
                </View>
                {difficulty === d.key && (
                  <Ionicons name="checkmark-circle" size={22} color={d.color} />
                )}
              </TouchableOpacity>
            ))}

            <View style={styles.summaryCard}>
              <Text style={styles.summaryTitle}>Your Plan Summary</Text>
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>Current daily limit</Text>
                <Text style={styles.summaryValue}>{dailyCount} cigs</Text>
              </View>
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>Active hours</Text>
                <Text style={styles.summaryValue}>{wakeTime} – {sleepTime}</Text>
              </View>
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>Permission interval</Text>
                <Text style={styles.summaryValue}>
                  ~{Math.round(
                    (() => {
                      const [wh, wm] = wakeTime.split(':').map(Number);
                      const [sh, sm] = sleepTime.split(':').map(Number);
                      let sleep = sh * 60 + sm;
                      const wake = wh * 60 + wm;
                      if (sleep <= wake) sleep += 1440;
                      return (sleep - wake) / parseInt(dailyCount);
                    })(),
                  )} min
                </Text>
              </View>
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>Phase</Text>
                <Text style={[styles.summaryValue, { color: Colors.phaseControl }]}>Control (Days 1–7)</Text>
              </View>
            </View>
          </ScrollView>
        )}
      </Animated.View>

      <View style={styles.footer}>
        {step > 0 && (
          <TouchableOpacity style={styles.backBtn} onPress={() => animateStep(step - 1)}>
            <Ionicons name="arrow-back" size={20} color={Colors.textSub} />
          </TouchableOpacity>
        )}
        <TouchableOpacity
          style={[
            styles.nextBtn,
            step === 0 && !isStep0Valid && styles.nextBtnDisabled,
          ]}
          onPress={() => {
            if (step < 2) animateStep(step + 1);
            else handleStart();
          }}
          disabled={step === 0 && !isStep0Valid}
        >
          <Text style={styles.nextBtnText}>{step < 2 ? 'Continue' : 'Begin Journey'}</Text>
          <Ionicons name={step < 2 ? 'arrow-forward' : 'checkmark'} size={18} color={Colors.text} />
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  progressRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
    paddingTop: 16,
    paddingBottom: 8,
  },
  progressDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: Colors.border,
  },
  progressDotActive: {
    backgroundColor: Colors.accent,
    width: 24,
  },
  progressDotDone: {
    backgroundColor: Colors.teal,
  },
  content: {
    flex: 1,
    paddingHorizontal: 24,
  },
  scrollContent: {
    paddingBottom: 24,
  },
  iconRow: {
    alignItems: 'center',
    marginBottom: 20,
    marginTop: 20,
  },
  iconWrap: {
    width: 72,
    height: 72,
    borderRadius: 20,
    backgroundColor: Colors.accentDim,
    alignItems: 'center',
    justifyContent: 'center',
  },
  heading: {
    fontFamily: 'Inter_700Bold',
    fontSize: 28,
    color: Colors.text,
    marginBottom: 10,
    marginTop: 8,
  },
  subheading: {
    fontFamily: 'Inter_400Regular',
    fontSize: 15,
    color: Colors.textSub,
    lineHeight: 22,
    marginBottom: 32,
  },
  fieldLabel: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 13,
    color: Colors.textSub,
    letterSpacing: 0.5,
    textTransform: 'uppercase',
    marginBottom: 10,
    marginTop: 4,
  },
  input: {
    backgroundColor: Colors.card,
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontFamily: 'Inter_500Medium',
    fontSize: 17,
    color: Colors.text,
    borderWidth: 1,
    borderColor: Colors.border,
    marginBottom: 24,
  },
  counterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.card,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: Colors.border,
    overflow: 'hidden',
    marginBottom: 24,
  },
  counterBtn: {
    flex: 1,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  counterValue: {
    fontFamily: 'Inter_700Bold',
    fontSize: 22,
    color: Colors.text,
    flex: 1,
    textAlign: 'center',
  },
  timesRow: {
    flexDirection: 'row',
    gap: 16,
    marginBottom: 28,
    marginTop: 8,
  },
  timeBlock: {
    flex: 1,
    backgroundColor: Colors.card,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: 16,
    alignItems: 'center',
  },
  timeLabel: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 12,
    color: Colors.textSub,
    letterSpacing: 0.5,
    textTransform: 'uppercase',
    marginBottom: 12,
  },
  timeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  timeUnit: {
    alignItems: 'center',
  },
  timeBtn: {
    padding: 6,
  },
  timeValue: {
    fontFamily: 'Inter_700Bold',
    fontSize: 28,
    color: Colors.text,
    width: 48,
    textAlign: 'center',
  },
  timeSep: {
    fontFamily: 'Inter_700Bold',
    fontSize: 28,
    color: Colors.textSub,
    marginBottom: 2,
  },
  currencyRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 24,
  },
  currencyBtn: {
    width: 52,
    height: 52,
    borderRadius: 12,
    backgroundColor: Colors.card,
    borderWidth: 1,
    borderColor: Colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  currencyBtnActive: {
    borderColor: Colors.accent,
    backgroundColor: Colors.accentDim,
  },
  currencyText: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 18,
    color: Colors.textSub,
  },
  currencyTextActive: {
    color: Colors.accent,
  },
  diffCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.card,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: 16,
    marginBottom: 12,
    gap: 14,
  },
  diffDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  diffText: {
    flex: 1,
  },
  diffLabel: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 16,
    color: Colors.text,
  },
  diffDesc: {
    fontFamily: 'Inter_400Regular',
    fontSize: 13,
    color: Colors.textSub,
    marginTop: 2,
  },
  summaryCard: {
    backgroundColor: Colors.elevated,
    borderRadius: 14,
    padding: 16,
    marginTop: 20,
    gap: 12,
  },
  summaryTitle: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 14,
    color: Colors.textSub,
    letterSpacing: 0.4,
    textTransform: 'uppercase',
    marginBottom: 4,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  summaryLabel: {
    fontFamily: 'Inter_400Regular',
    fontSize: 14,
    color: Colors.textSub,
  },
  summaryValue: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 14,
    color: Colors.text,
  },
  footer: {
    flexDirection: 'row',
    paddingHorizontal: 24,
    paddingBottom: 16,
    paddingTop: 12,
    gap: 12,
    alignItems: 'center',
  },
  backBtn: {
    width: 48,
    height: 52,
    borderRadius: 14,
    backgroundColor: Colors.card,
    borderWidth: 1,
    borderColor: Colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  nextBtn: {
    flex: 1,
    height: 52,
    borderRadius: 14,
    backgroundColor: Colors.accent,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  nextBtnDisabled: {
    backgroundColor: Colors.elevated,
  },
  nextBtnText: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 16,
    color: Colors.text,
  },
});
