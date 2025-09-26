import React from 'react';
import { BatchMatchToggle } from '../../BatchMatchToggle';

interface BatchMatchBlockProps {
  step: any;
  ENABLE_BATCH_MATCH?: boolean;
  onBatchMatch: (stepId: string) => void;
  onUpdateStepParameters: (id: string, nextParams: any) => void;
}

export const BatchMatchBlock: React.FC<BatchMatchBlockProps> = ({ step, ENABLE_BATCH_MATCH, onBatchMatch, onUpdateStepParameters }) => {
  return (
    <BatchMatchToggle
      step={step}
      ENABLE_BATCH_MATCH={!!ENABLE_BATCH_MATCH}
      onBatchMatch={onBatchMatch}
      onUpdateStepParameters={onUpdateStepParameters}
    />
  );
};

export default BatchMatchBlock;
