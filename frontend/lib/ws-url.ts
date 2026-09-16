/**
 * Resolves the WebSocket origin for all realtime client connections.
 *
 * Single source of truth — previously `ws://localhost:3001` was hard-coded in
 * `store/uiStore.ts` and `http://localhost:3001` duplicated in
 * `services/messaging.service.ts`, both of which silently broke any
 * non-local deployment (UX-P1-03).
 *
 * Precedence:
 * 1. `NEXT_PUBLIC_WS_URL`  — explicit override (e.g. wss://api.example.com)
 * 2. `NEXT_PUBLIC_API_URL` — derive ws/wss host from the API base URL
 * 3. `window.location`     — same-origin fallback for browser-only deployments
 *
 * `nativeScheme` converts http(s) to ws(s) for the browser-native WebSocket
 * API used by the notifications channel (socket.io accepts both schemes).
 */
function resolveWsOrigin(nativeScheme: boolean): string {
  const explicit = process.env.NEXT_PUBLIC_WS_URL;
  if (explicit) {
    return nativeScheme
      ? explicit
          .replace(/^https:/, "wss:")
          .replace(/^http:/, "ws:")
          .replace(/\/+$/, "")
      : explicit.replace(/\/+$/, "");
  }

  const apiBase =
    process.env.NEXT_PUBLIC_API_URL ||
    (typeof window !== "undefined"
      ? `${window.location.origin}/api/v1`
      : "http://localhost:3001/api/v1");

  try {
    const url = new URL(
      apiBase,
      typeof window !== "undefined" ? window.location.origin : undefined,
    );
    let proto: string;
    if (nativeScheme) {
      proto = url.protocol === "https:" ? "wss:" : "ws:";
    } else {
      proto = url.protocol;
    }
    return `${proto}//${url.host}`;
  } catch {
    return nativeScheme ? "ws://localhost:3001" : "http://localhost:3001";
  }
}

/** Origin for the socket.io messaging client (path passed separately). */
export const resolveMessagingWsOrigin = (): string => resolveWsOrigin(false);

/** Full URL for the native WebSocket notifications channel. */
export const resolveNotificationsWsUrl = (): string =>
  `${resolveWsOrigin(true)}/ws-notifications`;