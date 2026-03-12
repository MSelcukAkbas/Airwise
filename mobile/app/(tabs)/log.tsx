import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Modal,
  Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { useApp } from '@/contexts/AppContext';
import { SmokeLog, TriggerReason } from '@/utils/types';
import Colors from '@/constants/colors';

const TYPE_CONFIG = {
  allowed: { labelKey: 'log.types.allowed', color: Colors.teal, icon: 'checkmark-circle' as const },
  extra: { labelKey: 'log.types.extra', color: Colors.warning, icon: 'add-circle' as const },
  craving_survived: { labelKey: 'log.types.craving_survived', color: Colors.success, icon: 'shield-checkmark' as const },
  craving_failed: { labelKey: 'log.types.craving_failed', color: Colors.danger, icon: 'close-circle' as const },
};

const TRIGGER_OPTIONS: { key: TriggerReason; labelKey: string; icon: string }[] = [
  { key: 'stress', labelKey: 'log.triggers.stress', icon: '😤' },
  { key: 'caffeine', labelKey: 'log.triggers.caffeine', icon: '☕' },
  { key: 'after_meal', labelKey: 'log.triggers.after_meal', icon: '🍽' },
  { key: 'anxiety', labelKey: 'log.triggers.anxiety', icon: '😰' },
  { key: 'boredom', labelKey: 'log.triggers.boredom', icon: '😑' },
  { key: 'social', labelKey: 'log.triggers.social', icon: '👥' },
  { key: 'other', labelKey: 'log.triggers.other', icon: '•••' },
];

function formatTime(ts: string): string {
  const d = new Date(ts);
  return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

function formatDate(ts: string, i18n: any): string {
  const d = new Date(ts);
  return d.toLocaleDateString(i18n.language, { weekday: 'short', month: 'short', day: 'numeric' });
}

export default function LogScreen() {
  const { t, i18n } = useTranslation();
  const insets = useSafeAreaInsets();
  const { todayLogs, getTodaySmokeCount, getTodayExtraCount, profile } = useApp();
  const [selectedLog, setSelectedLog] = useState<SmokeLog | null>(null);

  const smokeCount = getTodaySmokeCount();
  const extraCount = getTodayExtraCount();
  const survivedCount = todayLogs.filter((l) => l.type === 'craving_survived').length;

  const renderItem = ({ item, index }: { item: SmokeLog; index: number }) => {
    const config = TYPE_CONFIG[item.type];
    const trigger = TRIGGER_OPTIONS.find((t) => t.key === item.triggerReason);
    return (
      <TouchableOpacity
        style={[styles.logItem, index === todayLogs.length - 1 && styles.logItemLast]}
        onPress={() => { setSelectedLog(item); Haptics.selectionAsync(); }}
        activeOpacity={0.8}
      >
        <View style={[styles.logIcon, { backgroundColor: `${config.color}20` }]}>
          <Ionicons name={config.icon} size={20} color={config.color} />
        </View>
        <View style={styles.logInfo}>
          <View style={styles.logTop}>
            <Text style={styles.logType}>{t(config.labelKey)}</Text>
            {item.triggerReason && (
              <View style={styles.triggerChip}>
                <Text style={styles.triggerChipText}>{trigger ? t(trigger.labelKey) : item.triggerReason}</Text>
              </View>
            )}
          </View>
          <Text style={styles.logTime}>{formatTime(item.timestamp)}</Text>
        </View>
        {item.cravingIntensity != null && (
          <View style={styles.intensityBadge}>
            <Text style={styles.intensityText}>{t('log.intensity', { intensity: item.cravingIntensity })}</Text>
          </View>
        )}
        <Ionicons name="chevron-forward" size={14} color={Colors.textTertiary} />
      </TouchableOpacity>
    );
  };

  const ListHeader = () => (
    <View style={styles.headerContainer}>
      <View style={styles.summaryCard}>
        <View style={styles.summaryTop}>
          <View style={styles.summaryItem}>
            <Text style={styles.summaryVal}>{smokeCount}</Text>
            <Text style={styles.summaryLabel}>{t('log.stats.smoked')}</Text>
          </View>
          <View style={styles.summaryDivider} />
          <View style={styles.summaryItem}>
            <Text style={[styles.summaryVal, { color: survivedCount > 0 ? Colors.success : Colors.textSub }]}>{survivedCount}</Text>
            <Text style={styles.summaryLabel}>{t('log.stats.survived')}</Text>
          </View>
        </View>
        
        <View style={styles.summaryProgress}>
          <View style={styles.progressBarBg}>
            <View 
              style={[
                styles.progressBarFill, 
                { 
                  width: `${Math.min(100, (smokeCount / (profile?.currentDailyLimit || 1)) * 100)}%`,
                  backgroundColor: smokeCount > (profile?.currentDailyLimit || 0) ? Colors.danger : Colors.accent
                }
              ]} 
            />
          </View>
          <View style={styles.progressTextRow}>
            <Text style={styles.progressText}>
              {t('log.progress.status', { cur: smokeCount, total: profile?.currentDailyLimit })}
            </Text>
            {extraCount > 0 && (
              <Text style={styles.extraBadge}>
                +{extraCount} {t('log.stats.extra').toLowerCase()}
              </Text>
            )}
          </View>
        </View>
      </View>

      <Text style={styles.listTitle}>{t('log.sections.history')}</Text>
    </View>
  );

  const ListEmpty = () => (
    <View style={styles.emptyWrap}>
      <View style={styles.emptyIcon}>
        <Ionicons name="journal-outline" size={32} color={Colors.textTertiary} />
      </View>
      <Text style={styles.emptyTitle}>{t('log.empty.title')}</Text>
      <Text style={styles.emptyText}>{t('log.empty.description')}</Text>
    </View>
  );

  return (
    <View style={[styles.container, { paddingTop: insets.top + (Platform.OS === 'web' ? 67 : 0) }]}>
      <View style={styles.pageHeader}>
        <Text style={styles.pageTitle}>{t('log.title')}</Text>
        <Text style={styles.pageSubTitle}>{formatDate(new Date().toISOString(), i18n)}</Text>
      </View>

      <FlatList
        data={todayLogs}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        ListHeaderComponent={ListHeader}
        ListEmptyComponent={ListEmpty}
        contentContainerStyle={[
          styles.listContent,
          { paddingBottom: insets.bottom + (Platform.OS === 'web' ? 34 : 84) },
        ]}
        showsVerticalScrollIndicator={false}
      />

      <Modal
        visible={selectedLog != null}
        transparent
        animationType="fade"
        onRequestClose={() => setSelectedLog(null)}
      >
        <TouchableOpacity style={styles.modalOverlay} onPress={() => setSelectedLog(null)} activeOpacity={1}>
          <View style={styles.modalCard}>
            {selectedLog && (() => {
              const config = TYPE_CONFIG[selectedLog.type];
              const trigger = TRIGGER_OPTIONS.find((t) => t.key === selectedLog.triggerReason);
              return (
                <>
                  <View style={[styles.modalIcon, { backgroundColor: `${config.color}20` }]}>
                    <Ionicons name={config.icon} size={32} color={config.color} />
                  </View>
                  <Text style={[styles.modalType, { color: config.color }]}>{t(config.labelKey)}</Text>
                  <Text style={styles.modalTime}>{formatTime(selectedLog.timestamp)}</Text>
                  <Text style={styles.modalDate}>{formatDate(selectedLog.timestamp, i18n)}</Text>

                  {selectedLog.triggerReason && (
                    <View style={styles.modalDetail}>
                      <Text style={styles.modalDetailLabel}>{t('log.modal.trigger')}</Text>
                      <Text style={styles.modalDetailValue}>{trigger ? t(trigger.labelKey) : selectedLog.triggerReason}</Text>
                    </View>
                  )}
                  {selectedLog.cravingIntensity != null && (
                    <View style={styles.modalDetail}>
                      <Text style={styles.modalDetailLabel}>{t('log.modal.intensity')}</Text>
                      <Text style={styles.modalDetailValue}>{t('log.intensity', { intensity: selectedLog.cravingIntensity })}</Text>
                    </View>
                  )}

                  <TouchableOpacity style={styles.modalCloseBtn} onPress={() => setSelectedLog(null)}>
                    <Text style={styles.modalCloseBtnText}>{t('log.modal.close')}</Text>
                  </TouchableOpacity>
                </>
              );
            })()}
          </View>
        </TouchableOpacity>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  pageHeader: {
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 20,
  },
  pageTitle: {
    fontFamily: 'Inter_700Bold',
    fontSize: 28,
    color: Colors.text,
  },
  pageSubTitle: {
    fontFamily: 'Inter_500Medium',
    fontSize: 14,
    color: Colors.textSub,
    marginTop: 2,
  },
  listContent: {
    paddingHorizontal: 20,
  },
  headerContainer: {
    marginBottom: 24,
  },
  summaryCard: {
    backgroundColor: Colors.card,
    borderRadius: 20,
    padding: 20,
    borderWidth: 1,
    borderColor: Colors.border,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 4,
  },
  summaryTop: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  summaryItem: {
    flex: 1,
    alignItems: 'center',
  },
  summaryVal: {
    fontFamily: 'Inter_700Bold',
    fontSize: 32,
    color: Colors.text,
  },
  summaryLabel: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 12,
    color: Colors.textSub,
    marginTop: 4,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  summaryDivider: {
    width: 1,
    height: 40,
    backgroundColor: Colors.border,
  },
  summaryProgress: {
    width: '100%',
  },
  progressBarBg: {
    height: 8,
    backgroundColor: Colors.border,
    borderRadius: 4,
    width: '100%',
    overflow: 'hidden',
    marginBottom: 10,
  },
  progressBarFill: {
    height: '100%',
    borderRadius: 4,
  },
  progressTextRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  progressText: {
    fontFamily: 'Inter_500Medium',
    fontSize: 13,
    color: Colors.textSub,
  },
  extraBadge: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 11,
    color: Colors.danger,
    backgroundColor: Colors.dangerDim,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  listTitle: {
    fontFamily: 'Inter_700Bold',
    fontSize: 18,
    color: Colors.text,
    marginTop: 32,
    marginBottom: 0,
  },
  logItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: Colors.card,
    borderRadius: 12,
    padding: 14,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  logItemLast: {
    marginBottom: 0,
  },
  logIcon: {
    width: 40,
    height: 40,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  logInfo: {
    flex: 1,
  },
  logTop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 3,
  },
  logType: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 14,
    color: Colors.text,
  },
  triggerChip: {
    backgroundColor: Colors.elevated,
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 6,
  },
  triggerChipText: {
    fontFamily: 'Inter_400Regular',
    fontSize: 11,
    color: Colors.textSub,
  },
  logTime: {
    fontFamily: 'Inter_400Regular',
    fontSize: 13,
    color: Colors.textSub,
  },
  intensityBadge: {
    backgroundColor: Colors.dangerDim,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  intensityText: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 11,
    color: Colors.danger,
  },
  emptyWrap: {
    alignItems: 'center',
    paddingTop: 60,
    gap: 12,
  },
  emptyIcon: {
    width: 64,
    height: 64,
    borderRadius: 16,
    backgroundColor: Colors.card,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyTitle: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 17,
    color: Colors.text,
  },
  emptyText: {
    fontFamily: 'Inter_400Regular',
    fontSize: 14,
    color: Colors.textSub,
    textAlign: 'center',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
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
    borderWidth: 1,
    borderColor: Colors.border,
    gap: 8,
  },
  modalIcon: {
    width: 60,
    height: 60,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  modalType: {
    fontFamily: 'Inter_700Bold',
    fontSize: 20,
  },
  modalTime: {
    fontFamily: 'Inter_700Bold',
    fontSize: 28,
    color: Colors.text,
  },
  modalDate: {
    fontFamily: 'Inter_400Regular',
    fontSize: 14,
    color: Colors.textSub,
    marginBottom: 8,
  },
  modalDetail: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
    paddingVertical: 8,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  modalDetailLabel: {
    fontFamily: 'Inter_400Regular',
    fontSize: 14,
    color: Colors.textSub,
  },
  modalDetailValue: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 14,
    color: Colors.text,
  },
  modalCloseBtn: {
    marginTop: 8,
    backgroundColor: Colors.elevated,
    borderRadius: 12,
    paddingVertical: 12,
    width: '100%',
    alignItems: 'center',
  },
  modalCloseBtnText: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 15,
    color: Colors.text,
  },
});
