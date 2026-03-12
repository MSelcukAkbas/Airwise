import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import { SMOKE_ALLOWED_CATEGORY } from './NotificationChannels';

/**
 * Schedulers for specific scenarios. 
 * Separating trigger logic allows for cleaner status analysis and dynamic scheduling in the future.
 */

export async function scheduleSmokeOpportunity(date: Date, t: (key: string) => string) {
  const now = new Date();
  if (date <= now) return;

  const secondsUntil = Math.floor((date.getTime() - now.getTime()) / 1000);

  if (Platform.OS === 'web') {
    // Basic Web API fallback without Service Worker (requires tab to be open)
    // Future expansion: Service Worker integration
    setTimeout(() => {
      if ('Notification' in window && Notification.permission === 'granted') {
        new Notification(t('notifications.smokeAllowed.title'), {
          body: t('notifications.smokeAllowed.body'),
          icon: '/assets/images/icon.png'
        });
      }
    }, secondsUntil * 1000);
    return;
  }

  if (secondsUntil > 0) {
    await Notifications.scheduleNotificationAsync({
      content: {
        title: t('notifications.smokeAllowed.title'),
        body: t('notifications.smokeAllowed.body'),
        data: { type: 'smoke_allowed' },
        categoryIdentifier: SMOKE_ALLOWED_CATEGORY,
        sound: true,
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
        seconds: secondsUntil,
      },
    });

    // Schedule craving reminder 15 minutes later
    const cravingDate = new Date(date.getTime() + 15 * 60 * 1000);
    const secondsUntilCraving = Math.floor((cravingDate.getTime() - now.getTime()) / 1000);
    
    if (secondsUntilCraving > secondsUntil) {
      await Notifications.scheduleNotificationAsync({
        content: {
          title: t('notifications.cravingReminder.title') || 'Still Resisting?',
          body: t('notifications.cravingReminder.body') || 'Every minute you wait is a win for your health! 🌟',
          data: { type: 'craving_reminder' },
          sound: true,
        },
        trigger: {
          type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
          seconds: secondsUntilCraving,
        },
      });
    }
  }
}

export async function scheduleGenericTaskReminder(title: string, body: string, secondsDelay: number) {
  if (Platform.OS === 'web') return; // Extendable later
  
  await Notifications.scheduleNotificationAsync({
    content: {
      title,
      body,
      data: { type: 'task_reminder' },
      sound: true,
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
      seconds: Math.max(1, secondsDelay),
    },
  });
}
