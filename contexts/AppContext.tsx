import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { UserProfile, SmokeLog, UserTask, SmokeType, TriggerReason } from '@/utils/types';
import {
  getNextPermissionTime,
  determinePhase,
  calculateNewDailyLimit,
  getDaysSinceStart,
  todayKey,
} from '@/utils/algorithm';
import { getRandomDailyTasks } from '@/utils/taskCatalog';

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
  refreshPermission: () => void;
  getTodaySmokeCount: () => number;
  getTodayAllowedCount: () => number;
  getTodayExtraCount: () => number;
  getTotalSavedToday: () => number;
  getCumulativeSaved: () => number;
}

const AppContext = createContext<AppState | null>(null);

export function AppProvider({ children }: { children: React.ReactNode }) {
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
  }, []);

  const checkPermission = useCallback((next: Date | null) => {
    if (!next) {
      setIsPermissionReady(true);
      return;
    }
    const ready = new Date() >= next;
    setIsPermissionReady(ready);
  }, []);

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
      const profileStr = await AsyncStorage.getItem(PROFILE_KEY);
      if (profileStr) {
        const p: UserProfile = JSON.parse(profileStr);
        const updatedLimit = calculateNewDailyLimit(p);
        const updatedPhase = determinePhase({ ...p, currentDailyLimit: updatedLimit });
        const updated = { ...p, currentDailyLimit: updatedLimit, currentPhase: updatedPhase };
        setProfile(updated);
        await loadTodayData(updated);
      }
    } catch (e) {
      console.error('Load error', e);
    } finally {
      setIsLoading(false);
    }
  };

  const loadTodayData = async (p: UserProfile) => {
    const key = todayKey();
    try {
      const logsStr = await AsyncStorage.getItem(LOGS_PREFIX + key);
      const logs: SmokeLog[] = logsStr ? JSON.parse(logsStr) : [];
      setTodayLogs(logs);

      const lastSmokeStr = await AsyncStorage.getItem(LAST_SMOKE_KEY);
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

  const loadOrCreateDailyTasks = async (p: UserProfile, dateKey: string) => {
    const tasksStr = await AsyncStorage.getItem(TASKS_PREFIX + dateKey);
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
      await AsyncStorage.setItem(TASKS_PREFIX + dateKey, JSON.stringify(tasks));
    }
  };

  const setupProfile = async (p: UserProfile) => {
    await AsyncStorage.setItem(PROFILE_KEY, JSON.stringify(p));
    setProfile(p);
    await loadTodayData(p);
  };

  const updateProfile = async (partial: Partial<UserProfile>) => {
    if (!profile) return;
    const updated = { ...profile, ...partial };
    setProfile(updated);
    await AsyncStorage.setItem(PROFILE_KEY, JSON.stringify(updated));
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
    await AsyncStorage.setItem(LOGS_PREFIX + key, JSON.stringify(newLogs));

    if (type === 'allowed' || type === 'extra') {
      setLastSmokeTime(now);
      await AsyncStorage.setItem(LAST_SMOKE_KEY, JSON.stringify(now.toISOString()));
      const next = getNextPermissionTime(profile, now);
      setNextPermissionTime(next);
      setIsPermissionReady(false);
      setSkipCount(0);
    }

    const todaySmokeTotal = newLogs.filter((l) => l.type === 'allowed' || l.type === 'extra').length;
    const dayOk = todaySmokeTotal <= profile.currentDailyLimit;
    const isAllowed = type === 'allowed';

    await updateStreaks(isAllowed, dayOk, profile);
  };

  const updateStreaks = async (wasAllowed: boolean, withinLimit: boolean, p: UserProfile) => {
    const today = todayKey();
    if (p.lastActiveDate === today) return;
    const updates: Partial<UserProfile> = { lastActiveDate: today };
    if (wasAllowed) {
      const newControl = p.controlStreak + 1;
      updates.controlStreak = newControl;
      updates.longestControlStreak = Math.max(newControl, p.longestControlStreak);
    } else {
      updates.controlStreak = 0;
    }
    if (withinLimit) {
      const newTarget = p.targetStreak + 1;
      updates.targetStreak = newTarget;
      updates.longestTargetStreak = Math.max(newTarget, p.longestTargetStreak);
    } else {
      updates.targetStreak = 0;
    }
    await updateProfile(updates);
  };

  const completeTask = async (taskId: string) => {
    const task = todayTasks.find((t) => t.id === taskId);
    if (!task || task.status !== 'pending' || !profile) return;

    const newTasks = todayTasks.map((t) =>
      t.id === taskId ? { ...t, status: 'completed' as const } : t,
    );
    setTodayTasks(newTasks);
    await AsyncStorage.setItem(TASKS_PREFIX + todayKey(), JSON.stringify(newTasks));

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
    await AsyncStorage.setItem(TASKS_PREFIX + todayKey(), JSON.stringify(newTasks));
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
    await updateProfile({ freezeCount: profile.freezeCount - 1 });
    return true;
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
