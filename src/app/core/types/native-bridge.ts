export type PushPermissionState = 'granted' | 'denied' | 'default';

export interface PendingTap {
  notificationId: string;
  printId: number;
}

/**
 * Injected by the Cordova app into the top-level frame on the app origin only.
 *
 * The raw FCM token is deliberately NOT exposed. The web layer hands its bearer token to
 * native and native performs the API call, so page script — including the third-party
 * scripts this origin serves under a report-only CSP — can never read a token it could use
 * to hijack a device registration.
 */
export interface PrintLogNativeBridge {
  platform: 'android';
  appVersion: string;
  pushPermission: PushPermissionState;
  requestPushPermission(): Promise<PushPermissionState>;
  registerForPush(bearerToken: string): Promise<{ ok: boolean }>;
  unregisterForPush(bearerToken: string): Promise<{ ok: boolean }>;
  consumePendingTap(): Promise<PendingTap | null>;
}

declare global {
  interface Window {
    PrintLogNative?: PrintLogNativeBridge;
  }
}
