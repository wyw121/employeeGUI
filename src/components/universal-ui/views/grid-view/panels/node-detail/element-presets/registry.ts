import type { ElementPreset } from './types';
import type { MatchCriteria, MatchStrategy } from '../types';

export const ELEMENT_PRESETS: ElementPreset[] = [
  {
    id: 'follow_button',
    label: '关注按钮',
    description: '适配小红书等社交 App 的"关注"按钮，基于真实XML优化',
    hints: ['标准策略匹配', '使用子节点文本', '排除已关注状态', '跨设备兼容'],
    buildCriteria: ({ node }) => {
      // 允许在没有选中节点时也提供合理的默认预设，便于在步骤卡中直接使用
      if (!node) {
        const fields = ['package', 'class', 'clickable', 'first_child_text', 'first_child_class'];
        const values: Record<string, string> = {
          'package': 'com.xingin.xhs',
          'class': 'android.widget.FrameLayout',
          'clickable': 'true',
          'first_child_text': '关注',
          'first_child_class': 'android.widget.TextView',
        };
        const includes: Record<string, string[]> = {
          'package': ['com.xingin.xhs'],
          'first_child_text': ['关注'],
          'class': ['FrameLayout'],
        };
        const excludes: Record<string, string[]> = {
          'first_child_text': ['已关注', '关注中', '已拉黑', '取消关注'],
        };
        return { strategy: 'standard', fields, values, includes, excludes };
      }
      const strategy: MatchStrategy = 'standard';
      
      // 基于真实XML分析的字段组合：package, class, clickable, first_child_text, first_child_class
      const fields = ['package', 'class', 'clickable', 'first_child_text', 'first_child_class'];
      const values: Record<string, string> = {
        'package': 'com.xingin.xhs',
        'class': 'android.widget.FrameLayout', 
        'clickable': 'true',
        'first_child_text': '关注',
        'first_child_class': 'android.widget.TextView',
      };

      // 基于真实结构的包含/排除条件
      const includes: Record<string, string[]> = {
        'package': ['com.xingin.xhs'],
        'first_child_text': ['关注'],
        'class': ['FrameLayout'],
      };
      const excludes: Record<string, string[]> = {
        'first_child_text': ['已关注', '关注中', '已拉黑', '取消关注'],
      };

      return {
        strategy,
        fields,
        values,
        includes,
        excludes,
      } satisfies MatchCriteria;
    }
  },
  
  // 通用社交按钮预设 - 适配多种APP的社交功能按钮
  {
    id: 'universal_social_button',
    label: '通用社交按钮',
    description: '通用的社交功能按钮预设，适用于关注、删除好友、添加好友等多种场景',
    hints: ['跨APP兼容', '动态文本匹配', '智能排除已操作状态', '灵活字段组合'],
    buildCriteria: ({ node }) => {
      if (!node) {
        // 无节点时的通用默认：在步骤卡中可直接选择使用
        const fields = [
          'class',
          'clickable',
          'text',
          'first_child_text',
        ];
        const values: Record<string, string> = {
          'clickable': 'true',
        };
        const socialTexts = [
          '关注','添加好友','删除好友','移除好友','加关注','取消关注','私聊','发消息','聊天','邀请','拉黑','举报','分享','收藏','点赞','评论','转发','投票','订阅',
          'Follow','Unfollow','Add Friend','Remove Friend','Delete Friend','Message','Chat','Share','Like','Comment','Subscribe',
          '确定','确认','取消','删除','移除','添加'
        ];
        const includes: Record<string, string[]> = {
          text: socialTexts,
          first_child_text: socialTexts,
        };
        const excludes: Record<string, string[]> = {
          text: ['已关注','已添加','已删除','已移除','已拉黑','已发送','已收藏','已点赞','已订阅','已完成','Following','Added','Sent','Done','Completed'],
          first_child_text: ['已关注','已添加','已删除','已移除','已拉黑','已发送','已收藏','已点赞','已订阅','已完成','Following','Added','Sent','Done','Completed'],
          clickable: ['false'],
          class: ['android.view.View','android.widget.ImageView']
        };
        return { strategy: 'standard', fields, values, includes, excludes };
      }
      const attrs = node.attrs || {};
      const strategy: MatchStrategy = 'standard';
      
      // 通用字段组合：支持多种识别方式
      const fields = [
        'package',           // 应用包名（用于APP区分）
        'class',             // 控件类型
        'clickable',         // 可点击属性
        'text',              // 按钮文本（优先）
        'first_child_text',  // 子节点文本（备选）
        'content-desc',      // 无障碍描述
        'resource-id',       // 资源ID（如果有）
      ];
      
      // 根据当前节点属性动态填充值
      const values: Record<string, string> = {};
      if (attrs.package) values.package = attrs.package;
      if (attrs.class) values.class = attrs.class;
      if (attrs.clickable) values.clickable = attrs.clickable;
      if (attrs.text) values.text = attrs.text;
      if (attrs['first_child_text']) values.first_child_text = attrs['first_child_text'];
      if (attrs['content-desc']) values['content-desc'] = attrs['content-desc'];
      if (attrs['resource-id']) values['resource-id'] = attrs['resource-id'];

      // 动态包含条件：基于常见社交按钮文本
      const includes: Record<string, string[]> = {};
      
      // 如果有包名，限制在当前APP
      if (attrs.package) {
        includes.package = [attrs.package];
      }
      
      // 动态文本匹配：根据当前按钮文本设置包含条件
      const socialButtonTexts = [
        // 中文社交操作
        '关注', '添加好友', '删除好友', '移除好友', '加关注', '取消关注',
        '私聊', '发消息', '聊天', '邀请', '拉黑', '举报', '分享',
        '收藏', '点赞', '评论', '转发', '投票', '订阅',
        // 英文社交操作
        'Follow', 'Unfollow', 'Add Friend', 'Remove Friend', 'Delete Friend',
        'Message', 'Chat', 'Share', 'Like', 'Comment', 'Subscribe',
        // 常见按钮形式
        '确定', '确认', '取消', '删除', '移除', '添加'
      ];
      
      // 检测当前按钮文本，设置相应的包含条件
      const currentText = attrs.text || attrs['first_child_text'] || '';
      if (currentText) {
        // 优先使用确切的文本匹配
        if (attrs.text) {
          includes.text = [currentText];
        } else if (attrs['first_child_text']) {
          includes.first_child_text = [currentText];
        }
      } else {
        // 如果没有具体文本，使用通用社交按钮文本列表
        if (attrs.text !== undefined) {
          includes.text = socialButtonTexts;
        }
        if (attrs['first_child_text'] !== undefined) {
          includes.first_child_text = socialButtonTexts;
        }
      }
      
      // 通用排除条件：避免匹配已操作状态
      const excludes: Record<string, string[]> = {
        // 排除已完成状态的文本
        text: [
          '已关注', '已添加', '已删除', '已移除', '已拉黑', 
          '已发送', '已收藏', '已点赞', '已订阅', '已完成',
          'Following', 'Added', 'Sent', 'Done', 'Completed'
        ],
        first_child_text: [
          '已关注', '已添加', '已删除', '已移除', '已拉黑',
          '已发送', '已收藏', '已点赞', '已订阅', '已完成',
          'Following', 'Added', 'Sent', 'Done', 'Completed'
        ],
        // 排除禁用状态
        clickable: ['false'],
        // 排除系统界面元素
        class: [
          'android.view.View', // 通用视图（通常不可交互）
          'android.widget.ImageView' // 纯图片（除非特殊情况）
        ]
      };

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