import {spawnSync} from 'node:child_process';
import fs from 'node:fs/promises';
await fs.mkdir('public/premium',{recursive:true});
const vids=[
 ['run_it_back','https://www.youtube.com/watch?v=Pq8C3BnQiuI'],
 ['highlights_2024','https://www.youtube.com/watch?v=BtnVV-yxRWw'],
 ['highlights_2025','https://www.youtube.com/watch?v=nX_yvNocpGc']
];
for(const [name,url] of vids){
  const out=`public/premium/${name}.mp4`;
  const args=['-f','bv*[height<=1080]+ba/b[height<=1080]','--merge-output-format','mp4','--no-playlist','-o',out,url];
  const r=spawnSync('yt-dlp',args,{stdio:'inherit'});
  if(r.status!==0) throw new Error(`yt-dlp failed for ${name}`);
}
