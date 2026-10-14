// The individual UI shots. Each one is named for the file it writes under public/ui/.
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

const DESKTOP = { width: 1280, height: 800 };
const PHONE = { width: 390, height: 844, mobile: true };

export default {
  async materialsList({ browser, newPage, settle, shot, APP, outDir }) {
    const page = await newPage(browser, DESKTOP);
    await page.goto(`${APP}/materials`);
    await settle(page, 1500);
    await shot(page, 'desktop-materials-list');
    const add = await page
      .getByRole('link', { name: /add new material/i })
      .or(page.getByRole('button', { name: /add new material/i }))
      .first()
      .boundingBox();
    fs.writeFileSync(
      path.join(outDir, 'desktop-materials-list.json'),
      JSON.stringify({ addButton: add }, null, 2)
    );
    await page.context().close();
  },

  async addMaterial({ browser, newPage, settle, shot, APP, HERO }) {
    const page = await newPage(browser, DESKTOP);
    await page.goto(`${APP}/materials/new`);
    await settle(page, 1500);
    await page.evaluate(() => window.scrollTo(0, 420));
    await settle(page, 300);
    await shot(page, 'desktop-add-material-empty');
    await page
      .getByLabel('Name', { exact: false })
      .first()
      .fill(HERO.displayName);
    const type = page.locator('[formcontrolname="materialType"]');
    await type.click();
    await type.fill(HERO.materialType);
    await page.keyboard.press('Escape');
    await page.locator('[formcontrolname="colorName"]').fill(HERO.colorName);
    await page.locator('[formcontrolname="brand"]').fill(HERO.brand);
    await page.keyboard.press('Escape');
    await page.locator('body').click({ position: { x: 1200, y: 400 } });
    await settle(page, 400);
    await shot(page, 'desktop-add-material-filled');
    await page.context().close();
  },

  async materialDetail({ browser, newPage, settle, shot, APP, HERO, outDir }) {
    const page = await newPage(browser, DESKTOP);
    await page.goto(`${APP}/materials/${HERO.id}`);
    await settle(page, 1500);
    const printButton = page
      .getByRole('button', { name: /print qr label/i })
      .first();
    await printButton.scrollIntoViewIfNeeded();
    await settle(page, 400);
    await shot(page, 'desktop-material-detail');
    const box = await printButton.boundingBox();
    fs.writeFileSync(
      path.join(outDir, 'desktop-material-detail.json'),
      JSON.stringify({ printQrButton: box }, null, 2)
    );
    await printButton.click();
    await page.locator('app-qr-label-dialog .label-card').first().waitFor();
    await settle(page, 800);
    await shot(page, 'desktop-qr-dialog');
    await shot(page, 'qr-label', {
      selector: 'app-qr-label-dialog .label-card',
    });
    const label = await page
      .locator('app-qr-label-dialog .label-card')
      .first()
      .boundingBox();
    const printBtn = await page
      .getByRole('button', { name: /^print$/i })
      .first()
      .boundingBox();
    fs.writeFileSync(
      path.join(outDir, 'desktop-qr-dialog.json'),
      JSON.stringify({ label, printButton: printBtn }, null, 2)
    );
    // The QR code exactly as the app renders it. The 3D label is drawn from this, so the
    // code on the spool in the film is a real, scannable 3D Print Log label.
    const svg = await page
      .locator('app-qr-label-dialog .qr-code svg')
      .first()
      .evaluate((el) => el.outerHTML);
    fs.writeFileSync(path.join(outDir, 'qr.svg'), svg);
    await page.context().close();
  },

  async phoneFlow({ launch, newPage, settle, shot, APP, outDir }) {
    // Chromium's fake camera plays a y4m file. Feed it the real label, so the app's own
    // scanner decodes it and the "loaded" screen is the genuine result of a scan.
    const y4m = path.join(outDir, '..', '..', 'out', 'fake-camera.y4m');
    fs.mkdirSync(path.dirname(y4m), { recursive: true });
    // Rendered from the app's own SVG at camera resolution: the 3x screenshot of the label
    // card is too soft for html5-qrcode to lock on to.
    const camPng = path.join(path.dirname(y4m), 'fake-camera.png');
    {
      const b = await launch();
      const p = await b.newPage({ viewport: { width: 640, height: 480 } });
      const svg = fs.readFileSync(path.join(outDir, 'qr.svg'), 'utf8');
      await p.setContent(`<body style="margin:0;background:#fff;display:grid;place-items:center;height:480px">
        <div style="width:340px;height:340px">${svg.replace('<svg', '<svg width="340" height="340"')}</div></body>`);
      await p.screenshot({ path: camPng });
      await b.close();
    }
    // Four seconds of blank white first, so the scanner screen can be captured before the
    // code is in view; then the label until the scanner decodes it.
    execFileSync('ffmpeg', [
      '-y',
      '-loglevel',
      'error',
      '-f',
      'lavfi',
      '-i',
      'color=c=white:s=640x480:r=30:d=4',
      '-loop',
      '1',
      '-t',
      '6',
      '-r',
      '30',
      '-i',
      camPng,
      '-filter_complex',
      '[0:v]format=yuv420p[a];[1:v]format=yuv420p[b];[a][b]concat=n=2:v=1[v]',
      '-map',
      '[v]',
      y4m,
    ]);
    const browser = await launch([
      '--use-fake-ui-for-media-stream',
      '--use-fake-device-for-media-stream',
      `--use-file-for-fake-video-capture=${y4m}`,
    ]);
    const page = await newPage(browser, PHONE);
    await page.context().grantPermissions(['camera'], { origin: APP });
    await page.goto(`${APP}/printers/104`);
    await settle(page, 1500);
    const slots = page.locator('app-printer-slots');
    await slots.scrollIntoViewIfNeeded();
    await page.evaluate(() => window.scrollBy(0, 260));
    await settle(page, 400);
    await shot(page, 'phone-printer-slots');
    // The scan shot taps this button, then swaps the empty T2 row for the loaded one.
    const t2Row = () =>
      slots.locator('[data-testid="printer-slot"]').nth(2).boundingBox();
    const slotTargets = {
      loadButton: await slots
        .getByRole('button', { name: 'Load T2' })
        .first()
        .boundingBox(),
      emptyRow: await t2Row(),
    };
    console.log('clicking load');
    page.on('console', (m) => console.log('[page]', m.text().slice(0, 200)));
    await slots
      .getByRole('button', { name: 'Load T2' })
      .first()
      .click({ timeout: 10000 });
    await page.locator('app-filament-search-modal').waitFor({ timeout: 10000 });
    await settle(page, 900);
    await shot(page, 'phone-search-modal');
    console.log('toggling scanner');
    await page.locator('.scan-toggle-button').click();
    // Chromium restarts the fake-camera file when the stream opens: still inside the blank lead-in.
    await page.waitForTimeout(1800);
    await page.addStyleTag({
      content:
        '.mat-mdc-tooltip-panel, .cdk-overlay-container .mdc-tooltip { display: none !important; }',
    });
    await page.waitForTimeout(200);
    await shot(page, 'phone-scanner');
    // Where the camera feed sits: the video replaces it with the 3D viewfinder.
    const feed = await page
      .locator('app-qr-scanner video')
      .first()
      .boundingBox();
    fs.writeFileSync(
      path.join(outDir, 'phone-scanner.json'),
      JSON.stringify({ feed }, null, 2)
    );
    console.log('waiting for scan');
    // The scan closes the modal and loads the slot.
    await page
      .locator('app-filament-search-modal')
      .waitFor({ state: 'detached', timeout: 15000 });
    await settle(page, 600);
    await shot(page, 'phone-slot-loaded');
    fs.writeFileSync(
      path.join(outDir, 'phone-printer-slots.json'),
      JSON.stringify({ ...slotTargets, loadedRow: await t2Row() }, null, 2)
    );
    await browser.close();
  },
};
