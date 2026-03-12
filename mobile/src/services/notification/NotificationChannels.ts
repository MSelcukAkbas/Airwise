import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

export const SMOKE_ALLOWED_CATEGORY = 'smoke_allowed';

/**
 * Handles Android Notification Channels and Interactive Categories
 * Designed to be modular so additional categories (e.g. daily-summary, warning) can be added easily.
 */
export async function setupNotificationChannels(t: (key: string) => string) {
  if (Platform.OS === 'web') return;

  // For future custom channels:
  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('default', {
      name: 'default',
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#FF231F7C',
    });
  }

  await Notifications.setNotificationCategoryAsync(SMOKE_ALLOWED_CATEGORY, [
    {
      identifier: 'smoke_now',
      buttonTitle: t('notifications.actions.smoke'),
      options: { isDestructive: true, opensAppToForeground: true },
    },
    {
      identifier: 'resist_now',
      buttonTitle: t('notifications.actions.resist'),
      options: { isAuthenticationRequired: false, opensAppToForeground: true },
    },
  ]);
}
