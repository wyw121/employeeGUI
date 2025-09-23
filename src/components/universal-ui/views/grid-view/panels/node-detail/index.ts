// Barrel exports for node-detail submodule
export { MatchPresetsRow } from './MatchPresetsRow';
export { MatchingStrategySelector } from './MatchingStrategySelector';
export { SelectedFieldsPreview } from './SelectedFieldsPreview';
export { SelectedFieldsChips } from './SelectedFieldsChips';
export { SelectedFieldsEditor } from './SelectedFieldsEditor';
export { SelectedFieldsTable } from './SelectedFieldsTable';
export { NegativeConditionsEditor } from './NegativeConditionsEditor';

export * from './types';
// 公共工具（供其他面板/列表模块化复用）
export { PRESET_FIELDS, inferStrategyFromFields, isSameFieldsAsPreset, toBackendStrategy, buildDefaultValues, normalizeFieldsAndValues, hasPositionConstraint, normalizeExcludes } from './helpers';
// 标题/描述辅助
export { buildShortDescriptionFromCriteria } from './titleHelpers';
