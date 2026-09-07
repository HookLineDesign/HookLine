import React from 'react';
import {Composition} from 'remotion';
import {GamecocksEdit} from './video';

export const RemotionRoot: React.FC = () => {
  return (
    <Composition
      id="GamecocksEdit"
      component={GamecocksEdit}
      durationInFrames={900}
      fps={30}
      width={1080}
      height={1920}
    />
  );
};
