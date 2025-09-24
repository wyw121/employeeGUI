/**
 * 增强字段选择器 - 字段定义和分组配置
 * 
 * 提供完整的字段分组定义，包含所有增强字段的说明和使用场景
 * 解决网格检查器中增强字段无法自定义选择的问题
 */

export interface FieldInfo {
  key: string;                    // 字段键名
  label: string;                  // 显示名称
  description: string;            // 字段说明
  scenarios: string[];            // 适用场景
  priority: 'high' | 'medium' | 'low';  // 推荐优先级
  compatibleStrategies: string[]; // 兼容的匹配策略
  examples?: string[];            // 示例值
}

export interface FieldGroup {
  id: string;                     // 分组ID
  title: string;                  // 分组标题
  description: string;            // 分组说明
  icon: string;                   // 分组图标
  color: string;                  // 分组颜色主题
  fields: FieldInfo[];            // 包含的字段
  defaultEnabled?: boolean;       // 是否默认启用
}

// 🎯 基础字段组：传统匹配字段
export const BASIC_FIELDS_GROUP: FieldGroup = {
  id: 'basic',
  title: '基础字段',
  description: '传统的UI元素属性，适用于大多数匹配场景',
  icon: '🎯',
  color: 'blue',
  defaultEnabled: true,
  fields: [
    {
      key: 'resource-id',
      label: '资源ID',
      description: 'Android resource identifier，最稳定的匹配字段',
      scenarios: ['唯一标识', '精确匹配', '跨版本兼容'],
      priority: 'high',
      compatibleStrategies: ['absolute', 'strict', 'relaxed', 'positionless', 'standard'],
      examples: ['com.xiaohongshu:id/title', 'android:id/button1']
    },
    {
      key: 'text',
      label: '文本内容',
      description: '元素显示的文本内容，适用于按钮、标签等',
      scenarios: ['按钮点击', '文本验证', '内容查找'],
      priority: 'high',
      compatibleStrategies: ['absolute', 'strict', 'relaxed', 'positionless', 'standard'],
      examples: ['确定', 'Submit', '登录']
    },
    {
      key: 'content-desc',
      label: '内容描述',
      description: '无障碍访问描述，语义化程度高',
      scenarios: ['无障碍适配', '图标按钮', '语义匹配'],
      priority: 'medium',
      compatibleStrategies: ['absolute', 'strict', 'relaxed', 'positionless', 'standard'],
      examples: ['返回按钮', 'Share button', '搜索图标']
    },
    {
      key: 'class',
      label: '控件类型',
      description: 'Android UI控件的类名，反映元素类型',
      scenarios: ['控件类型识别', '结构匹配', '元素分类'],
      priority: 'medium',
      compatibleStrategies: ['absolute', 'strict', 'relaxed', 'positionless', 'standard'],
      examples: ['android.widget.Button', 'android.widget.TextView', 'androidx.compose.ui.text.TextView']
    },
    {
      key: 'package',
      label: '应用包名',
      description: '应用的包名，用于区分不同应用',
      scenarios: ['应用识别', '跨应用操作', '包名验证'],
      priority: 'low',
      compatibleStrategies: ['absolute', 'strict', 'relaxed', 'positionless', 'standard'],
      examples: ['com.xiaohongshu.android', 'com.tencent.mm']
    },
    {
      key: 'bounds',
      label: '位置边界',
      description: '元素在屏幕上的精确坐标位置',
      scenarios: ['精确定位', '相对位置', '坐标点击'],
      priority: 'low',
      compatibleStrategies: ['absolute'],
      examples: ['[100,200][300,250]', '[0,0][1080,200]']
    },
    {
      key: 'index',
      label: '索引位置',
      description: '元素在父容器中的索引号',
      scenarios: ['同级区分', '列表项选择', '顺序定位'],
      priority: 'low',
      compatibleStrategies: ['absolute', 'strict'],
      examples: ['0', '2', '5']
    }
  ]
};

// 👨‍👦 父节点字段组：层级向上增强
export const PARENT_FIELDS_GROUP: FieldGroup = {
  id: 'parent',
  title: '父节点字段',
  description: '向上查找父元素信息，解决子元素有文本但父容器才可点击的问题',
  icon: '👨‍👦',
  color: 'green',
  defaultEnabled: false,
  fields: [
    {
      key: 'parent_class',
      label: '父节点类型',
      description: '父元素的控件类名，反映容器类型',
      scenarios: ['容器识别', '布局匹配', '层级结构'],
      priority: 'high',
      compatibleStrategies: ['standard', 'positionless', 'relaxed'],
      examples: ['android.widget.LinearLayout', 'android.widget.RelativeLayout']
    },
    {
      key: 'parent_text',
      label: '父节点文本',
      description: '父元素包含的文本内容',
      scenarios: ['容器文本', '标题匹配', '上下文信息'],
      priority: 'medium',
      compatibleStrategies: ['standard', 'positionless', 'relaxed'],
      examples: ['设置页面', '个人中心', '消息通知']
    },
    {
      key: 'parent_resource_id',
      label: '父节点资源ID',
      description: '父元素的资源标识符，稳定性高',
      scenarios: ['容器识别', '页面区域', '模块定位'],
      priority: 'high',
      compatibleStrategies: ['standard', 'positionless', 'relaxed', 'strict'],
      examples: ['com.xiaohongshu:id/container', 'android:id/content']
    },
    {
      key: 'parent_content_desc',
      label: '父节点内容描述',
      description: '父元素的无障碍访问描述',
      scenarios: ['容器语义', '区域描述', '功能分组'],
      priority: 'medium',
      compatibleStrategies: ['standard', 'positionless', 'relaxed'],
      examples: ['导航栏', '内容区域', '操作面板']
    }
  ]
};

// 👶 子节点字段组：层级向下增强
export const CHILD_FIELDS_GROUP: FieldGroup = {
  id: 'child',
  title: '子节点字段',
  description: '向下查找子元素信息，解决父容器有文本但子元素内容更具体的问题',
  icon: '👶',
  color: 'purple',
  defaultEnabled: false,
  fields: [
    {
      key: 'first_child_text',
      label: '首个子节点文本',
      description: '第一个子元素的文本内容，常见于按钮内部文字',
      scenarios: ['按钮文字', '标签文本', '嵌套内容'],
      priority: 'high',
      compatibleStrategies: ['standard', 'positionless', 'relaxed'],
      examples: ['确认', '取消', '立即购买']
    },
    {
      key: 'first_child_content_desc',
      label: '首个子节点描述',
      description: '第一个子元素的内容描述',
      scenarios: ['子元素语义', '嵌套描述', '详细信息'],
      priority: 'medium',
      compatibleStrategies: ['standard', 'positionless', 'relaxed'],
      examples: ['主要操作按钮', '重要提示', '状态指示']
    },
    {
      key: 'first_child_resource_id',
      label: '首个子节点ID',
      description: '第一个子元素的资源标识符',
      scenarios: ['子元素识别', '组件定位', '精确查找'],
      priority: 'high',
      compatibleStrategies: ['standard', 'positionless', 'relaxed', 'strict'],
      examples: ['com.xiaohongshu:id/text_view', 'android:id/title']
    },
    {
      key: 'descendant_texts',
      label: '后代节点文本集',
      description: '所有后代元素的文本集合，支持深度搜索',
      scenarios: ['深度文本搜索', '复杂布局', '多层嵌套'],
      priority: 'medium',
      compatibleStrategies: ['standard', 'relaxed'],
      examples: ['["标题", "副标题", "详情"]', '["价格", "¥99", "立即购买"]']
    }
  ]
};

// 🎭 交互状态字段组：动态属性增强
export const INTERACTION_FIELDS_GROUP: FieldGroup = {
  id: 'interaction',
  title: '交互状态字段',
  description: '元素的交互状态属性，提供动态匹配能力',
  icon: '🎭',
  color: 'orange',
  defaultEnabled: false,
  fields: [
    {
      key: 'clickable',
      label: '可点击状态',
      description: '标识元素是否可点击，区分按钮与静态文本',
      scenarios: ['按钮识别', '交互元素', '操作区分'],
      priority: 'high',
      compatibleStrategies: ['absolute', 'strict', 'standard'],
      examples: ['true', 'false']
    },
    {
      key: 'checkable',
      label: '可选中状态',
      description: '标识元素是否可选中，如复选框、单选框',
      scenarios: ['表单控件', '选择操作', '状态切换'],
      priority: 'medium',
      compatibleStrategies: ['absolute', 'strict', 'standard'],
      examples: ['true', 'false']
    },
    {
      key: 'checked',
      label: '选中状态',
      description: '标识元素当前是否已选中',
      scenarios: ['选中验证', '状态匹配', '表单状态'],
      priority: 'medium',
      compatibleStrategies: ['absolute', 'strict', 'standard'],
      examples: ['true', 'false']
    },
    {
      key: 'scrollable',
      label: '可滚动状态',
      description: '标识元素是否可滚动，如列表、ScrollView',
      scenarios: ['列表识别', '滚动容器', '页面区域'],
      priority: 'medium',
      compatibleStrategies: ['absolute', 'strict', 'standard'],
      examples: ['true', 'false']
    },
    {
      key: 'enabled',
      label: '启用状态',
      description: '标识元素是否启用，区分可用与禁用状态',
      scenarios: ['禁用检测', '状态验证', '交互可用性'],
      priority: 'medium',
      compatibleStrategies: ['absolute', 'strict', 'standard'],
      examples: ['true', 'false']
    },
    {
      key: 'password',
      label: '密码字段',
      description: '标识是否为密码输入框，特殊输入类型',
      scenarios: ['密码输入', '安全字段', '输入类型'],
      priority: 'low',
      compatibleStrategies: ['absolute', 'strict', 'standard'],
      examples: ['true', 'false']
    }
  ]
};

// 🎪 可点击祖先字段组：智能容器查找
export const CLICKABLE_ANCESTOR_FIELDS_GROUP: FieldGroup = {
  id: 'clickable_ancestor',
  title: '可点击祖先字段',
  description: '向上查找最近的可点击容器，实现智能点击目标识别',
  icon: '🎪',
  color: 'red',
  defaultEnabled: false,
  fields: [
    {
      key: 'clickable_ancestor_class',
      label: '可点击祖先类型',
      description: '最近的可点击祖先元素的类名',
      scenarios: ['智能点击', '容器定位', '层级点击'],
      priority: 'high',
      compatibleStrategies: ['standard', 'positionless', 'relaxed'],
      examples: ['android.widget.Button', 'android.widget.LinearLayout']
    },
    {
      key: 'clickable_ancestor_resource_id',
      label: '可点击祖先ID',
      description: '最近的可点击祖先元素的资源标识符',
      scenarios: ['精确容器', '智能定位', '稳定匹配'],
      priority: 'high',
      compatibleStrategies: ['standard', 'positionless', 'relaxed', 'strict'],
      examples: ['com.xiaohongshu:id/item_container', 'android:id/button']
    },
    {
      key: 'clickable_ancestor_text',
      label: '可点击祖先文本',
      description: '最近的可点击祖先元素的文本内容',
      scenarios: ['容器文本', '按钮组识别', '文本容器'],
      priority: 'medium',
      compatibleStrategies: ['standard', 'positionless', 'relaxed'],
      examples: ['设置项', '菜单选项', '操作按钮']
    }
  ]
};

// 📋 所有字段组集合
export const ALL_FIELD_GROUPS: FieldGroup[] = [
  BASIC_FIELDS_GROUP,
  PARENT_FIELDS_GROUP,
  CHILD_FIELDS_GROUP,
  INTERACTION_FIELDS_GROUP,
  CLICKABLE_ANCESTOR_FIELDS_GROUP
];

// 🎯 根据策略获取推荐的字段组
export function getRecommendedGroupsForStrategy(strategy: string): string[] {
  const recommendations: Record<string, string[]> = {
    'absolute': ['basic', 'interaction'],
    'strict': ['basic', 'parent', 'interaction'],
    'relaxed': ['basic', 'parent', 'child'],
    'positionless': ['basic', 'parent', 'child'],
    'standard': ['basic', 'child', 'parent'],
    'custom': [] // 自定义策略不推荐特定组
  };
  
  return recommendations[strategy] || ['basic'];
}

// 🔍 根据字段键查找字段信息
export function getFieldInfo(fieldKey: string): FieldInfo | null {
  for (const group of ALL_FIELD_GROUPS) {
    const field = group.fields.find(f => f.key === fieldKey);
    if (field) return field;
  }
  return null;
}

// 📊 获取字段使用统计和推荐
export function analyzeFieldUsage(selectedFields: string[]): {
  groupStats: Record<string, number>;
  missingRecommended: FieldInfo[];
  unusedHighPriority: FieldInfo[];
} {
  const groupStats: Record<string, number> = {};
  const selectedFieldsSet = new Set(selectedFields);
  
  // 统计各组使用情况
  ALL_FIELD_GROUPS.forEach(group => {
    const usedCount = group.fields.filter(f => selectedFieldsSet.has(f.key)).length;
    groupStats[group.id] = usedCount;
  });
  
  // 查找缺失的高优先级字段
  const missingRecommended = ALL_FIELD_GROUPS
    .flatMap(g => g.fields)
    .filter(f => f.priority === 'high' && !selectedFieldsSet.has(f.key));
    
  // 查找未使用的高优先级字段
  const unusedHighPriority = ALL_FIELD_GROUPS
    .flatMap(g => g.fields)
    .filter(f => f.priority === 'high' && !selectedFieldsSet.has(f.key));
  
  return {
    groupStats,
    missingRecommended,
    unusedHighPriority
  };
}