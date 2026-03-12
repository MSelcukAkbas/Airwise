import { UserProfile, Phase } from './types';

export function parseTime(timeStr: string): { hours: number; minutes: number } {
  const parts = timeStr.split(':');
  return { hours: parseInt(parts[0], 10), minutes: parseInt(parts[1], 10) };
}

export function getActiveMinutes(profile: UserProfile): number {
  const wake = parseTime(profile.wakeUpTime);
  const sleep = parseTime(profile.sleepTime);
  const wakeMinutes = wake.hours * 60 + wake.minutes;
  let sleepMinutes = sleep.hours * 60 + sleep.minutes;
  if (sleepMinutes <= wakeMinutes) sleepMinutes += 24 * 60;
  return sleepMinutes - wakeMinutes;
}

export function getIntervalMinutes(profile: UserProfile): number {
  const activeMinutes = getActiveMinutes(profile);
  return Math.max(15, Math.floor(activeMinutes / profile.currentDailyLimit));
}

export function getNextPermissionTime(
  profile: UserProfile,
  lastSmokeTime: Date | null,
): Date {
  const now = new Date();
  const wake = parseTime(profile.wakeUpTime);
  const todayWake = new Date(now);
  todayWake.setHours(wake.hours, wake.minutes, 0, 0);

  if (!lastSmokeTime) return todayWake;

  const lastSmokeDate = new Date(lastSmokeTime);
  if (lastSmokeDate < todayWake) return todayWake;

  const intervalMs = getIntervalMinutes(profile) * 60 * 1000;
  return new Date(lastSmokeDate.getTime() + intervalMs);
}

export function isWithinActiveHours(profile: UserProfile): boolean {
  const now = new Date();
  const wake = parseTime(profile.wakeUpTime);
  const sleep = parseTime(profile.sleepTime);
  const nowMinutes = now.getHours() * 60 + now.getMinutes();
  const wakeMinutes = wake.hours * 60 + wake.minutes;
  let sleepMinutes = sleep.hours * 60 + sleep.minutes;
  if (sleepMinutes <= wakeMinutes) sleepMinutes += 24 * 60;
  if (nowMinutes >= wakeMinutes && nowMinutes < sleepMinutes) return true;
  if (sleepMinutes > 24 * 60 && nowMinutes < sleepMinutes - 24 * 60) return true;
  return false;
}

export function determinePhase(profile: UserProfile): Phase {
  const daysSinceStart = getDaysSinceStart(profile, true);
  if (daysSinceStart < 7) return 'control';
  if (profile.currentDailyLimit <= 3) return 'freedom';
  if (getIntervalMinutes(profile) > 90) return 'delay';
  if (daysSinceStart >= 7) return 'reduction';
  return 'control';
}

export function calculateNewDailyLimit(profile: UserProfile): number {
  const daysSinceStart = getDaysSinceStart(profile, true);
  if (daysSinceStart < 7) return profile.dailyStartLimit;
  const daysInReduction = daysSinceStart - 7;
  const weeksInReduction = Math.floor(daysInReduction / 7);
  const diffRates: Record<string, number> = { easy: 1, normal: 2, hard: 3 };
  const rate = diffRates[profile.difficultyLevel] || 2;
  const reduction = weeksInReduction * rate;
  return Math.max(1, profile.dailyStartLimit - reduction);
}

export function getDaysSinceStart(profile: UserProfile, effective: boolean = false): number {
  const start = new Date(profile.startDate);
  const now = new Date();
  let days = Math.floor((now.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
  if (effective && profile.frozenDates && profile.frozenDates.length > 0) {
    days = Math.max(0, days - profile.frozenDates.length);
  }
  return days;
}

export function calculateSavings(
  profile: UserProfile,
  cigarettesNotSmoked: number,
): number {
  const pricePerCigarette = profile.cigarettePricePerPack / (profile.cigarettesPerPack || 20);
  return Math.max(0, cigarettesNotSmoked * pricePerCigarette);
}

export function formatCountdown(ms: number): string {
  if (ms <= 0) return '00:00';
  const totalSeconds = Math.floor(ms / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  if (hours > 0) {
    return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
  }
  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
}

export function formatTime(date: Date): string {
  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

export function todayKey(): string {
  return new Date().toISOString().split('T')[0];
}
