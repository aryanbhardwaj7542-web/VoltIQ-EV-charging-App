/**
 * Service Worker Registration Helper for VoltIQ PWA
 */

export interface SwStatus {
  isSupported: boolean;
  isRegistered: boolean;
  registration: ServiceWorkerRegistration | null;
  state: 'UNREGISTERED' | 'INSTALLING' | 'WAITING' | 'ACTIVE' | 'ERROR';
}

export function registerServiceWorker(onSuccess?: (reg: ServiceWorkerRegistration) => void): void {
  if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
    window.addEventListener('load', () => {
      navigator.serviceWorker
        .register('/sw.js')
        .then((registration) => {
          console.log('[VoltIQ PWA] Service Worker registered successfully:', registration.scope);
          // Check for worker updates and purge stale cache
          registration.update().catch(() => {});
          if (onSuccess) onSuccess(registration);
        })
        .catch((error) => {
          console.warn('[VoltIQ PWA] Service Worker registration failed:', error);
        });
    });
  }
}

export async function getSwStatus(): Promise<SwStatus> {
  if (typeof window === 'undefined' || !('serviceWorker' in navigator)) {
    return {
      isSupported: false,
      isRegistered: false,
      registration: null,
      state: 'UNREGISTERED'
    };
  }

  try {
    const reg = await navigator.serviceWorker.getRegistration();
    if (!reg) {
      return {
        isSupported: true,
        isRegistered: false,
        registration: null,
        state: 'UNREGISTERED'
      };
    }

    let state: SwStatus['state'] = 'ACTIVE';
    if (reg.installing) state = 'INSTALLING';
    else if (reg.waiting) state = 'WAITING';
    else if (reg.active) state = 'ACTIVE';

    return {
      isSupported: true,
      isRegistered: true,
      registration: reg,
      state
    };
  } catch {
    return {
      isSupported: true,
      isRegistered: false,
      registration: null,
      state: 'ERROR'
    };
  }
}
