/**
 * 增强字段选择器 - 高级字段选择组件
 * 
 * 提供分组展示和选择所有增强字段的UI组件
 * 支持字段分组、批量选择、智能推荐等功能
 */

import React, { useState, useMemo } from 'react';
import { 
  ALL_FIELD_GROUPS, 
  getRecommendedGroupsForStrategy, 
  analyzeFieldUsage,
  type FieldGroup,
  type FieldInfo 
} from './fieldDefinitions';

interface AdvancedFieldSelectorProps {
  selectedFields: string[];
  strategy: string;
  onFieldsChange: (fields: string[]) => void;
  onGroupToggle?: (groupId: string, enabled: boolean) => void;
  compact?: boolean; // 紧凑模式
}

interface FieldGroupCardProps {
  group: FieldGroup;
  selectedFields: string[];
  onFieldToggle: (fieldKey: string, selected: boolean) => void;
  onGroupToggle: (groupId: string, enabled: boolean) => void;
  isRecommended: boolean;
  compact?: boolean;
}

const FieldGroupCard: React.FC<FieldGroupCardProps> = ({ 
  group, 
  selectedFields, 
  onFieldToggle, 
  onGroupToggle, 
  isRecommended,
  compact = false 
}) => {
  const selectedFieldsSet = new Set(selectedFields);
  const groupFields = group.fields.map(f => f.key);
  const selectedCount = groupFields.filter(f => selectedFieldsSet.has(f)).length;
  const totalCount = groupFields.length;
  const isGroupEnabled = selectedCount > 0;
  const isFullySelected = selectedCount === totalCount;

  const colorClasses = {
    blue: 'border-blue-200 bg-blue-50',
    green: 'border-green-200 bg-green-50', 
    purple: 'border-purple-200 bg-purple-50',
    orange: 'border-orange-200 bg-orange-50',
    red: 'border-red-200 bg-red-50'
  };

  const toggleGroup = () => {
    if (isFullySelected) {
      // 取消选择所有字段
      groupFields.forEach(f => onFieldToggle(f, false));
      onGroupToggle(group.id, false);
    } else {
      // 选择所有字段
      groupFields.forEach(f => onFieldToggle(f, true));
      onGroupToggle(group.id, true);
    }
  };

  return (
    <div className={`border-2 rounded-lg p-4 ${colorClasses[group.color as keyof typeof colorClasses] || 'border-gray-200 bg-gray-50'} ${isRecommended ? 'ring-2 ring-blue-300' : ''}`}>
      {/* 分组标题和控制 */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <span className="text-lg">{group.icon}</span>
          <div>
            <h4 className="font-medium text-gray-800 flex items-center gap-2">
              {group.title}
              {isRecommended && (
                <span className="px-2 py-1 bg-blue-100 text-blue-700 text-xs rounded-full">推荐</span>
              )}
            </h4>
            {!compact && (
              <p className="text-sm text-gray-600 mt-1">{group.description}</p>
            )}
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          <span className="text-sm text-gray-500">
            {selectedCount}/{totalCount}
          </span>
          <button
            onClick={toggleGroup}
            className={`px-3 py-1 text-xs rounded-md border transition-colors ${
              isFullySelected 
                ? 'bg-gray-100 text-gray-700 border-gray-300 hover:bg-gray-200' 
                : 'bg-white text-gray-600 border-gray-300 hover:bg-gray-50'
            }`}
          >
            {isFullySelected ? '取消全选' : '全选'}
          </button>
        </div>
      </div>

      {/* 字段列表 */}
      <div className="space-y-2">
        {group.fields.map(field => (
          <FieldCheckboxRow
            key={field.key}
            field={field}
            selected={selectedFieldsSet.has(field.key)}
            onChange={(selected) => onFieldToggle(field.key, selected)}
            compact={compact}
          />
        ))}
      </div>
    </div>
  );
};

interface FieldCheckboxRowProps {
  field: FieldInfo;
  selected: boolean;
  onChange: (selected: boolean) => void;
  compact?: boolean;
}

const FieldCheckboxRow: React.FC<FieldCheckboxRowProps> = ({ 
  field, 
  selected, 
  onChange,
  compact = false 
}) => {
  const priorityColors = {
    high: 'text-red-600',
    medium: 'text-yellow-600', 
    low: 'text-gray-500'
  };

  const priorityLabels = {
    high: '高',
    medium: '中',
    low: '低'
  };

  return (
    <label className="flex items-start gap-3 p-2 rounded-md hover:bg-white/50 cursor-pointer transition-colors">
      <input
        type="checkbox"
        checked={selected}
        onChange={(e) => onChange(e.target.checked)}
        className="mt-1 h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
      />
      
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="font-medium text-sm text-gray-800">
            {field.label}
          </span>
          <span className="text-xs text-gray-500">
            ({field.key})
          </span>
          <span className={`text-xs ${priorityColors[field.priority]}`}>
            {priorityLabels[field.priority]}
          </span>
        </div>
        
        {!compact && (
          <>
            <p className="text-xs text-gray-600 mt-1 leading-relaxed">
              {field.description}
            </p>
            
            {field.scenarios.length > 0 && (
              <div className="flex flex-wrap gap-1 mt-2">
                {field.scenarios.slice(0, 3).map(scenario => (
                  <span key={scenario} className="px-2 py-1 bg-gray-100 text-gray-600 text-xs rounded">
                    {scenario}
                  </span>
                ))}
                {field.scenarios.length > 3 && (
                  <span className="text-xs text-gray-500">
                    +{field.scenarios.length - 3}
                  </span>
                )}
              </div>
            )}
          </>
        )}
      </div>
    </label>
  );
};

export const AdvancedFieldSelector: React.FC<AdvancedFieldSelectorProps> = ({
  selectedFields,
  strategy,
  onFieldsChange,
  onGroupToggle,
  compact = false
}) => {
  const [showAdvanced, setShowAdvanced] = useState(false);
  
  const recommendedGroups = useMemo(
    () => new Set(getRecommendedGroupsForStrategy(strategy)),
    [strategy]
  );

  const fieldAnalysis = useMemo(
    () => analyzeFieldUsage(selectedFields),
    [selectedFields]
  );

  const handleFieldToggle = (fieldKey: string, selected: boolean) => {
    const newFields = selected
      ? [...selectedFields, fieldKey]
      : selectedFields.filter(f => f !== fieldKey);
    onFieldsChange(newFields);
  };

  const handleGroupToggle = (groupId: string, enabled: boolean) => {
    onGroupToggle?.(groupId, enabled);
  };

  // 基础字段组始终显示，其他组根据 showAdvanced 控制
  const displayGroups = ALL_FIELD_GROUPS.filter(group => 
    group.id === 'basic' || showAdvanced
  );

  return (
    <div className="space-y-4">
      {/* 控制面板 */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <h3 className="font-medium text-gray-800">字段选择</h3>
          <span className="text-sm text-gray-500">
            已选择 {selectedFields.length} 个字段
          </span>
        </div>
        
        <div className="flex items-center gap-2">
          {fieldAnalysis.missingRecommended.length > 0 && (
            <span className="px-2 py-1 bg-yellow-100 text-yellow-700 text-xs rounded-full">
              建议添加 {fieldAnalysis.missingRecommended.length} 个字段
            </span>
          )}
          
          <button
            onClick={() => setShowAdvanced(!showAdvanced)}
            className={`px-3 py-1.5 text-sm rounded-md border transition-colors ${
              showAdvanced 
                ? 'bg-blue-50 text-blue-700 border-blue-300' 
                : 'bg-white text-gray-600 border-gray-300 hover:bg-gray-50'
            }`}
          >
            {showAdvanced ? '收起高级字段' : '显示高级字段'}
          </button>
        </div>
      </div>

      {/* 推荐提示 */}
      {recommendedGroups.size > 0 && showAdvanced && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
          <p className="text-sm text-blue-700">
            <span className="font-medium">💡 策略推荐:</span>
            {' '}当前 <code className="px-1 bg-blue-100 rounded">{strategy}</code> 策略推荐使用以下字段组：
            {Array.from(recommendedGroups).map(groupId => {
              const group = ALL_FIELD_GROUPS.find(g => g.id === groupId);
              return group ? ` ${group.icon}${group.title}` : '';
            }).join('、')}
          </p>
        </div>
      )}

      {/* 字段组列表 */}
      <div className="space-y-4">
        {displayGroups.map(group => (
          <FieldGroupCard
            key={group.id}
            group={group}
            selectedFields={selectedFields}
            onFieldToggle={handleFieldToggle}
            onGroupToggle={handleGroupToggle}
            isRecommended={recommendedGroups.has(group.id)}
            compact={compact}
          />
        ))}
      </div>

      {/* 高级字段提示 */}
      {!showAdvanced && (
        <div className="text-center py-4 border-t border-gray-200">
          <button
            onClick={() => setShowAdvanced(true)}
            className="text-sm text-gray-500 hover:text-gray-700 transition-colors"
          >
            📈 显示更多高级字段（父节点、子节点、交互状态等）
          </button>
        </div>
      )}
    </div>
  );
};

export default AdvancedFieldSelector;