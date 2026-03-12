import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useApp } from '@/contexts/AppContext';
import { getDaysSinceStart } from '@/utils/algorithm';
import Colors from '@/constants/colors';

export default function SavingsCard() {
  const { t } = useTranslation();
  const { profile, getCumulativeSaved, getTotalSavedToday } = useApp();

  if (!profile) return null;

  const savedTotal = getCumulativeSaved();
  const savedToday = getTotalSavedToday();
  const pricePerCig = profile.cigarettePricePerPack / (profile.cigarettesPerPack || 20);
  const totalNotSmoked = Math.max(
    0,
    (profile.dailyStartLimit - profile.currentDailyLimit) * getDaysSinceStart(profile),
  );

  return (
    <View style={styles.savingsCard}>
      <Text style={styles.sectionTitle}>{t('profile.sections.savings')}</Text>
      <View style={styles.savingsMain}>
        <Text style={styles.savingsBig}>{profile.currency}{savedTotal.toFixed(2)}</Text>
        <Text style={styles.savingsSub}>{t('profile.savings.estimated')}</Text>
      </View>
      <View style={styles.savingsRow}>
        <View style={styles.savingsMini}>
          <Text style={styles.savingsMiniNum}>{profile.currency}{savedToday.toFixed(2)}</Text>
          <Text style={styles.savingsMiniLabel}>{t('profile.savings.today')}</Text>
        </View>
        <View style={styles.savingsMini}>
          <Text style={styles.savingsMiniNum}>{totalNotSmoked}</Text>
          <Text style={styles.savingsMiniLabel}>{t('profile.savings.notSmoked')}</Text>
        </View>
        <View style={styles.savingsMini}>
          <Text style={styles.savingsMiniNum}>{profile.currency}{pricePerCig.toFixed(2)}</Text>
          <Text style={styles.savingsMiniLabel}>{t('profile.savings.perCigarette')}</Text>
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
});
