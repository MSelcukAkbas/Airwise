import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { storage } from '@/services/storage/StorageService';
import { syncQueue } from '@/services/storage/SyncQueueManager';
import { UserProfile, SmokeLog, UserTask, SmokeType, TriggerReason } from '@/utils/types';
import {
  getNextPermissionTime,
  determinePhase,
  calculateNewDailyLimit,
  getDaysSinceStart,
  todayKey,
} from '@/utils/algorithm';
import { getRandomDailyTasks } from '@/utils/taskCatalog';
import { 
  requestPermissions, 
  scheduleSmokeNotification, 
  cancelAllNotifications, 
  registerNotificationCategories 
} from '@/utils/notifications';
import * as Notifications from 'expo-notifications';
import { useTranslation } from 'react-i18next';

const PROFILE_KEY = '@smokepace_profile';
const LOGS_PREFIX = '@smokepace_logs_';
const TASKS_PREFIX = '@smokepace_tasks_';
const LAST_SMOKE_KEY = '@smokepace_last_smoke';

interface AppState {
  profile: UserProfile | null;
  isLoading: boolean;
  todayLogs: SmokeLog[];
  todayTasks: UserTask[];
  lastSmokeTime: Date | null;
  nextPermissionTime: Date | null;
  isPermissionReady: boolean;
  skipCount: number;
  setupProfile: (profile: UserProfile) => Promise<void>;
  updateProfile: (partial: Partial<UserProfile>) => Promise<void>;
  logSmoke: (type: SmokeType, triggerReason?: TriggerReason, cravingIntensity?: number) => Promise<void>;
  completeTask: (taskId: string) => Promise<void>;
  skipTask: (taskId: string) => Promise<void>;
  skipPermission: () => void;
  useFreeze: () => Promise<boolean>;
  resetJourney: () => Promise<void>;
  refreshPermission: () => void;
  getTodaySmokeCount: () => number;
  getTodayAllowedCount: () => number;
  getTodayExtraCount: () => number;
  getTotalSavedToday: () => number;
  getCumulativeSaved: () => number;
}

const AppContext = createContext<AppState | null>(null);

export function AppProvider({ children }: { children: React.ReactNode }) {
  const { t } = useTranslation();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [todayLogs, setTodayLogs] = useState<SmokeLog[]>([]);
  const [todayTasks, setTodayTasks] = useState<UserTask[]>([]);
  const [lastSmokeTime, setLastSmokeTime] = useState<Date | null>(null);
  const [nextPermissionTime, setNextPermissionTime] = useState<Date | null>(null);
  const [isPermissionReady, setIsPermissionReady] = useState(false);
  const [skipCount, setSkipCount] = useState(0);
  const permissionTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    loadData();
  }, [t]);

  const checkPermission = useCallback((next: Date | null) => {
    if (!profile) return;
    
    // If limit reached, permission is NEVER ready
    if (getTodaySmokeCount() >= profile.currentDailyLimit) {
      setIsPermissionReady(false);
      return;
    }

    if (!next) {
      setIsPermissionReady(true);
      return;
    }
    const ready = new Date() >= next;
    setIsPermissionReady(ready);
  }, [profile]);

  useEffect(() => {
    if (permissionTimerRef.current) clearInterval(permissionTimerRef.current);
    permissionTimerRef.current = setInterval(() => {
      checkPermission(nextPermissionTime);
    }, 1000);
    return () => {
      if (permissionTimerRef.current) clearInterval(permissionTimerRef.current);
    };
  }, [nextPermissionTime, checkPermission]);

  const loadData = async () => {
    try {
      const profileStr = await storage.getItem(PROFILE_KEY);
      if (profileStr) {
        let p: UserProfile = JSON.parse(profileStr);
        p.frozenDates = p.frozenDates || [];
        
        // 1. Check for missing days and update streaks BEFORE loading today
        p = await checkDailyStreaks(p);
        
        // 2. Recalculate limits and phases based on possibly updated streaks/date
        const updatedLimit = calculateNewDailyLimit(p);
        const updatedPhase = determinePhase({ ...p, currentDailyLimit: updatedLimit });
        const updated = { ...p, currentDailyLimit: updatedLimit, currentPhase: updatedPhase };
        
        setProfile(updated);
        await storage.setItem(PROFILE_KEY, JSON.stringify(updated));
        
        // Request notification permissions
        await requestPermissions();
        // Register categories with current translation
        await registerNotificationCategories(t);
        
        await loadTodayData(updated);
      }
    } catch (e) {
      console.error('Load error', e);
    } finally {
      setIsLoading(false);
    }
  };

  const checkDailyStreaks = async (p: UserProfile): Promise<UserProfile> => {
    const today = todayKey();
    if (!p.lastActiveDate || p.lastActiveDate === today) return p;

    // We have a gap or it's just the first time opening today
    const lastActive = new Date(p.lastActiveDate);
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayKey = yesterday.toISOString().split('T')[0];

    // If last active was before yesterday, streaks are broken anyway
    // But let's specifically evaluate "Yesterday" if it exists
    let updatedProfile = { ...p };

    // Case 1: Last active was exactly yesterday -> Evaluate performance
    if (p.lastActiveDate === yesterdayKey) {
      const logsStr = await storage.getItem(LOGS_PREFIX + yesterdayKey);
      const logs: SmokeLog[] = logsStr ? JSON.parse(logsStr) : [];
      
      const totalSmoked = logs.filter(l => l.type === 'allowed' || l.type === 'extra').length;
      const extrasCount = logs.filter(l => l.type === 'extra').length;
      
      // Target Streak: Total <= Limit
      const isFrozen = p.frozenDates?.includes(yesterdayKey);
      
      // Control Streak: No extras (Protected if frozen)
      if (extrasCount === 0 && totalSmoked > 0) {
        updatedProfile.controlStreak += 1;
        updatedProfile.longestControlStreak = Math.max(updatedProfile.controlStreak, updatedProfile.longestControlStreak);
      } else if (extrasCount > 0 && !isFrozen) {
        updatedProfile.controlStreak = 0;
      }

      // Target Streak: Total <= Limit (Protected if frozen)
      if (totalSmoked <= p.currentDailyLimit && totalSmoked > 0) {
        updatedProfile.targetStreak += 1;
        updatedProfile.longestTargetStreak = Math.max(updatedProfile.targetStreak, updatedProfile.longestTargetStreak);
      } else if (totalSmoked > p.currentDailyLimit && !isFrozen) {
        updatedProfile.targetStreak = 0;
      }
    } else {
      // Case 2: Gap of more than 1 day -> Reset streaks
      updatedProfile.controlStreak = 0;
      updatedProfile.targetStreak = 0;
    }

    updatedProfile.lastActiveDate = today;
    return updatedProfile;
  };

  const loadTodayData = async (p: UserProfile) => {
    const key = todayKey();
    try {
      const logsStr = await storage.getItem(LOGS_PREFIX + key);
      const logs: SmokeLog[] = logsStr ? JSON.parse(logsStr) : [];
      setTodayLogs(logs);

      const lastSmokeStr = await storage.getItem(LAST_SMOKE_KEY);
      let lastSmoke: Date | null = null;
      if (lastSmokeStr) {
        lastSmoke = new Date(JSON.parse(lastSmokeStr));
        setLastSmokeTime(lastSmoke);
      }

      const next = getNextPermissionTime(p, lastSmoke);
      setNextPermissionTime(next);
      checkPermission(next);

      await loadOrCreateDailyTasks(p, key);
    } catch (e) {
      console.error('Load today error', e);
    }
  };

  useEffect(() => {
    if (nextPermissionTime && profile) {
      scheduleSmokeNotification(nextPermissionTime, t);
    }
  }, [nextPermissionTime, profile, t]);

  const loadOrCreateDailyTasks = async (p: UserProfile, dateKey: string) => {
    const tasksStr = await storage.getItem(TASKS_PREFIX + dateKey);
    if (tasksStr) {
      setTodayTasks(JSON.parse(tasksStr));
    } else {
      const catalog = getRandomDailyTasks(p.currentPhase, 3);
      const tasks: UserTask[] = catalog.map((t) => ({
        id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
        catalogId: t.id,
        assignedDate: dateKey,
        status: 'pending',
        title: t.title,
        description: t.description,
        rewardType: t.rewardType,
        rewardAmount: t.rewardAmount,
      }));
      setTodayTasks(tasks);
      await storage.setItem(TASKS_PREFIX + dateKey, JSON.stringify(tasks));
    }
  };

  const setupProfile = async (p: UserProfile) => {
    await storage.setItem(PROFILE_KEY, JSON.stringify(p));
    setProfile(p);
    
    // Send core creation payload offline-queue ready to backend:
    await syncQueue.enqueueOperation('PROFILE_UPDATE', { 
      action: 'create', 
      profile: p 
    });

    await loadTodayData(p);
  };

  const updateProfile = async (partial: Partial<UserProfile>) => {
    if (!profile) return;
    const updated = { ...profile, ...partial };
    setProfile(updated);
    await storage.setItem(PROFILE_KEY, JSON.stringify(updated));

    // Send patch payload offline queue ready to backend:
    await syncQueue.enqueueOperation('PROFILE_UPDATE', { 
      action: 'patch', 
      changes: partial 
    });
  };

  const logSmoke = async (type: SmokeType, triggerReason?: TriggerReason, cravingIntensity?: number) => {
    if (!profile) return;
    const now = new Date();
    const log: SmokeLog = {
      id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
      timestamp: now.toISOString(),
      type,
      triggerReason,
      cravingIntensity,
    };

    const newLogs = [log, ...todayLogs];
    setTodayLogs(newLogs);
    const key = todayKey();
    await storage.setItem(LOGS_PREFIX + key, JSON.stringify(newLogs));

    // Enqueue the log event
    await syncQueue.enqueueOperation('LOG_SMOKE', { log });

    if (type === 'allowed' || type === 'extra') {
      setLastSmokeTime(now);
      await storage.setItem(LAST_SMOKE_KEY, JSON.stringify(now.toISOString()));
      const next = getNextPermissionTime(profile, now);
      setNextPermissionTime(next);
      setIsPermissionReady(false);
      setSkipCount(0);
    } else if (type === 'craving_survived') {
      await updateProfile({ xpPoints: profile.xpPoints + 15 });
    }

    const todaySmokeTotal = newLogs.filter((l) => l.type === 'allowed' || l.type === 'extra').length;
    // Streak updates are now handled daily on app load for better accuracy
    if (profile.lastActiveDate !== key) {
      await updateProfile({ lastActiveDate: key });
    }
  };

  const completeTask = async (taskId: string) => {
    const task = todayTasks.find((t) => t.id === taskId);
    if (!task || task.status !== 'pending' || !profile) return;

    const newTasks = todayTasks.map((t) =>
      t.id === taskId ? { ...t, status: 'completed' as const } : t,
    );
    setTodayTasks(newTasks);
    await storage.setItem(TASKS_PREFIX + todayKey(), JSON.stringify(newTasks));

    // Enqueue Task Complete Payload
    await syncQueue.enqueueOperation('TASK_COMPLETE', { taskId, status: 'completed' });

    const updates: Partial<UserProfile> = {};
    if (task.rewardType === 'xp') {
      updates.xpPoints = profile.xpPoints + task.rewardAmount;
    } else if (task.rewardType === 'freeze') {
      updates.freezeCount = profile.freezeCount + task.rewardAmount;
    }
    await updateProfile(updates);
  };

  const skipTask = async (taskId: string) => {
    const newTasks = todayTasks.map((t) =>
      t.id === taskId ? { ...t, status: 'skipped' as const } : t,
    );
    setTodayTasks(newTasks);
    await storage.setItem(TASKS_PREFIX + todayKey(), JSON.stringify(newTasks));
  };

  const skipPermission = () => {
    if (!profile || !isPermissionReady) return;
    const interval = nextPermissionTime ? getNextPermissionTime(profile, new Date()) : null;
    const bonusMs = 5 * 60 * 1000;
    if (interval) {
      const bonus = new Date(interval.getTime() + bonusMs);
      setNextPermissionTime(bonus);
    }
    setIsPermissionReady(false);
    setSkipCount((prev) => prev + 1);
  };

  const useFreeze = async (): Promise<boolean> => {
    if (!profile || profile.freezeCount <= 0) return false;
    const today = todayKey();
    if (profile.frozenDates?.includes(today)) return true; // Already frozen

    const newFrozen = [...(profile.frozenDates || []), today];
    await updateProfile({ 
      freezeCount: profile.freezeCount - 1,
      frozenDates: newFrozen
    });
    return true;
  };

  const resetJourney = async () => {
    // 1. Alert the backend that the user is starting fresh (offline-first sync queue)
    await syncQueue.enqueueOperation('RESET_JOURNEY', { timestamp: new Date().toISOString() });
    
    // 2. Backup the sync queue
    const queueBackup = await storage.getItem('@smokepace_offline_sync_queue');

    // 3. Clear ALL local storage (This wipes everything including old AsyncStorage migration states)
    await storage.clear();
    
    // 4. Restore the queue so the backend still receives the reset notification and historic offline logs
    if (queueBackup) {
      await storage.setItem('@smokepace_offline_sync_queue', queueBackup);
    }
    
    // 5. Reset all AppContext loaded state
    setProfile(null);
    setTodayLogs([]);
    setTodayTasks([]);
    setLastSmokeTime(null);
    setNextPermissionTime(null);
    setIsPermissionReady(false);
    setSkipCount(0);
  };

  const refreshPermission = useCallback(() => {
    if (profile) {
      const next = getNextPermissionTime(profile, lastSmokeTime);
      setNextPermissionTime(next);
      checkPermission(next);
    }
  }, [profile, lastSmokeTime, checkPermission]);

  const getTodaySmokeCount = () =>
    todayLogs.filter((l) => l.type === 'allowed' || l.type === 'extra').length;

  const getTodayAllowedCount = () =>
    todayLogs.filter((l) => l.type === 'allowed').length;

  const getTodayExtraCount = () =>
    todayLogs.filter((l) => l.type === 'extra').length;

  const getTotalSavedToday = () => {
    if (!profile) return 0;
    const smoked = getTodaySmokeCount();
    const wouldHaveSmoked = profile.dailyStartLimit;
    const saved = Math.max(0, wouldHaveSmoked - smoked);
    const pricePerCig = profile.cigarettePricePerPack / (profile.cigarettesPerPack || 20);
    return saved * pricePerCig;
  };

  const getCumulativeSaved = () => {
    if (!profile) return 0;
    const days = getDaysSinceStart(profile);
    const savedPerDay = Math.max(
      0,
      profile.dailyStartLimit - profile.currentDailyLimit,
    );
    const pricePerCig = profile.cigarettePricePerPack / (profile.cigarettesPerPack || 20);
    return savedPerDay * pricePerCig * days;
  };

  const logSmokeRef = useRef(logSmoke);
  useEffect(() => {
    logSmokeRef.current = logSmoke;
  }, [logSmoke]);

  useEffect(() => {
    // Setup interactive notification categories
    registerNotificationCategories(t);

    // Listen for notification interactions
    const subscription = Notifications.addNotificationResponseReceivedListener(response => {
      const { actionIdentifier } = response;
      console.log('Notification action received:', actionIdentifier);
      if (actionIdentifier === 'smoke_now') {
        logSmokeRef.current('allowed');
      } else if (actionIdentifier === 'resist_now') {
        logSmokeRef.current('craving_survived');
      }
    });

    return () => subscription.remove();
  }, [t]);

  return (
    <AppContext.Provider
      value={{
        profile,
        isLoading,
        todayLogs,
        todayTasks,
        lastSmokeTime,
        nextPermissionTime,
        isPermissionReady,
        skipCount,
        setupProfile,
        updateProfile,
        logSmoke,
        completeTask,
        skipTask,
        skipPermission,
        useFreeze,
        resetJourney,
        refreshPermission,
        getTodaySmokeCount,
        getTodayAllowedCount,
        getTodayExtraCount,
        getTotalSavedToday,
        getCumulativeSaved,
      }}
    >
      {children}
    </AppContext.Provider>
  );
}

export function useApp(): AppState {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp must be used within AppProvider');
  return ctx;
}
