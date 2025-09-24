// Barrel exports for node-detail submodule
export { MatchPresetsRow } from './MatchPresetsRow';
export { MatchingStrategySelector } from './MatchingStrategySelector';
export { SelectedFieldsPreview } from './SelectedFieldsPreview';
export { SelectedFieldsChips } from './SelectedFieldsChips';
export { SelectedFieldsEditor } from './SelectedFieldsEditor';
export { SelectedFieldsTable } from './SelectedFieldsTable';
export { NegativeConditionsEditor } from './NegativeConditionsEditor';
export { PositiveConditionsEditor } from './PositiveConditionsEditor';

// 🆕 统一回填组件和工具
export { 
  SetAsStepElementButton,
  NodeDetailSetElementButton,
  ScreenPreviewSetElementButton,
  MatchResultSetElementButton,
  createSetAsStepElementButton
} from './SetAsStepElementButton';
export { 
  buildCompleteStepCriteria,
  buildSmartStepCriteria,
  buildMatchResultCriteria,
  validateStepCriteria,
  formatCriteriaForDebug,
  type CompleteStepCriteria,
  type ElementToStepOptions
} from './elementToStepHelper';

export * from './types';
// 公共工具（供其他面板/列表模块化复用）
export { PRESET_FIELDS, inferStrategyFromFields, isSameFieldsAsPreset, toBackendStrategy, buildDefaultValues, normalizeFieldsAndValues, hasPositionConstraint, normalizeExcludes, normalizeIncludes } from './helpers';
// 标题/描述辅助
export { buildShortDescriptionFromCriteria } from './titleHelpers';
