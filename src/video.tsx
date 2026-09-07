import React from 'react';
import {AbsoluteFill, Easing, interpolate, Sequence, staticFile, useCurrentFrame} from 'remotion';
import {Audio, Video} from '@remotion/media';

const GARNET = '#73000A';

const ImpactFlash: React.FC<{at: number}> = ({at}) => {
  const frame = useCurrentFrame();
  const opacity = interpolate(frame, [at - 1, at, at + 2], [0, 0.95, 0], {
    extrapolateLeft: 'clamp', extrapolateRight: 'clamp'
  });
  return <AbsoluteFill style={{backgroundColor: 'white', opacity, mixBlendMode: 'screen'}} />;
};

const Clip: React.FC<{src: string; trim: number; duration: number; zoom?: number; x?: number; speed?: number}> = ({src, trim, duration, zoom = 1.18, x = 0, speed = 1}) => {
  const frame = useCurrentFrame();
  const punch = interpolate(frame % 18, [0, 2, 18], [1.035, 1, 1], {extrapolateRight: 'clamp'});
  const drift = interpolate(frame, [0, duration], [-18 + x, 18 + x], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: Easing.bezier(.22,.8,.2,1)});
  return (
    <AbsoluteFill style={{overflow: 'hidden', backgroundColor: 'black'}}>
      <Video
        src={staticFile(src)}
        trimBefore={trim}
        durationInFrames={duration}
        playbackRate={speed}
        muted
        style={{
          width: '100%', height: '100%', objectFit: 'cover', objectPosition: 'center',
          scale: zoom * punch,
          translate: `${drift}px 0px`,
          filter: 'contrast(1.22) saturate(1.16) brightness(.91)'
        }}
      />
      <AbsoluteFill style={{background:'linear-gradient(180deg,rgba(0,0,0,.35),transparent 20%,transparent 72%,rgba(0,0,0,.55))'}}/>
      <AbsoluteFill style={{boxShadow:'inset 0 0 170px rgba(0,0,0,.78)'}}/>
    </AbsoluteFill>
  );
};

const BigType: React.FC<{top: string; bottom?: string; from: number; to: number}> = ({top,bottom,from,to}) => {
  const frame = useCurrentFrame();
  const opacity = interpolate(frame,[from,from+4,to-5,to],[0,1,1,0],{extrapolateLeft:'clamp',extrapolateRight:'clamp'});
  const scale = interpolate(frame,[from,to],[1.22,.98],{extrapolateLeft:'clamp',extrapolateRight:'clamp',easing:Easing.bezier(.16,1,.3,1)});
  return <AbsoluteFill style={{justifyContent:'center',alignItems:'center',opacity}}>
    <div style={{textAlign:'center',scale,fontFamily:'Impact,Arial Black,sans-serif',fontStyle:'italic',letterSpacing:-2,textTransform:'uppercase',textShadow:'0 8px 25px rgba(0,0,0,.8)'}}>
      <div style={{fontSize:142,lineHeight:.82,color:'white'}}>{top}</div>
      {bottom ? <div style={{fontSize:142,lineHeight:.82,color:GARNET,WebkitTextStroke:'3px white'}}>{bottom}</div> : null}
    </div>
  </AbsoluteFill>;
};

export const GamecocksEdit: React.FC = () => {
  const frame = useCurrentFrame();
  const introScale = interpolate(frame,[0,88],[1.45,1],{extrapolateRight:'clamp',easing:Easing.bezier(.16,1,.3,1)});
  const redPulse = .12 + (frame % 15 < 2 ? .16 : 0);
  const beats = [88,150,208,268,330,392,450,510,570,630,690,748,810,868];

  return (
    <AbsoluteFill style={{backgroundColor:'black', color:'white'}}>
      <Audio src={staticFile('song.mp3')} volume={0.95} />

      <Sequence from={0} durationInFrames={88}>
        <AbsoluteFill style={{background:'radial-gradient(circle at center,#240005 0%,#070707 48%,#000 100%)',justifyContent:'center',alignItems:'center'}}>
          <div style={{scale:introScale,textAlign:'center',fontFamily:'Impact,Arial Black,sans-serif',fontStyle:'italic'}}>
            <div style={{fontSize:240,lineHeight:.8,color:GARNET,WebkitTextStroke:'5px white'}}>16</div>
            <div style={{fontSize:54,letterSpacing:18,marginTop:30}}>SOUTH CAROLINA</div>
          </div>
        </AbsoluteFill>
      </Sequence>

      <Sequence from={88} durationInFrames={120}><Clip src="sellers1.mp4" trim={300} duration={120} zoom={1.28} speed={1.08}/></Sequence>
      <Sequence from={208} durationInFrames={122}><Clip src="sellers1.mp4" trim={870} duration={122} zoom={1.34} x={-20} speed={1.18}/></Sequence>
      <Sequence from={330} durationInFrames={120}><Clip src="sellers2.mp4" trim={1320} duration={120} zoom={1.24} x={25} speed={1.12}/></Sequence>
      <Sequence from={450} durationInFrames={120}><Clip src="cinematic.mp4" trim={450} duration={120} zoom={1.3} speed={1.04}/></Sequence>
      <Sequence from={570} durationInFrames={120}><Clip src="sellers1.mp4" trim={2250} duration={120} zoom={1.36} x={-25} speed={1.2}/></Sequence>
      <Sequence from={690} durationInFrames={120}><Clip src="sellers2.mp4" trim={3180} duration={120} zoom={1.3} x={15} speed={1.16}/></Sequence>
      <Sequence from={810} durationInFrames={60}><Clip src="sellers1.mp4" trim={5100} duration={60} zoom={1.42} speed={1.02}/></Sequence>

      <BigType top="LANORRIS" bottom="SELLERS" from={95} to={150}/>
      <BigType top="BUILT" bottom="DIFFERENT" from={470} to={525}/>
      <BigType top="GAME" bottom="COCKS" from={748} to={805}/>

      {beats.map((b)=><ImpactFlash key={b} at={b}/>)}
      <AbsoluteFill style={{pointerEvents:'none',backgroundColor:GARNET,opacity:redPulse,mixBlendMode:'color'}}/>

      <Sequence from={870} durationInFrames={30}>
        <AbsoluteFill style={{backgroundColor:'black',justifyContent:'center',alignItems:'center'}}>
          <div style={{fontFamily:'Impact,Arial Black,sans-serif',fontStyle:'italic',fontSize:104,letterSpacing:4,color:'white',textAlign:'center'}}>
            FOREVER TO THEE
            <div style={{fontSize:48,color:GARNET,marginTop:14,letterSpacing:14}}>SOUTH CAROLINA</div>
          </div>
        </AbsoluteFill>
      </Sequence>
    </AbsoluteFill>
  );
};
