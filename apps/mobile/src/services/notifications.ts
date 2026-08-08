import { Platform } from 'react-native';
import Constants from 'expo-constants';
import { localEvents, CalendarEvent } from './database';
import { formatDate } from '../utils/date';

// expo-notifications' scheduling isn't supported in Expo Go (SDK 53+) and importing
// it there spams a console error. Lazy-require it and skip entirely in Expo Go — it
// works fully in a real/dev build.
const isExpoGo = Constants.executionEnvironment === 'storeClient';
let Notifications: typeof import('expo-notifications') | null = null;
const getNotifications = () => {
  if (isExpoGo) return null;
  if (!Notifications) {
    Notifications = require('expo-notifications');
    Notifications!.setNotificationHandler({
      handleNotification: async () => ({
        shouldPlaySound: true,
        shouldSetBadge: false,
        shouldShowBanner: true,
        shouldShowList: true,
      }),
    });
  }
  return Notifications;
};

let permissionAsked = false;

export async function ensureNotificationPermission(): Promise<boolean> {
  const N = getNotifications();
  if (!N) return false;
  try {
    const current = await N.getPermissionsAsync();
    if (current.granted) return true;
    if (permissionAsked && !current.canAskAgain) return false;
    permissionAsked = true;
    const req = await N.requestPermissionsAsync();
    return req.granted;
  } catch {
    return false;
  }
}

const titleFor = (type: CalendarEvent['type']): string => {
  switch (type) {
    case 'heat':
    case 'repeatHeat': return '🐄 Heat reminder';
    case 'medication': return '💉 Vaccination due';
    case 'treatment': return '💊 Treatment';
    case 'dueDate': return '🐄 Expected calving';
    default: return 'Reminder';
  }
};

// Re-schedule a local reminder at 8am the day before every upcoming event
// (heat, vaccination due, expected calving) derived from the calendar. Safe to
// call repeatedly — it clears and rebuilds the schedule. No-ops if permission
// is denied or the platform (e.g. Expo Go) can't schedule.
export async function scheduleReminders(): Promise<number> {
  const N = getNotifications();
  if (!N) return 0;
  try {
    if (!(await ensureNotificationPermission())) return 0;

    if (Platform.OS === 'android') {
      await N.setNotificationChannelAsync('reminders', {
        name: 'Reminders',
        importance: N.AndroidImportance.HIGH,
      });
    }

    await N.cancelAllScheduledNotificationsAsync();

    const events = await localEvents.getAll();
    const now = new Date();
    let scheduled = 0;

    for (const e of events) {
      if (scheduled >= 40) break; // OS caps pending notifications; keep it sane
      let notifyAt: Date;
      if (e.type === 'reminder') {
        // Fire at the reminder's own date + time (default 9am).
        const [hh, mm] = (e.time || '09:00').split(':').map(Number);
        notifyAt = new Date(`${e.date}T00:00:00`);
        notifyAt.setHours(hh || 9, mm || 0, 0, 0);
      } else {
        // Health/heat/calving: remind a day early at 8am.
        notifyAt = new Date(`${e.date}T08:00:00`);
        notifyAt.setDate(notifyAt.getDate() - 1);
      }
      if (isNaN(notifyAt.getTime()) || notifyAt <= now) continue;

      await N.scheduleNotificationAsync({
        content: {
          title: titleFor(e.type),
          body: `${e.cowId}: ${e.title} — due ${formatDate(e.date)}`,
        },
        trigger: {
          type: N.SchedulableTriggerInputTypes.DATE,
          date: notifyAt,
          channelId: Platform.OS === 'android' ? 'reminders' : undefined,
        },
      });
      scheduled += 1;
    }
    return scheduled;
  } catch {
    return 0;
  }
}
