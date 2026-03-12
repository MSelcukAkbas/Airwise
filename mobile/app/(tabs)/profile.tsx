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
import { storage } from '@/services/storage/StorageService';
import * as Haptics from 'expo-haptics';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { useApp } from '@/contexts/AppContext';
import { UserProfile, DifficultyLevel, AirwiseConfig, DifficultyConfig } from '@/utils/types';
import Colors from '@/constants/colors';
import { getDaysSinceStart } from '@/utils/algorithm';
import TimeAdjuster from '@/components/TimeAdjuster';
import NumberStepper from '@/components/NumberStepper';
import StatsGrid from '@/components/StatsGrid';
import SavingsCard from '@/components/SavingsCard';
import StreaksCard from '@/components/StreaksCard';
import ConfirmModal from '@/components/ConfirmModal';

const PHASE_INFO = {
  control: { labelKey: 'profile.phases.control.label', subKey: 'profile.phases.control.sub', color: Colors.phaseControl },
  reduction: { labelKey: 'profile.phases.reduction.label', subKey: 'profile.phases.reduction.sub', color: Colors.phaseReduction },
  delay: { labelKey: 'profile.phases.delay.label', subKey: 'profile.phases.delay.sub', color: Colors.phaseDelay },
  freedom: { labelKey: 'profile.phases.freedom.label', subKey: 'profile.phases.freedom.sub', color: Colors.phaseFreedom },
};

const PHASE_ORDER = ['control', 'reduction', 'delay', 'freedom'] as const;

import configData from '../../airwise.config.json';
const config = configData as AirwiseConfig;
const DIFFICULTIES = config.difficulties.map((d: DifficultyConfig) => ({
  ...d,
  key: d.key as DifficultyLevel,
  color: d.color.startsWith('#') ? d.color : (Colors[d.color as keyof typeof Colors] || Colors.accent) as string,
}));


export default function ProfileScreen() {
  const { t, i18n } = useTranslation();
  const insets = useSafeAreaInsets();
  const { profile, updateProfile, useFreeze, resetJourney } = useApp();

  const [showEditModal, setShowEditModal] = useState(false);
  const [showResetModal, setShowResetModal] = useState(false);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [pendingDifficulty, setPendingDifficulty] = useState<DifficultyLevel | null>(null);

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

  const handleDifficultySelect = (level: DifficultyLevel) => {
    if (level === profile.difficultyLevel) return;
    setPendingDifficulty(level);
    setShowConfirmModal(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
  };

  const confirmDifficultyChange = () => {
    if (pendingDifficulty) {
        setEditDifficulty(pendingDifficulty);
    }
    setShowConfirmModal(false);
    setPendingDifficulty(null);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
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
    await resetJourney();
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
          <Text style={styles.pageTitle}>{t('profile.title')}</Text>
          <TouchableOpacity style={styles.settingsHeaderBtn} onPress={openEdit}>
            <Ionicons name="settings-outline" size={24} color={Colors.textSub} />
          </TouchableOpacity>
        </View>

        <View style={styles.identityCard}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{profile.name.charAt(0).toUpperCase()}</Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.identityName}>{profile.name}</Text>
            <Text style={styles.identityDays}>
              {t('profile.dayMode', { day: dayCount, difficulty: t(`profile.difficulties.${profile.difficultyLevel}.label`) })}
            </Text>
          </View>
        </View>

        <View style={styles.journeyCard}>
          <Text style={styles.sectionTitle}>{t('profile.sections.phase')}</Text>
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
                  {t(PHASE_INFO[p].labelKey).split(' ')[0]}
                </Text>
              </View>
            ))}
          </View>
          <Text style={styles.phaseDesc}>{t(phase.subKey)}</Text>
        </View>

        <StatsGrid />
        <SavingsCard />
        <StreaksCard />

        <View style={styles.cloudSyncCard}>
          <View style={styles.cloudHeader}>
            <Ionicons name="cloud-upload-outline" size={20} color={Colors.accent} />
            <Text style={styles.sectionTitle}>{t('profile.sections.cloudSync', 'Data Sync')}</Text>
          </View>
          <Text style={styles.cloudDesc}>
            {t('profile.cloudSync.desc', 'Create an account to backup your progress to the cloud and sync across devices.')}
          </Text>
          <View style={styles.cloudActions}>
            <TouchableOpacity style={styles.cloudBtnPrimary} onPress={() => { /* TODO: Cloud login sync */ }}>
              <Text style={styles.cloudBtnTextPrimary}>{t('profile.cloudSync.login', 'Login / Register')}</Text>
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.freezeSection}>
          <View style={styles.freezeHeader}>
            <Ionicons name="snow" size={18} color={Colors.accent} />
            <Text style={styles.sectionTitle}>{t('profile.sections.freeze')}</Text>
          </View>
          <Text style={styles.freezeDesc}>
            {t('profile.freeze.desc')}
          </Text>
          <TouchableOpacity
            style={[styles.freezeBtn, profile.freezeCount === 0 && styles.freezeBtnDisabled]}
            onPress={handleUseFreeze}
            disabled={profile.freezeCount === 0}
          >
            <Ionicons name="snow" size={18} color={profile.freezeCount > 0 ? Colors.text : Colors.textTertiary} />
            <Text style={[styles.freezeBtnText, profile.freezeCount === 0 && styles.freezeBtnTextDisabled]}>
              {t('profile.freeze.btn', { count: profile.freezeCount })}
            </Text>
          </TouchableOpacity>
        </View>


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
                <Text style={styles.editTitle}>{t('profile.editModal.title')}</Text>
                <TouchableOpacity onPress={() => setShowEditModal(false)} style={styles.editCloseBtn}>
                  <Ionicons name="close" size={22} color={Colors.textSub} />
                </TouchableOpacity>
              </View>

              <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.editScrollContent}>
                {/* Name */}
                <Text style={styles.editFieldLabel}>{t('profile.editModal.nameTitle')}</Text>
                <TextInput
                  style={styles.editInput}
                  value={editName}
                  onChangeText={setEditName}
                  placeholder={t('profile.editModal.namePlaceholder')}
                  placeholderTextColor={Colors.textTertiary}
                />

                {/* Active Hours */}
                <Text style={styles.editFieldLabel}>{t('profile.editModal.hoursTitle')}</Text>
                <View style={styles.timesRow}>
                  <TimeAdjuster label={t('profile.editModal.wakeUp')} value={editWakeTime} setter={setEditWakeTime} />
                  <TimeAdjuster label={t('profile.editModal.sleep')} value={editSleepTime} setter={setEditSleepTime} />
                </View>

                {/* Daily Limit */}
                <Text style={styles.editFieldLabel}>{t('profile.editModal.limitTitle')}</Text>
                <View style={styles.editRow}>
                  <Text style={styles.editRowLabel}>{t('profile.editModal.cigPerDay')}</Text>
                  <NumberStepper
                    value={editDailyLimit}
                    onChange={setEditDailyLimit}
                    min={1}
                    max={60}
                    suffix={t('profile.editModal.cigSuffix')}
                  />
                </View>
                <Text style={styles.editHint}>
                  {t('profile.editModal.limitHint')}
                </Text>

                {/* Price */}
                <Text style={styles.editFieldLabel}>{t('profile.editModal.priceTitle')}</Text>
                <View style={styles.editRow}>
                  <Text style={styles.editRowLabel}>{t('profile.editModal.pricePerPack')}</Text>
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
                  <Text style={styles.editRowLabel}>{t('profile.editModal.cigPerPack')}</Text>
                  <NumberStepper
                    value={editPackSize}
                    onChange={setEditPackSize}
                    min={10}
                    max={40}
                    step={1}
                    suffix={t('profile.editModal.cigSuffix')}
                  />
                </View>

                {/* Currency */}
                <Text style={styles.editFieldLabel}>{t('profile.editModal.currencyTitle')}</Text>
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
                <Text style={styles.editFieldLabel}>{t('profile.editModal.speedTitle')}</Text>
                {DIFFICULTIES.map((d) => (
                  <TouchableOpacity
                    key={d.key}
                    style={[styles.diffCard, editDifficulty === d.key && { borderColor: d.color, borderWidth: 2 }]}
                    onPress={() => handleDifficultySelect(d.key)}
                  >
                    <View style={[styles.diffDot, { backgroundColor: d.color }]} />
                    <View style={{ flex: 1 }}>
                      <Text style={styles.diffLabel}>{d.label}</Text>
                      <Text style={styles.diffDesc}>{d.desc}</Text>
                      {d.details && <Text style={styles.diffDetails}>{d.details}</Text>}
                    </View>
                    {editDifficulty === d.key && (
                      <Ionicons name="checkmark-circle" size={20} color={d.color} />
                    )}
                  </TouchableOpacity>
                ))}

                {/* Language */}
                <Text style={styles.editFieldLabel}>{t('profile.settings.language')}</Text>
                <View style={styles.editRow}>
                  <Text style={styles.editRowLabel}>{i18n.language === 'en' ? 'English' : 'Türkçe'}</Text>
                  <TouchableOpacity 
                    style={{ paddingVertical: 6, paddingHorizontal: 12, backgroundColor: Colors.elevated, borderRadius: 8, borderWidth: 1, borderColor: Colors.border }}
                    onPress={() => {
                      i18n.changeLanguage(i18n.language === 'en' ? 'tr' : 'en');
                      Haptics.selectionAsync();
                    }}
                  >
                    <Text style={{ fontFamily: 'Inter_600SemiBold', fontSize: 13, color: Colors.accent }}>{i18n.language === 'en' ? 'Switch' : 'Değiştir'}</Text>
                  </TouchableOpacity>
                </View>

                {/* Reset Journey */}
                <Text style={styles.editFieldLabel}>DANGER ZONE</Text>
                <TouchableOpacity style={[styles.resetBtn, { marginTop: 0 }]} onPress={() => { setShowEditModal(false); setTimeout(() => setShowResetModal(true), 300); }}>
                  <Ionicons name="warning-outline" size={16} color={Colors.danger} />
                  <Text style={styles.resetBtnText}>{t('profile.reset')}</Text>
                </TouchableOpacity>

                <View style={styles.editActions}>
                  <TouchableOpacity style={styles.cancelEditBtn} onPress={() => setShowEditModal(false)}>
                    <Text style={styles.cancelEditText}>{t('profile.editModal.cancel')}</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.saveBtn} onPress={saveEdit}>
                    <Ionicons name="checkmark" size={18} color={Colors.text} />
                    <Text style={styles.saveBtnText}>{t('profile.editModal.save')}</Text>
                  </TouchableOpacity>
                </View>
              </ScrollView>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* ─── Reset Modal ─── */}
      <ConfirmModal
        visible={showResetModal}
        title={t('profile.resetModal.title')}
        description={t('profile.resetModal.desc')}
        confirmLabel={t('profile.resetModal.confirm')}
        cancelLabel={t('profile.resetModal.cancel')}
        onConfirm={handleReset}
        onCancel={() => setShowResetModal(false)}
        type="danger"
      />

      {/* ─── Difficulty Change Modal ─── */}
      <ConfirmModal
        visible={showConfirmModal}
        title={t('profile.confirmModal.difficulty.title')}
        description={t('profile.confirmModal.difficulty.desc')}
        confirmLabel={t('profile.confirmModal.difficulty.confirm')}
        cancelLabel={t('profile.confirmModal.difficulty.cancel')}
        onConfirm={confirmDifficultyChange}
        onCancel={() => setShowConfirmModal(false)}
        type="warning"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  scrollContent: { paddingHorizontal: 20, gap: 16 },
  pageHeader: { paddingTop: 12, paddingBottom: 4, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  pageTitle: { fontFamily: 'Inter_700Bold', fontSize: 28, color: Colors.text },
  settingsHeaderBtn: { padding: 4 },

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


  cloudSyncCard: {
    backgroundColor: Colors.card,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  cloudHeader: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 8 },
  cloudDesc: { fontFamily: 'Inter_400Regular', fontSize: 13, color: Colors.textSub, marginBottom: 16, lineHeight: 20 },
  cloudActions: { flexDirection: 'row' },
  cloudBtnPrimary: {
    backgroundColor: Colors.accentDim,
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: Colors.accent,
  },
  cloudBtnTextPrimary: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 14,
    color: Colors.accent,
  },

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
  diffDetails: { fontFamily: 'Inter_600SemiBold', fontSize: 11, color: Colors.textTertiary, marginTop: 2 },

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
