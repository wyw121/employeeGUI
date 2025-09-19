/**
 * XML字段分析器
 * 基于Android XML UI元素实际提供的字段进行分析和配置
 */

// Android UI Dump XML 提供的常见字段分析
export interface AndroidXMLFields {
  // 基础文本信息
  text: string;                    // 显示的文本内容
  'content-desc': string;          // 内容描述，用于无障碍访问
  
  // 标识和类型
  'resource-id': string;           // 资源ID，如 "com.xingin.xhs:id/xxx"
  class: string;                   // 元素类名，如 "android.widget.Button"
  package: string;                 // 包名，如 "com.xingin.xhs"
  
  // 位置和尺寸
  bounds: string;                  // 边界坐标，如 "[0,0][1080,1920]"
  index: string;                   // 在父容器中的索引位置
  
  // 交互属性
  clickable: 'true' | 'false';     // 是否可点击
  'long-clickable': 'true' | 'false'; // 是否可长按
  scrollable: 'true' | 'false';    // 是否可滚动
  focusable: 'true' | 'false';     // 是否可聚焦
  enabled: 'true' | 'false';       // 是否启用
  selected: 'true' | 'false';      // 是否被选中
  
  // 表单属性
  checkable: 'true' | 'false';     // 是否可勾选
  checked: 'true' | 'false';       // 是否已勾选
  password: 'true' | 'false';      // 是否是密码字段
  
  // 状态属性
  focused: 'true' | 'false';       // 是否已聚焦
}

// 字段配置信息
export interface FieldConfig {
  key: keyof AndroidXMLFields;
  label: string;
  englishLabel: string;
  description: string;
  type: 'text' | 'boolean' | 'identifier' | 'coordinates' | 'number';
  importance: 'high' | 'medium' | 'low';
  matchWeight: number;             // 匹配权重 (0-100)
  commonValues?: string[];         // 常见值示例
  isIdentifier: boolean;           // 是否为标识符
  isInteractive: boolean;          // 是否为交互属性
}

// Android XML字段完整配置
export const ANDROID_XML_FIELD_CONFIG: FieldConfig[] = [
  // 🔥 高重要性字段 - 用于精确匹配
  {
    key: 'text',
    label: '文本内容',
    englishLabel: 'text',
    description: '元素显示的实际文本内容',
    type: 'text',
    importance: 'high',
    matchWeight: 30,
    commonValues: ['首页', '发现', '市集', '消息', '我', '搜索', '发布'],
    isIdentifier: true,
    isInteractive: false
  },
  {
    key: 'resource-id',
    label: '资源标识',
    englishLabel: 'resource_id',
    description: 'Android资源ID，最精确的元素标识符',
    type: 'identifier',
    importance: 'high',
    matchWeight: 25,
    commonValues: ['com.xingin.xhs:id/main_tab', 'android:id/content'],
    isIdentifier: true,
    isInteractive: false
  },
  {
    key: 'content-desc',
    label: '内容描述',
    englishLabel: 'content_desc',
    description: '无障碍内容描述，通常包含完整的元素信息',
    type: 'text',
    importance: 'high',
    matchWeight: 20,
    commonValues: ['首页', '搜索', '发布按钮', '用户头像'],
    isIdentifier: true,
    isInteractive: false
  },
  
  // 🟡 中等重要性字段 - 用于辅助匹配
  {
    key: 'class',
    label: '元素类型',
    englishLabel: 'element_type',
    description: 'Android控件类名，确定元素类型',
    type: 'identifier',
    importance: 'medium',
    matchWeight: 15,
    commonValues: ['android.widget.Button', 'android.widget.TextView', 'android.widget.ImageView'],
    isIdentifier: true,
    isInteractive: false
  },
  {
    key: 'clickable',
    label: '可点击性',
    englishLabel: 'clickable',
    description: '元素是否可以被点击操作',
    type: 'boolean',
    importance: 'medium',
    matchWeight: 10,
    commonValues: ['true', 'false'],
    isIdentifier: false,
    isInteractive: true
  },
  {
    key: 'bounds',
    label: '边界坐标',
    englishLabel: 'bounds',
    description: '元素的屏幕坐标位置，格式: [left,top][right,bottom]',
    type: 'coordinates',
    importance: 'medium',
    matchWeight: 8,
    commonValues: ['[0,0][1080,192]', '[24,204][528,876]'],
    isIdentifier: false,
    isInteractive: false
  },
  {
    key: 'index',
    label: '索引位置',
    englishLabel: 'index',
    description: '在父容器中的位置索引',
    type: 'number',
    importance: 'medium',
    matchWeight: 5,
    commonValues: ['0', '1', '2'],
    isIdentifier: false,
    isInteractive: false
  },
  
  // 🔵 低重要性字段 - 用于验证和补充
  {
    key: 'enabled',
    label: '启用状态',
    englishLabel: 'enabled',
    description: '元素是否处于可用状态',
    type: 'boolean',
    importance: 'low',
    matchWeight: 3,
    commonValues: ['true', 'false'],
    isIdentifier: false,
    isInteractive: true
  },
  {
    key: 'focusable',
    label: '可聚焦性',
    englishLabel: 'focusable',
    description: '元素是否可以获得焦点',
    type: 'boolean',
    importance: 'low',
    matchWeight: 3,
    commonValues: ['true', 'false'],
    isIdentifier: false,
    isInteractive: true
  },
  {
    key: 'scrollable',
    label: '可滚动性',
    englishLabel: 'scrollable',
    description: '元素是否支持滚动操作',
    type: 'boolean',
    importance: 'low',
    matchWeight: 3,
    commonValues: ['true', 'false'],
    isIdentifier: false,
    isInteractive: true
  },
  {
    key: 'long-clickable',
    label: '可长按性',
    englishLabel: 'long_clickable',
    description: '元素是否支持长按操作',
    type: 'boolean',
    importance: 'low',
    matchWeight: 2,
    commonValues: ['true', 'false'],
    isIdentifier: false,
    isInteractive: true
  },
  {
    key: 'selected',
    label: '选中状态',
    englishLabel: 'selected',
    description: '元素是否处于选中状态',
    type: 'boolean',
    importance: 'low',
    matchWeight: 2,
    commonValues: ['true', 'false'],
    isIdentifier: false,
    isInteractive: true
  },
  {
    key: 'package',
    label: '应用包名',
    englishLabel: 'package',
    description: 'Android应用包名标识',
    type: 'identifier',
    importance: 'low',
    matchWeight: 1,
    commonValues: ['com.xingin.xhs', 'com.android.systemui'],
    isIdentifier: true,
    isInteractive: false
  },
  {
    key: 'checkable',
    label: '可勾选性',
    englishLabel: 'checkable',
    description: '元素是否可以被勾选',
    type: 'boolean',
    importance: 'low',
    matchWeight: 1,
    commonValues: ['true', 'false'],
    isIdentifier: false,
    isInteractive: true
  },
  {
    key: 'checked',
    label: '勾选状态',
    englishLabel: 'checked',
    description: '元素是否已被勾选',
    type: 'boolean',
    importance: 'low',
    matchWeight: 1,
    commonValues: ['true', 'false'],
    isIdentifier: false,
    isInteractive: true
  },
  {
    key: 'password',
    label: '密码字段',
    englishLabel: 'password',
    description: '是否为密码输入字段',
    type: 'boolean',
    importance: 'low',
    matchWeight: 1,
    commonValues: ['true', 'false'],
    isIdentifier: false,
    isInteractive: false
  },
  {
    key: 'focused',
    label: '焦点状态',
    englishLabel: 'focused',
    description: '元素是否当前获得焦点',
    type: 'boolean',
    importance: 'low',
    matchWeight: 1,
    commonValues: ['true', 'false'],
    isIdentifier: false,
    isInteractive: true
  }
];

/**
 * 解析bounds坐标字符串
 */
export const parseBounds = (boundsStr: string): { left: number; top: number; right: number; bottom: number } | null => {
  const match = boundsStr.match(/\[(\d+),(\d+)\]\[(\d+),(\d+)\]/);
  if (!match) return null;
  
  return {
    left: parseInt(match[1]),
    top: parseInt(match[2]),
    right: parseInt(match[3]),
    bottom: parseInt(match[4])
  };
};

/**
 * 格式化字段值显示
 */
export const formatFieldValue = (field: FieldConfig, value: string): string => {
  if (!value) return '空值';
  
  switch (field.type) {
    case 'boolean':
      return value === 'true' ? '是' : '否';
    case 'coordinates':
      const bounds = parseBounds(value);
      return bounds ? `(${bounds.left},${bounds.top}) - (${bounds.right},${bounds.bottom})` : value;
    case 'identifier':
      // 简化显示长标识符
      if (field.key === 'resource-id') {
        return value.includes(':id/') ? value.split(':id/')[1] : value;
      }
      if (field.key === 'class') {
        return value.split('.').pop() || value;
      }
      return value;
    default:
      return value.length > 30 ? value.substring(0, 30) + '...' : value;
  }
};

/**
 * 获取字段重要性颜色
 */
export const getFieldImportanceColor = (importance: 'high' | 'medium' | 'low'): string => {
  switch (importance) {
    case 'high': return 'red';
    case 'medium': return 'orange';
    case 'low': return 'blue';
    default: return 'default';
  }
};

/**
 * 获取推荐的默认启用字段
 */
export const getDefaultEnabledFields = (): Array<keyof AndroidXMLFields> => {
  return ANDROID_XML_FIELD_CONFIG
    .filter(config => config.importance === 'high' || 
      (config.importance === 'medium' && config.matchWeight >= 10))
    .map(config => config.key);
};