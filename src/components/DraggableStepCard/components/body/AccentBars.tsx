import React from 'react';
import type { StepTypeStyle } from '../../styles/stepTypeStyles';

interface AccentBarsProps {
  stepType: string;
  typeStyle: StepTypeStyle;
}

export const AccentBars: React.FC<AccentBarsProps> = ({ stepType, typeStyle }) => {
  const isLoop = stepType === 'loop_start' || stepType === 'loop_end';
  if (!isLoop) return null;

  const hasTop = !!typeStyle.topAccentClass;
  const hasLeft = !!typeStyle.leftAccentClass;
  if (!hasTop && !hasLeft) return null;

  return (
    <>
      {hasTop ? <div className={typeStyle.topAccentClass!} /> : null}
      {hasLeft ? <div className={typeStyle.leftAccentClass!} /> : null}
    </>
  );
};

export default AccentBars;
