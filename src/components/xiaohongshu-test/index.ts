/**
 * 小红书好友关注功能测试模块导出
 */

// 核心脚本和配置
export { 
  XiaohongshuAutoFollowScript, 
  XIAOHONGSHU_UI_CONFIG, 
  FollowStep,
  type FollowStepResult,
  type XiaohongshuFriend 
} from './XiaohongshuScript';

// ADB设备管理
export { 
  AdbDeviceManager, 
  adbManager, 
  KeyCodes,
  type DeviceInfo,
  type AdbCommandResult,
  type UIElement 
} from './AdbManager';

// 小红书应用管理
export { 
  XiaohongshuAppManager, 
  createXiaohongshuAppManager,
  type XiaohongshuAppStatus,
  type NavigationResult 
} from './XiaohongshuAppManager';

// UI组件
export { default as XiaohongshuFollowTest } from './XiaohongshuFollowTest';
export { default as XiaohongshuScriptTest } from './XiaohongshuScriptTest';
export { default as XiaohongshuQuickTest } from './XiaohongshuQuickTest';
export { default as XiaohongshuValidationTest } from './XiaohongshuValidationTest';

// 测试页面
export { default as XiaohongshuTestPage } from './XiaohongshuTestPage';

// 原有类型定义
export type {
  XiaohongshuContact,
  XiaohongshuFollowResult
} from './XiaohongshuFollowTest';