import type { Platform } from '../types';

// 平台配置
export const PLATFORMS: Record<Platform, { name: string; color: string; icon: string }> = {
  xiaohongshu: {
    name: '小红书',
    color: 'bg-red-500',
    icon: '📕'
  },
  douyin: {
    name: '抖音',
    color: 'bg-black',
    icon: '🎵'
  },
  kuaishou: {
    name: '快手',
    color: 'bg-orange-500',
    icon: '⚡'
  },
  bilibili: {
    name: 'B站',
    color: 'bg-pink-500',
    icon: '📺'
  },
  wechat: {
    name: '微信',
    color: 'bg-green-500',
    icon: '💬'
  },
  qq: {
    name: 'QQ',
    color: 'bg-blue-500',
    icon: '🐧'
  },
  weibo: {
    name: '微博',
    color: 'bg-orange-600',
    icon: '📰'
  }
};

// 可用平台列表（按优先级排序）
export const AVAILABLE_PLATFORMS: Platform[] = ['xiaohongshu', 'douyin', 'kuaishou', 'bilibili'];

// 精准获客示例关键词
export const SAMPLE_KEYWORDS = [
  '感兴趣',
  '求推荐',
  '怎么样',
  '在哪买',
  '多少钱',
  '求链接',
  '同款',
  '种草',
  '求购',
  '推荐一下'
];

// 城市示例
export const SAMPLE_CITIES = [
  '北京', '上海', '广州', '深圳', '杭州', '南京', '苏州', '成都', '重庆', '武汉'
];

