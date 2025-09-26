import React from 'react';
import { StrategyControls } from '../../StrategyControls';

interface StrategyControlsBlockProps {
  step: any;
  onUpdateStepParameters: (id: string, nextParams: any) => void;
}

export const StrategyControlsBlock: React.FC<StrategyControlsBlockProps> = ({ step, onUpdateStepParameters }) => {
  return (
    <StrategyControls step={step} boundNode={null} onUpdate={(next) => onUpdateStepParameters(step.id, next)} />
  );
};

export default StrategyControlsBlock;
