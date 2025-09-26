import React from 'react';
import StrategyControlsBlock from './strategy/StrategyControlsBlock';
import BatchMatchBlock from './strategy/BatchMatchBlock';

interface StrategyAreaProps {
  step: any;
  onUpdateStepParameters?: (id: string, nextParams: any) => void;
  onBatchMatch?: (stepId: string) => void;
  ENABLE_BATCH_MATCH?: boolean;
}

export const StrategyArea: React.FC<StrategyAreaProps> = ({ step, onUpdateStepParameters, onBatchMatch, ENABLE_BATCH_MATCH }) => {
  const showStrategyControls = React.useMemo(() => {
    const set = new Set<string>(['smart_find_element', 'batch_match', 'smart_click', 'smart_input', 'smart_verify', 'smart_extract']);
    return set.has(step.step_type) || !!step.parameters?.matching;
  }, [step.step_type, step.parameters]);

  if (!showStrategyControls || !onUpdateStepParameters) return null;

  return (
    <div className="flex items-center gap-1">
      <StrategyControlsBlock step={step} onUpdateStepParameters={onUpdateStepParameters} />
      {onBatchMatch && (
        <BatchMatchBlock
          step={step}
          ENABLE_BATCH_MATCH={ENABLE_BATCH_MATCH}
          onBatchMatch={onBatchMatch}
          onUpdateStepParameters={onUpdateStepParameters}
        />
      )}
    </div>
  );
};

export default StrategyArea;
