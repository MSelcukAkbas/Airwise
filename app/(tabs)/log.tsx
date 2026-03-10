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
import { useApp } from '@/contexts/AppContext';
import { SmokeLog, TriggerReason } from '@/utils/types';
import Colors from '@/constants/colors';

const TYPE_CONFIG = {
  allowed: { label: 'Permitted', color: Colors.teal, icon: 'checkmark-circle' as const },
  extra: { label: 'Extra', color: Colors.warning, icon: 'add-circle' as const },
  craving_survived: { label: 'Survived', color: Colors.success, icon: 'shield-checkmark' as const },
  craving_failed: { label: 'Craving', color: Colors.danger, icon: 'close-circle' as const },
};

const TRIGGER_OPTIONS: { key: TriggerReason; label: string; icon: string }[] = [
  { key: 'stress', label: 'Stress', icon: '😤' },
  { key: 'caffeine', label: 'After Coffee', icon: '☕' },
  { key: 'after_meal', label: 'After Meal', icon: '🍽' },
  { key: 'anxiety', label: 'Anxiety', icon: '😰' },
  { key: 'boredom', label: 'Boredom', icon: '😑' },
  { key: 'social', label: 'Social', icon: '👥' },
  { key: 'other', label: 'Other', icon: '•••' },
];

function formatTime(ts: string): string {
  const d = new Date(ts);
  return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

function formatDate(ts: string): string {
  const d = new Date(ts);
  return d.toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric' });
}

export default function LogScreen() {
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
            <Text style={styles.logType}>{config.label}</Text>
            {item.triggerReason && (
              <View style={styles.triggerChip}>
                <Text style={styles.triggerChipText}>{trigger?.label ?? item.triggerReason}</Text>
              </View>
            )}
          </View>
          <Text style={styles.logTime}>{formatTime(item.timestamp)}</Text>
        </View>
        {item.cravingIntensity != null && (
          <View style={styles.intensityBadge}>
            <Text style={styles.intensityText}>{item.cravingIntensity}/10</Text>
          </View>
        )}
        <Ionicons name="chevron-forward" size={14} color={Colors.textTertiary} />
      </TouchableOpacity>
    );
  };

  const ListHeader = () => (
    <View>
      <View style={styles.statsRow}>
        <View style={styles.statBox}>
          <Text style={styles.statNum}>{smokeCount}</Text>
          <Text style={styles.statLabel}>Smoked</Text>
        </View>
        <View style={[styles.statDivider]} />
        <View style={styles.statBox}>
          <Text style={[styles.statNum, { color: extraCount > 0 ? Colors.warning : Colors.success }]}>{extraCount}</Text>
          <Text style={styles.statLabel}>Extra</Text>
        </View>
        <View style={styles.statDivider} />
        <View style={styles.statBox}>
          <Text style={[styles.statNum, { color: Colors.success }]}>{survivedCount}</Text>
          <Text style={styles.statLabel}>Survived</Text>
        </View>
        <View style={styles.statDivider} />
        <View style={styles.statBox}>
          <Text style={styles.statNum}>{profile?.currentDailyLimit ?? '-'}</Text>
          <Text style={styles.statLabel}>Limit</Text>
        </View>
      </View>

      {todayLogs.length > 0 && (
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>TODAY</Text>
          <Text style={styles.sectionDate}>{formatDate(new Date().toISOString())}</Text>
        </View>
      )}
    </View>
  );

  const ListEmpty = () => (
    <View style={styles.emptyWrap}>
      <View style={styles.emptyIcon}>
        <Ionicons name="journal-outline" size={32} color={Colors.textTertiary} />
      </View>
      <Text style={styles.emptyTitle}>No logs yet</Text>
      <Text style={styles.emptyText}>Your smoking sessions will appear here</Text>
    </View>
  );

  return (
    <View style={[styles.container, { paddingTop: insets.top + (Platform.OS === 'web' ? 67 : 0) }]}>
      <View style={styles.pageHeader}>
        <Text style={styles.pageTitle}>Log</Text>
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
                  <Text style={[styles.modalType, { color: config.color }]}>{config.label}</Text>
                  <Text style={styles.modalTime}>{formatTime(selectedLog.timestamp)}</Text>
                  <Text style={styles.modalDate}>{formatDate(selectedLog.timestamp)}</Text>

                  {selectedLog.triggerReason && (
                    <View style={styles.modalDetail}>
                      <Text style={styles.modalDetailLabel}>Trigger</Text>
                      <Text style={styles.modalDetailValue}>{trigger?.label ?? selectedLog.triggerReason}</Text>
                    </View>
                  )}
                  {selectedLog.cravingIntensity != null && (
                    <View style={styles.modalDetail}>
                      <Text style={styles.modalDetailLabel}>Craving intensity</Text>
                      <Text style={styles.modalDetailValue}>{selectedLog.cravingIntensity}/10</Text>
                    </View>
                  )}

                  <TouchableOpacity style={styles.modalCloseBtn} onPress={() => setSelectedLog(null)}>
                    <Text style={styles.modalCloseBtnText}>Close</Text>
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
    paddingBottom: 4,
  },
  pageTitle: {
    fontFamily: 'Inter_700Bold',
    fontSize: 28,
    color: Colors.text,
  },
  listContent: {
    paddingHorizontal: 20,
  },
  statsRow: {
    flexDirection: 'row',
    backgroundColor: Colors.card,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: Colors.border,
    marginTop: 16,
    marginBottom: 24,
    overflow: 'hidden',
  },
  statBox: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 16,
  },
  statNum: {
    fontFamily: 'Inter_700Bold',
    fontSize: 22,
    color: Colors.text,
  },
  statLabel: {
    fontFamily: 'Inter_400Regular',
    fontSize: 11,
    color: Colors.textSub,
    marginTop: 2,
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  statDivider: {
    width: 1,
    backgroundColor: Colors.border,
    marginVertical: 12,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  sectionTitle: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 11,
    color: Colors.textSub,
    letterSpacing: 1.5,
  },
  sectionDate: {
    fontFamily: 'Inter_400Regular',
    fontSize: 12,
    color: Colors.textTertiary,
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
