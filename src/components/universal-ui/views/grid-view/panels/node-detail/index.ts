// Barrel exports for node-detail submodule
export { MatchPresetsRow } from './MatchPresetsRow';
export { MatchingStrategySelector } from './MatchingStrategySelector';
export { SelectedFieldsPreview } from './SelectedFieldsPreview';
export { SelectedFieldsChips } from './SelectedFieldsChips';
export { SelectedFieldsEditor } from './SelectedFieldsEditor';
export { SelectedFieldsTable } from './SelectedFieldsTable';
export { NegativeConditionsEditor } from './NegativeConditionsEditor';
export { PositiveConditionsEditor } from './PositiveConditionsEditor';

// 🆕 增强字段选择器模块
export { 
  AdvancedFieldSelector,
  FieldDescriptionPanel,
  EnhancedFieldSelector,
  FieldHelp,
  ALL_FIELD_GROUPS,
  BASIC_FIELDS_GROUP,
  PARENT_FIELDS_GROUP,
  CHILD_FIELDS_GROUP,
  INTERACTION_FIELDS_GROUP,
  CLICKABLE_ANCESTOR_FIELDS_GROUP,
  getRecommendedGroupsForStrategy,
  getFieldInfo,
  analyzeFieldUsage,
  type FieldInfo,
  type FieldGroup
} from './enhanced-field-selector';

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
export { PRESET_FIELDS, inferStrategyFromFields, isSameFieldsAsPreset, toBackendStrategy, buildDefaultValues, normalizeFieldsAndValues, hasPositionConstraint, normalizeExcludes, normalizeIncludes, buildFindSimilarCriteria } from './helpers';
// 标题/描述辅助
export { buildShortDescriptionFromCriteria } from './titleHelpers';
