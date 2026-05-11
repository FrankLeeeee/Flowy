import { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { subscribePush, unsubscribePush } from '../api/client';

// 'ios-needs-install' means the browser is iOS Safari running as a tab, where
// Web Push is unavailable until the user adds the PWA to their Home Screen
// (iOS 16.4+). It needs a different user-facing message than a generic
// unsupported browser, so we surface it as its own state.
export type PushSupport = 'supported' | 'unsupported' | 'ios-needs-install';

function detectSupport(): PushSupport {
  if ('serviceWorker' in navigator && 'PushManager' in window) return 'supported';

  const isIOS =
    /iPad|iPhone|iPod/.test(navigator.userAgent) ||
    (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  const standaloneNav = (navigator as Navigator & { standalone?: boolean }).standalone;
  const isStandalone =
    standaloneNav === true ||
    window.matchMedia('(display-mode: standalone)').matches;
  if (isIOS && !isStandalone) return 'ios-needs-install';

  return 'unsupported';
}

export function usePushNotifications() {
  const [permission, setPermission] = useState<NotificationPermission>(
    'Notification' in window ? Notification.permission : 'denied',
  );
  const [subscribed, setSubscribed] = useState(false);
  const [loading, setLoading] = useState(false);
  const [support] = useState<PushSupport>(detectSupport);

  useEffect(() => {
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) return;

    navigator.serviceWorker.ready.then((reg) => {
      reg.pushManager.getSubscription().then((sub) => {
        setSubscribed(!!sub);
      });
    });
  }, []);

  const subscribe = useCallback(async () => {
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) return;
    setLoading(true);
    try {
      const perm = await Notification.requestPermission();
      setPermission(perm);
      if (perm !== 'granted') return;

      const { data } = await axios.get<{ publicKey: string }>('/api/push/vapid-public-key', {
        withCredentials: true,
      });

      const reg = await navigator.serviceWorker.ready;
      // iOS Safari rejects the ArrayBuffer form of applicationServerKey — the
      // subscription succeeds but pushes never arrive. Passing the Uint8Array
      // view directly works on every browser.
      const sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(data.publicKey),
      });

      await subscribePush(sub.toJSON() as PushSubscriptionJSON);
      setSubscribed(true);
    } catch {
      // Permission denied or subscription failed
    } finally {
      setLoading(false);
    }
  }, []);

  const unsubscribe = useCallback(async () => {
    if (!('serviceWorker' in navigator)) return;
    setLoading(true);
    try {
      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.getSubscription();
      if (sub) {
        await unsubscribePush(sub.endpoint);
        await sub.unsubscribe();
      }
      setSubscribed(false);
    } catch {
      // Unsubscribe failed
    } finally {
      setLoading(false);
    }
  }, []);

  return { permission, subscribed, loading, support, subscribe, unsubscribe };
}

function urlBase64ToUint8Array(base64String: string): Uint8Array<ArrayBuffer> {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const raw = window.atob(base64);
  const buffer = new ArrayBuffer(raw.length);
  const arr = new Uint8Array(buffer);
  for (let i = 0; i < raw.length; i++) {
    arr[i] = raw.charCodeAt(i);
  }
  return arr;
}
