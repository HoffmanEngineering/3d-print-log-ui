export type PushPermissionState = 'granted' | 'denied' | 'default';

/** Whether the phone can read tags right now. */
export type NfcStatus = 'unsupported' | 'off' | 'ready';

/** The tag technology native read the UID with. */
export type TagTech = 'nfca' | 'nfcb' | 'nfcf' | 'nfcv';

/** A spool tag held to the phone: its UID (uppercase hex, no separators) and technology. */
export interface TagRead {
  uid: string;
  tech: TagTech;
}

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

  /**
   * Register interest in taps that arrive after this page has loaded. Native calls the
   * listener; the listener drains the tap with consumePendingTap. Cordova's `resume` event
   * cannot be used for this — cordova.js is not present on this origin.
   *
   * Optional because an older app shell may not expose it yet.
   */
  onPendingTap?(listener: () => void): void;

  // NFC spool tags (app 1.3.0+). All optional: an older app shell has none of them, and the
  // presence of startTagReading is how the page tells. Delivery is signal-then-fetch, like taps.

  nfcStatus?(): Promise<NfcStatus>;
  /** Opens a reading session; native reads tags until stopTagReading. */
  startTagReading?(): Promise<NfcStatus>;
  stopTagReading?(): Promise<void>;
  /** The latest tag read, claimed once, or null. */
  consumeTag?(): Promise<TagRead | null>;
  openNfcSettings?(): Promise<void>;
  onTag?(listener: () => void): void;
  onNfcStatus?(listener: () => void): void;
}

declare global {
  interface Window {
    PrintLogNative?: PrintLogNativeBridge;
  }
}
