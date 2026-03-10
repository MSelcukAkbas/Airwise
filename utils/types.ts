export type Phase = 'control' | 'reduction' | 'delay' | 'freedom';
export type DifficultyLevel = 'easy' | 'normal' | 'hard';
export type SmokeType = 'allowed' | 'extra' | 'craving_survived' | 'craving_failed';
export type TriggerReason = 'stress' | 'caffeine' | 'after_meal' | 'anxiety' | 'boredom' | 'social' | 'other';
export type RewardType = 'xp' | 'freeze';

export interface UserProfile {
  name: string;
  dailyStartLimit: number;
  currentDailyLimit: number;
  difficultyLevel: DifficultyLevel;
  wakeUpTime: string;
  sleepTime: string;
  cigarettePricePerPack: number;
  cigarettesPerPack: number;
  currentPhase: Phase;
  startDate: string;
  controlStreak: number;
  longestControlStreak: number;
  targetStreak: number;
  longestTargetStreak: number;
  freezeCount: number;
  xpPoints: number;
  lastActiveDate: string;
  currency: string;
}

export interface SmokeLog {
  id: string;
  timestamp: string;
  type: SmokeType;
  triggerReason?: TriggerReason;
  cravingIntensity?: number;
}

export interface TaskCatalogItem {
  id: string;
  title: string;
  description: string;
  triggerPhase: Phase | 'all';
  rewardType: RewardType;
  rewardAmount: number;
  isActive: boolean;
}

export interface UserTask {
  id: string;
  catalogId: string;
  assignedDate: string;
  status: 'pending' | 'completed' | 'failed' | 'skipped';
  title: string;
  description: string;
  rewardType: RewardType;
  rewardAmount: number;
}
