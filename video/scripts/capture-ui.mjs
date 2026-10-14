// Captures the real 3D Print Log UI for the video's screen inserts.
//
// Runs against the Angular dev server (`npm start` in the repo root, https://localhost:4200)
// with every API request answered from fixtures, the same approach as the Cypress capture
// harness (cypress/support/capture.ts), so no API or database is needed. The demo fixtures in
// cypress/fixtures/demo are reused; video/fixtures adds the hero spool and the few endpoints
// those don't cover.
//
//   node scripts/capture-ui.mjs            # all shots
//   node scripts/capture-ui.mjs --discover # log unstubbed API calls, no shots kept
import { chromium } from 'playwright-core';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const videoRoot = path.resolve(here, '..');
const repoRoot = path.resolve(videoRoot, '..');
const demo = path.join(repoRoot, 'cypress/fixtures/demo');
const extra = path.join(videoRoot, 'fixtures');
const outDir = path.join(videoRoot, 'public/ui');
const APP = process.env.APP_URL ?? 'https://localhost:4200';
const discover = process.argv.includes('--discover');
const APP_VERSION = JSON.parse(
  fs.readFileSync(path.join(repoRoot, 'package.json'), 'utf8')
).version;

const readJson = (p) => JSON.parse(fs.readFileSync(p, 'utf8'));
const HERO = readJson(path.join(extra, 'hero-filament.json'));

// The hero spool is the one the ad adds, so it leads the list.
const filamentList = readJson(path.join(demo, 'filaments.json'));
filamentList.items = [HERO, ...filamentList.items];
filamentList.paging.totalCount = filamentList.items.length;

/** method, pattern (tested against pathname + search), body */
const ROUTES = [
  [
    'GET',
    /\/api\/Prints\/summary/i,
    readJson(path.join(demo, 'prints-summary.json')),
  ],
  [
    'GET',
    /\/api\/printers\/summary/i,
    readJson(path.join(demo, 'printers-summary.json')),
  ],
  [
    'GET',
    /\/api\/Printers\/thumbnails/i,
    readJson(path.join(demo, 'printer-thumbnails.json')),
  ],
  [
    'GET',
    /\/api\/Filaments\/storage-locations/i,
    readJson(path.join(demo, 'filament-storage-locations.json')),
  ],
  ['GET', /\/api\/Filaments\/[0-9a-f-]{36}$/i, HERO],
  ['GET', /\/api\/Filaments(\?|$)/i, filamentList],
  ['GET', /\/api\/Projects(\?|$)/i, readJson(path.join(demo, 'projects.json'))],
  [
    'GET',
    /\/api\/MaterialCategories/i,
    readJson(path.join(demo, 'materials-categories.json')),
  ],
  [
    'GET',
    /\/api\/Users\/me\/user-settings/i,
    [
      ...readJson(path.join(demo, 'user-settings.json')),
      // Email_NoticeSeenAt: keeps the email-notice banner off every shot.
      {
        id: 99,
        userId: 1,
        userSettingTypeId: 26,
        value: '2026-01-01T00:00:00Z',
        createdDate: '2026-01-01T00:00:00+00:00',
        updatedDate: '2026-01-01T00:00:00+00:00',
      },
    ],
  ],
  [
    'GET',
    /\/api\/notifications\/unread-count/i,
    readJson(path.join(demo, 'notifications-unread-count.json')),
  ],
  [
    'GET',
    /\/api\/achievements\/me/i,
    readJson(path.join(demo, 'achievements-me.json')),
  ],
  [
    'GET',
    /\/api\/achievements\/catalog/i,
    readJson(path.join(demo, 'achievements-catalog.json')),
  ],
  ...(fs.existsSync(path.join(extra, 'routes.json'))
    ? readJson(path.join(extra, 'routes.json')).map(([m, re, file]) => [
        m,
        new RegExp(re, 'i'),
        readJson(path.join(extra, file)),
      ])
    : []),
];

const unhandled = new Set();

async function stub(page) {
  await page.route(/localhost:5001|\/api\//, async (route) => {
    const req = route.request();
    const url = new URL(req.url());
    const key = url.pathname + url.search;
    if (!url.pathname.startsWith('/api/')) return route.continue();
    for (const [m, re, body] of ROUTES) {
      if (req.method() === m && re.test(key)) {
        return route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify(body),
        });
      }
    }
    if (req.method() === 'GET' && /\/thumbnail/i.test(url.pathname)) {
      return route.fulfill({
        status: 200,
        contentType: 'image/jpeg',
        body: fs.readFileSync(path.join(demo, 'images/snapmaker_u1.jpg')),
      });
    }
    unhandled.add(`${req.method()} ${url.pathname}`);
    // Writes succeed with an echo, unknown reads with an empty list.
    if (req.method() !== 'GET') {
      return route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: req.postData() ?? '{}',
      });
    }
    return route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: '[]',
    });
  });
}

async function newPage(
  browser,
  { width, height, mobile = false, dark = false }
) {
  const ctx = await browser.newContext({
    viewport: { width, height },
    deviceScaleFactor: 3,
    isMobile: mobile,
    hasTouch: mobile,
    ignoreHTTPSErrors: true,
    colorScheme: dark ? 'dark' : 'light',
  });
  await ctx.addInitScript(
    (d) => {
      try {
        localStorage.setItem('theme-mode', d.dark ? 'dark' : 'light');
        // No consent banner, tour, or "what's new" dialog over the shots.
        localStorage.setItem('cookieConsent', 'true');
        localStorage.setItem('LastLoggedInVersion', d.version);
      } catch {}
    },
    { dark, version: APP_VERSION }
  );
  const page = await ctx.newPage();
  await stub(page);
  return page;
}

async function settle(page, ms = 900) {
  await page.waitForLoadState('networkidle').catch(() => {});
  await page.waitForTimeout(ms);
}

async function shot(page, name, opts = {}) {
  if (discover) return;
  fs.mkdirSync(outDir, { recursive: true });
  const file = path.join(outDir, `${name}.png`);
  if (opts.selector)
    await page
      .locator(opts.selector)
      .first()
      .screenshot({ path: file, animations: 'disabled' });
  else await page.screenshot({ path: file, animations: 'disabled' });
  console.log('wrote', path.relative(videoRoot, file));
}

const SHOTS = (await import('./capture-shots.mjs')).default;

const executablePath =
  process.env.CHROME ?? '/opt/pw-browsers/chromium-1194/chrome-linux/chrome';
/** A browser of its own, for shots that need extra flags (the fake camera). */
const launch = (args = []) =>
  chromium.launch({
    executablePath,
    args: ['--ignore-certificate-errors', ...args],
  });
const browser = await launch();
const only = process.argv.find((a) => a.startsWith('--only='))?.slice(7);
for (const [name, fn] of Object.entries(SHOTS)) {
  if (only && name !== only) continue;
  try {
    await fn({ browser, launch, newPage, settle, shot, HERO, APP, outDir });
  } catch (err) {
    console.error(`shot ${name} failed:`, err.message);
    process.exitCode = 1;
  }
}
await browser.close();
if (unhandled.size)
  console.log('Unstubbed API calls:\n  ' + [...unhandled].join('\n  '));
