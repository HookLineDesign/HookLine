import {chromium} from 'playwright';
import fs from 'node:fs/promises';
import path from 'node:path';

const clips = [
  ['sellers1', 'https://www.espn.com/watch/player/_/id/42700754'],
  ['sellers2', 'https://www.espn.com/video/clip/_/id/42697706'],
  ['cinematic', 'https://www.espn.com/video/clip/_/id/42159145'],
];

await fs.mkdir('public', {recursive: true});
await fs.mkdir('captures', {recursive: true});

const browser = await chromium.launch({headless: true, args: ['--autoplay-policy=no-user-gesture-required']});

for (const [name, url] of clips) {
  const context = await browser.newContext({
    viewport: {width: 1280, height: 720},
    recordVideo: {dir: 'captures', size: {width: 1280, height: 720}},
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/131 Safari/537.36'
  });
  const page = await context.newPage();
  await page.goto(url, {waitUntil: 'domcontentloaded', timeout: 60000});
  await page.waitForTimeout(4000);

  // Dismiss common consent overlays if present.
  for (const text of ['Accept', 'I Accept', 'Agree', 'Continue']) {
    const b = page.getByRole('button', {name: new RegExp(`^${text}$`, 'i')});
    if (await b.count()) {
      try { await b.first().click({timeout: 1000}); } catch {}
    }
  }

  const video = page.locator('video').first();
  await video.waitFor({state: 'attached', timeout: 30000});
  await page.evaluate(() => {
    const v = document.querySelector('video');
    if (!v) return;
    document.body.innerHTML = '';
    document.body.style.margin = '0';
    document.body.style.background = '#000';
    Object.assign(v.style, {
      position: 'fixed', inset: '0', width: '100vw', height: '100vh', objectFit: 'contain', background: '#000', zIndex: '999999'
    });
    document.body.appendChild(v);
  });

  await page.evaluate(async () => {
    const v = document.querySelector('video');
    if (v) {
      v.muted = true;
      try { v.currentTime = 0; } catch {}
      try { await v.play(); } catch {}
    }
  });

  await page.waitForTimeout(11000);
  const pv = page.video();
  await context.close();
  const recorded = await pv.path();
  await fs.copyFile(recorded, path.join('public', `${name}.webm`));
}

await browser.close();
