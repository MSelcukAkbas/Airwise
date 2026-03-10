import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import { Ionicons } from '@expo/vector-icons';
import { useApp } from '@/contexts/AppContext';
import { UserTask } from '@/utils/types';
import Colors from '@/constants/colors';

const STATUS_CONFIG = {
  pending: { color: Colors.textSub, icon: 'ellipse-outline' as const },
  completed: { color: Colors.success, icon: 'checkmark-circle' as const },
  failed: { color: Colors.danger, icon: 'close-circle' as const },
  skipped: { color: Colors.textTertiary, icon: 'remove-circle-outline' as const },
};

function XPBar({ current, max }: { current: number; max: number }) {
  const progress = Math.min(1, current / max);
  const level = Math.floor(current / max);
  return (
    <View style={styles.xpWrap}>
      <View style={styles.xpHeader}>
        <Text style={styles.xpLabel}>Level {level + 1}</Text>
        <Text style={styles.xpValue}>{current} XP</Text>
      </View>
      <View style={styles.xpBg}>
        <View style={[styles.xpFill, { width: `${progress * 100}%` }]} />
      </View>
      <Text style={styles.xpNext}>{max - (current % max)} XP to next level</Text>
    </View>
  );
}

export default function TasksScreen() {
  const insets = useSafeAreaInsets();
  const { todayTasks, profile, completeTask, skipTask } = useApp();

  const pendingCount = todayTasks.filter((t) => t.status === 'pending').length;
  const completedCount = todayTasks.filter((t) => t.status === 'completed').length;

  const renderTask = ({ item }: { item: UserTask }) => {
    const status = STATUS_CONFIG[item.status];
    const isPending = item.status === 'pending';

    return (
      <View style={[styles.taskCard, item.status === 'completed' && styles.taskCardDone]}>
        <View style={styles.taskTop}>
          <Ionicons name={status.icon} size={22} color={status.color} />
          <View style={styles.taskTextWrap}>
            <Text style={[styles.taskTitle, !isPending && styles.taskTitleDone]}>{item.title}</Text>
            <Text style={styles.taskDesc}>{item.description}</Text>
          </View>
          <View style={[styles.rewardChip, item.rewardType === 'freeze' && styles.rewardChipFreeze]}>
            {item.rewardType === 'freeze' ? (
              <Ionicons name="snow" size={11} color={Colors.accent} />
            ) : (
              <Ionicons name="flash" size={11} color={Colors.warning} />
            )}
            <Text style={[styles.rewardText, item.rewardType === 'freeze' && styles.rewardTextFreeze]}>
              {item.rewardType === 'xp' ? `+${item.rewardAmount} XP` : '🛡 Freeze'}
            </Text>
          </View>
        </View>

        {isPending && (
          <View style={styles.taskActions}>
            <TouchableOpacity
              style={styles.skipTaskBtn}
              onPress={() => { skipTask(item.id); Haptics.selectionAsync(); }}
            >
              <Text style={styles.skipTaskBtnText}>Skip</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.doneBtn}
              onPress={() => { completeTask(item.id); Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success); }}
            >
              <Ionicons name="checkmark" size={16} color={Colors.text} />
              <Text style={styles.doneBtnText}>Mark Done</Text>
            </TouchableOpacity>
          </View>
        )}

        {item.status === 'completed' && (
          <View style={styles.completedBanner}>
            <Ionicons name="checkmark-circle" size={14} color={Colors.success} />
            <Text style={styles.completedBannerText}>Reward claimed</Text>
          </View>
        )}
      </View>
    );
  };

  const ListHeader = () => (
    <View>
      {profile && <XPBar current={profile.xpPoints} max={500} />}

      <View style={styles.freezeRow}>
        <View style={styles.freezeCard}>
          <Ionicons name="snow" size={20} color={Colors.accent} />
          <View>
            <Text style={styles.freezeNum}>{profile?.freezeCount ?? 0}</Text>
            <Text style={styles.freezeLabel}>Freeze Tokens</Text>
          </View>
        </View>
        <View style={styles.streakMiniCard}>
          <Ionicons name="flame" size={18} color={Colors.warning} />
          <View>
            <Text style={styles.freezeNum}>{completedCount}/{todayTasks.length}</Text>
            <Text style={styles.freezeLabel}>Done today</Text>
          </View>
        </View>
      </View>

      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>DAILY CHALLENGES</Text>
        {pendingCount > 0 && (
          <View style={styles.pendingBadge}>
            <Text style={styles.pendingBadgeText}>{pendingCount} pending</Text>
          </View>
        )}
      </View>
    </View>
  );

  const ListEmpty = () => (
    <View style={styles.emptyWrap}>
      <View style={styles.emptyIcon}>
        <Ionicons name="trophy-outline" size={32} color={Colors.textTertiary} />
      </View>
      <Text style={styles.emptyTitle}>All done!</Text>
      <Text style={styles.emptyText}>No tasks assigned for today</Text>
    </View>
  );

  return (
    <View style={[styles.container, { paddingTop: insets.top + (Platform.OS === 'web' ? 67 : 0) }]}>
      <View style={styles.pageHeader}>
        <Text style={styles.pageTitle}>Tasks</Text>
      </View>

      <FlatList
        data={todayTasks}
        keyExtractor={(item) => item.id}
        renderItem={renderTask}
        ListHeaderComponent={ListHeader}
        ListEmptyComponent={ListEmpty}
        contentContainerStyle={[
          styles.listContent,
          { paddingBottom: insets.bottom + (Platform.OS === 'web' ? 34 : 84) },
        ]}
        showsVerticalScrollIndicator={false}
      />
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
  xpWrap: {
    backgroundColor: Colors.card,
    borderRadius: 14,
    padding: 16,
    marginTop: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  xpHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  xpLabel: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 14,
    color: Colors.text,
  },
  xpValue: {
    fontFamily: 'Inter_700Bold',
    fontSize: 14,
    color: Colors.warning,
  },
  xpBg: {
    height: 6,
    backgroundColor: Colors.border,
    borderRadius: 3,
    overflow: 'hidden',
    marginBottom: 6,
  },
  xpFill: {
    height: 6,
    borderRadius: 3,
    backgroundColor: Colors.warning,
  },
  xpNext: {
    fontFamily: 'Inter_400Regular',
    fontSize: 11,
    color: Colors.textSub,
  },
  freezeRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 20,
  },
  freezeCard: {
    flex: 1,
    backgroundColor: Colors.accentDim,
    borderRadius: 12,
    padding: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderWidth: 1,
    borderColor: Colors.accent + '30',
  },
  streakMiniCard: {
    flex: 1,
    backgroundColor: Colors.card,
    borderRadius: 12,
    padding: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  freezeNum: {
    fontFamily: 'Inter_700Bold',
    fontSize: 18,
    color: Colors.text,
  },
  freezeLabel: {
    fontFamily: 'Inter_400Regular',
    fontSize: 11,
    color: Colors.textSub,
    marginTop: 1,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  sectionTitle: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 11,
    color: Colors.textSub,
    letterSpacing: 1.5,
  },
  pendingBadge: {
    backgroundColor: Colors.accentDim,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  pendingBadgeText: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 11,
    color: Colors.accent,
  },
  taskCard: {
    backgroundColor: Colors.card,
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: Colors.border,
    gap: 12,
  },
  taskCardDone: {
    opacity: 0.7,
  },
  taskTop: {
    flexDirection: 'row',
    gap: 12,
    alignItems: 'flex-start',
  },
  taskTextWrap: {
    flex: 1,
  },
  taskTitle: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 15,
    color: Colors.text,
    marginBottom: 4,
  },
  taskTitleDone: {
    color: Colors.textSub,
  },
  taskDesc: {
    fontFamily: 'Inter_400Regular',
    fontSize: 13,
    color: Colors.textSub,
    lineHeight: 18,
  },
  rewardChip: {
    backgroundColor: Colors.warningDim,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  rewardChipFreeze: {
    backgroundColor: Colors.accentDim,
  },
  rewardText: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 11,
    color: Colors.warning,
  },
  rewardTextFreeze: {
    color: Colors.accent,
  },
  taskActions: {
    flexDirection: 'row',
    gap: 10,
  },
  skipTaskBtn: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 10,
    backgroundColor: Colors.elevated,
    alignItems: 'center',
  },
  skipTaskBtnText: {
    fontFamily: 'Inter_500Medium',
    fontSize: 14,
    color: Colors.textSub,
  },
  doneBtn: {
    flex: 2,
    paddingVertical: 10,
    borderRadius: 10,
    backgroundColor: Colors.success,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  doneBtnText: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 14,
    color: Colors.text,
  },
  completedBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  completedBannerText: {
    fontFamily: 'Inter_500Medium',
    fontSize: 12,
    color: Colors.success,
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
  },
});
