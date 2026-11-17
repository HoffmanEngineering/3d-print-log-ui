import { HttpClient } from '@angular/common/http';
import { computed, inject, Injectable, signal } from '@angular/core';
import { Observable, throwError } from 'rxjs';
import { environment } from 'src/environments/environment';
import { CAN_PURCHASE_PRO } from '../pricing/pro-purchase';

export interface SubscriptionDto {
  status: 'none' | 'active' | 'past_due' | 'canceled';
  plan: 'free' | 'pro_monthly' | 'pro_annual';
  currentPeriodEnd: string | null;
  cancelAtPeriodEnd: boolean;
  isPro: boolean;
  /** Images allowed per print, per material and per printer. One cap governs all three. */
  maxImages: number;
  /** @deprecated Kept for wire compatibility; always equals {@link maxImages}. */
  maxImagesPerPrint: number;
  maxFilesPerPrint: number;
  maxFileStorageBytes: number;
  usedFileStorageBytes: number;
}

@Injectable({
  providedIn: 'root',
})
export class SubscriptionService {
  private readonly http = inject(HttpClient);
  private readonly canPurchasePro = inject(CAN_PURCHASE_PRO);
  private readonly baseApiUrl = `${environment.printLogApiUrl}/api/Subscription`;

  private readonly _subscription = signal<SubscriptionDto | null>(null);

  readonly isPro = computed(() => this._subscription()?.isPro ?? false);
  readonly status = computed(() => this._subscription()?.status ?? 'none');
  readonly plan = computed(() => this._subscription()?.plan ?? 'free');
  readonly currentPeriodEnd = computed(
    () => this._subscription()?.currentPeriodEnd ?? null
  );
  readonly cancelAtPeriodEnd = computed(
    () => this._subscription()?.cancelAtPeriodEnd ?? false
  );
  /**
   * Images allowed on one print, material or printer.
   *
   * Defaults to the FREE cap, never the Pro one: an unloaded subscription must not
   * promise a user headroom the API will reject.
   */
  readonly maxImages = computed(() => this._subscription()?.maxImages ?? 5);

  /** @deprecated Use {@link maxImages}; the API sends the same number for both. */
  readonly maxImagesPerPrint = computed(
    () => this._subscription()?.maxImages ?? 5
  );
  readonly maxFilesPerPrint = computed(
    () => this._subscription()?.maxFilesPerPrint ?? 0
  );
  readonly maxFileStorageBytes = computed(
    () => this._subscription()?.maxFileStorageBytes ?? 0
  );
  readonly usedFileStorageBytes = computed(
    () => this._subscription()?.usedFileStorageBytes ?? 0
  );

  private readonly _loaded = signal(false);
  /**
   * True once /me has answered, successfully or not. Until then {@link isPro} is a guess
   * (false), so anything that must not show to a Pro user, such as an ad, waits on this.
   */
  readonly loaded = this._loaded.asReadonly();

  loadSubscription(): void {
    this.http.get<SubscriptionDto>(`${this.baseApiUrl}/me`).subscribe({
      next: (dto) => {
        this._subscription.set(dto);
        this._loaded.set(true);
      },
      // A failed lookup keeps the free defaults, as it always has.
      error: () => this._loaded.set(true),
    });
  }

  incrementUsedStorage(bytes: number): void {
    this._subscription.update((s) =>
      s ? { ...s, usedFileStorageBytes: s.usedFileStorageBytes + bytes } : s
    );
  }

  decrementUsedStorage(bytes: number): void {
    this._subscription.update((s) =>
      s
        ? {
            ...s,
            usedFileStorageBytes: Math.max(0, s.usedFileStorageBytes - bytes),
          }
        : s
    );
  }

  createCheckoutSession(planId: string): Observable<{ url: string }> {
    if (!this.canPurchasePro) {
      return purchaseUnavailable();
    }
    return this.http.post<{ url: string }>(`${this.baseApiUrl}/checkout`, {
      planId,
    });
  }

  /** The billing portal changes plans too, so it is a purchase surface like checkout. */
  createPortalSession(): Observable<{ url: string }> {
    if (!this.canPurchasePro) {
      return purchaseUnavailable();
    }
    return this.http.post<{ url: string }>(`${this.baseApiUrl}/portal`, {});
  }
}

/**
 * The backstop behind CAN_PURCHASE_PRO: in the iOS app no request is made, so a call to
 * action a template forgot to hide still cannot send the user to Stripe.
 */
function purchaseUnavailable(): Observable<never> {
  return throwError(
    () => new Error('Pro cannot be purchased in the iOS app (App Store 3.1.1).')
  );
}
