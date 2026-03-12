import { setupNotificationChannels, SMOKE_ALLOWED_CATEGORY } from '../services/notification/NotificationChannels';
import { notificationService } from '../services/notification/NotificationService';
import { scheduleSmokeOpportunity, scheduleGenericTaskReminder } from '../services/notification/NotificationSchedulers';

// Re-export constants
export { SMOKE_ALLOWED_CATEGORY };

// Proxy functions to abstract the new Service Layer from the UI/Contexts
// This maintains backwards compatibility while fully switching to the modular system

export async function registerNotificationCategories(t: (key: string) => string) {
  return setupNotificationChannels(t);
}

export async function requestPermissions() {
  return notificationService.requestPermissions();
}

export async function scheduleSmokeNotification(date: Date, t: (key: string) => string) {
  return scheduleSmokeOpportunity(date, t);
}

export async function scheduleTaskReminder(title: string, body: string, secondsDelay: number) {
  return scheduleGenericTaskReminder(title, body, secondsDelay);
}

export async function cancelAllNotifications() {
  return notificationService.cancelAllNotifications();
}

