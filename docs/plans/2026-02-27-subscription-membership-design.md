# 3D Print Log Pro - Subscription Membership Design

**Date:** 2026-02-27
**Status:** Approved

## Overview

Add a "3D Print Log Pro" subscription tier that allows users to pay to remove ads and unlock premium features. Uses Stripe for payment processing with the backend API as the source of truth for subscription state.

## Tiers & Pricing

|                                                                            | Free | Pro                                 |
| -------------------------------------------------------------------------- | ---- | ----------------------------------- |
| **Monthly price**                                                          | $0   | $2.99/mo                            |
| **Annual price**                                                           | $0   | $29.99/yr (~$2.50/mo, 16% discount) |
| Ad-free experience                                                         | No   | Yes                                 |
| Images per print                                                           | 5    | 15-20                               |
| File attachments (gcode, STL, 3MF)                                         | No   | Yes                                 |
| All core features (prints, printers, filaments, analytics, feed, API keys) | Yes  | Yes                                 |

**Key principle:** Free tier retains all existing functionality. Pro adds quality-of-life upgrades. No existing features are taken away.

## Architecture: Backend-Managed Stripe

The backend API handles Stripe webhooks, stores subscription status in the database, and exposes it via API endpoints. The frontend fetches subscription status like any other user data. Stripe Checkout (hosted) handles the payment UI.

## Backend Design (.NET 9 API)

### New Entity: `Subscription`

```csharp
public class Subscription : TimestampEntity
{
    [Key]
    public long Id { get; set; }
    public long UserId { get; set; }
    public User User { get; set; }

    public string StripeCustomerId { get; set; }
    public string StripeSubscriptionId { get; set; }
    public string StripePriceId { get; set; }

    public SubscriptionStatus Status { get; set; }  // None, Active, PastDue, Canceled
    public SubscriptionPlan Plan { get; set; }       // Free, ProMonthly, ProAnnual

    public DateTimeOffset? CurrentPeriodStart { get; set; }
    public DateTimeOffset? CurrentPeriodEnd { get; set; }
    public bool CancelAtPeriodEnd { get; set; }
    public DateTimeOffset? CanceledAt { get; set; }
}
```

### New Enums

```csharp
public enum SubscriptionStatus { None, Active, PastDue, Canceled }
public enum SubscriptionPlan { Free, ProMonthly, ProAnnual }
```

### New Controller: `SubscriptionController`

| Method | Route                        | Auth           | Description                                       |
| ------ | ---------------------------- | -------------- | ------------------------------------------------- |
| GET    | `/api/Subscription/me`       | Authorize      | Get current user's subscription status            |
| POST   | `/api/Subscription/checkout` | Authorize      | Create Stripe Checkout Session, return URL        |
| POST   | `/api/Subscription/portal`   | Authorize      | Create Stripe Customer Portal session, return URL |
| POST   | `/api/Subscription/webhook`  | AllowAnonymous | Stripe webhook receiver (validates signature)     |

### New Service: `ISubscriptionService`

```csharp
public interface ISubscriptionService
{
    Task<SubscriptionDto> GetSubscriptionForUser(long userId);
    Task<string> CreateCheckoutSession(long userId, string planId);
    Task<string> CreateCustomerPortalSession(long userId);
    Task HandleStripeWebhook(string json, string signature);
}
```

### Stripe Webhook Events

| Event                           | Action                              |
| ------------------------------- | ----------------------------------- |
| `checkout.session.completed`    | Create/activate subscription record |
| `customer.subscription.updated` | Update status, plan, period dates   |
| `customer.subscription.deleted` | Mark as canceled                    |
| `invoice.payment_failed`        | Mark as past_due                    |

### Configuration (appsettings.json)

```json
{
  "Stripe": {
    "SecretKey": "",
    "WebhookSecret": "",
    "ProMonthlyPriceId": "",
    "ProAnnualPriceId": ""
  }
}
```

### Feature Limit Enforcement

- Print image upload endpoints check subscription status before allowing >5 images
- New file attachment endpoints require active Pro subscription
- Enforcement happens server-side regardless of frontend state

### NuGet Package

- `Stripe.net` (official Stripe .NET SDK)

### New DTOs

```csharp
public class SubscriptionDto
{
    public SubscriptionStatus Status { get; set; }
    public SubscriptionPlan Plan { get; set; }
    public DateTimeOffset? CurrentPeriodEnd { get; set; }
    public bool CancelAtPeriodEnd { get; set; }
    public bool IsPro { get; set; }  // Convenience: Status == Active
}

public class CreateCheckoutSessionDto
{
    [Required]
    public string PlanId { get; set; }  // "pro_monthly" or "pro_annual"
}
```

## Frontend Design (Angular 20)

### New Service: `SubscriptionService` (core/services/)

```typescript
@Injectable({ providedIn: 'root' })
export class SubscriptionService {
  private readonly subscription = signal<SubscriptionDto | null>(null);

  readonly isPro = computed(() => this.subscription()?.isPro ?? false);
  readonly status = computed(() => this.subscription()?.status ?? 'none');
  readonly plan = computed(() => this.subscription()?.plan ?? 'free');
  readonly currentPeriodEnd = computed(() => this.subscription()?.currentPeriodEnd);
  readonly cancelAtPeriodEnd = computed(() => this.subscription()?.cancelAtPeriodEnd ?? false);

  loadSubscription(): void {
    /* GET /api/Subscription/me */
  }
  createCheckoutSession(planId: string): Observable<{ url: string }> {
    /* POST /api/Subscription/checkout */
  }
  createPortalSession(): Observable<{ url: string }> {
    /* POST /api/Subscription/portal */
  }
}
```

### New Model: `SubscriptionDto`

```typescript
export interface SubscriptionDto {
  status: 'none' | 'active' | 'past_due' | 'canceled';
  plan: 'free' | 'pro_monthly' | 'pro_annual';
  currentPeriodEnd: string | null;
  cancelAtPeriodEnd: boolean;
  isPro: boolean;
}
```

### New Lazy-Loaded Module: `subscription/`

**Routes:**

- `/subscription` - Pricing/upgrade page with plan cards
- `/subscription/success` - Post-checkout confirmation
- `/subscription/canceled` - Checkout abandoned page

### Ad Removal

Existing `AdComponent` and `SidebarAdComponent` check `isPro()`:

```html
@if (!subscriptionService.isPro()) {
<app-ad></app-ad>
}
```

### Settings Integration

New "Subscription" section in the settings page:

- Current plan display with renewal date
- "Manage Billing" button → Stripe Customer Portal redirect
- "Upgrade to Pro" button (free users only)

### Checkout Flow

1. User clicks "Upgrade to Pro" (from pricing page, settings, or upgrade prompt)
2. User selects monthly or annual plan
3. Frontend calls `POST /api/Subscription/checkout` with plan choice
4. Backend creates Stripe Checkout Session, returns URL
5. Frontend redirects to Stripe Checkout (hosted page)
6. After payment, Stripe redirects to `/subscription/success`
7. Backend receives Stripe webhook, updates database
8. Frontend refreshes subscription status via `GET /api/Subscription/me`

### Upgrade Prompts (Gentle, Not Pushy)

- **Image upload:** When hitting 5 images, show "Upload more with Pro" badge
- **File attachments:** "Attach files with Pro" on print detail view
- **Ads:** Optional small "Remove ads with Pro" link near ad placements
- **Navigation:** Small "Pro" link in sidebar for free users

### Pro User Indicators

- No ads displayed anywhere
- Higher image upload limit (count indicator adjusts)
- File attachment dropzone on print detail/edit views
- Subtle "Pro" badge in profile/settings

## Implementation Phases

### Phase 1: Backend Foundation

- Subscription entity, EF migration
- `ISubscriptionService` / `SubscriptionService`
- `SubscriptionController` with all endpoints
- Stripe integration (checkout sessions, webhooks, customer portal)
- Feature limit enforcement (images)

### Phase 2: Frontend Core

- `SubscriptionService` and `SubscriptionDto` model
- Subscription module (pricing page, success/cancel pages)
- Settings integration (subscription status, manage billing)
- Ad removal logic

### Phase 3: Feature Gating

- Image upload limit adjustment based on subscription
- File attachment feature (new Pro-only capability)
- Upgrade prompts at relevant touchpoints
- Pro badge/indicator

### Phase 4: Polish

- Email notifications (welcome, expiring, payment failed)
- Analytics events for subscription funnel
- Documentation updates

## Out of Scope (YAGNI)

- Free trial period
- Multiple Pro tiers
- Team/organization subscriptions
- Coupon/promo codes (Stripe supports natively, add later)
- Referral system

## Environment Configuration

### Frontend (environment.ts / environment.prod.ts)

```typescript
stripe: {
    proMonthlyPriceId: 'price_xxx',
    proAnnualPriceId: 'price_xxx',
}
```

### Backend (appsettings.json)

```json
{
  "Stripe": {
    "SecretKey": "",
    "WebhookSecret": "",
    "ProMonthlyPriceId": "",
    "ProAnnualPriceId": ""
  }
}
```

## Dependencies

### Backend

- `Stripe.net` NuGet package

### Frontend

- No new npm packages needed (Stripe Checkout is hosted, no client SDK required)
