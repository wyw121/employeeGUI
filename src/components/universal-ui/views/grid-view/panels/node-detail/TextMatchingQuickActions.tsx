/**
 * TextMatchingQuickActions.tsx
 * 文本匹配快捷操作按钮组件
 */

import React from 'react';
import styles from '../../GridElementView.module.css';

export interface TextMatchingQuickActionsProps {
  field: string;
  currentValue: string;
  onSetValue: (value: string) => void;
  excludes: string[];
  onChangeExcludes: (excludes: string[]) => void;
}

/**
 * 为文本字段提供快捷匹配操作
 * 特别是"不包含通配按钮"功能
 */
export const TextMatchingQuickActions: React.FC<TextMatchingQuickActionsProps> = ({
  field,
  currentValue,
  onSetValue,
  excludes,
  onChangeExcludes
}) => {
  // 只对文本相关字段显示
  const isTextField = ['text', 'content-desc'].includes(field);
  if (!isTextField) return null;

  const handleExactMatchOnly = () => {
    if (!currentValue.trim()) return;
    
    // 分析当前值，提取核心词汇
    const coreText = currentValue.trim();
    
    // 生成常见的"包含但不等于"的模式
    const commonSuffixes = ['我', '他', '她', '吧', '啊', '呢', '的', '了', '着'];
    const commonPrefixes = ['请', '来', '快', '赶紧', '一起'];
    
    const newExcludes = [...excludes];
    
    // 添加后缀变体到排除列表
    commonSuffixes.forEach(suffix => {
      const variant = coreText + suffix;
      if (!newExcludes.includes(variant) && variant !== coreText) {
        newExcludes.push(variant);
      }
    });
    
    // 添加前缀变体到排除列表
    commonPrefixes.forEach(prefix => {
      const variant = prefix + coreText;
      if (!newExcludes.includes(variant) && variant !== coreText) {
        newExcludes.push(variant);
      }
    });
    
    onChangeExcludes(newExcludes);
  };

  const handleCleanExactText = () => {
    if (!currentValue.trim()) return;
    
    // 智能提取纯文本（去掉常见后缀）
    const text = currentValue.trim();
    const commonSuffixes = ['我', '他', '她', '吧', '啊', '呢', '的', '了', '着', '一下', '看看'];
    const commonPrefixes = ['请', '来', '快', '赶紧', '一起', '马上'];
    
    let cleanText = text;
    
    // 移除后缀
    for (const suffix of commonSuffixes) {
      if (cleanText.endsWith(suffix) && cleanText.length > suffix.length) {
        cleanText = cleanText.slice(0, -suffix.length);
        break;
      }
    }
    
    // 移除前缀
    for (const prefix of commonPrefixes) {
      if (cleanText.startsWith(prefix) && cleanText.length > prefix.length) {
        cleanText = cleanText.slice(prefix.length);
        break;
      }
    }
    
    if (cleanText !== text) {
      onSetValue(cleanText);
    }
  };

  const handleAddCommonExcludes = () => {
    // 为"关注"场景添加常见的排除项
    const commonExcludePatterns = [
      currentValue + '我',
      currentValue + '他',  
      currentValue + '她',
      currentValue + '吧',
      '来' + currentValue,
      '请' + currentValue,
      currentValue + '一下'
    ];
    
    const newExcludes = [...excludes];
    commonExcludePatterns.forEach(pattern => {
      if (!newExcludes.includes(pattern) && pattern !== currentValue) {
        newExcludes.push(pattern);
      }
    });
    
    onChangeExcludes(newExcludes);
  };

  return (
    <div className="flex flex-wrap gap-2 mt-1">
      <div className="text-xs text-neutral-500 w-full mb-1">快捷操作：</div>
      
      <button
        type="button"
        className={`${styles.btn} text-xs`}
        onClick={handleCleanExactText}
        title="智能提取核心文本（去除常见前后缀）"
      >
        📝 提取核心词
      </button>
      
      <button
        type="button"
        className={`${styles.btn} text-xs`}
        onClick={handleExactMatchOnly}
        title="仅匹配精确文本，排除带前后缀的变体"
      >
        🎯 精确匹配
      </button>
      
      <button
        type="button"
        className={`${styles.btn} text-xs`}
        onClick={handleAddCommonExcludes}
        title="添加常见的不匹配模式（如：关注我、来关注等）"
      >
        🚫 排除变体
      </button>
      
      {excludes.length > 0 && (
        <button
          type="button"
          className={`${styles.btn} text-xs text-red-600`}
          onClick={() => onChangeExcludes([])}
          title="清空所有排除条件"
        >
          🗑️ 清空排除
        </button>
      )}
    </div>
  );
};

export default TextMatchingQuickActions;