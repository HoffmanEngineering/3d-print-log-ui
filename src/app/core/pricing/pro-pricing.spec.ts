import {
  annualPricePerMonth,
  annualSavingsPercent,
  PRO_CURRENCY,
  PRO_PLANS,
  proPlan,
} from './pro-pricing';

describe('pro-pricing', () => {
  it('has a monthly and an annual plan in USD', () => {
    expect(PRO_CURRENCY).toBe('USD');
    expect(PRO_PLANS.map((p) => p.id)).toEqual(['pro_monthly', 'pro_annual']);
  });

  it('stores prices as two-decimal strings', () => {
    for (const plan of PRO_PLANS) {
      expect(plan.price).toMatch(/^\d+\.\d{2}$/);
    }
  });

  it('gives each plan an ISO 8601 billing duration', () => {
    expect(proPlan('pro_monthly').billingDuration).toBe('P1M');
    expect(proPlan('pro_annual').billingDuration).toBe('P1Y');
  });

  it('derives the annual per-month price and savings from the two prices', () => {
    const monthly = Number(proPlan('pro_monthly').price);
    const annual = Number(proPlan('pro_annual').price);
    expect(annualPricePerMonth()).toBe((annual / 12).toFixed(2));
    expect(annualSavingsPercent()).toBe(
      Math.floor((1 - annual / (monthly * 12)) * 100)
    );
  });
});
