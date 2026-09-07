import {chromium} from 'playwright';
import {spawnSync} from 'node:child_process';
import fs from 'node:fs/promises';

const candidates = [
  'https://audiomack.com/bankrollju/song/lanorris-sellers',
  'https://audiomack.com/bankrollju/song/lanorris-sellers-clean',
  'https://audiomack.com/bankrollju'
];

await fs.mkdir('public', {recursive: true});
const browser = await chromium.launch({headless: true, args:['--autoplay-policy=no-user-gesture-required']});
let done = false;
let last = '';

for (const pageUrl of candidates) {
  if (done) break;
  for (let attempt = 1; attempt <= 3 && !done; attempt++) {
    const context = await browser.newContext({
      viewport:{width:1280,height:720},
      userAgent:'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/131 Safari/537.36'
    });
    const page = await context.newPage();
    const media = [];
    const maybe = (url, type='') => {
      const u=(url||'').toLowerCase();
      const t=(type||'').toLowerCase();
      if (u.includes('.mp3') || u.includes('.m4a') || u.includes('.aac') || u.includes('.m3u8') || t.startsWith('audio/') || t.includes('mpegurl')) {
        if (!media.includes(url)) { media.push(url); console.log('AUDIO_MEDIA', url); }
      }
    };
    page.on('request', r => maybe(r.url(), r.resourceType()));
    page.on('response', r => maybe(r.url(), r.headers()['content-type'] || ''));

    try {
      console.log(`SONG_START url=${pageUrl} attempt=${attempt}`);
      await page.goto(pageUrl,{waitUntil:'domcontentloaded',timeout:45000});
      await page.waitForTimeout(3000);

      for (const text of ['Accept','I Accept','Agree','Continue']) {
        const b=page.getByRole('button',{name:new RegExp(`^${text}$`,'i')});
        if(await b.count()){try{await b.first().click({timeout:700});}catch{}}
      }

      // If on artist page, click the LaNorris Sellers song when it is rendered.
      try {
        const sellerText = page.getByText(/LaNorris Sellers/i).first();
        if (await sellerText.count()) {
          await sellerText.click({timeout:4000});
          await page.waitForTimeout(2500);
        }
      } catch {}

      // Click likely play controls repeatedly until a stream request appears.
      for (let pass=0; pass<5 && media.length===0; pass++) {
        for (const frame of page.frames()) {
          try {
            await frame.evaluate(() => {
              const audios=[...document.querySelectorAll('audio')];
              for(const a of audios){a.muted=true;a.play().catch(()=>{});}
              const els=[...document.querySelectorAll('button,[role="button"],a')];
              for(const el of els){
                const s=`${el.getAttribute('aria-label')||''} ${el.getAttribute('title')||''} ${el.textContent||''}`.toLowerCase();
                if(s.includes('play')){try{el.click();}catch{}}
              }
            });
          } catch {}
        }
        await page.waitForTimeout(3500);
      }

      const chosen = media.find(u=>u.toLowerCase().includes('.m3u8')) || media.find(u=>u.toLowerCase().includes('.mp3')) || media.find(u=>u.toLowerCase().includes('.m4a')) || media[0];
      if(!chosen) throw new Error('No Audiomack audio stream found');

      const cookies=await context.cookies();
      const cookieHeader=cookies.map(c=>`${c.name}=${c.value}`).join('; ');
      const headers=`Referer: ${pageUrl}\r\nUser-Agent: Mozilla/5.0\r\n${cookieHeader?`Cookie: ${cookieHeader}\r\n`:''}`;
      const args=['-y','-headers',headers,'-i',chosen,'-t','30','-vn','-codec:a','libmp3lame','-q:a','1','public/song.mp3'];
      const res=spawnSync('ffmpeg',args,{stdio:'inherit'});
      if(res.status!==0) throw new Error('ffmpeg audio capture failed');
      done=true;
      console.log('SONG_OK');
    } catch(e) {
      last=e?.message||String(e);
      console.log(`SONG_RETRY reason=${last}`);
    } finally {
      await context.close();
    }
  }
}

await browser.close();
if(!done) throw new Error(`Could not capture BankRollJu track preview: ${last}`);
