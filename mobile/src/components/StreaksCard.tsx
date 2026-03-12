import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { useApp } from '@/contexts/AppContext';
import Colors from '@/constants/colors';

export default function StreaksCard() {
  const { t } = useTranslation();
  const { profile } = useApp();

  if (!profile) return null;

  return (
    <View style={styles.streaksCard}>
      <Text style={styles.sectionTitle}>{t('profile.sections.streaks')}</Text>
      <View style={styles.streakTable}>
        <View style={styles.streakTableRow}>
          <Text style={[styles.streakTableLabel, { flex: 2 }]}></Text>
          <Text style={styles.streakTableHead}>{t('profile.streaks.current')}</Text>
          <Text style={styles.streakTableHead}>{t('profile.streaks.best')}</Text>
        </View>
        <View style={styles.streakTableRow}>
          <View style={styles.streakTableLabelRow}>
            <Ionicons name="shield-checkmark" size={14} color={Colors.phaseControl} />
            <Text style={styles.streakTableLabel}>{t('profile.streaks.control')}</Text>
          </View>
          <Text style={[styles.streakTableVal, { color: Colors.phaseControl }]}>{profile.controlStreak}d</Text>
          <Text style={styles.streakTableVal}>{profile.longestControlStreak}d</Text>
        </View>
        <View style={styles.streakTableRow}>
          <View style={styles.streakTableLabelRow}>
            <Ionicons name="trophy" size={14} color={Colors.teal} />
            <Text style={styles.streakTableLabel}>{t('profile.streaks.target')}</Text>
          </View>
          <Text style={[styles.streakTableVal, { color: Colors.teal }]}>{profile.targetStreak}d</Text>
          <Text style={styles.streakTableVal}>{profile.longestTargetStreak}d</Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  sectionTitle: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 11,
    color: Colors.textSub,
    letterSpacing: 1.5,
    marginBottom: 14,
  },
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
});
