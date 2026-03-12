import * as Notifications from 'expo-notifications';
import { Platform, LogBox } from 'react-native';

// Ignore the Expo Go push notification warning since we only use local notifications currently
LogBox.ignoreLogs([
  '`expo-notifications` functionality is not fully supported in Expo Go',
  'expo-notifications: Android Push notifications',
]);

/**
 * Core Notification Service
 * Handles permissions, initialization, and core configuration.
 * Contains fallbacks for PWA / Web.
 */
class NotificationService {
  constructor() {
    this.configureHandler();
  }

  private configureHandler() {
    Notifications.setNotificationHandler({
      handleNotification: async () => ({
        shouldShowAlert: true,
        shouldPlaySound: true,
        shouldSetBadge: false,
        shouldShowBanner: true,
        shouldShowList: true,
      }),
    });
  }

  /**
   * Request permissions from the user.
   * On Web, relies on the `Notification` API.
   * On Native, relies on `expo-notifications`.
   */
  async requestPermissions(): Promise<boolean> {
    if (Platform.OS === 'web') {
      if (!('Notification' in window)) return false;
      if (Notification.permission === 'granted') return true;
      if (Notification.permission !== 'denied') {
        const permission = await Notification.requestPermission();
        return permission === 'granted';
      }
      return false;
    }

    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;
    
    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }
    
    return finalStatus === 'granted';
  }

  async cancelAllNotifications(): Promise<void> {
    if (Platform.OS === 'web') {
      // Logic for service worker web tasks if implemented
      return;
    }
    await Notifications.cancelAllScheduledNotificationsAsync();
  }
}

export const notificationService = new NotificationService();
