import proPricing from '../../../content/pro-pricing.json';

/**
 * One paid plan. The checkout `id` is what the API's Stripe session expects;
 * `billingDuration` is an ISO 8601 duration and `unitCode` the matching
 * UN/CEFACT code, both of which the homepage JSON-LD publishes as-is.
 */
export interface ProPlan {
  readonly id: 'pro_monthly' | 'pro_annual';
  readonly label: string;
  /** A decimal string ("2.99"), never a float, so it prints exactly. */
  readonly price: string;
  readonly billingDuration: string;
  readonly unitCode: string;
}

/**
 * The Pro prices, read from src/content/pro-pricing.json.
 *
 * That file is the single source for every price this repo shows: the pricing
 * page and the homepage JSON-LD read it here, and scripts/pro-pricing.test.mjs
 * fails if the hand-written copies (docs/pro-subscription.md, src/index.md)
 * quote anything else. Stripe holds the amount actually charged, so a price
 * change starts there and ends here.
 */
export const PRO_CURRENCY: string = proPricing.currency;

export const PRO_PLANS: readonly ProPlan[] = proPricing.plans as ProPlan[];

export function proPlan(id: ProPlan['id']): ProPlan {
  const plan = PRO_PLANS.find((p) => p.id === id);
  if (!plan) {
    throw new Error(`pro-pricing.json has no "${id}" plan`);
  }
  return plan;
}

/** The annual price spread over twelve months, e.g. "2.50". */
export function annualPricePerMonth(): string {
  return (Number(proPlan('pro_annual').price) / 12).toFixed(2);
}

/** How much the annual plan saves over twelve monthly payments, in whole percent (rounded down). */
export function annualSavingsPercent(): number {
  const monthly = Number(proPlan('pro_monthly').price) * 12;
  const annual = Number(proPlan('pro_annual').price);
  return Math.floor((1 - annual / monthly) * 100);
}
