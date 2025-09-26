export interface ActionConfig {
  icon: string;
  name: string;
  color: string;
  category: string;
}

export const SMART_ACTION_CONFIGS: Record<string, ActionConfig> = {
  smart_find_element: { icon: '🎯', name: '智能元素查找', color: 'blue', category: '定位' },
  batch_match: { icon: '🔍', name: '批量匹配', color: 'purple', category: '定位' },
  smart_click: { icon: '👆', name: '智能点击', color: 'green', category: '交互' },
  smart_input: { icon: '✏️', name: '智能输入', color: 'orange', category: '输入' },
  smart_scroll: { icon: '📜', name: '智能滚动', color: 'purple', category: '导航' },
  smart_wait: { icon: '⏰', name: '智能等待', color: 'cyan', category: '控制' },
  smart_extract: { icon: '📤', name: '智能提取', color: 'red', category: '数据' },
  smart_verify: { icon: '✅', name: '智能验证', color: 'geekblue', category: '验证' },
  loop_start: { icon: '🔄', name: '循环开始', color: 'blue', category: '循环' },
  loop_end: { icon: '🏁', name: '循环结束', color: 'blue', category: '循环' },
  contact_generate_vcf: { icon: '📇', name: '生成VCF文件', color: 'gold', category: '通讯录' },
  contact_import_to_device: { icon: '⚙️', name: '导入联系人到设备', color: 'orange', category: '通讯录' },
};

export const DEFAULT_ACTION_CONFIG: ActionConfig = {
  icon: '⚙️',
  name: '未知操作',
  color: 'default',
  category: '其他',
};
