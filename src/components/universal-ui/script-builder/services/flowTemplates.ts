// Flow 模板与类型：从 FlowScriptBuilder.tsx 抽离
// 仅包含数据与类型；无 React 依赖
import React from 'react';

export interface FlowTemplate {
  id: string;
  name: string;
  description: string;
  icon: React.ReactNode;
  color: string;
  steps: FlowStepTemplate[];
}

export interface FlowStepTemplate {
  id: string;
  name: string;
  description: string;
  type: 'app_open' | 'navigation' | 'interaction' | 'condition' | 'wait';
  app?: string;
  action?: string;
  nextSteps?: string[];
  xmlCondition?: string;
  parameters?: Record<string, any>;
}

export interface FlowBuilderStep {
  id: string;
  templateId: string;
  name: string;
  description: string;
  order: number;
  parameters: Record<string, any>;
  completed: boolean;
}

// 小红书模板
import { HeartOutlined, MessageOutlined } from '@ant-design/icons';

export const XIAOHONGSHU_TEMPLATE: FlowTemplate = {
  id: 'xiaohongshu',
  name: '小红书自动化',
  description: '小红书应用相关自动化流程',
  icon: React.createElement(HeartOutlined, { style: { color: '#ff4757' } }),
  color: '#ff4757',
  steps: [
    { id: 'xhs_open_app', name: '打开小红书APP', description: '启动小红书应用到首页', type: 'app_open', app: 'com.xingin.xhs', nextSteps: ['xhs_open_sidebar', 'xhs_search', 'xhs_browse_home'] },
    { id: 'xhs_open_sidebar', name: '打开侧边栏', description: '点击左上角头像打开侧边栏菜单', type: 'navigation', action: 'click_sidebar', xmlCondition: 'resource-id="com.xingin.xhs:id/avatar"', nextSteps: ['xhs_find_friends', 'xhs_my_profile', 'xhs_settings'] },
    { id: 'xhs_find_friends', name: '发现好友', description: '点击发现好友功能', type: 'interaction', action: 'click_find_friends', xmlCondition: 'text="发现好友"', nextSteps: ['xhs_import_contacts', 'xhs_search_friends'] },
    { id: 'xhs_import_contacts', name: '导入通讯录', description: '导入手机通讯录联系人', type: 'interaction', action: 'import_contacts', nextSteps: ['xhs_follow_contacts'] },
    { id: 'xhs_follow_contacts', name: '关注联系人', description: '批量关注导入的联系人', type: 'interaction', action: 'follow_contacts', nextSteps: [] },
    { id: 'xhs_search', name: '搜索功能', description: '使用搜索功能查找内容', type: 'interaction', action: 'search', nextSteps: ['xhs_search_users', 'xhs_search_content'] },
    { id: 'xhs_search_users', name: '搜索用户', description: '搜索特定用户', type: 'interaction', action: 'search_users', nextSteps: ['xhs_follow_user'] },
    { id: 'xhs_follow_user', name: '关注用户', description: '关注搜索到的用户', type: 'interaction', action: 'follow_user', nextSteps: [] },
    { id: 'xhs_browse_home', name: '浏览首页', description: '浏览首页推荐内容', type: 'interaction', action: 'browse_home', nextSteps: ['xhs_like_posts', 'xhs_comment_posts'] },
    { id: 'xhs_like_posts', name: '点赞内容', description: '为感兴趣的内容点赞', type: 'interaction', action: 'like_posts', nextSteps: [] },
    { id: 'xhs_comment_posts', name: '评论互动', description: '对内容进行评论互动', type: 'interaction', action: 'comment_posts', nextSteps: [] }
  ]
};

export const APP_TEMPLATES: FlowTemplate[] = [
  XIAOHONGSHU_TEMPLATE,
  {
    id: 'wechat',
    name: '微信自动化',
    description: '微信应用相关自动化流程',
    icon: React.createElement(MessageOutlined, { style: { color: '#07c160' } }),
    color: '#07c160',
    steps: [
      { id: 'wechat_open_app', name: '打开微信APP', description: '启动微信应用', type: 'app_open', app: 'com.tencent.mm', nextSteps: ['wechat_contacts', 'wechat_moments'] },
      { id: 'wechat_contacts', name: '通讯录', description: '打开通讯录页面', type: 'navigation', action: 'open_contacts', nextSteps: ['wechat_add_friend'] },
      { id: 'wechat_add_friend', name: '添加好友', description: '添加新的微信好友', type: 'interaction', action: 'add_friend', nextSteps: [] }
    ]
  }
];
