/**
 * 小红书好友关注功能配置
 */

export const XIAOHONGSHU_CONFIG = {
  // 默认设备配置
  DEFAULT_DEVICE: 'emulator-5556',
  
  // 关注配置
  FOLLOW_CONFIG: {
    DEFAULT_DELAY: 3000,      // 默认关注间隔 (毫秒)
    MIN_DELAY: 1000,          // 最小间隔
    MAX_DELAY: 10000,         // 最大间隔
    MAX_BATCH_SIZE: 50,       // 单次最大关注数量
    ENABLE_SCREENSHOTS: true,  // 是否启用截图
  },

  // UI配置
  UI_CONFIG: {
    LOG_MAX_LINES: 100,       // 最大日志行数
    PROGRESS_UPDATE_INTERVAL: 500, // 进度更新间隔
  },

  // 测试数据
  TEST_CONTACTS: [
    { id: '1', name: '张三', phone: '13800138001' },
    { id: '2', name: '李四', phone: '13800138002' },
    { id: '3', name: '王五', phone: '13800138003' },
    { id: '4', name: '赵六', phone: '13800138004' },
    { id: '5', name: '孙七', phone: '13800138005' },
  ],

  // API端点
  API_ENDPOINTS: {
    CHECK_APP_STATUS: 'check_xiaohongshu_app_status',
    AUTO_FOLLOW: 'xiaohongshu_auto_follow',
    NAVIGATE_TO_CONTACTS: 'navigate_to_xiaohongshu_contacts',
  },

  // 错误消息
  ERROR_MESSAGES: {
    NO_DEVICE: '请选择目标设备',
    NO_CONTACTS: '请先生成测试联系人',
    APP_NOT_FOUND: '未检测到小红书应用',
    FOLLOW_FAILED: '关注操作失败',
    NETWORK_ERROR: '网络连接错误',
  },

  // 成功消息
  SUCCESS_MESSAGES: {
    APP_DETECTED: '小红书应用检测成功',
    CONTACTS_GENERATED: '测试联系人生成成功',
    FOLLOW_STARTED: '开始执行关注操作',
    FOLLOW_COMPLETED: '关注操作完成',
  }
};

// 关注状态类型
export const FOLLOW_STATUS = {
  PENDING: 'pending' as const,
  FOLLOWING: 'following' as const,
  SUCCESS: 'success' as const,
  FAILED: 'failed' as const,
  SKIPPED: 'skipped' as const,
};

// 应用状态类型
export const APP_STATUS = {
  NOT_DETECTED: '未检测',
  DETECTING: '检测中...',
  INSTALLED: '已安装',
  RUNNING: '运行中',
  NOT_INSTALLED: '未安装',
  ERROR: '检测失败',
};