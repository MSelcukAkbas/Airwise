import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Modal,
  TextInput,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Haptics from 'expo-haptics';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useApp } from '@/contexts/AppContext';
import { UserProfile, DifficultyLevel } from '@/utils/types';
import Colors from '@/constants/colors';
import { getDaysSinceStart, getIntervalMinutes } from '@/utils/algorithm';

const PHASE_INFO = {
  control: { label: 'Control Phase', sub: 'Days 1–7: Building rhythm', color: Colors.phaseControl },
  reduction: { label: 'Reduction Phase', sub: 'Weeks 2–8: Cutting down', color: Colors.phaseReduction },
  delay: { label: 'Delay Phase', sub: 'Extending intervals', color: Colors.phaseDelay },
  freedom: { label: 'Freedom Phase', sub: 'Final stretch', color: Colors.phaseFreedom },
};

const PHASE_ORDER = ['control', 'reduction', 'delay', 'freedom'] as const;

const DIFFICULTIES: { key: DifficultyLevel; label: string; desc: string; color: string }[] = [
  { key: 'easy', label: 'Gentle', desc: '-1/week', color: Colors.success },
  { key: 'normal', label: 'Steady', desc: '-2/week', color: Colors.warning },
  { key: 'hard', label: 'Intensive', desc: '-3/week', color: Colors.danger },
];

function TimeAdjuster({
  label,
  value,
  setter,
}: {
  label: string;
  value: string;
  setter: (v: string) => void;
}) {
  const adjust = (part: 'h' | 'm', delta: number) => {
    const [h, m] = value.split(':').map(Number);
    let newH = h;
    let newM = m;
    if (part === 'h') newH = (h + delta + 24) % 24;
    else newM = (m + delta + 60) % 60;
    setter(`${String(newH).padStart(2, '0')}:${String(newM).padStart(2, '0')}`);
    Haptics.selectionAsync();
  };
  return (
    <View style={styles.timeBlock}>
      <Text style={styles.timeLabel}>{label}</Text>
      <View style={styles.timeRow}>
        <View style={styles.timeUnit}>
          <TouchableOpacity onPress={() => adjust('h', 1)} style={styles.timeBtn}>
            <Ionicons name="chevron-up" size={16} color={Colors.accent} />
          </TouchableOpacity>
          <Text style={styles.timeVal}>{value.split(':')[0]}</Text>
          <TouchableOpacity onPress={() => adjust('h', -1)} style={styles.timeBtn}>
            <Ionicons name="chevron-down" size={16} color={Colors.accent} />
          </TouchableOpacity>
        </View>
        <Text style={styles.timeSep}>:</Text>
        <View style={styles.timeUnit}>
          <TouchableOpacity onPress={() => adjust('m', 5)} style={styles.timeBtn}>
            <Ionicons name="chevron-up" size={16} color={Colors.accent} />
          </TouchableOpacity>
          <Text style={styles.timeVal}>{value.split(':')[1]}</Text>
          <TouchableOpacity onPress={() => adjust('m', -5)} style={styles.timeBtn}>
            <Ionicons name="chevron-down" size={16} color={Colors.accent} />
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

function NumberStepper({
  value,
  onChange,
  min,
  max,
  step = 1,
  prefix = '',
  suffix = '',
}: {
  value: number;
  onChange: (n: number) => void;
  min: number;
  max: number;
  step?: number;
  prefix?: string;
  suffix?: string;
}) {
  return (
    <View style={styles.stepper}>
      <TouchableOpacity
        style={styles.stepBtn}
        onPress={() => { onChange(Math.max(min, value - step)); Haptics.selectionAsync(); }}
        disabled={value <= min}
      >
        <Ionicons name="remove" size={18} color={value <= min ? Colors.textTertiary : Colors.text} />
      </TouchableOpacity>
      <Text style={styles.stepValue}>{prefix}{value}{suffix}</Text>
      <TouchableOpacity
        style={styles.stepBtn}
        onPress={() => { onChange(Math.min(max, value + step)); Haptics.selectionAsync(); }}
        disabled={value >= max}
      >
        <Ionicons name="add" size={18} color={value >= max ? Colors.textTertiary : Colors.text} />
      </TouchableOpacity>
    </View>
  );
}

export default function ProfileScreen() {
  const insets = useSafeAreaInsets();
  const { profile, updateProfile, getCumulativeSaved, getTotalSavedToday, useFreeze } = useApp();

  const [showEditModal, setShowEditModal] = useState(false);
  const [showResetModal, setShowResetModal] = useState(false);

  const [editName, setEditName] = useState('');
  const [editWakeTime, setEditWakeTime] = useState('');
  const [editSleepTime, setEditSleepTime] = useState('');
  const [editPrice, setEditPrice] = useState(0);
  const [editPackSize, setEditPackSize] = useState(20);
  const [editCurrency, setEditCurrency] = useState('₺');
  const [editDifficulty, setEditDifficulty] = useState<DifficultyLevel>('normal');
  const [editDailyLimit, setEditDailyLimit] = useState(0);

  if (!profile) return null;

  const dayCount = getDaysSinceStart(profile) + 1;
  const phase = PHASE_INFO[profile.currentPhase];
  const phaseIndex = PHASE_ORDER.indexOf(profile.currentPhase);
  const intervalMins = getIntervalMinutes(profile);
  const savedTotal = getCumulativeSaved();
  const savedToday = getTotalSavedToday();
  const pricePerCig = profile.cigarettePricePerPack / (profile.cigarettesPerPack || 20);
  const totalNotSmoked = Math.max(
    0,
    (profile.dailyStartLimit - profile.currentDailyLimit) * getDaysSinceStart(profile),
  );

  const openEdit = () => {
    setEditName(profile.name);
    setEditWakeTime(profile.wakeUpTime);
    setEditSleepTime(profile.sleepTime);
    setEditPrice(profile.cigarettePricePerPack);
    setEditPackSize(profile.cigarettesPerPack || 20);
    setEditCurrency(profile.currency);
    setEditDifficulty(profile.difficultyLevel);
    setEditDailyLimit(profile.currentDailyLimit);
    setShowEditModal(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };

  const saveEdit = async () => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    await updateProfile({
      name: editName.trim() || profile.name,
      wakeUpTime: editWakeTime,
      sleepTime: editSleepTime,
      cigarettePricePerPack: editPrice,
      cigarettesPerPack: editPackSize,
      currency: editCurrency,
      difficultyLevel: editDifficulty,
      currentDailyLimit: editDailyLimit,
    });
    setShowEditModal(false);
  };

  const handleUseFreeze = async () => {
    const used = await useFreeze();
    Haptics.notificationAsync(
      used ? Haptics.NotificationFeedbackType.Success : Haptics.NotificationFeedbackType.Error,
    );
  };

  const handleReset = async () => {
    setShowResetModal(false);
    await AsyncStorage.clear();
    router.replace('/onboarding');
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top + (Platform.OS === 'web' ? 67 : 0) }]}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[
          styles.scrollContent,
          { paddingBottom: insets.bottom + (Platform.OS === 'web' ? 34 : 84) },
        ]}
      >
        <View style={styles.pageHeader}>
          <Text style={styles.pageTitle}>Profile</Text>
        </View>

        <View style={styles.identityCard}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{profile.name.charAt(0).toUpperCase()}</Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.identityName}>{profile.name}</Text>
            <Text style={styles.identityDays}>
              Day {dayCount} · {profile.difficultyLevel.charAt(0).toUpperCase() + profile.difficultyLevel.slice(1)} mode
            </Text>
          </View>
          <TouchableOpacity style={styles.editIconBtn} onPress={openEdit}>
            <Ionicons name="create-outline" size={20} color={Colors.accent} />
          </TouchableOpacity>
        </View>

        <View style={styles.journeyCard}>
          <Text style={styles.sectionTitle}>PHASE PROGRESS</Text>
          <View style={styles.phaseSteps}>
            {PHASE_ORDER.map((p, i) => (
              <View key={p} style={styles.phaseStep}>
                <View
                  style={[
                    styles.phaseStepDot,
                    i <= phaseIndex && { backgroundColor: PHASE_INFO[p].color },
                    i === phaseIndex && styles.phaseStepDotActive,
                  ]}
                />
                {i < PHASE_ORDER.length - 1 && (
                  <View
                    style={[
                      styles.phaseStepLine,
                      i < phaseIndex && { backgroundColor: PHASE_INFO[PHASE_ORDER[i + 1]].color },
                    ]}
                  />
                )}
                <Text style={[styles.phaseStepLabel, i === phaseIndex && { color: phase.color }]}>
                  {PHASE_INFO[p].label.split(' ')[0]}
                </Text>
              </View>
            ))}
          </View>
          <Text style={styles.phaseDesc}>{phase.sub}</Text>
        </View>

        <View style={styles.statsGrid}>
          <View style={styles.statCard}>
            <Ionicons name="trending-down" size={20} color={Colors.success} />
            <Text style={styles.statBig}>{profile.dailyStartLimit - profile.currentDailyLimit}</Text>
            <Text style={styles.statSmall}>Reduced/day</Text>
          </View>
          <View style={styles.statCard}>
            <Ionicons name="time-outline" size={20} color={Colors.accent} />
            <Text style={styles.statBig}>{intervalMins}m</Text>
            <Text style={styles.statSmall}>Interval</Text>
          </View>
          <View style={styles.statCard}>
            <Ionicons name="flash" size={20} color={Colors.warning} />
            <Text style={styles.statBig}>{profile.xpPoints}</Text>
            <Text style={styles.statSmall}>XP earned</Text>
          </View>
          <View style={styles.statCard}>
            <Ionicons name="snow" size={20} color={Colors.accent} />
            <Text style={styles.statBig}>{profile.freezeCount}</Text>
            <Text style={styles.statSmall}>Freeze left</Text>
          </View>
        </View>

        <View style={styles.savingsCard}>
          <Text style={styles.sectionTitle}>SAVINGS</Text>
          <View style={styles.savingsMain}>
            <Text style={styles.savingsBig}>{profile.currency}{savedTotal.toFixed(2)}</Text>
            <Text style={styles.savingsSub}>estimated total saved</Text>
          </View>
          <View style={styles.savingsRow}>
            <View style={styles.savingsMini}>
              <Text style={styles.savingsMiniNum}>{profile.currency}{savedToday.toFixed(2)}</Text>
              <Text style={styles.savingsMiniLabel}>Today</Text>
            </View>
            <View style={styles.savingsMini}>
              <Text style={styles.savingsMiniNum}>{totalNotSmoked}</Text>
              <Text style={styles.savingsMiniLabel}>Not smoked</Text>
            </View>
            <View style={styles.savingsMini}>
              <Text style={styles.savingsMiniNum}>{profile.currency}{pricePerCig.toFixed(2)}</Text>
              <Text style={styles.savingsMiniLabel}>Per cigarette</Text>
            </View>
          </View>
        </View>

        <View style={styles.streaksCard}>
          <Text style={styles.sectionTitle}>STREAKS</Text>
          <View style={styles.streakTable}>
            <View style={styles.streakTableRow}>
              <Text style={[styles.streakTableLabel, { flex: 2 }]}></Text>
              <Text style={styles.streakTableHead}>Current</Text>
              <Text style={styles.streakTableHead}>Best</Text>
            </View>
            <View style={styles.streakTableRow}>
              <View style={styles.streakTableLabelRow}>
                <Ionicons name="shield-checkmark" size={14} color={Colors.phaseControl} />
                <Text style={styles.streakTableLabel}>Control</Text>
              </View>
              <Text style={[styles.streakTableVal, { color: Colors.phaseControl }]}>{profile.controlStreak}d</Text>
              <Text style={styles.streakTableVal}>{profile.longestControlStreak}d</Text>
            </View>
            <View style={styles.streakTableRow}>
              <View style={styles.streakTableLabelRow}>
                <Ionicons name="trophy" size={14} color={Colors.teal} />
                <Text style={styles.streakTableLabel}>Target</Text>
              </View>
              <Text style={[styles.streakTableVal, { color: Colors.teal }]}>{profile.targetStreak}d</Text>
              <Text style={styles.streakTableVal}>{profile.longestTargetStreak}d</Text>
            </View>
          </View>
        </View>

        <View style={styles.freezeSection}>
          <View style={styles.freezeHeader}>
            <Ionicons name="snow" size={18} color={Colors.accent} />
            <Text style={styles.sectionTitle}>FREEZE SHIELD</Text>
          </View>
          <Text style={styles.freezeDesc}>
            Use a freeze token to protect your streak from an unplanned slip. Tokens are earned through tasks — not purchasable.
          </Text>
          <TouchableOpacity
            style={[styles.freezeBtn, profile.freezeCount === 0 && styles.freezeBtnDisabled]}
            onPress={handleUseFreeze}
            disabled={profile.freezeCount === 0}
          >
            <Ionicons name="snow" size={18} color={profile.freezeCount > 0 ? Colors.text : Colors.textTertiary} />
            <Text style={[styles.freezeBtnText, profile.freezeCount === 0 && styles.freezeBtnTextDisabled]}>
              Use Freeze Token ({profile.freezeCount} left)
            </Text>
          </TouchableOpacity>
        </View>

        <View style={styles.settingsSection}>
          <View style={styles.settingsTitleRow}>
            <Text style={styles.sectionTitle}>SETTINGS</Text>
            <TouchableOpacity style={styles.editTextBtn} onPress={openEdit}>
              <Ionicons name="create-outline" size={15} color={Colors.accent} />
              <Text style={styles.editTextBtnLabel}>Edit</Text>
            </TouchableOpacity>
          </View>
          <View style={styles.settingsCard}>
            <View style={styles.settingRow}>
              <Ionicons name="person-outline" size={18} color={Colors.textSub} />
              <Text style={styles.settingLabel}>Name</Text>
              <Text style={styles.settingValue}>{profile.name}</Text>
            </View>
            <View style={[styles.settingRow, styles.settingRowBorder]}>
              <Ionicons name="moon-outline" size={18} color={Colors.textSub} />
              <Text style={styles.settingLabel}>Active hours</Text>
              <Text style={styles.settingValue}>{profile.wakeUpTime} – {profile.sleepTime}</Text>
            </View>
            <View style={[styles.settingRow, styles.settingRowBorder]}>
              <Ionicons name="stats-chart" size={18} color={Colors.textSub} />
              <Text style={styles.settingLabel}>Daily limit</Text>
              <Text style={styles.settingValue}>{profile.currentDailyLimit} cigarettes</Text>
            </View>
            <View style={[styles.settingRow, styles.settingRowBorder]}>
              <Ionicons name="pricetag-outline" size={18} color={Colors.textSub} />
              <Text style={styles.settingLabel}>Pack price</Text>
              <Text style={styles.settingValue}>{profile.currency}{profile.cigarettePricePerPack} / {profile.cigarettesPerPack} cig</Text>
            </View>
            <View style={[styles.settingRow, styles.settingRowBorder]}>
              <Ionicons name="speedometer-outline" size={18} color={Colors.textSub} />
              <Text style={styles.settingLabel}>Difficulty</Text>
              <Text style={styles.settingValue}>{profile.difficultyLevel}</Text>
            </View>
          </View>
        </View>

        <TouchableOpacity style={styles.resetBtn} onPress={() => setShowResetModal(true)}>
          <Ionicons name="refresh-outline" size={16} color={Colors.danger} />
          <Text style={styles.resetBtnText}>Reset & Restart Journey</Text>
        </TouchableOpacity>
      </ScrollView>

      {/* ─── Edit Modal ─── */}
      <Modal
        visible={showEditModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowEditModal(false)}
      >
        <KeyboardAvoidingView
          style={{ flex: 1 }}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          <View style={styles.editOverlay}>
            <View
              style={[
                styles.editSheet,
                { paddingBottom: insets.bottom + 16 },
              ]}
            >
              <View style={styles.editHeader}>
                <Text style={styles.editTitle}>Edit Settings</Text>
                <TouchableOpacity onPress={() => setShowEditModal(false)} style={styles.editCloseBtn}>
                  <Ionicons name="close" size={22} color={Colors.textSub} />
                </TouchableOpacity>
              </View>

              <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.editScrollContent}>
                {/* Name */}
                <Text style={styles.editFieldLabel}>NAME</Text>
                <TextInput
                  style={styles.editInput}
                  value={editName}
                  onChangeText={setEditName}
                  placeholder="Your name"
                  placeholderTextColor={Colors.textTertiary}
                />

                {/* Active Hours */}
                <Text style={styles.editFieldLabel}>ACTIVE HOURS</Text>
                <View style={styles.timesRow}>
                  <TimeAdjuster label="Wake up" value={editWakeTime} setter={setEditWakeTime} />
                  <TimeAdjuster label="Sleep" value={editSleepTime} setter={setEditSleepTime} />
                </View>

                {/* Daily Limit */}
                <Text style={styles.editFieldLabel}>CURRENT DAILY LIMIT</Text>
                <View style={styles.editRow}>
                  <Text style={styles.editRowLabel}>Cigarettes per day</Text>
                  <NumberStepper
                    value={editDailyLimit}
                    onChange={setEditDailyLimit}
                    min={1}
                    max={60}
                    suffix=" cig"
                  />
                </View>
                <Text style={styles.editHint}>
                  Changing this manually overrides the algorithm. Use with care.
                </Text>

                {/* Price */}
                <Text style={styles.editFieldLabel}>CIGARETTE PRICE</Text>
                <View style={styles.editRow}>
                  <Text style={styles.editRowLabel}>Price per pack</Text>
                  <NumberStepper
                    value={editPrice}
                    onChange={setEditPrice}
                    min={1}
                    max={999}
                    step={5}
                    prefix={editCurrency}
                  />
                </View>
                <View style={[styles.editRow, { marginTop: 10 }]}>
                  <Text style={styles.editRowLabel}>Cigarettes per pack</Text>
                  <NumberStepper
                    value={editPackSize}
                    onChange={setEditPackSize}
                    min={10}
                    max={40}
                    step={1}
                    suffix=" cig"
                  />
                </View>

                {/* Currency */}
                <Text style={styles.editFieldLabel}>CURRENCY</Text>
                <View style={styles.currencyRow}>
                  {['₺', '$', '€', '£', '¥'].map((c) => (
                    <TouchableOpacity
                      key={c}
                      style={[styles.currencyBtn, editCurrency === c && styles.currencyBtnActive]}
                      onPress={() => { setEditCurrency(c); Haptics.selectionAsync(); }}
                    >
                      <Text style={[styles.currencyText, editCurrency === c && styles.currencyTextActive]}>{c}</Text>
                    </TouchableOpacity>
                  ))}
                </View>

                {/* Difficulty */}
                <Text style={styles.editFieldLabel}>REDUCTION SPEED</Text>
                {DIFFICULTIES.map((d) => (
                  <TouchableOpacity
                    key={d.key}
                    style={[styles.diffCard, editDifficulty === d.key && { borderColor: d.color, borderWidth: 2 }]}
                    onPress={() => { setEditDifficulty(d.key); Haptics.selectionAsync(); }}
                  >
                    <View style={[styles.diffDot, { backgroundColor: d.color }]} />
                    <View style={{ flex: 1 }}>
                      <Text style={styles.diffLabel}>{d.label}</Text>
                      <Text style={styles.diffDesc}>{d.desc}</Text>
                    </View>
                    {editDifficulty === d.key && (
                      <Ionicons name="checkmark-circle" size={20} color={d.color} />
                    )}
                  </TouchableOpacity>
                ))}

                <View style={styles.editActions}>
                  <TouchableOpacity style={styles.cancelEditBtn} onPress={() => setShowEditModal(false)}>
                    <Text style={styles.cancelEditText}>Cancel</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.saveBtn} onPress={saveEdit}>
                    <Ionicons name="checkmark" size={18} color={Colors.text} />
                    <Text style={styles.saveBtnText}>Save Changes</Text>
                  </TouchableOpacity>
                </View>
              </ScrollView>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* ─── Reset Modal ─── */}
      <Modal
        visible={showResetModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowResetModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Ionicons name="warning-outline" size={36} color={Colors.danger} />
            <Text style={styles.modalTitle}>Reset Everything?</Text>
            <Text style={styles.modalText}>
              This will erase all your progress, streaks, and logs. This action cannot be undone.
            </Text>
            <TouchableOpacity style={styles.modalDangerBtn} onPress={handleReset}>
              <Text style={styles.modalDangerText}>Yes, Reset</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.modalCancelBtn} onPress={() => setShowResetModal(false)}>
              <Text style={styles.modalCancelText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  scrollContent: { paddingHorizontal: 20, gap: 16 },
  pageHeader: { paddingTop: 12, paddingBottom: 4 },
  pageTitle: { fontFamily: 'Inter_700Bold', fontSize: 28, color: Colors.text },

  identityCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    backgroundColor: Colors.card,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 14,
    backgroundColor: Colors.accentDim,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: { fontFamily: 'Inter_700Bold', fontSize: 22, color: Colors.accent },
  identityName: { fontFamily: 'Inter_700Bold', fontSize: 18, color: Colors.text },
  identityDays: { fontFamily: 'Inter_400Regular', fontSize: 13, color: Colors.textSub, marginTop: 2 },
  editIconBtn: {
    width: 38,
    height: 38,
    borderRadius: 10,
    backgroundColor: Colors.accentDim,
    alignItems: 'center',
    justifyContent: 'center',
  },

  sectionTitle: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 11,
    color: Colors.textSub,
    letterSpacing: 1.5,
    marginBottom: 14,
  },

  journeyCard: {
    backgroundColor: Colors.card,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  phaseSteps: { flexDirection: 'row', alignItems: 'center', marginBottom: 10 },
  phaseStep: { flex: 1, alignItems: 'center' },
  phaseStepDot: { width: 14, height: 14, borderRadius: 7, backgroundColor: Colors.border, marginBottom: 6 },
  phaseStepDotActive: { width: 18, height: 18, borderRadius: 9 },
  phaseStepLine: {
    position: 'absolute',
    top: 6,
    left: '60%',
    right: '-60%',
    height: 2,
    backgroundColor: Colors.border,
  },
  phaseStepLabel: { fontFamily: 'Inter_500Medium', fontSize: 10, color: Colors.textTertiary },
  phaseDesc: { fontFamily: 'Inter_400Regular', fontSize: 13, color: Colors.textSub },

  statsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  statCard: {
    flex: 1,
    minWidth: '45%',
    backgroundColor: Colors.card,
    borderRadius: 14,
    padding: 14,
    gap: 6,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  statBig: { fontFamily: 'Inter_700Bold', fontSize: 26, color: Colors.text },
  statSmall: { fontFamily: 'Inter_400Regular', fontSize: 12, color: Colors.textSub },

  savingsCard: {
    backgroundColor: Colors.card,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  savingsMain: { marginBottom: 16 },
  savingsBig: { fontFamily: 'Inter_700Bold', fontSize: 36, color: Colors.success },
  savingsSub: { fontFamily: 'Inter_400Regular', fontSize: 13, color: Colors.textSub, marginTop: 2 },
  savingsRow: { flexDirection: 'row', gap: 8 },
  savingsMini: { flex: 1, backgroundColor: Colors.elevated, borderRadius: 10, padding: 10, alignItems: 'center' },
  savingsMiniNum: { fontFamily: 'Inter_700Bold', fontSize: 15, color: Colors.text },
  savingsMiniLabel: { fontFamily: 'Inter_400Regular', fontSize: 11, color: Colors.textSub, marginTop: 2 },

  streaksCard: {
    backgroundColor: Colors.card,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  streakTable: { gap: 10 },
  streakTableRow: { flexDirection: 'row', alignItems: 'center' },
  streakTableLabelRow: { flex: 2, flexDirection: 'row', alignItems: 'center', gap: 6 },
  streakTableLabel: { fontFamily: 'Inter_500Medium', fontSize: 14, color: Colors.textSub, flex: 2 },
  streakTableHead: {
    flex: 1,
    fontFamily: 'Inter_600SemiBold',
    fontSize: 12,
    color: Colors.textTertiary,
    textAlign: 'center',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  streakTableVal: { flex: 1, fontFamily: 'Inter_700Bold', fontSize: 16, color: Colors.text, textAlign: 'center' },

  freezeSection: {
    backgroundColor: Colors.card,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: Colors.border,
    gap: 12,
  },
  freezeHeader: { flexDirection: 'row', gap: 8, alignItems: 'center', marginBottom: -4 },
  freezeDesc: { fontFamily: 'Inter_400Regular', fontSize: 13, color: Colors.textSub, lineHeight: 19 },
  freezeBtn: {
    backgroundColor: Colors.accentDim,
    borderRadius: 12,
    paddingVertical: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderWidth: 1,
    borderColor: Colors.accent + '30',
  },
  freezeBtnDisabled: { backgroundColor: Colors.elevated, borderColor: Colors.border },
  freezeBtnText: { fontFamily: 'Inter_600SemiBold', fontSize: 14, color: Colors.text },
  freezeBtnTextDisabled: { color: Colors.textTertiary },

  settingsSection: { gap: 0 },
  settingsTitleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
  },
  editTextBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    backgroundColor: Colors.accentDim,
  },
  editTextBtnLabel: { fontFamily: 'Inter_600SemiBold', fontSize: 12, color: Colors.accent },
  settingsCard: {
    backgroundColor: Colors.card,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: Colors.border,
    overflow: 'hidden',
  },
  settingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  settingRowBorder: { borderTopWidth: 1, borderTopColor: Colors.border },
  settingLabel: { fontFamily: 'Inter_500Medium', fontSize: 14, color: Colors.text, flex: 1 },
  settingValue: { fontFamily: 'Inter_500Medium', fontSize: 14, color: Colors.textSub },

  resetBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.danger + '30',
    backgroundColor: Colors.dangerDim,
    marginBottom: 8,
  },
  resetBtnText: { fontFamily: 'Inter_500Medium', fontSize: 14, color: Colors.danger },

  // ── Edit Sheet ──
  editOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'flex-end',
  },
  editSheet: {
    backgroundColor: Colors.surface,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '92%',
    borderTopWidth: 1,
    borderColor: Colors.border,
  },
  editHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 4,
  },
  editTitle: { fontFamily: 'Inter_700Bold', fontSize: 20, color: Colors.text },
  editCloseBtn: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: Colors.card,
    alignItems: 'center',
    justifyContent: 'center',
  },
  editScrollContent: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 8,
    gap: 4,
  },
  editFieldLabel: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 11,
    color: Colors.textSub,
    letterSpacing: 1.2,
    marginTop: 16,
    marginBottom: 8,
  },
  editInput: {
    backgroundColor: Colors.card,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 13,
    fontFamily: 'Inter_500Medium',
    fontSize: 16,
    color: Colors.text,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  editRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: Colors.card,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  editRowLabel: { fontFamily: 'Inter_500Medium', fontSize: 14, color: Colors.text },
  editHint: {
    fontFamily: 'Inter_400Regular',
    fontSize: 12,
    color: Colors.textTertiary,
    marginTop: 6,
    lineHeight: 17,
  },

  timesRow: { flexDirection: 'row', gap: 12 },
  timeBlock: {
    flex: 1,
    backgroundColor: Colors.card,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: 12,
    alignItems: 'center',
  },
  timeLabel: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 11,
    color: Colors.textSub,
    letterSpacing: 0.4,
    textTransform: 'uppercase',
    marginBottom: 8,
  },
  timeRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  timeUnit: { alignItems: 'center' },
  timeBtn: { padding: 4 },
  timeVal: {
    fontFamily: 'Inter_700Bold',
    fontSize: 26,
    color: Colors.text,
    width: 40,
    textAlign: 'center',
  },
  timeSep: { fontFamily: 'Inter_700Bold', fontSize: 26, color: Colors.textSub, marginBottom: 2 },

  stepper: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  stepBtn: {
    width: 34,
    height: 34,
    borderRadius: 8,
    backgroundColor: Colors.elevated,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepValue: {
    fontFamily: 'Inter_700Bold',
    fontSize: 16,
    color: Colors.text,
    minWidth: 72,
    textAlign: 'center',
  },

  currencyRow: { flexDirection: 'row', gap: 10 },
  currencyBtn: {
    width: 50,
    height: 50,
    borderRadius: 12,
    backgroundColor: Colors.card,
    borderWidth: 1,
    borderColor: Colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  currencyBtnActive: { borderColor: Colors.accent, backgroundColor: Colors.accentDim },
  currencyText: { fontFamily: 'Inter_600SemiBold', fontSize: 18, color: Colors.textSub },
  currencyTextActive: { color: Colors.accent },

  diffCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.card,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: 14,
    marginBottom: 8,
    gap: 12,
  },
  diffDot: { width: 10, height: 10, borderRadius: 5 },
  diffLabel: { fontFamily: 'Inter_600SemiBold', fontSize: 15, color: Colors.text },
  diffDesc: { fontFamily: 'Inter_400Regular', fontSize: 12, color: Colors.textSub, marginTop: 1 },

  editActions: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 20,
    marginBottom: 8,
  },
  cancelEditBtn: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: Colors.elevated,
    alignItems: 'center',
  },
  cancelEditText: { fontFamily: 'Inter_600SemiBold', fontSize: 15, color: Colors.textSub },
  saveBtn: {
    flex: 2,
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: Colors.accent,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  saveBtnText: { fontFamily: 'Inter_700Bold', fontSize: 15, color: Colors.text },

  // ── Reset Modal ──
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.75)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  modalCard: {
    backgroundColor: Colors.card,
    borderRadius: 20,
    padding: 24,
    width: '100%',
    maxWidth: 340,
    alignItems: 'center',
    gap: 12,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  modalTitle: { fontFamily: 'Inter_700Bold', fontSize: 20, color: Colors.text },
  modalText: {
    fontFamily: 'Inter_400Regular',
    fontSize: 14,
    color: Colors.textSub,
    textAlign: 'center',
    lineHeight: 20,
  },
  modalDangerBtn: {
    backgroundColor: Colors.danger,
    borderRadius: 12,
    paddingVertical: 13,
    width: '100%',
    alignItems: 'center',
  },
  modalDangerText: { fontFamily: 'Inter_700Bold', fontSize: 15, color: Colors.text },
  modalCancelBtn: {
    backgroundColor: Colors.elevated,
    borderRadius: 12,
    paddingVertical: 13,
    width: '100%',
    alignItems: 'center',
  },
  modalCancelText: { fontFamily: 'Inter_600SemiBold', fontSize: 15, color: Colors.textSub },
});
