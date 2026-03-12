import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { useApp } from '@/contexts/AppContext';
import { getIntervalMinutes } from '@/utils/algorithm';
import Colors from '@/constants/colors';

export default function StatsGrid() {
  const { t } = useTranslation();
  const { profile } = useApp();

  if (!profile) return null;

  const intervalMins = getIntervalMinutes(profile);

  return (
    <View style={styles.statsGrid}>
      <View style={styles.statCard}>
        <Ionicons name="trending-down" size={20} color={Colors.success} />
        <Text style={styles.statBig}>{profile.dailyStartLimit - profile.currentDailyLimit}</Text>
        <Text style={styles.statSmall}>{t('profile.stats.reduced')}</Text>
      </View>
      <View style={styles.statCard}>
        <Ionicons name="time-outline" size={20} color={Colors.accent} />
        <Text style={styles.statBig}>{intervalMins}m</Text>
        <Text style={styles.statSmall}>{t('profile.stats.interval')}</Text>
      </View>
      <View style={styles.statCard}>
        <Ionicons name="flash" size={20} color={Colors.warning} />
        <Text style={styles.statBig}>{profile.xpPoints}</Text>
        <Text style={styles.statSmall}>{t('profile.stats.xp')}</Text>
      </View>
      <View style={styles.statCard}>
        <Ionicons name="snow" size={20} color={Colors.accent} />
        <Text style={styles.statBig}>{profile.freezeCount}</Text>
        <Text style={styles.statSmall}>{t('profile.stats.freeze')}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
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
});
