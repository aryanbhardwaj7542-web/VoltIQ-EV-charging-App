/**
 * VoltIQ Dynamic API & Real-Time WebSocket Configuration
 * Automatically adapts between local Vite dev server (port 5173 -> 3001)
 * and unified production runtime (origin domain/port), supporting custom environment overrides.
 */

function getApiBaseUrl(): string {
  if (typeof import.meta !== 'undefined' && import.meta.env?.VITE_API_URL) {
    return import.meta.env.VITE_API_URL.replace(/\/$/, '');
  }

  if (typeof window !== 'undefined') {
    // If running under Vite dev server (port 5173), target backend on port 3001
    if (window.location.port === '5173') {
      const hostname = window.location.hostname || 'localhost';
      return `http://${hostname}:3001`;
    }
    // In production or containerized mode, use same-origin base
    return window.location.origin.replace(/\/$/, '');
  }

  return 'http://localhost:3001';
}

function getWebSocketBaseUrl(): string {
  if (typeof import.meta !== 'undefined' && import.meta.env?.VITE_WS_URL) {
    return import.meta.env.VITE_WS_URL;
  }

  if (typeof window !== 'undefined') {
    // If running under Vite dev server (port 5173), connect to ws://hostname:3001/ws
    if (window.location.port === '5173') {
      const hostname = window.location.hostname || 'localhost';
      return `ws://${hostname}:3001/ws`;
    }
    // In production, derive protocol and host from window location
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    return `${protocol}//${window.location.host}/ws`;
  }

  return 'ws://localhost:3001/ws';
}

export const API_BASE_URL = getApiBaseUrl();
export const WS_BASE_URL = getWebSocketBaseUrl();

/**
 * Helper to build an absolute API endpoint URL
 * @param path - API path (e.g. '/api/stations' or 'api/stations')
 */
export function buildApiUrl(path: string): string {
  const normalizedPath = path.startsWith('/') ? path : `/${path}`;
  return `${API_BASE_URL}${normalizedPath}`;
}

/**
 * Returns the active WebSocket endpoint URL
 */
export function getWsUrl(): string {
  return WS_BASE_URL;
}
