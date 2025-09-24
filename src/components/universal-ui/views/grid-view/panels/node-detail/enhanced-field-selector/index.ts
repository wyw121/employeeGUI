/**
 * 增强字段选择器模块导出
 * 
 * 统一导出增强字段选择器相关的所有组件和工具
 */

// 字段定义和配置
export {
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
} from './fieldDefinitions';

// 高级字段选择器组件
export { 
  AdvancedFieldSelector,
  default as DefaultAdvancedFieldSelector 
} from './AdvancedFieldSelector';

// 字段说明和帮助面板
export { 
  FieldDescriptionPanel,
  default as DefaultFieldDescriptionPanel 
} from './FieldDescriptionPanel';

// 便捷导入别名
export { AdvancedFieldSelector as EnhancedFieldSelector } from './AdvancedFieldSelector';
export { FieldDescriptionPanel as FieldHelp } from './FieldDescriptionPanel';