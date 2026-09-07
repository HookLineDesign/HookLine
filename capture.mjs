import {chromium} from 'playwright';
import {spawnSync} from 'node:child_process';
import fs from 'node:fs/promises';

const clips = [
  ['sellers1', 'https://www.espn.com/watch/player/_/id/42700754'],
  ['sellers2', 'https://www.espn.com/video/clip/_/id/42697706'],
  ['cinematic', 'https://www.espn.com/video/clip/_/id/42159145'],
];

await fs.mkdir('public', {recursive: true});
const browser = await chromium.launch({headless: true, args: ['--autoplay-policy=no-user-gesture-required']});

for (const [name, pageUrl] of clips) {
  let captured = false;
  let lastError = '';

  for (let attempt = 1; attempt <= 5 && !captured; attempt++) {
    console.log(`CAPTURE_START ${name} attempt=${attempt}`);
    const context = await browser.newContext({
      viewport: {width: 1280, height: 720},
      userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/131 Safari/537.36'
    });
    const page = await context.newPage();
    const media = [];

    const maybeAdd = (u) => {
      if (!u) return;
      const lower = u.toLowerCase();
      if (lower.includes('.m3u8') || lower.includes('.mp4')) {
        if (!media.includes(u)) {
          media.push(u);
          console.log(`MEDIA ${name} ${u}`);
        }
      }
    };
    page.on('request', r => maybeAdd(r.url()));
    page.on('response', r => maybeAdd(r.url()));

    try {
      await page.goto(pageUrl, {waitUntil: 'domcontentloaded', timeout: 45000});
      await page.waitForTimeout(3000 + attempt * 1000);

      for (const text of ['Accept', 'I Accept', 'Agree', 'Continue']) {
        const b = page.getByRole('button', {name: new RegExp(`^${text}$`, 'i')});
        if (await b.count()) { try { await b.first().click({timeout: 800}); } catch {} }
      }

      for (let pass = 0; pass < 3 && media.length === 0; pass++) {
        for (const frame of page.frames()) {
          try {
            await frame.evaluate(() => {
              const videos = Array.from(document.querySelectorAll('video'));
              for (const v of videos) {
                v.muted = true;
                try { v.currentTime = 0; } catch {}
                v.play().catch(() => {});
              }
              for (const el of Array.from(document.querySelectorAll('button,[role="button"]'))) {
                const label = `${el.getAttribute('aria-label') || ''} ${el.textContent || ''}`.toLowerCase();
                if (label.includes('play')) { try { el.click(); } catch {} }
              }
            });
          } catch {}
        }
        await page.waitForTimeout(5000);
      }

      const chosen = media.find(u => u.toLowerCase().includes('.m3u8')) || media.find(u => u.toLowerCase().includes('.mp4'));
      if (!chosen) throw new Error('No playable media request found');

      const cookies = await context.cookies();
      const cookieHeader = cookies.map(c => `${c.name}=${c.value}`).join('; ');
      const headers = `Referer: ${pageUrl}\r\nUser-Agent: Mozilla/5.0\r\n${cookieHeader ? `Cookie: ${cookieHeader}\r\n` : ''}`;
      const out = `public/${name}.mp4`;
      const args = ['-y', '-headers', headers, '-i', chosen, '-t', '12', '-c:v', 'libx264', '-preset', 'fast', '-crf', '18', '-an', out];
      const res = spawnSync('ffmpeg', args, {stdio: 'inherit'});
      if (res.status !== 0) throw new Error('ffmpeg failed');

      captured = true;
      console.log(`CAPTURE_OK ${name} attempt=${attempt}`);
    } catch (e) {
      lastError = e?.message || String(e);
      console.log(`CAPTURE_RETRY ${name} attempt=${attempt} reason=${lastError}`);
    } finally {
      await context.close();
    }
  }

  if (!captured) {
    await browser.close();
    throw new Error(`Failed to capture ${name} after retries: ${lastError}`);
  }
}

await browser.close();
