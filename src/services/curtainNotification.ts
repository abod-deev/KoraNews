// Helper service to trigger native system notifications in the phone's notification curtain (ستارة الهاتف)
import { safeStorage } from '../utils/safeStorage';

export interface CurtainNotificationOptions {
  title: string;
  body: string;
  url?: string;
  tag?: string;
  badge?: string;
  icon?: string;
}

export function isCurtainNotificationSupported(): boolean {
  return typeof window !== 'undefined' && ('Notification' in window || 'serviceWorker' in navigator);
}

export function getNotificationPermission(): NotificationPermission {
  if (typeof window === 'undefined' || !('Notification' in window)) {
    return 'denied';
  }
  return Notification.permission;
}

export async function requestCurtainNotificationPermission(): Promise<NotificationPermission> {
  if (typeof window === 'undefined' || !('Notification' in window)) {
    return 'denied';
  }
  try {
    const perm = await Notification.requestPermission();
    return perm;
  } catch (err) {
    console.warn('Error requesting notification permission:', err);
    return 'denied';
  }
}

/**
 * Sends a native system notification directly to the phone's notification shade/curtain (ستارة الإشعارات في الهاتف).
 * Uses ServiceWorkerRegistration.showNotification first (which is required by Android & mobile browsers to show in the curtain),
 * and falls back to desktop Notification API.
 */
export async function sendPhoneCurtainNotification(options: CurtainNotificationOptions): Promise<{
  success: boolean;
  method?: 'service_worker' | 'desktop_api';
  error?: string;
}> {
  if (!isCurtainNotificationSupported()) {
    return { success: false, error: 'المتصفح لا يدعم إشعارات النظام' };
  }

  let permission = getNotificationPermission();
  if (permission === 'default') {
    permission = await requestCurtainNotificationPermission();
  }

  if (permission !== 'granted') {
    return { success: false, error: 'لم يتم منح إذن الإشعارات' };
  }

  const notificationOptions: NotificationOptions = {
    body: options.body,
    icon: options.icon || '/site-logo.jpg',
    badge: options.badge || '/site-logo.jpg',
    tag: options.tag || 'predictions-alert',
    renotify: true,
    // Vibration pattern triggers phone hardware haptic vibration: [vibrate, pause, vibrate, pause, vibrate]
    vibrate: [250, 100, 250, 100, 250],
    data: {
      url: options.url || '/predictions',
    },
  };

  // 1. Primary method for Mobile / Phone curtain: ServiceWorker registration
  if (typeof navigator !== 'undefined' && 'serviceWorker' in navigator) {
    try {
      let registration = await navigator.serviceWorker.getRegistration();
      if (!registration) {
        registration = await navigator.serviceWorker.register('/sw.js');
      }
      if (registration) {
        await registration.showNotification(options.title, notificationOptions);
        return { success: true, method: 'service_worker' };
      }
    } catch (swErr) {
      console.warn('SW showNotification failed, trying fallback:', swErr);
    }
  }

  // 2. Desktop fallback
  try {
    const n = new Notification(options.title, notificationOptions);
    n.onclick = () => {
      window.focus();
      if (options.url) {
        window.location.href = options.url;
      }
    };
    return { success: true, method: 'desktop_api' };
  } catch (err: any) {
    console.error('Curtain notification failed:', err);
    return { success: false, error: err?.message || 'فشل إرسال الإشعار إلى ستارة الهاتف' };
  }
}

const STORAGE_KEY_CURTAIN_ENABLED = 'kora_phone_curtain_notifications_enabled';

// Clean up any legacy alert data previously added
export function cleanLegacyAlertData(): void {
  try {
    const legacyKeys = [
      'kora_seen_prediction_match_ids',
      'kora_prediction_alerts_enabled',
      'kora_prediction_notified_matches',
      'kora_predictions_notified_matches',
      'kora_last_prediction_alert_time',
      'kora_prediction_seen_time',
    ];
    legacyKeys.forEach((key) => {
      safeStorage.removeItem(key);
    });
  } catch (e) {
    console.warn('Failed to clean legacy alert keys', e);
  }
}

// Auto clean legacy keys on load
cleanLegacyAlertData();

export function isCurtainAlertEnabled(): boolean {
  try {
    const val = safeStorage.getItem(STORAGE_KEY_CURTAIN_ENABLED);
    return val !== null ? val === 'true' : false;
  } catch {
    return false;
  }
}

export function setCurtainAlertEnabled(enabled: boolean): void {
  try {
    safeStorage.setItem(STORAGE_KEY_CURTAIN_ENABLED, String(enabled));
  } catch {}
}
