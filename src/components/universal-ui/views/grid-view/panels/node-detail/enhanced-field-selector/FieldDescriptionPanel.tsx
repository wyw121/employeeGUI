/**
 * 增强字段选择器 - 字段说明和帮助面板
 * 
 * 为每个字段提供详细说明、使用场景、示例等帮助信息
 * 支持智能提示和最佳实践建议
 */

import React, { useState } from 'react';
import { getFieldInfo, type FieldInfo } from './fieldDefinitions';

interface FieldDescriptionPanelProps {
  fieldKey: string | null;
  onClose?: () => void;
  className?: string;
}

interface FieldDetailCardProps {
  field: FieldInfo;
}

const FieldDetailCard: React.FC<FieldDetailCardProps> = ({ field }) => {
  const priorityConfig = {
    high: { label: '高优先级', color: 'text-red-600 bg-red-50', icon: '🔥' },
    medium: { label: '中优先级', color: 'text-yellow-600 bg-yellow-50', icon: '⚡' },
    low: { label: '低优先级', color: 'text-gray-600 bg-gray-50', icon: '💡' }
  };

  const config = priorityConfig[field.priority];

  return (
    <div className="space-y-4">
      {/* 字段标题和基本信息 */}
      <div className="border-b border-gray-200 pb-4">
        <div className="flex items-center gap-3 mb-2">
          <h3 className="text-lg font-semibold text-gray-800">{field.label}</h3>
          <span className={`px-2 py-1 text-xs rounded-full ${config.color}`}>
            {config.icon} {config.label}
          </span>
        </div>
        
        <div className="flex items-center gap-2 text-sm text-gray-600 mb-3">
          <span className="font-mono bg-gray-100 px-2 py-1 rounded">
            {field.key}
          </span>
        </div>
        
        <p className="text-gray-700 leading-relaxed">
          {field.description}
        </p>
      </div>

      {/* 适用场景 */}
      <div>
        <h4 className="font-medium text-gray-800 mb-3 flex items-center gap-2">
          🎯 适用场景
        </h4>
        <div className="grid grid-cols-1 gap-2">
          {field.scenarios.map((scenario, index) => (
            <div key={index} className="flex items-center gap-2 p-2 bg-blue-50 rounded-lg">
              <span className="w-2 h-2 bg-blue-400 rounded-full"></span>
              <span className="text-sm text-blue-700">{scenario}</span>
            </div>
          ))}
        </div>
      </div>

      {/* 兼容策略 */}
      <div>
        <h4 className="font-medium text-gray-800 mb-3 flex items-center gap-2">
          🧩 兼容策略
        </h4>
        <div className="flex flex-wrap gap-2">
          {field.compatibleStrategies.map(strategy => (
            <span key={strategy} className="px-2 py-1 bg-green-100 text-green-700 text-xs rounded-md">
              {strategy}
            </span>
          ))}
        </div>
      </div>

      {/* 示例值 */}
      {field.examples && field.examples.length > 0 && (
        <div>
          <h4 className="font-medium text-gray-800 mb-3 flex items-center gap-2">
            📝 示例值
          </h4>
          <div className="space-y-2">
            {field.examples.map((example, index) => (
              <div key={index} className="bg-gray-50 rounded-lg p-3">
                <code className="text-sm text-gray-700 font-mono break-all">
                  {example}
                </code>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 最佳实践提示 */}
      <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
        <h4 className="font-medium text-amber-800 mb-2 flex items-center gap-2">
          💡 最佳实践
        </h4>
        <div className="text-sm text-amber-700 space-y-2">
          {getBestPractices(field.key).map((tip, index) => (
            <p key={index}>• {tip}</p>
          ))}
        </div>
      </div>
    </div>
  );
};

// 根据字段获取最佳实践建议
function getBestPractices(fieldKey: string): string[] {
  const practices: Record<string, string[]> = {
    'resource-id': [
      '优先选择具有唯一resource-id的元素，稳定性最高',
      '避免使用系统级ID（如android:id）作为唯一匹配条件',
      '结合其他字段使用，提高匹配准确性'
    ],
    'text': [
      '确保文本内容不会频繁变化（如避免使用时间、数字等动态内容）',
      '考虑多语言适配，建议结合其他字段使用',
      '注意文本可能包含不可见字符，使用时需要预处理'
    ],
    'content-desc': [
      '内容描述通常比文本更稳定，优先考虑使用',
      '特别适合图标按钮等没有显示文本的元素',
      '注意无障碍访问描述可能因版本而异'
    ],
    'class': [
      '结合其他字段使用，避免单独依赖类名匹配',
      '注意不同Android版本或应用版本的类名可能不同',
      '自定义控件的类名相对稳定，系统控件类名可能变化'
    ],
    'parent_class': [
      '适用于子元素有意义内容但需要点击父容器的场景',
      '结合parent_resource_id使用，提高匹配精确度',
      '注意父节点层级不要过深，避免匹配不稳定'
    ],
    'first_child_text': [
      '解决按钮文字在子TextView中的常见问题',
      '适用于Material Design等现代UI框架',
      '确保子元素文本相对稳定，避免动态内容'
    ],
    'clickable': [
      '帮助区分可交互元素与静态文本',
      '结合其他字段使用，提高匹配准确性',
      '注意某些元素可能动态改变可点击状态'
    ],
    'bounds': [
      '仅适用于固定分辨率和设备的场景',
      '跨设备使用时容易失败，谨慎使用',
      '适合临时脚本或单设备专用场景'
    ]
  };

  return practices[fieldKey] || [
    '结合多个字段使用，提高匹配稳定性',
    '考虑不同设备和版本的兼容性',
    '定期验证匹配效果，及时调整策略'
  ];
}

export const FieldDescriptionPanel: React.FC<FieldDescriptionPanelProps> = ({
  fieldKey,
  onClose,
  className = ''
}) => {
  const [isExpanded, setIsExpanded] = useState(true);

  if (!fieldKey) {
    return (
      <div className={`bg-gray-50 rounded-lg p-6 text-center ${className}`}>
        <div className="text-gray-400 mb-2">
          <span className="text-3xl">📋</span>
        </div>
        <p className="text-gray-600">
          选择一个字段查看详细说明
        </p>
        <p className="text-sm text-gray-500 mt-2">
          在左侧字段列表中点击字段名称或勾选框
        </p>
      </div>
    );
  }

  const field = getFieldInfo(fieldKey);
  if (!field) {
    return (
      <div className={`bg-red-50 border border-red-200 rounded-lg p-6 text-center ${className}`}>
        <div className="text-red-400 mb-2">
          <span className="text-3xl">❌</span>
        </div>
        <p className="text-red-600 font-medium">
          字段信息未找到
        </p>
        <p className="text-sm text-red-500 mt-1">
          字段键: <code>{fieldKey}</code>
        </p>
      </div>
    );
  }

  return (
    <div className={`bg-white border border-gray-200 rounded-lg ${className}`}>
      {/* 面板头部 */}
      <div className="flex items-center justify-between p-4 border-b border-gray-200">
        <h2 className="font-semibold text-gray-800 flex items-center gap-2">
          📖 字段说明
        </h2>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="p-1 text-gray-400 hover:text-gray-600 transition-colors"
            title={isExpanded ? '收起' : '展开'}
          >
            {isExpanded ? (
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            ) : (
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            )}
          </button>
          {onClose && (
            <button
              onClick={onClose}
              className="p-1 text-gray-400 hover:text-gray-600 transition-colors"
              title="关闭"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          )}
        </div>
      </div>

      {/* 面板内容 */}
      {isExpanded && (
        <div className="p-4 max-h-96 overflow-y-auto">
          <FieldDetailCard field={field} />
        </div>
      )}
    </div>
  );
};

export default FieldDescriptionPanel;