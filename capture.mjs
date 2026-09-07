import { chromium } from 'playwright';
import { spawnSync } from 'node:child_process';
import fs from 'node:fs/promises';

const clips = [
  ['clemson_winner','https://www.espn.com/watch/player/_/id/42700754'],
  ['clemson_escape','https://www.espn.com/video/clip/_/id/42697706'],
  ['hurdle_td','https://www.espn.com/video/clip/_/id/42159145'],
  ['harbor_80','https://www.espn.com/watch/player/_/id/46976435'],
  ['sellers_closeup','https://www.espn.com/video/clip/_/id/45739338'],
  ['sellers_feature','https://www.espn.com/video/clip/_/id/45969539'],
  ['sellers_interview','https://www.espn.com/watch/player?id=46124202'],
  ['clemson_fumble','https://www.espn.com/video/clip/_/id/42697752']
];

await fs.mkdir('public/premium',{recursive:true});
const browser = await chromium.launch({headless:true,args:['--autoplay-policy=no-user-gesture-required']});
let good=0;
for (const [name,url] of clips) {
  const context = await browser.newContext({viewport:{width:1920,height:1080}, userAgent:'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/131 Safari/537.36'});
  const page = await context.newPage();
  const media=[];
  const add=u=>{if(!u)return; const l=u.toLowerCase(); if((l.includes('.m3u8')||l.includes('.mp4'))&&!media.includes(u)){media.push(u); console.log('MEDIA',name,u)}};
  page.on('request',r=>add(r.url())); page.on('response',r=>add(r.url()));
  try {
    await page.goto(url,{waitUntil:'domcontentloaded',timeout:50000});
    for(let k=0;k<5 && !media.length;k++){
      for(const frame of page.frames()) try { await frame.evaluate(()=>{document.querySelectorAll('video').forEach(v=>{v.muted=true;v.play().catch(()=>{})});document.querySelectorAll('button,[role="button"]').forEach(b=>{const s=((b.getAttribute('aria-label')||'')+' '+(b.textContent||'')).toLowerCase();if(s.includes('play'))try{b.click()}catch{}})}); } catch{}
      await page.waitForTimeout(3500);
    }
    const chosen=media.find(u=>u.toLowerCase().includes('.m3u8'))||media.find(u=>u.toLowerCase().includes('.mp4'));
    if(!chosen) throw new Error('no media');
    const cookies=await context.cookies();
    const h=`Referer: ${url}\r\nUser-Agent: Mozilla/5.0\r\nCookie: ${cookies.map(c=>`${c.name}=${c.value}`).join('; ')}\r\n`;
    const out=`public/premium/${name}.mp4`;
    const r=spawnSync('ffmpeg',['-y','-headers',h,'-i',chosen,'-t','18','-vf','scale=1920:-2','-c:v','libx264','-preset','fast','-crf','17','-an',out],{stdio:'inherit'});
    if(r.status!==0) throw new Error('ffmpeg');
    good++; console.log('OK',name);
  } catch(e) { console.log('SKIP',name,String(e)); }
  await context.close();
}
await browser.close();
if(good<4) throw new Error(`Only ${good} clips captured`);
