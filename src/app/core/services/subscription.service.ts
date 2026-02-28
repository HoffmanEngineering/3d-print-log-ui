import { HttpClient } from '@angular/common/http';
import { computed, inject, Injectable, signal } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from 'src/environments/environment';

export interface SubscriptionDto {
  status: 'none' | 'active' | 'past_due' | 'canceled';
  plan: 'free' | 'pro_monthly' | 'pro_annual';
  currentPeriodEnd: string | null;
  cancelAtPeriodEnd: boolean;
  isPro: boolean;
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
  readonly maxImagesPerPrint = computed(
    () => this._subscription()?.maxImagesPerPrint ?? 5
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

  loadSubscription(): void {
    this.http.get<SubscriptionDto>(`${this.baseApiUrl}/me`).subscribe((dto) => {
      this._subscription.set(dto);
    });
  }

  createCheckoutSession(planId: string): Observable<{ url: string }> {
    return this.http.post<{ url: string }>(`${this.baseApiUrl}/checkout`, {
      planId,
    });
  }

  createPortalSession(): Observable<{ url: string }> {
    return this.http.post<{ url: string }>(`${this.baseApiUrl}/portal`, {});
  }
}
