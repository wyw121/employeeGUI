import type { ElementPreset } from './types';
import type { MatchCriteria, MatchStrategy } from '../types';
import { PRESET_FIELDS } from '../helpers';

// 小工具：提取 resource-id 末段
const lastSegment = (s?: string) => (s || '').split(/[\/:]/).filter(Boolean).pop() || '';

export const ELEMENT_PRESETS: ElementPreset[] = [
  {
    id: 'follow_button',
    label: '关注按钮',
    description: '适配小红书关注按钮，基于子节点文本匹配，跨设备稳健',
    hints: ['标准策略', '子节点文本增强', 'package+class+子文本组合', '排除已关注状态'],
    buildCriteria: ({ node }) => {
      if (!node) return null;
      const attrs = node.attrs || {};
      const strategy: MatchStrategy = 'standard';
      
      // 专门为小红书关注按钮优化的字段组合
      const fields = [
        'package',           // 固定: com.xingin.xhs
        'class',             // FrameLayout
        'clickable',         // true
        'first_child_text',  // 子节点的"关注"文本
        'first_child_class'  // 子节点的TextView类
      ];
      
      const values: Record<string, string> = {};
      fields.forEach(f => { 
        if (attrs[f]) values[f] = String(attrs[f]); 
      });

      // 包含/排除条件：针对小红书关注按钮优化
      const includes: Record<string, string[]> = {};
      const excludes: Record<string, string[]> = {};

      // 关键：子节点文本必须包含"关注"
      includes['first_child_text'] = ['关注'];
      
      // 包名必须是小红书
      if (attrs['package']) {
        includes['package'] = ['com.xingin.xhs'];
      }
      
      // 类名必须包含FrameLayout（关注按钮的容器）
      if (attrs['class']) {
        includes['class'] = ['FrameLayout'];
      }
      
      // 排除已关注/关注中等状态
      excludes['first_child_text'] = ['已关注', '关注中', '已拉黑', '取消关注'];

      return {
        strategy,
        fields,
        values,
        includes,
        excludes,
      } satisfies MatchCriteria;
    }
  },
];