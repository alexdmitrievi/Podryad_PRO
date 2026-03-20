'use client';

const VAPID_PUBLIC_KEY = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || '';

export async function registerServiceWorker(): Promise<ServiceWorkerRegistration | null> {
  if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
    console.log('Push notifications not supported');
    return null;
  }

  try {
    const reg = await navigator.serviceWorker.register('/sw-push.js');
    console.log('Push SW registered');
    return reg;
  } catch (error) {
    console.error('SW registration failed:', error);
    return null;
  }
}

export async function subscribeToPush(): Promise<PushSubscription | null> {
  const reg = await registerServiceWorker();
  if (!reg) return null;

  // Проверяем текущую подписку
  const existing = await reg.pushManager.getSubscription();
  if (existing) return existing;

  try {
    const subscription = await reg.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(
        VAPID_PUBLIC_KEY
      ) as BufferSource,
    });
    return subscription;
  } catch (error) {
    console.error('Push subscription failed:', error);
    return null;
  }
}

export async function unsubscribeFromPush(): Promise<boolean> {
  const reg = await navigator.serviceWorker.getRegistration();
  if (!reg) return false;

  const subscription = await reg.pushManager.getSubscription();
  if (!subscription) return true;

  return subscription.unsubscribe();
}

// Проверить текущий статус разрешений
export function getPushPermissionStatus():
  | 'granted'
  | 'denied'
  | 'default'
  | 'unsupported' {
  if (!('Notification' in window)) return 'unsupported';
  return Notification.permission;
}

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}
