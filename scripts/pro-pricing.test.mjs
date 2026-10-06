// src/content/pro-pricing.json is the one place the Pro prices are typed for
// code: the pricing page and the homepage JSON-LD read it. The two prose copies
// below are hand-written, so these tests are what catch a price change that
// reached one of them and not the others.
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const read = (file) =>
  readFileSync(new URL(`../${file}`, import.meta.url), 'utf8');

const pricing = JSON.parse(read('src/content/pro-pricing.json'));
const plan = (id) => {
  const found = pricing.plans.find((p) => p.id === id);
  assert.ok(found, `pro-pricing.json has no ${id} plan`);
  return found;
};
const monthly = plan('pro_monthly');
const annual = plan('pro_annual');

const escapeRegExp = (text) => text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const dollars = (text) =>
  [...text.matchAll(/\$(\d+\.\d\d)/g)].map((m) => m[1]).sort();

test('pro-pricing.json is well formed', () => {
  assert.equal(pricing.currency, 'USD');
  for (const p of pricing.plans) {
    assert.match(p.price, /^\d+\.\d\d$/, `${p.id} price`);
    assert.match(p.billingDuration, /^P\d+[MY]$/, `${p.id} billingDuration`);
    assert.ok(p.unitCode, `${p.id} unitCode`);
  }
});

test('docs/pro-subscription.md quotes the prices in pro-pricing.json', () => {
  const doc = read('src/content/docs/pro-subscription.md');
  for (const p of pricing.plans) {
    const match = new RegExp(
      `\\*\\*${escapeRegExp(p.label)}\\*\\* — \\$(\\d+\\.\\d\\d)`
    ).exec(doc);
    assert.ok(match, `pro-subscription.md has no **${p.label}** price`);
    assert.equal(match[1], p.price, `${p.label} price`);
  }
  // The derived figures the docs also quote.
  const perMonth = (Number(annual.price) / 12).toFixed(2);
  const savings = Math.floor(
    (1 - Number(annual.price) / (Number(monthly.price) * 12)) * 100
  );
  assert.ok(doc.includes(`$${perMonth} per month`), `per-month $${perMonth}`);
  assert.ok(doc.includes(`${savings}%`), `savings ${savings}%`);
});

test('src/index.md quotes the prices in pro-pricing.json', () => {
  assert.deepEqual(
    dollars(read('src/index.md')),
    [monthly.price, annual.price].sort()
  );
});

test('the pricing page reads its prices instead of typing them', () => {
  const template = read('src/app/subscription/pricing/pricing.component.html');
  assert.deepEqual(dollars(template), []);
});
