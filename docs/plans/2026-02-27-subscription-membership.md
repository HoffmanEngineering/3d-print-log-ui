# 3D Print Log Pro - Subscription Membership Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add a "3D Print Log Pro" subscription ($2.99/mo or $29.99/yr) powered by Stripe, allowing users to remove ads and unlock premium features (more images, file attachments).

**Architecture:** Backend-managed Stripe. The .NET 9 API handles Stripe webhooks and stores subscription status in SQL Server. The Angular 20 frontend fetches subscription state via API and gates features with a signal-based `SubscriptionService`. Stripe Checkout (hosted) handles all payment UI.

**Tech Stack:** Angular 20 (frontend), .NET 9 / EF Core / SQL Server (backend), Stripe Checkout + Customer Portal + Webhooks (payments)

**Design Doc:** `docs/plans/2026-02-27-subscription-membership-design.md`

---

## Phase 1: Backend Foundation

### Task 1: Add Stripe NuGet Package

**Files:**

- Modify: `PrintLogApi/PrintLogApi/PrintLogApi.csproj:38-58`

**Step 1: Add the Stripe.net package**

Add to the `<ItemGroup>` containing other `PackageReference` entries (after line 57):

```xml
<PackageReference Include="Stripe.net" Version="47.4.0" />
```

**Step 2: Restore packages**

Run: `cd PrintLogApi && dotnet restore`
Expected: Restore succeeds

**Step 3: Commit**

```bash
git add PrintLogApi/PrintLogApi/PrintLogApi.csproj
git commit -m "chore: add Stripe.net NuGet package"
```

---

### Task 2: Add Stripe Configuration

**Files:**

- Modify: `PrintLogApi/PrintLogApi/appsettings.json:1-27`
- Modify: `PrintLogApi/PrintLogApi/appsettings.Development.json`
- Modify: `PrintLogApi/PrintLogApi/Startup.cs:174-183`

**Step 1: Add Stripe config section to appsettings.json**

Add after the `ExternalProviders` section (before the closing `}`):

```json
"Stripe": {
  "SecretKey": "",
  "WebhookSecret": "",
  "ProMonthlyPriceId": "",
  "ProAnnualPriceId": ""
}
```

**Step 2: Add dev Stripe keys to appsettings.Development.json**

Add the same `Stripe` section with test-mode keys (these will be filled in by the developer from the Stripe Dashboard):

```json
"Stripe": {
  "SecretKey": "",
  "WebhookSecret": "",
  "ProMonthlyPriceId": "",
  "ProAnnualPriceId": ""
}
```

**Step 3: Create Stripe options class**

Create file: `PrintLogApi/PrintLogApi/Models/Stripe/StripeOptions.cs`

```csharp
namespace PrintLogApi.Models.Stripe
{
    public class StripeOptions
    {
        public string SecretKey { get; set; }
        public string WebhookSecret { get; set; }
        public string ProMonthlyPriceId { get; set; }
        public string ProAnnualPriceId { get; set; }
    }
}
```

**Step 4: Register Stripe configuration in Startup.cs**

Add after the SMTP configuration block (after line 182 in `Startup.cs`):

```csharp
services.Configure<StripeOptions>(Configuration.GetSection("Stripe"));
Stripe.StripeConfiguration.ApiKey = Configuration["Stripe:SecretKey"];
```

Add the required using at the top of Startup.cs:

```csharp
using PrintLogApi.Models.Stripe;
```

**Step 5: Verify build**

Run: `cd PrintLogApi && dotnet build`
Expected: Build succeeds

**Step 6: Commit**

```bash
git add PrintLogApi/
git commit -m "feat: add Stripe configuration to backend"
```

---

### Task 3: Create Subscription Entity and Enums

**Files:**

- Create: `PrintLogApi/PrintLogApi/Models/SubscriptionStatus.cs`
- Create: `PrintLogApi/PrintLogApi/Models/SubscriptionPlan.cs`
- Create: `PrintLogApi/PrintLogApi/Models/Subscription.cs`
- Modify: `PrintLogApi/PrintLogApi/PrintLogContext.cs:17-57` (add DbSet)
- Modify: `PrintLogApi/PrintLogApi/PrintLogContext.cs` (add index in OnModelCreating)

**Step 1: Create SubscriptionStatus enum**

Create file: `PrintLogApi/PrintLogApi/Models/SubscriptionStatus.cs`

```csharp
namespace PrintLogApi.Models
{
    public enum SubscriptionStatus
    {
        None = 0,
        Active = 1,
        PastDue = 2,
        Canceled = 3
    }
}
```

**Step 2: Create SubscriptionPlan enum**

Create file: `PrintLogApi/PrintLogApi/Models/SubscriptionPlan.cs`

```csharp
namespace PrintLogApi.Models
{
    public enum SubscriptionPlan
    {
        Free = 0,
        ProMonthly = 1,
        ProAnnual = 2
    }
}
```

**Step 3: Create Subscription entity**

Create file: `PrintLogApi/PrintLogApi/Models/Subscription.cs`

Follow the pattern from `UserApiKey.cs` (inherits `TimestampEntity`, has `UserId` FK):

```csharp
using System;
using System.ComponentModel.DataAnnotations;

namespace PrintLogApi.Models
{
    public class Subscription : TimestampEntity
    {
        [Key]
        public long Id { get; set; }

        [Required]
        public long UserId { get; set; }
        public User User { get; set; }

        [StringLength(255)]
        public string StripeCustomerId { get; set; }

        [StringLength(255)]
        public string StripeSubscriptionId { get; set; }

        [StringLength(255)]
        public string StripePriceId { get; set; }

        public SubscriptionStatus Status { get; set; }
        public SubscriptionPlan Plan { get; set; }

        public DateTimeOffset? CurrentPeriodStart { get; set; }
        public DateTimeOffset? CurrentPeriodEnd { get; set; }
        public bool CancelAtPeriodEnd { get; set; }
        public DateTimeOffset? CanceledAt { get; set; }
    }
}
```

**Step 4: Add DbSet to PrintLogContext**

In `PrintLogContext.cs`, add after line 57 (`public DbSet<Notification> Notifications { get; set; }`):

```csharp
public DbSet<Subscription> Subscriptions { get; set; }
```

**Step 5: Add indexes in OnModelCreating**

In the `OnModelCreating` method of `PrintLogContext.cs`, add after the Notification indexes (find the last `modelBuilder.Entity<Notification>()` block and add after it):

```csharp
modelBuilder.Entity<Subscription>()
    .HasIndex(s => s.UserId)
    .IsUnique()
    .HasDatabaseName("IX_Subscriptions_UserId");

modelBuilder.Entity<Subscription>()
    .HasIndex(s => s.StripeCustomerId)
    .HasDatabaseName("IX_Subscriptions_StripeCustomerId");

modelBuilder.Entity<Subscription>()
    .HasIndex(s => s.StripeSubscriptionId)
    .HasDatabaseName("IX_Subscriptions_StripeSubscriptionId");
```

**Step 6: Create EF migration**

Run: `cd PrintLogApi/PrintLogApi && dotnet ef migrations add AddSubscription`
Expected: Migration files created in `Migrations/`

**Step 7: Verify build**

Run: `cd PrintLogApi && dotnet build`
Expected: Build succeeds

**Step 8: Commit**

```bash
git add PrintLogApi/
git commit -m "feat: add Subscription entity with EF migration"
```

---

### Task 4: Create Subscription DTOs and AutoMapper Profile

**Files:**

- Create: `PrintLogApi/PrintLogApi/Models/DTOs/Subscription/SubscriptionDto.cs`
- Create: `PrintLogApi/PrintLogApi/Models/DTOs/Subscription/CreateCheckoutSessionDto.cs`
- Create: `PrintLogApi/PrintLogApi/Profiles/SubscriptionProfile.cs`

**Step 1: Create SubscriptionDto**

Follow the pattern from `NotificationSummaryDto.cs`:

Create file: `PrintLogApi/PrintLogApi/Models/DTOs/Subscription/SubscriptionDto.cs`

```csharp
using System;

namespace PrintLogApi.Models.DTOs.Subscription
{
    public class SubscriptionDto
    {
        public SubscriptionStatus Status { get; set; }
        public SubscriptionPlan Plan { get; set; }
        public DateTimeOffset? CurrentPeriodEnd { get; set; }
        public bool CancelAtPeriodEnd { get; set; }
        public bool IsPro { get; set; }
    }
}
```

**Step 2: Create CreateCheckoutSessionDto**

Create file: `PrintLogApi/PrintLogApi/Models/DTOs/Subscription/CreateCheckoutSessionDto.cs`

```csharp
using System.ComponentModel.DataAnnotations;

namespace PrintLogApi.Models.DTOs.Subscription
{
    public class CreateCheckoutSessionDto
    {
        [Required]
        public string PlanId { get; set; }
    }
}
```

**Step 3: Create AutoMapper profile**

Follow the pattern from `UserApiKeyProfile.cs`:

Create file: `PrintLogApi/PrintLogApi/Profiles/SubscriptionProfile.cs`

```csharp
using AutoMapper;
using PrintLogApi.Models;
using PrintLogApi.Models.DTOs.Subscription;

namespace PrintLogApi.Profiles
{
    public class SubscriptionProfile : Profile
    {
        public SubscriptionProfile()
        {
            CreateMap<Models.Subscription, SubscriptionDto>()
                .ForMember(dest => dest.IsPro,
                    opt => opt.MapFrom(src => src.Status == SubscriptionStatus.Active));
        }
    }
}
```

**Step 4: Verify build**

Run: `cd PrintLogApi && dotnet build`
Expected: Build succeeds

**Step 5: Commit**

```bash
git add PrintLogApi/
git commit -m "feat: add Subscription DTOs and AutoMapper profile"
```

---

### Task 5: Create Subscription Service

**Files:**

- Create: `PrintLogApi/PrintLogApi/Services/ISubscriptionService.cs`
- Create: `PrintLogApi/PrintLogApi/Services/SubscriptionService.cs`
- Create: `PrintLogApi/PrintLogApi/Exceptions/SubscriptionException.cs`
- Modify: `PrintLogApi/PrintLogApi/Startup.cs:165` (register service)

**Step 1: Create SubscriptionException**

Follow the pattern from `DoesNotExistException.cs`:

Create file: `PrintLogApi/PrintLogApi/Exceptions/SubscriptionException.cs`

```csharp
using System;

namespace PrintLogApi.Exceptions
{
    public class SubscriptionException : Exception
    {
        public SubscriptionException(string message) : base(message)
        {
        }

        public SubscriptionException(string message, Exception innerException) : base(message, innerException)
        {
        }

        public SubscriptionException()
        {
        }
    }
}
```

**Step 2: Create ISubscriptionService interface**

Follow the pattern from `IUserApiKeyService.cs`:

Create file: `PrintLogApi/PrintLogApi/Services/ISubscriptionService.cs`

```csharp
using System.Threading.Tasks;
using PrintLogApi.Models.DTOs.Subscription;

namespace PrintLogApi.Services
{
    public interface ISubscriptionService
    {
        Task<SubscriptionDto> GetSubscriptionForUser(long userId);
        Task<string> CreateCheckoutSession(long userId, string planId, string successUrl, string cancelUrl);
        Task<string> CreateCustomerPortalSession(long userId, string returnUrl);
        Task HandleStripeWebhook(string json, string signature);
    }
}
```

**Step 3: Create SubscriptionService implementation**

Follow the pattern from `UserApiKeyService.cs` (constructor injection of PrintLogContext, IMapper, TelemetryClient, IOptions):

Create file: `PrintLogApi/PrintLogApi/Services/SubscriptionService.cs`

```csharp
using System;
using System.Linq;
using System.Threading.Tasks;
using AutoMapper;
using Microsoft.ApplicationInsights;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Options;
using PrintLogApi.Exceptions;
using PrintLogApi.Models;
using PrintLogApi.Models.DTOs.Subscription;
using PrintLogApi.Models.Stripe;
using Stripe;
using Stripe.Checkout;

namespace PrintLogApi.Services
{
    public class SubscriptionService : ISubscriptionService
    {
        private readonly PrintLogContext _context;
        private readonly IMapper _mapper;
        private readonly TelemetryClient _telemetry;
        private readonly StripeOptions _stripeOptions;

        public SubscriptionService(
            PrintLogContext context,
            IMapper mapper,
            TelemetryClient telemetry,
            IOptions<StripeOptions> stripeOptions)
        {
            _context = context;
            _mapper = mapper;
            _telemetry = telemetry;
            _stripeOptions = stripeOptions.Value;
        }

        public async Task<SubscriptionDto> GetSubscriptionForUser(long userId)
        {
            var subscription = await _context.Subscriptions
                .Where(s => s.UserId == userId)
                .AsNoTracking()
                .SingleOrDefaultAsync();

            if (subscription == null)
            {
                return new SubscriptionDto
                {
                    Status = SubscriptionStatus.None,
                    Plan = SubscriptionPlan.Free,
                    IsPro = false,
                    CancelAtPeriodEnd = false,
                    CurrentPeriodEnd = null
                };
            }

            return _mapper.Map<SubscriptionDto>(subscription);
        }

        public async Task<string> CreateCheckoutSession(long userId, string planId, string successUrl, string cancelUrl)
        {
            var priceId = planId switch
            {
                "pro_monthly" => _stripeOptions.ProMonthlyPriceId,
                "pro_annual" => _stripeOptions.ProAnnualPriceId,
                _ => throw new SubscriptionException($"Invalid plan: {planId}")
            };

            // Get or create Stripe customer
            var subscription = await _context.Subscriptions
                .Where(s => s.UserId == userId)
                .SingleOrDefaultAsync();

            string customerId = subscription?.StripeCustomerId;

            if (string.IsNullOrEmpty(customerId))
            {
                // Get user info for Stripe customer creation
                var user = await _context.Users
                    .Where(u => u.Id == userId)
                    .AsNoTracking()
                    .SingleAsync();

                var customerService = new CustomerService();
                var customer = await customerService.CreateAsync(new CustomerCreateOptions
                {
                    Metadata = new System.Collections.Generic.Dictionary<string, string>
                    {
                        { "userId", userId.ToString() }
                    }
                });
                customerId = customer.Id;

                // Save customer ID
                if (subscription == null)
                {
                    subscription = new Models.Subscription
                    {
                        UserId = userId,
                        StripeCustomerId = customerId,
                        Status = SubscriptionStatus.None,
                        Plan = SubscriptionPlan.Free,
                        CreatedById = userId,
                        UpdatedById = userId
                    };
                    _context.Subscriptions.Add(subscription);
                }
                else
                {
                    subscription.StripeCustomerId = customerId;
                    subscription.UpdatedById = userId;
                }

                await _context.SaveChangesAsync();
            }

            var sessionService = new SessionService();
            var session = await sessionService.CreateAsync(new SessionCreateOptions
            {
                Customer = customerId,
                PaymentMethodTypes = new System.Collections.Generic.List<string> { "card" },
                LineItems = new System.Collections.Generic.List<SessionLineItemOptions>
                {
                    new SessionLineItemOptions
                    {
                        Price = priceId,
                        Quantity = 1
                    }
                },
                Mode = "subscription",
                SuccessUrl = successUrl,
                CancelUrl = cancelUrl,
                Metadata = new System.Collections.Generic.Dictionary<string, string>
                {
                    { "userId", userId.ToString() }
                }
            });

            _telemetry.TrackEvent("Subscription_CheckoutSessionCreated", new System.Collections.Generic.Dictionary<string, string>
            {
                { "userId", userId.ToString() },
                { "planId", planId }
            });

            return session.Url;
        }

        public async Task<string> CreateCustomerPortalSession(long userId, string returnUrl)
        {
            var subscription = await _context.Subscriptions
                .Where(s => s.UserId == userId)
                .AsNoTracking()
                .SingleOrDefaultAsync();

            if (subscription == null || string.IsNullOrEmpty(subscription.StripeCustomerId))
            {
                throw new SubscriptionException("No Stripe customer found for this user.");
            }

            var sessionService = new Stripe.BillingPortal.SessionService();
            var session = await sessionService.CreateAsync(new Stripe.BillingPortal.SessionCreateOptions
            {
                Customer = subscription.StripeCustomerId,
                ReturnUrl = returnUrl
            });

            return session.Url;
        }

        public async Task HandleStripeWebhook(string json, string signature)
        {
            var stripeEvent = EventUtility.ConstructEvent(json, signature, _stripeOptions.WebhookSecret);

            switch (stripeEvent.Type)
            {
                case EventTypes.CheckoutSessionCompleted:
                    await HandleCheckoutSessionCompleted(stripeEvent);
                    break;
                case EventTypes.CustomerSubscriptionUpdated:
                    await HandleSubscriptionUpdated(stripeEvent);
                    break;
                case EventTypes.CustomerSubscriptionDeleted:
                    await HandleSubscriptionDeleted(stripeEvent);
                    break;
                case EventTypes.InvoicePaymentFailed:
                    await HandlePaymentFailed(stripeEvent);
                    break;
            }
        }

        private async Task HandleCheckoutSessionCompleted(Event stripeEvent)
        {
            var session = stripeEvent.Data.Object as Session;
            if (session == null) return;

            var stripeSubscriptionId = session.SubscriptionId;
            var customerId = session.CustomerId;

            // Fetch the full subscription from Stripe
            var subscriptionService = new Stripe.SubscriptionService();
            var stripeSubscription = await subscriptionService.GetAsync(stripeSubscriptionId);

            var subscription = await _context.Subscriptions
                .Where(s => s.StripeCustomerId == customerId)
                .SingleOrDefaultAsync();

            if (subscription == null)
            {
                // Try to find by userId from metadata
                if (session.Metadata.TryGetValue("userId", out var userIdStr) && long.TryParse(userIdStr, out var userId))
                {
                    subscription = await _context.Subscriptions
                        .Where(s => s.UserId == userId)
                        .SingleOrDefaultAsync();

                    if (subscription == null)
                    {
                        subscription = new Models.Subscription
                        {
                            UserId = userId,
                            StripeCustomerId = customerId,
                            CreatedById = userId,
                            UpdatedById = userId
                        };
                        _context.Subscriptions.Add(subscription);
                    }
                }
                else
                {
                    return; // Cannot identify user
                }
            }

            var priceId = stripeSubscription.Items.Data.FirstOrDefault()?.Price.Id;

            subscription.StripeSubscriptionId = stripeSubscriptionId;
            subscription.StripePriceId = priceId;
            subscription.Status = SubscriptionStatus.Active;
            subscription.Plan = MapPriceIdToPlan(priceId);
            subscription.CurrentPeriodStart = stripeSubscription.CurrentPeriodStart;
            subscription.CurrentPeriodEnd = stripeSubscription.CurrentPeriodEnd;
            subscription.CancelAtPeriodEnd = stripeSubscription.CancelAtPeriodEnd;

            await _context.SaveChangesAsync();

            _telemetry.TrackEvent("Subscription_Activated", new System.Collections.Generic.Dictionary<string, string>
            {
                { "userId", subscription.UserId.ToString() },
                { "plan", subscription.Plan.ToString() }
            });
        }

        private async Task HandleSubscriptionUpdated(Event stripeEvent)
        {
            var stripeSubscription = stripeEvent.Data.Object as Stripe.Subscription;
            if (stripeSubscription == null) return;

            var subscription = await _context.Subscriptions
                .Where(s => s.StripeSubscriptionId == stripeSubscription.Id)
                .SingleOrDefaultAsync();

            if (subscription == null) return;

            var priceId = stripeSubscription.Items.Data.FirstOrDefault()?.Price.Id;

            subscription.StripePriceId = priceId;
            subscription.Status = MapStripeStatus(stripeSubscription.Status);
            subscription.Plan = MapPriceIdToPlan(priceId);
            subscription.CurrentPeriodStart = stripeSubscription.CurrentPeriodStart;
            subscription.CurrentPeriodEnd = stripeSubscription.CurrentPeriodEnd;
            subscription.CancelAtPeriodEnd = stripeSubscription.CancelAtPeriodEnd;

            if (stripeSubscription.CanceledAt.HasValue)
            {
                subscription.CanceledAt = stripeSubscription.CanceledAt;
            }

            await _context.SaveChangesAsync();

            _telemetry.TrackEvent("Subscription_Updated", new System.Collections.Generic.Dictionary<string, string>
            {
                { "userId", subscription.UserId.ToString() },
                { "status", subscription.Status.ToString() },
                { "plan", subscription.Plan.ToString() }
            });
        }

        private async Task HandleSubscriptionDeleted(Event stripeEvent)
        {
            var stripeSubscription = stripeEvent.Data.Object as Stripe.Subscription;
            if (stripeSubscription == null) return;

            var subscription = await _context.Subscriptions
                .Where(s => s.StripeSubscriptionId == stripeSubscription.Id)
                .SingleOrDefaultAsync();

            if (subscription == null) return;

            subscription.Status = SubscriptionStatus.Canceled;
            subscription.Plan = SubscriptionPlan.Free;
            subscription.CanceledAt = DateTimeOffset.UtcNow;

            await _context.SaveChangesAsync();

            _telemetry.TrackEvent("Subscription_Canceled", new System.Collections.Generic.Dictionary<string, string>
            {
                { "userId", subscription.UserId.ToString() }
            });
        }

        private async Task HandlePaymentFailed(Event stripeEvent)
        {
            var invoice = stripeEvent.Data.Object as Invoice;
            if (invoice == null) return;

            var subscription = await _context.Subscriptions
                .Where(s => s.StripeCustomerId == invoice.CustomerId)
                .SingleOrDefaultAsync();

            if (subscription == null) return;

            subscription.Status = SubscriptionStatus.PastDue;

            await _context.SaveChangesAsync();

            _telemetry.TrackEvent("Subscription_PaymentFailed", new System.Collections.Generic.Dictionary<string, string>
            {
                { "userId", subscription.UserId.ToString() }
            });
        }

        private SubscriptionPlan MapPriceIdToPlan(string priceId)
        {
            if (priceId == _stripeOptions.ProMonthlyPriceId) return SubscriptionPlan.ProMonthly;
            if (priceId == _stripeOptions.ProAnnualPriceId) return SubscriptionPlan.ProAnnual;
            return SubscriptionPlan.Free;
        }

        private static SubscriptionStatus MapStripeStatus(string stripeStatus)
        {
            return stripeStatus switch
            {
                "active" => SubscriptionStatus.Active,
                "past_due" => SubscriptionStatus.PastDue,
                "canceled" => SubscriptionStatus.Canceled,
                "unpaid" => SubscriptionStatus.PastDue,
                "trialing" => SubscriptionStatus.Active,
                _ => SubscriptionStatus.None
            };
        }
    }
}
```

**Step 4: Register service in Startup.cs**

Add after line 165 (`services.AddTransient<INotificationService, NotificationService>();`):

```csharp
services.AddTransient<ISubscriptionService, SubscriptionService>();
```

**Step 5: Verify build**

Run: `cd PrintLogApi && dotnet build`
Expected: Build succeeds

**Step 6: Commit**

```bash
git add PrintLogApi/
git commit -m "feat: add SubscriptionService with Stripe integration"
```

---

### Task 6: Create Subscription Controller

**Files:**

- Create: `PrintLogApi/PrintLogApi/Controllers/SubscriptionController.cs`

**Step 1: Create SubscriptionController**

Follow the pattern from `UsersController.cs` (attributes, DI, `User.GetUserId()`, ActionResult returns):

Create file: `PrintLogApi/PrintLogApi/Controllers/SubscriptionController.cs`

```csharp
using System;
using System.IO;
using System.Threading.Tasks;
using Microsoft.ApplicationInsights;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using PrintLogApi.Exceptions;
using PrintLogApi.Extensions;
using PrintLogApi.Models.DTOs.Subscription;
using PrintLogApi.Services;

namespace PrintLogApi.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    [Authorize]
    public class SubscriptionController : ControllerBase
    {
        private readonly ISubscriptionService _subscriptionService;
        private readonly TelemetryClient _telemetry;

        public SubscriptionController(
            ISubscriptionService subscriptionService,
            TelemetryClient telemetry)
        {
            _subscriptionService = subscriptionService;
            _telemetry = telemetry;
        }

        /// <summary>
        /// Get the current user's subscription status.
        /// </summary>
        [HttpGet("me")]
        public async Task<ActionResult<SubscriptionDto>> GetCurrentUserSubscription()
        {
            var userId = User.GetUserId();
            if (!userId.HasValue)
                return Unauthorized();

            var subscription = await _subscriptionService.GetSubscriptionForUser(userId.Value);
            return Ok(subscription);
        }

        /// <summary>
        /// Create a Stripe Checkout session for upgrading to Pro.
        /// </summary>
        [HttpPost("checkout")]
        public async Task<ActionResult<CheckoutSessionResponseDto>> CreateCheckoutSession(
            [FromBody] CreateCheckoutSessionDto dto)
        {
            var userId = User.GetUserId();
            if (!userId.HasValue)
                return Unauthorized();

            try
            {
                var successUrl = $"{Request.Headers["Origin"]}/subscription/success?session_id={{CHECKOUT_SESSION_ID}}";
                var cancelUrl = $"{Request.Headers["Origin"]}/subscription/canceled";

                var url = await _subscriptionService.CreateCheckoutSession(
                    userId.Value, dto.PlanId, successUrl, cancelUrl);

                return Ok(new CheckoutSessionResponseDto { Url = url });
            }
            catch (SubscriptionException ex)
            {
                return BadRequest(ex.Message);
            }
        }

        /// <summary>
        /// Create a Stripe Customer Portal session for managing billing.
        /// </summary>
        [HttpPost("portal")]
        public async Task<ActionResult<PortalSessionResponseDto>> CreatePortalSession()
        {
            var userId = User.GetUserId();
            if (!userId.HasValue)
                return Unauthorized();

            try
            {
                var returnUrl = $"{Request.Headers["Origin"]}/settings";
                var url = await _subscriptionService.CreateCustomerPortalSession(userId.Value, returnUrl);
                return Ok(new PortalSessionResponseDto { Url = url });
            }
            catch (SubscriptionException ex)
            {
                return BadRequest(ex.Message);
            }
        }

        /// <summary>
        /// Stripe webhook endpoint. Validates the Stripe signature and processes events.
        /// </summary>
        [HttpPost("webhook")]
        [AllowAnonymous]
        public async Task<IActionResult> HandleWebhook()
        {
            var json = await new StreamReader(HttpContext.Request.Body).ReadToEndAsync();
            var signature = Request.Headers["Stripe-Signature"];

            try
            {
                await _subscriptionService.HandleStripeWebhook(json, signature);
                return Ok();
            }
            catch (Stripe.StripeException ex)
            {
                _telemetry.TrackException(ex);
                return BadRequest($"Webhook error: {ex.Message}");
            }
        }
    }

    public class CheckoutSessionResponseDto
    {
        public string Url { get; set; }
    }

    public class PortalSessionResponseDto
    {
        public string Url { get; set; }
    }
}
```

**Step 2: Verify build**

Run: `cd PrintLogApi && dotnet build`
Expected: Build succeeds

**Step 3: Commit**

```bash
git add PrintLogApi/
git commit -m "feat: add SubscriptionController with checkout, portal, and webhook endpoints"
```

---

## Phase 2: Frontend Core

### Task 7: Add Subscription Model and Service

**Files:**

- Create: `src/app/core/services/subscription.service.ts`
- Create: `src/app/core/services/subscription.service.spec.ts`

**Step 1: Write the test**

Create file: `src/app/core/services/subscription.service.spec.ts`

```typescript
import { TestBed } from '@angular/core/testing';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideHttpClient } from '@angular/common/http';
import { SubscriptionService, SubscriptionDto } from './subscription.service';
import { environment } from 'src/environments/environment';

describe('SubscriptionService', () => {
  let service: SubscriptionService;
  let httpMock: HttpTestingController;
  const baseUrl = `${environment.printLogApiUrl}/api/Subscription`;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    service = TestBed.inject(SubscriptionService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('should default isPro to false', () => {
    expect(service.isPro()).toBeFalse();
  });

  it('should default status to none', () => {
    expect(service.status()).toBe('none');
  });

  describe('loadSubscription', () => {
    it('should fetch subscription and update signals', () => {
      const mockDto: SubscriptionDto = {
        status: 'active',
        plan: 'pro_monthly',
        currentPeriodEnd: '2026-03-27T00:00:00Z',
        cancelAtPeriodEnd: false,
        isPro: true,
      };

      service.loadSubscription();

      const req = httpMock.expectOne(`${baseUrl}/me`);
      expect(req.request.method).toBe('GET');
      req.flush(mockDto);

      expect(service.isPro()).toBeTrue();
      expect(service.status()).toBe('active');
      expect(service.plan()).toBe('pro_monthly');
    });
  });

  describe('createCheckoutSession', () => {
    it('should POST plan and return url', () => {
      service.createCheckoutSession('pro_monthly').subscribe((result) => {
        expect(result.url).toBe('https://checkout.stripe.com/test');
      });

      const req = httpMock.expectOne(`${baseUrl}/checkout`);
      expect(req.request.method).toBe('POST');
      expect(req.request.body).toEqual({ planId: 'pro_monthly' });
      req.flush({ url: 'https://checkout.stripe.com/test' });
    });
  });

  describe('createPortalSession', () => {
    it('should POST and return url', () => {
      service.createPortalSession().subscribe((result) => {
        expect(result.url).toBe('https://billing.stripe.com/test');
      });

      const req = httpMock.expectOne(`${baseUrl}/portal`);
      expect(req.request.method).toBe('POST');
      req.flush({ url: 'https://billing.stripe.com/test' });
    });
  });
});
```

**Step 2: Run test to verify it fails**

Run: `npm run test:brief`
Expected: FAIL — `SubscriptionService` not found

**Step 3: Write the service**

Create file: `src/app/core/services/subscription.service.ts`

Follow the pattern from `user-setting.service.ts` (Injectable with providedIn root, HttpClient, environment URL):

```typescript
import { HttpClient } from '@angular/common/http';
import { computed, inject, Injectable, signal } from '@angular/core';
import { Observable, tap } from 'rxjs';
import { environment } from 'src/environments/environment';

export interface SubscriptionDto {
  status: 'none' | 'active' | 'past_due' | 'canceled';
  plan: 'free' | 'pro_monthly' | 'pro_annual';
  currentPeriodEnd: string | null;
  cancelAtPeriodEnd: boolean;
  isPro: boolean;
}

@Injectable({
  providedIn: 'root',
})
export class SubscriptionService {
  private readonly http = inject(HttpClient);
  private readonly baseApiUrl = `${environment.printLogApiUrl}/api/Subscription`;

  private readonly subscription = signal<SubscriptionDto | null>(null);

  readonly isPro = computed(() => this.subscription()?.isPro ?? false);
  readonly status = computed(() => this.subscription()?.status ?? 'none');
  readonly plan = computed(() => this.subscription()?.plan ?? 'free');
  readonly currentPeriodEnd = computed(() => this.subscription()?.currentPeriodEnd ?? null);
  readonly cancelAtPeriodEnd = computed(() => this.subscription()?.cancelAtPeriodEnd ?? false);

  loadSubscription(): void {
    this.http.get<SubscriptionDto>(`${this.baseApiUrl}/me`).subscribe((dto) => {
      this.subscription.set(dto);
    });
  }

  createCheckoutSession(planId: string): Observable<{ url: string }> {
    return this.http.post<{ url: string }>(`${this.baseApiUrl}/checkout`, { planId });
  }

  createPortalSession(): Observable<{ url: string }> {
    return this.http.post<{ url: string }>(`${this.baseApiUrl}/portal`, {});
  }
}
```

**Step 4: Run tests to verify they pass**

Run: `npm run test:brief`
Expected: All SubscriptionService tests PASS

**Step 5: Commit**

```bash
git add src/app/core/services/subscription.service.ts src/app/core/services/subscription.service.spec.ts
git commit -m "feat: add SubscriptionService with signal-based state"
```

---

### Task 8: Create Subscription Module with Pricing Page

**Files:**

- Create: `src/app/subscription/subscription.module.ts`
- Create: `src/app/subscription/subscription-routing.module.ts`
- Create: `src/app/subscription/pricing/pricing.component.ts`
- Create: `src/app/subscription/pricing/pricing.component.html`
- Create: `src/app/subscription/pricing/pricing.component.scss`
- Create: `src/app/subscription/pricing/pricing.component.spec.ts`
- Create: `src/app/subscription/success/subscription-success.component.ts`
- Create: `src/app/subscription/success/subscription-success.component.html`
- Create: `src/app/subscription/success/subscription-success.component.spec.ts`
- Create: `src/app/subscription/canceled/subscription-canceled.component.ts`
- Create: `src/app/subscription/canceled/subscription-canceled.component.html`
- Create: `src/app/subscription/canceled/subscription-canceled.component.spec.ts`
- Modify: `src/app/app-routing.module.ts:94-95` (add subscription route)

**Step 1: Create the pricing component**

Create file: `src/app/subscription/pricing/pricing.component.ts`

```typescript
import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { SubscriptionService } from '../../core/services/subscription.service';
import { LoggingService } from '../../core/services/logging.service';

@Component({
  selector: 'app-pricing',
  templateUrl: './pricing.component.html',
  styleUrls: ['./pricing.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PricingComponent {
  private readonly subscriptionService = inject(SubscriptionService);
  private readonly loggingService = inject(LoggingService);

  readonly isPro = this.subscriptionService.isPro;
  readonly plan = this.subscriptionService.plan;

  checkoutLoading = false;

  checkout(planId: string): void {
    if (this.checkoutLoading) return;
    this.checkoutLoading = true;

    this.loggingService.logEvent('Pricing_CheckoutClicked', { planId });

    this.subscriptionService.createCheckoutSession(planId).subscribe({
      next: (result) => {
        window.location.href = result.url;
      },
      error: () => {
        this.checkoutLoading = false;
      },
    });
  }
}
```

Create file: `src/app/subscription/pricing/pricing.component.html`

```html
<div fxLayout="row" fxLayoutAlign="center">
  <div fxFlex="900px" fxFlex.lt-md="100%" style="padding: 16px">
    <div fxLayout="column" fxLayoutAlign="center center" fxLayoutGap="16px">
      <h1>3D Print Log Pro</h1>
      <p class="subtitle">Remove ads and unlock premium features</p>

      @if (isPro()) {
      <mat-card appearance="outlined" class="current-plan-card">
        <mat-card-content>
          <p>You're on the <strong>Pro</strong> plan. Thank you for your support!</p>
          <p>
            Manage your billing in
            <a routerLink="/settings">Settings</a>.
          </p>
        </mat-card-content>
      </mat-card>
      } @else {
      <div fxLayout="row" fxLayout.lt-sm="column" fxLayoutGap="16px" fxLayoutAlign="center stretch">
        <!-- Monthly Plan -->
        <mat-card appearance="outlined" class="plan-card" fxFlex="300px">
          <mat-card-header>
            <mat-card-title>Monthly</mat-card-title>
          </mat-card-header>
          <mat-card-content>
            <div class="price">
              <span class="amount">$2.99</span>
              <span class="period">/month</span>
            </div>
            <ul class="features">
              <li>Ad-free experience</li>
              <li>Up to 20 images per print</li>
              <li>File attachments (gcode, STL, 3MF)</li>
            </ul>
          </mat-card-content>
          <mat-card-actions>
            <button mat-raised-button color="primary" (click)="checkout('pro_monthly')" [disabled]="checkoutLoading" [class.spinner]="checkoutLoading">Subscribe Monthly</button>
          </mat-card-actions>
        </mat-card>

        <!-- Annual Plan -->
        <mat-card appearance="outlined" class="plan-card recommended" fxFlex="300px">
          <mat-card-header>
            <mat-card-title>Annual</mat-card-title>
            <mat-card-subtitle>Save 16%</mat-card-subtitle>
          </mat-card-header>
          <mat-card-content>
            <div class="price">
              <span class="amount">$29.99</span>
              <span class="period">/year</span>
            </div>
            <p class="price-detail">That's just $2.50/month</p>
            <ul class="features">
              <li>Ad-free experience</li>
              <li>Up to 20 images per print</li>
              <li>File attachments (gcode, STL, 3MF)</li>
            </ul>
          </mat-card-content>
          <mat-card-actions>
            <button mat-raised-button color="accent" (click)="checkout('pro_annual')" [disabled]="checkoutLoading" [class.spinner]="checkoutLoading">Subscribe Annually</button>
          </mat-card-actions>
        </mat-card>
      </div>
      }
    </div>
  </div>
</div>
```

Create file: `src/app/subscription/pricing/pricing.component.scss`

```scss
.subtitle {
  color: rgba(0, 0, 0, 0.6);
  font-size: 1.1em;
  margin-bottom: 16px;
}

.plan-card {
  text-align: center;

  &.recommended {
    border: 2px solid #ff4081;
  }

  .price {
    margin: 16px 0;

    .amount {
      font-size: 2.5em;
      font-weight: bold;
    }

    .period {
      font-size: 1.1em;
      color: rgba(0, 0, 0, 0.6);
    }
  }

  .price-detail {
    color: rgba(0, 0, 0, 0.6);
    font-size: 0.9em;
    margin-top: -8px;
  }

  .features {
    text-align: left;
    padding-left: 20px;

    li {
      margin-bottom: 8px;
    }
  }

  mat-card-actions {
    padding: 16px;
  }
}

.current-plan-card {
  max-width: 500px;
  text-align: center;
}
```

**Step 2: Create success component**

Create file: `src/app/subscription/success/subscription-success.component.ts`

```typescript
import { ChangeDetectionStrategy, Component, inject, OnInit } from '@angular/core';
import { SubscriptionService } from '../../core/services/subscription.service';

@Component({
  selector: 'app-subscription-success',
  templateUrl: './subscription-success.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SubscriptionSuccessComponent implements OnInit {
  private readonly subscriptionService = inject(SubscriptionService);

  ngOnInit(): void {
    // Refresh subscription status after successful checkout
    this.subscriptionService.loadSubscription();
  }
}
```

Create file: `src/app/subscription/success/subscription-success.component.html`

```html
<div fxLayout="row" fxLayoutAlign="center">
  <mat-card appearance="outlined" fxFlex="600px" fxFlex.lt-md="100%" style="margin: 32px 16px; text-align: center;">
    <mat-card-content>
      <h1>Welcome to 3D Print Log Pro!</h1>
      <p>Thank you for your support. Your Pro features are now active.</p>
      <ul style="text-align: left; max-width: 300px; margin: 16px auto;">
        <li>Ads have been removed</li>
        <li>Upload up to 20 images per print</li>
        <li>Attach files to your prints</li>
      </ul>
      <button mat-raised-button color="primary" routerLink="/prints">Go to My Prints</button>
    </mat-card-content>
  </mat-card>
</div>
```

**Step 3: Create canceled component**

Create file: `src/app/subscription/canceled/subscription-canceled.component.ts`

```typescript
import { ChangeDetectionStrategy, Component } from '@angular/core';

@Component({
  selector: 'app-subscription-canceled',
  templateUrl: './subscription-canceled.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SubscriptionCanceledComponent {}
```

Create file: `src/app/subscription/canceled/subscription-canceled.component.html`

```html
<div fxLayout="row" fxLayoutAlign="center">
  <mat-card appearance="outlined" fxFlex="600px" fxFlex.lt-md="100%" style="margin: 32px 16px; text-align: center;">
    <mat-card-content>
      <h1>No worries!</h1>
      <p>You can upgrade to Pro anytime you're ready.</p>
      <div fxLayout="row" fxLayoutGap="16px" fxLayoutAlign="center">
        <button mat-raised-button color="primary" routerLink="/subscription">View Plans</button>
        <button mat-raised-button routerLink="/prints">Go to My Prints</button>
      </div>
    </mat-card-content>
  </mat-card>
</div>
```

**Step 4: Create routing module**

Create file: `src/app/subscription/subscription-routing.module.ts`

```typescript
import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { PricingComponent } from './pricing/pricing.component';
import { SubscriptionSuccessComponent } from './success/subscription-success.component';
import { SubscriptionCanceledComponent } from './canceled/subscription-canceled.component';

const routes: Routes = [
  {
    path: '',
    component: PricingComponent,
  },
  {
    path: 'success',
    component: SubscriptionSuccessComponent,
  },
  {
    path: 'canceled',
    component: SubscriptionCanceledComponent,
  },
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class SubscriptionRoutingModule {}
```

**Step 5: Create feature module**

Create file: `src/app/subscription/subscription.module.ts`

Follow the pattern from `settings.module.ts`:

```typescript
import { NgModule } from '@angular/core';
import { SharedModule } from '../shared/shared.module';
import { SubscriptionRoutingModule } from './subscription-routing.module';
import { PricingComponent } from './pricing/pricing.component';
import { SubscriptionSuccessComponent } from './success/subscription-success.component';
import { SubscriptionCanceledComponent } from './canceled/subscription-canceled.component';

@NgModule({
  declarations: [PricingComponent, SubscriptionSuccessComponent, SubscriptionCanceledComponent],
  imports: [SharedModule, SubscriptionRoutingModule],
})
export class SubscriptionModule {}
```

**Step 6: Add route to app-routing.module.ts**

In `src/app/app-routing.module.ts`, add after the notifications route (after line 94, before the `home-redirect` route):

```typescript
{
  path: 'subscription',
  loadChildren: () =>
    import('./subscription/subscription.module').then(
      (m) => m.SubscriptionModule
    ),
  canActivate: [AuthGuard],
},
```

**Step 7: Write basic tests for all three components**

Create file: `src/app/subscription/pricing/pricing.component.spec.ts`

```typescript
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { RouterTestingModule } from '@angular/router/testing';
import { PricingComponent } from './pricing.component';
import { SharedModule } from '../../shared/shared.module';
import { LoggingService } from '../../core/services/logging.service';

describe('PricingComponent', () => {
  let component: PricingComponent;
  let fixture: ComponentFixture<PricingComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [PricingComponent],
      imports: [SharedModule, NoopAnimationsModule, RouterTestingModule],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        {
          provide: LoggingService,
          useValue: jasmine.createSpyObj('LoggingService', ['logEvent']),
        },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(PricingComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should default isPro to false', () => {
    expect(component.isPro()).toBeFalse();
  });
});
```

Create file: `src/app/subscription/success/subscription-success.component.spec.ts`

```typescript
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { RouterTestingModule } from '@angular/router/testing';
import { SharedModule } from '../../shared/shared.module';
import { SubscriptionSuccessComponent } from './subscription-success.component';

describe('SubscriptionSuccessComponent', () => {
  let component: SubscriptionSuccessComponent;
  let fixture: ComponentFixture<SubscriptionSuccessComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [SubscriptionSuccessComponent],
      imports: [SharedModule, RouterTestingModule],
      providers: [provideHttpClient(), provideHttpClientTesting()],
    }).compileComponents();

    fixture = TestBed.createComponent(SubscriptionSuccessComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
```

Create file: `src/app/subscription/canceled/subscription-canceled.component.spec.ts`

```typescript
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { RouterTestingModule } from '@angular/router/testing';
import { SharedModule } from '../../shared/shared.module';
import { SubscriptionCanceledComponent } from './subscription-canceled.component';

describe('SubscriptionCanceledComponent', () => {
  let component: SubscriptionCanceledComponent;
  let fixture: ComponentFixture<SubscriptionCanceledComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [SubscriptionCanceledComponent],
      imports: [SharedModule, RouterTestingModule],
    }).compileComponents();

    fixture = TestBed.createComponent(SubscriptionCanceledComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
```

**Step 8: Run tests**

Run: `npm run test:brief`
Expected: All subscription tests PASS

**Step 9: Commit**

```bash
git add src/app/subscription/ src/app/app-routing.module.ts
git commit -m "feat: add subscription module with pricing, success, and canceled pages"
```

---

### Task 9: Load Subscription on Login

**Files:**

- Modify: `src/app/core/services/auth.service.ts`

The `AuthService.localAuthSetup()` runs on app init. After the user is authenticated, we should load their subscription status.

**Step 1: Import SubscriptionService in auth.service.ts**

Add import and inject `SubscriptionService`. In the `localAuthSetup()` method (or wherever the user profile is fetched after login), add a call to `this.subscriptionService.loadSubscription()` after the user is confirmed authenticated.

Look at the existing pattern in `auth.service.ts` — find where `isAuthenticated$` emits `true` or where `userProfile$` is populated, and add the subscription load there.

Specifically, in the `getUser$()` flow that populates `userProfile$`, add:

```typescript
private readonly subscriptionService = inject(SubscriptionService);

// In the auth success flow, after userProfile$ is set:
this.subscriptionService.loadSubscription();
```

**Step 2: Run tests**

Run: `npm run test:brief`
Expected: All tests PASS (auth service tests may need the SubscriptionService mock added)

**Step 3: Commit**

```bash
git add src/app/core/services/auth.service.ts
git commit -m "feat: load subscription status after authentication"
```

---

### Task 10: Add Subscription Section to Settings Page

**Files:**

- Modify: `src/app/settings/settings.component.ts:1-82`
- Modify: `src/app/settings/settings.component.html:317-331` (before Export Data section)

**Step 1: Add SubscriptionService to settings component**

In `settings.component.ts`, add the injection:

```typescript
import { SubscriptionService } from '../core/services/subscription.service';

// In the component class, add:
readonly subscriptionService = inject(SubscriptionService);
```

Note: Since the component uses constructor injection, either add `inject()` calls at the field level (mixing patterns is OK in Angular) or add it to the constructor. Field-level `inject()` is preferred per CLAUDE.md conventions.

**Step 2: Add subscription section to settings template**

In `settings.component.html`, add after the filament price section closing `</div>` (after line 317) and before the `<hr />` Export Data section (line 318):

```html
<hr />
<div fxFlex="grow" fxFlexFill>
  <h2>Subscription</h2>
  @if (subscriptionService.isPro()) {
  <div>
    <p>
      <strong>Plan:</strong>
      {{ subscriptionService.plan() === 'pro_monthly' ? 'Pro Monthly' : 'Pro Annual' }}
    </p>
    @if (subscriptionService.currentPeriodEnd()) {
    <p>
      <strong>Renews:</strong>
      {{ subscriptionService.currentPeriodEnd() | date: 'mediumDate' }}
    </p>
    } @if (subscriptionService.cancelAtPeriodEnd()) {
    <p class="cancel-notice">Your subscription will not renew at the end of the current period.</p>
    }
    <button mat-raised-button color="primary" (click)="manageSubscription()">Manage Billing</button>
  </div>
  } @else {
  <p>You're on the free plan.</p>
  <button mat-raised-button color="accent" routerLink="/subscription">Upgrade to Pro</button>
  }
</div>
```

**Step 3: Add manageSubscription method to settings component**

In `settings.component.ts`, add the method:

```typescript
public manageSubscription(): void {
  this.subscriptionService.createPortalSession().subscribe((result) => {
    window.location.href = result.url;
  });
}
```

**Step 4: Run tests**

Run: `npm run test:brief`
Expected: All tests PASS (settings tests may need SubscriptionService mock)

**Step 5: Commit**

```bash
git add src/app/settings/
git commit -m "feat: add subscription management section to settings page"
```

---

### Task 11: Implement Ad Removal for Pro Users

**Files:**

- Modify: `src/app/shared/ad/ad.component.ts:1-13`
- Modify: `src/app/shared/ad/ad.component.html:1-6`
- Modify: `src/app/shared/ad/ad.component.spec.ts` (if exists)

**Step 1: Inject SubscriptionService into AdComponent**

In `src/app/shared/ad/ad.component.ts`, add:

```typescript
import { ChangeDetectionStrategy, Component, inject, input } from '@angular/core';
import { SubscriptionService } from '../../core/services/subscription.service';

@Component({
  selector: 'app-ad',
  templateUrl: './ad.component.html',
  styleUrls: ['./ad.component.scss'],
  standalone: false,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AdComponent {
  private readonly subscriptionService = inject(SubscriptionService);
  adSlot = input<number | null>(null);
  fullWidthResponsive = input<boolean>(true);
  readonly isPro = this.subscriptionService.isPro;
}
```

**Step 2: Gate the ad template**

Replace `src/app/shared/ad/ad.component.html` with:

```html
@if (!isPro()) {
<aside aria-label="Advertisement" class="ad-wrapper">
  <ng-adsense [adSlot]="adSlot()" [fullWidthResponsive]="fullWidthResponsive()"></ng-adsense>
</aside>
}
```

**Step 3: Run tests**

Run: `npm run test:brief`
Expected: All tests PASS

**Step 4: Commit**

```bash
git add src/app/shared/ad/
git commit -m "feat: hide ads for Pro subscribers"
```

---

## Phase 3: Feature Gating

### Task 12: Update Environment Files

**Files:**

- Modify: `src/environments/environment.ts:28-30`
- Modify: `src/environments/environment.prod.ts:24-26`
- Modify: `src/environments/environment.unittest.ts:28-30`

**Step 1: Add Stripe price IDs to environment files**

In `environment.ts`, add after the `googleAds` section (after line 30, before `};`):

```typescript
stripe: {
  proMonthlyPriceId: '',
  proAnnualPriceId: '',
},
```

Do the same for `environment.prod.ts` and `environment.unittest.ts` (with empty strings — real values added when Stripe products are created).

**Step 2: Verify build**

Run: `npm run build:dev`
Expected: Build succeeds

**Step 3: Commit**

```bash
git add src/environments/
git commit -m "feat: add Stripe configuration to environment files"
```

---

### Task 13: Add Pro Badge and Upgrade Link to Navigation

This task adds a subtle "Upgrade to Pro" link in the app navigation for free users, and a small Pro badge for subscribers. The exact implementation depends on where the app's sidebar/navigation is defined.

**Files:**

- Find and modify the main navigation/sidebar component (likely `src/app/shared/` or `src/app/core/`)

**Step 1: Find the navigation component**

Search for the sidebar/nav component that contains links to Prints, Printers, Materials, etc.

**Step 2: Inject SubscriptionService and add navigation item**

Add a conditional navigation item:

- Free users: "Upgrade to Pro" link pointing to `/subscription`
- Pro users: Small "Pro" badge/indicator

**Step 3: Run tests**

Run: `npm run test:brief`
Expected: All tests PASS

**Step 4: Commit**

```bash
git add <navigation-files>
git commit -m "feat: add Pro upgrade link and badge to navigation"
```

---

## Phase 4: Polish

### Task 14: Add Analytics Events

**Files:**

- Modify: `src/app/subscription/pricing/pricing.component.ts`
- Modify: `src/app/subscription/success/subscription-success.component.ts`

**Step 1: Add logging events**

In the pricing component, add events for page view and checkout click (already partially done in Task 8). In the success component, add an event for successful subscription activation.

Follow the `ComponentName_ActionName` convention from CLAUDE.md:

```typescript
this.loggingService.logEvent('Pricing_PageViewed');
this.loggingService.logEvent('Pricing_CheckoutClicked', { planId });
this.loggingService.logEvent('SubscriptionSuccess_Activated');
```

**Step 2: Commit**

```bash
git add src/app/subscription/
git commit -m "feat: add analytics events for subscription funnel"
```

---

### Task 15: Update Documentation

**Files:**

- Create or modify documentation component for subscription/Pro features

Per `CLAUDE.md`, documentation lives in `src/documentation/`. Add a page or section explaining Pro features, how to subscribe, and how to manage billing.

**Step 1: Create subscription documentation content**

Add a section to the relevant documentation page describing:

- What Pro includes (ad-free, more images, file attachments)
- How to subscribe (link to `/subscription`)
- How to manage billing (Settings > Subscription > Manage Billing)
- Pricing ($2.99/mo or $29.99/yr)

**Step 2: Commit**

```bash
git add src/app/documentation/
git commit -m "docs: add Pro subscription documentation page"
```

---

### Task 16: Final Verification

**Step 1: Run all tests**

Run: `npm run test:brief`
Expected: All tests PASS

**Step 2: Run lint**

Run: `npm run lint:brief`
Expected: No errors

**Step 3: Run build**

Run: `npm run build:dev`
Expected: Build succeeds

**Step 4: Run backend build**

Run: `cd PrintLogApi && dotnet build`
Expected: Build succeeds

**Step 5: Commit any final fixes**

If any lint or test issues, fix and commit.
