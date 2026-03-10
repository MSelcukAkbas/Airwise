import { TaskCatalogItem } from './types';

export const TASK_CATALOG: TaskCatalogItem[] = [
  {
    id: 't001',
    title: 'Morning Delay',
    description: 'Delay your first cigarette by 30 minutes after waking up',
    triggerPhase: 'all',
    rewardType: 'xp',
    rewardAmount: 50,
    isActive: true,
  },
  {
    id: 't002',
    title: 'Craving Warrior',
    description: 'Use the emergency button and complete the full breathing session',
    triggerPhase: 'all',
    rewardType: 'freeze',
    rewardAmount: 1,
    isActive: true,
  },
  {
    id: 't003',
    title: 'Skip One Slot',
    description: 'Skip one of your allocated permission windows today',
    triggerPhase: 'all',
    rewardType: 'xp',
    rewardAmount: 75,
    isActive: true,
  },
  {
    id: 't004',
    title: 'Stay on Target',
    description: 'Do not exceed your daily limit today',
    triggerPhase: 'all',
    rewardType: 'xp',
    rewardAmount: 100,
    isActive: true,
  },
  {
    id: 't005',
    title: 'System Loyal',
    description: 'Only smoke during system-permitted windows all day',
    triggerPhase: 'all',
    rewardType: 'freeze',
    rewardAmount: 1,
    isActive: true,
  },
  {
    id: 't006',
    title: '2-Hour Discipline',
    description: 'Maintain at least 2 hours between each cigarette',
    triggerPhase: 'reduction',
    rewardType: 'xp',
    rewardAmount: 150,
    isActive: true,
  },
  {
    id: 't007',
    title: 'Afternoon Freedom',
    description: 'Do not smoke between 12:00 and 15:00',
    triggerPhase: 'reduction',
    rewardType: 'xp',
    rewardAmount: 125,
    isActive: true,
  },
  {
    id: 't008',
    title: 'Evening Discipline',
    description: 'Stop smoking 2 hours before your sleep time',
    triggerPhase: 'delay',
    rewardType: 'freeze',
    rewardAmount: 1,
    isActive: true,
  },
  {
    id: 't009',
    title: 'Half Ration Day',
    description: 'Smoke only half your daily limit today',
    triggerPhase: 'delay',
    rewardType: 'xp',
    rewardAmount: 200,
    isActive: true,
  },
  {
    id: 't010',
    title: 'Track Every Trigger',
    description: 'Log a trigger reason for every craving session today',
    triggerPhase: 'all',
    rewardType: 'xp',
    rewardAmount: 60,
    isActive: true,
  },
];

export function getTasksForPhase(phase: string): TaskCatalogItem[] {
  return TASK_CATALOG.filter(
    (task) => task.isActive && (task.triggerPhase === 'all' || task.triggerPhase === phase),
  );
}

export function getRandomDailyTasks(phase: string, count: number = 3): TaskCatalogItem[] {
  const eligible = getTasksForPhase(phase);
  const shuffled = [...eligible].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, count);
}
