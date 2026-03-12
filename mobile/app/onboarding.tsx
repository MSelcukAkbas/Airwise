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
import { useTranslation } from 'react-i18next';
import i18n from '@/lib/i18n';
import { useApp } from '@/contexts/AppContext';
import { UserProfile, DifficultyLevel, AirwiseConfig, RegionConfig, DifficultyConfig } from '@/utils/types';
import Colors from '@/constants/colors';
import configData from '../airwise.config.json';

const config = configData as AirwiseConfig;

const DIFFICULTIES = config.difficulties.map((d: DifficultyConfig) => ({
  ...d,
  key: d.key as DifficultyLevel,
  color: Colors[d.color as keyof typeof Colors] as string,
}));

const REGIONS = config.regions;

export default function OnboardingScreen() {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const { setupProfile } = useApp();
  const [step, setStep] = useState(0);
  const [name, setName] = useState('');
  const [dailyCount, setDailyCount] = useState('20');
  const [wakeTime, setWakeTime] = useState('08:00');
  const [sleepTime, setSleepTime] = useState('23:00');
  
  const [selectedRegion, setSelectedRegion] = useState(REGIONS[0].id);
  const [pricePerPack, setPricePerPack] = useState(String(REGIONS[0].average_price));
  const [currency, setCurrency] = useState(REGIONS[0].currency_symbol);
  const [packSize, setPackSize] = useState(REGIONS[0].quantity_per_pack);

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
      cigarettePricePerPack: parseFloat(pricePerPack) || REGIONS[0].average_price,
      cigarettesPerPack: packSize,
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
      frozenDates: [],
    };
    await setupProfile(profile);
    router.replace('/(tabs)');
  };

  const handleRegionSelect = (id: number) => {
    const r = REGIONS.find((x: RegionConfig) => x.id === id);
    if (r) {
      setSelectedRegion(id);
      setCurrency(r.currency_symbol);
      setPricePerPack(String(r.average_price));
      setPackSize(r.quantity_per_pack);
      Haptics.selectionAsync();
    }
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
        {[0, 1, 2, 3].map((i) => (
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
            <Text style={styles.heading}>{t('onboarding.takeControl.title')}</Text>
            <Text style={styles.subheading}>
              {t('onboarding.takeControl.description')}
            </Text>

            <Text style={styles.fieldLabel}>{t('onboarding.takeControl.nameLabel')}</Text>
            <TextInput
              style={styles.input}
              value={name}
              onChangeText={setName}
              placeholder={t('onboarding.takeControl.namePlaceholder')}
              placeholderTextColor={Colors.textTertiary}
              returnKeyType="next"
              autoFocus
            />

            <Text style={styles.fieldLabel}>{t('onboarding.takeControl.dailyCountLabel')}</Text>
            <View style={styles.counterMain}>
              <View style={styles.counterRow}>
                <TouchableOpacity
                  style={styles.counterBtn}
                  onPress={() => adjustNumber(setDailyCount, dailyCount, -1, 1, 100)}
                >
                  <Ionicons name="remove" size={24} color={Colors.accent} />
                </TouchableOpacity>
                <View style={styles.counterDisplay}>
                  <Text style={styles.counterValue}>{dailyCount}</Text>
                  <Text style={styles.counterUnit}>{t('onboarding.summary.dailyLimitValue', { count: 0 }).replace(/[0-9]/g, '').trim()}</Text>
                </View>
                <TouchableOpacity
                  style={styles.counterBtn}
                  onPress={() => adjustNumber(setDailyCount, dailyCount, 1, 1, 100)}
                >
                  <Ionicons name="add" size={24} color={Colors.accent} />
                </TouchableOpacity>
              </View>
            </View>

            <Text style={styles.fieldLabel}>{t('onboarding.languageLabel')}</Text>
            <View style={styles.langPicker}>
              <TouchableOpacity 
                style={[styles.langChip, i18n.language === 'tr' && styles.langChipActive]} 
                onPress={() => i18n.changeLanguage('tr')}
              >
                <Text style={[styles.langText, i18n.language === 'tr' && styles.langTextActive]}>Türkçe 🇹🇷</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={[styles.langChip, i18n.language === 'en' && styles.langChipActive]} 
                onPress={() => i18n.changeLanguage('en')}
              >
                <Text style={[styles.langText, i18n.language === 'en' && styles.langTextActive]}>English 🇺🇸</Text>
              </TouchableOpacity>
            </View>
          </ScrollView>
        )}

        {step === 1 && (
          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
            <Text style={styles.heading}>{t('onboarding.schedule.title')}</Text>
            <Text style={styles.subheading}>
              {t('onboarding.schedule.description')}
            </Text>

            <View style={styles.timesRow}>
              <TimeAdjuster label={t('onboarding.schedule.wakeUpLabel')} value={wakeTime} setter={setWakeTime} />
              <TimeAdjuster label={t('onboarding.schedule.sleepLabel')} value={sleepTime} setter={setSleepTime} />
            </View>

            <Text style={styles.fieldLabel}>{t('onboarding.schedule.currencyLabel', 'Currency')}</Text>
            <View style={styles.currencyRow}>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 10 }}>
                {REGIONS.map((r: RegionConfig) => (
                  <TouchableOpacity
                    key={r.id}
                    style={[styles.currencyBtn, selectedRegion === r.id && styles.currencyBtnActive]}
                    onPress={() => handleRegionSelect(r.id)}
                  >
                    <Text style={[styles.currencyText, selectedRegion === r.id && styles.currencyTextActive]}>
                      {r.currency_symbol}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>

            <Text style={styles.fieldLabel}>{t('onboarding.schedule.priceLabel', { currency })}</Text>
            <View style={styles.counterRow}>
              <TouchableOpacity
                style={styles.counterBtn}
                onPress={() => adjustNumber(setPricePerPack, pricePerPack, -1, 1, 9999)}
              >
                <Ionicons name="remove" size={22} color={Colors.text} />
              </TouchableOpacity>
              <Text style={styles.counterValue}>{currency}{pricePerPack}</Text>
              <TouchableOpacity
                style={styles.counterBtn}
                onPress={() => adjustNumber(setPricePerPack, pricePerPack, 1, 1, 9999)}
              >
                <Ionicons name="add" size={22} color={Colors.text} />
              </TouchableOpacity>
            </View>
          </ScrollView>
        )}

        {step === 2 && (
          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
            <Text style={styles.heading}>{t('onboarding.reduction.title')}</Text>
            <Text style={styles.subheading}>
              {t('onboarding.reduction.description')}
            </Text>

            {DIFFICULTIES.map((d) => {
              const icons: Record<string, any> = {
                easy: 'leaf',
                normal: 'analytics',
                hard: 'flash',
                veteran: 'skull'
              };
              return (
                <TouchableOpacity
                  key={d.key}
                  style={[
                    styles.diffCard, 
                    difficulty === d.key && { borderColor: d.color, borderWidth: 2, backgroundColor: d.color + '05' }
                  ]}
                  onPress={() => { setDifficulty(d.key); Haptics.selectionAsync(); }}
                >
                  <View style={[styles.diffIconBox, { backgroundColor: d.color + '15' }]}>
                    <Ionicons name={icons[d.key] || 'speedometer'} size={24} color={d.color} />
                  </View>
                  <View style={styles.diffText}>
                    <Text style={styles.diffLabel}>{t(`onboarding.reduction.levels.${d.key}.label`)}</Text>
                    <Text style={styles.diffDesc}>{t(`onboarding.reduction.levels.${d.key}.desc`)}</Text>
                    <Text style={[styles.diffDetails, { color: d.color }]}>{t(`onboarding.reduction.levels.${d.key}.details`)}</Text>
                  </View>
                  {difficulty === d.key && (
                    <Ionicons name="checkmark-circle" size={22} color={d.color} />
                  )}
                </TouchableOpacity>
              );
            })}

            <View style={styles.summaryCard}>
              <View style={styles.summaryHeader}>
                <Ionicons name="sparkles" size={20} color={Colors.accent} />
                <Text style={styles.summaryTitle}>{t('onboarding.summary.title')}</Text>
              </View>
              
              <View style={styles.summaryRow}>
                <View style={styles.summaryLabelGroup}>
                  <Ionicons name="medical" size={16} color={Colors.textTertiary} />
                  <Text style={styles.summaryLabel}>{t('onboarding.summary.dailyLimitLabel')}</Text>
                </View>
                <Text style={styles.summaryValue}>{t('onboarding.summary.dailyLimitValue', { count: Number(dailyCount) })}</Text>
              </View>
              
              <View style={styles.summaryRow}>
                <View style={styles.summaryLabelGroup}>
                  <Ionicons name="time" size={16} color={Colors.textTertiary} />
                  <Text style={styles.summaryLabel}>{t('onboarding.summary.activeHoursLabel')}</Text>
                </View>
                <Text style={styles.summaryValue}>{wakeTime} – {sleepTime}</Text>
              </View>
              
              <View style={styles.summaryRow}>
                <View style={styles.summaryLabelGroup}>
                  <Ionicons name="hourglass" size={16} color={Colors.textTertiary} />
                  <Text style={styles.summaryLabel}>{t('onboarding.summary.permissionIntervalLabel')}</Text>
                </View>
                <Text style={styles.summaryValue}>
                  {t('onboarding.summary.permissionIntervalValue', {
                    minutes: Math.round(
                      (() => {
                        const [wh, wm] = wakeTime.split(':').map(Number);
                        const [sh, sm] = sleepTime.split(':').map(Number);
                        let sleep = sh * 60 + sm;
                        const wake = wh * 60 + wm;
                        if (sleep <= wake) sleep += 1440;
                        return (sleep - wake) / (parseInt(dailyCount) || 1);
                      })(),
                    )
                  })}
                </Text>
              </View>

            </View>


          </ScrollView>
        )}

        {step === 3 && (
          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
            <View style={styles.iconRow}>
              <View style={[styles.iconWrap, { backgroundColor: 'rgba(245, 158, 11, 0.1)' }]}>
                <Ionicons name="shield-checkmark" size={32} color={Colors.warning} />
              </View>
            </View>
            <Text style={styles.heading}>{t('onboarding.honesty.title')}</Text>
            <Text style={styles.subheading}>
              {t('onboarding.honesty.description', { mode: t(`onboarding.reduction.levels.${difficulty}.label`) })}
            </Text>
            
            <View style={styles.honestyCard}>
              <Ionicons name="information-circle" size={24} color={Colors.accent} />
              <Text style={styles.honestyText}>
                {t('onboarding.honesty.warning')}
              </Text>
            </View>
            
            <View style={styles.infoBox}>
              <Text style={styles.infoBoxTitle}>💡 {t('onboarding.honesty.agree')}</Text>
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
            if (step < 3) animateStep(step + 1);
            else handleStart();
          }}
          disabled={step === 0 && !isStep0Valid}
        >
          <Text style={styles.nextBtnText}>{step < 3 ? t('onboarding.actions.continue') : t('onboarding.actions.beginJourney')}</Text>
          <Ionicons name={step < 3 ? 'arrow-forward' : 'checkmark'} size={18} color={Colors.text} />
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
  honestyCard: {
    backgroundColor: Colors.elevated,
    borderRadius: 20,
    padding: 20,
    flexDirection: 'row',
    gap: 16,
    borderWidth: 1,
    borderColor: Colors.border,
    marginBottom: 24,
  },
  honestyText: {
    flex: 1,
    fontFamily: 'Inter_400Regular',
    fontSize: 15,
    color: Colors.textSub,
    lineHeight: 22,
  },
  infoBox: {
    backgroundColor: 'rgba(91, 138, 245, 0.1)',
    borderRadius: 16,
    padding: 16,
    alignItems: 'center',
  },
  infoBoxTitle: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 15,
    color: Colors.accent,
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
    borderRadius: 16,
    paddingHorizontal: 20,
    paddingVertical: 16,
    fontFamily: 'Inter_500Medium',
    fontSize: 18,
    color: Colors.text,
    borderWidth: 1.5,
    borderColor: Colors.border,
    marginBottom: 28,
  },
  counterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.card,
    borderRadius: 20,
    borderWidth: 1.5,
    borderColor: Colors.border,
    overflow: 'hidden',
  },
  counterBtn: {
    padding: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  counterDisplay: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'center',
    gap: 4,
  },
  counterValue: {
    fontFamily: 'Inter_700Bold',
    fontSize: 48,
    color: Colors.text,
  },
  counterUnit: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 16,
    color: Colors.textSub,
  },
  counterMain: {
    gap: 16,
    marginBottom: 24,
  },
  quickSelectGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 10,
  },
  quickChip: {
    flex: 1,
    paddingVertical: 10,
    backgroundColor: Colors.card,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.border,
    alignItems: 'center',
  },
  quickChipActive: {
    borderColor: Colors.accent,
    backgroundColor: Colors.accentDim,
  },
  quickChipText: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 14,
    color: Colors.textSub,
  },
  quickChipTextActive: {
    color: Colors.accent,
  },
  langPicker: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 20,
  },
  langChip: {
    flex: 1,
    backgroundColor: Colors.card,
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: Colors.border,
  },
  langChipActive: {
    borderColor: Colors.accent,
    backgroundColor: Colors.accentDim,
  },
  langText: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 14,
    color: Colors.textSub,
  },
  langTextActive: {
    color: Colors.accent,
  },
  diffIconBox: {
    width: 48,
    height: 48,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
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
  diffDetails: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 12,
    color: Colors.textTertiary,
    marginTop: 4,
  },
  summaryCard: {
    backgroundColor: Colors.elevated,
    borderRadius: 20,
    padding: 20,
    marginTop: 24,
    gap: 16,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  summaryHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  },
  summaryTitle: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 14,
    color: Colors.accent,
    letterSpacing: 0.4,
    textTransform: 'uppercase',
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  summaryLabelGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  summaryLabel: {
    fontFamily: 'Inter_400Regular',
    fontSize: 14,
    color: Colors.textSub,
  },
  summaryValue: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 15,
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
