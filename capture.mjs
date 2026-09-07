import {chromium} from 'playwright';
import {spawnSync} from 'node:child_process';
import fs from 'node:fs/promises';

const clips = [
  ['clemson', 'https://www.secsports.com/videos/2024/11/highlight-sellers-seals-scintillating-south-carolina-win-at-clemson'],
  ['kentstate', 'https://www.secsports.com/videos/2026/09/highlight-south-carolinas-offense-routs-kent-state-with-645-total-yards'],
  ['coastal', 'https://www.secsports.com/videos/2025/11/highlight-lanorris-sellers-powers-south-carolina-to-win-vs-coastal-carolina'],
  ['odu', 'https://www.secsports.com/videos/2024/08/highlight-south-carolina-survives-old-dominion-upset-bid'],
  ['escape', 'https://www.espn.com/video/clip/_/id/42697706'],
  ['hurdle', 'https://www.espn.com/video/clip/_/id/42159145'],
];

await fs.mkdir('public/premium', {recursive: true});
const browser = await chromium.launch({headless: true, args: ['--autoplay-policy=no-user-gesture-required']});

for (const [name, pageUrl] of clips) {
  let captured = false;
  let lastError = '';
  for (let attempt = 1; attempt <= 4 && !captured; attempt++) {
    const context = await browser.newContext({viewport:{width:1920,height:1080}, userAgent:'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/131 Safari/537.36'});
    const page = await context.newPage();
    const media=[];
    const maybe=(u)=>{if(!u)return; const l=u.toLowerCase(); if((l.includes('.m3u8')||l.includes('.mp4'))&&!media.includes(u)){media.push(u);console.log('MEDIA',name,u)}};
    page.on('request',r=>maybe(r.url())); page.on('response',r=>maybe(r.url()));
    try {
      await page.goto(pageUrl,{waitUntil:'domcontentloaded',timeout:50000});
      await page.waitForTimeout(4000+attempt*1200);
      for (const txt of ['Accept','I Accept','Agree','Continue']) { const b=page.getByRole('button',{name:new RegExp(`^${txt}$`,'i')}); if(await b.count()){try{await b.first().click({timeout:800})}catch{}} }
      for(let pass=0;pass<4&&media.length===0;pass++){
        for(const frame of page.frames()) try{await frame.evaluate(()=>{for(const v of document.querySelectorAll('video')){v.muted=true;v.play().catch(()=>{})} for(const el of document.querySelectorAll('button,[role="button"]')){const s=((el.getAttribute('aria-label')||'')+' '+(el.textContent||'')).toLowerCase(); if(s.includes('play'))try{el.click()}catch{}}})}catch{}
        await page.waitForTimeout(4500);
      }
      const chosen=media.find(u=>u.toLowerCase().includes('.m3u8'))||media.find(u=>u.toLowerCase().includes('.mp4'));
      if(!chosen) throw new Error('No media found');
      const cookies=await context.cookies(); const cookieHeader=cookies.map(c=>`${c.name}=${c.value}`).join('; ');
      const headers=`Referer: ${pageUrl}\r\nUser-Agent: Mozilla/5.0\r\n${cookieHeader?`Cookie: ${cookieHeader}\r\n`:''}`;
      const out=`public/premium/${name}.mp4`;
      const res=spawnSync('ffmpeg',['-y','-headers',headers,'-i',chosen,'-t','24','-vf','scale=1920:-2','-c:v','libx264','-preset','fast','-crf','17','-an',out],{stdio:'inherit'});
      if(res.status!==0) throw new Error('ffmpeg failed');
      captured=true; console.log('CAPTURE_OK',name);
    } catch(e){lastError=e?.message||String(e); console.log('RETRY',name,lastError)} finally {await context.close();}
  }
  if(!captured){await browser.close();throw new Error(`Failed ${name}: ${lastError}`)}
}
await browser.close();
