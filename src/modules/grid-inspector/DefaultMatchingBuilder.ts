/**
 * 构建网格检查器可用的匹配配置（前端态）
 * 输入为可视化/通用 UI 元素（包含常见字段），输出 { strategy, fields, values }
 * - 策略默认使用 standard
 * - 字段优先级：resource-id > text > content-desc > class > bounds
 * - 父节点字段：parent_class > parent_text > parent_resource_id（增强匹配精确度）
 */
export interface ElementLike {
  resource_id?: string;
  text?: string;
  content_desc?: string;
  class_name?: string;
  bounds?: string;
  
  // 🆕 父节点匹配字段，用于层级查询
  parent_class?: string;      // 父节点类名（高优先级）
  parent_text?: string;       // 父节点文本内容
  parent_resource_id?: string; // 父节点资源 ID
  parent_content_desc?: string; // 父节点内容描述
  
  // 🆕 可点击祖先字段（用于父节点点击匹配）
  clickable_ancestor_class?: string;       // 最近可点击祖先的类名
  clickable_ancestor_resource_id?: string; // 最近可点击祖先的资源ID
  clickable_ancestor_text?: string;        // 最近可点击祖先的文本
  
  // 🆕 交互状态字段（增强匹配精度）
  clickable?: string;         // "true"/"false" - 是否可点击
  enabled?: string;           // "true"/"false" - 是否启用
  scrollable?: string;        // "true"/"false" - 是否可滚动
  checked?: string;           // "true"/"false" - 选中状态
  checkable?: string;         // "true"/"false" - 是否可选中
  password?: string;          // "true"/"false" - 是否为密码框
  index?: string;             // "0","1","2" - 在父节点中的索引
  
  // 🆕 子节点字段（解决子容器有意义文本问题）
  first_child_text?: string;       // 第一个子节点的文本（最常见：按钮文本在子TextView中）
  first_child_content_desc?: string; // 第一个子节点的内容描述
  first_child_resource_id?: string;  // 第一个子节点的资源ID
  descendant_texts?: string[];       // 所有后代节点的文本集合（用于深度搜索）
}

export interface BuiltMatching {
  strategy: string;
  fields: string[];
  values: Record<string, string>;
}

export function buildDefaultMatchingFromElement(el: ElementLike): BuiltMatching {
  const values: Record<string, string> = {};
  const fields: string[] = [];

  const push = (field: string, val?: string) => {
    if (!val) return false;
    if (String(val).trim() === '') return false;
    fields.push(field);
    values[field] = String(val);
    return true;
  };

  // 🎯 智能字段选择策略：
  // 1. 优先级：resource-id > text > content-desc > class > bounds
  // 2. 父节点增强：parent_resource_id > parent_class > parent_text > parent_content_desc
  // 3. 交互状态增强：clickable, checked, scrollable, password, enabled
  // 4. 确保至少有2个有效语义字段，提升匹配稳定性

  let semanticFieldCount = 0;
  let parentFieldCount = 0;
  
  // 资源 id 优先（通常最稳定）
  if (push('resource-id', el.resource_id)) {
    semanticFieldCount++;
  }
  
  // 文本内容（高优先级，但要过滤无意义文本）
  if (el.text && isValidText(el.text)) {
    if (push('text', el.text)) {
      semanticFieldCount++;
    }
  }
  
  // content-desc（语义描述）
  if (el.content_desc && isValidContentDesc(el.content_desc)) {
    if (push('content-desc', el.content_desc)) {
      semanticFieldCount++;
    }
  }
  
  // 类名（结构信息，增强匹配准确性）
  if (el.class_name && isValidClassName(el.class_name)) {
    if (push('class', el.class_name)) {
      semanticFieldCount++;
    }
  }

  // 🆕 父节点字段（层级匹配增强）
  // 父节点资源 ID（最高优先级父节点信息）
  if (push('parent_resource_id', el.parent_resource_id)) {
    parentFieldCount++;
    semanticFieldCount++; // 父节点字段也算作语义字段
  }
  
  // 父节点类名（结构层级信息）
  if (el.parent_class && isValidClassName(el.parent_class)) {
    if (push('parent_class', el.parent_class)) {
      parentFieldCount++;
      semanticFieldCount++;
    }
  }
  
  // 父节点文本（上下文语义）
  if (el.parent_text && isValidText(el.parent_text)) {
    if (push('parent_text', el.parent_text)) {
      parentFieldCount++;
      semanticFieldCount++;
    }
  }
  
  // 父节点内容描述
  if (el.parent_content_desc && isValidContentDesc(el.parent_content_desc)) {
    if (push('parent_content_desc', el.parent_content_desc)) {
      parentFieldCount++;
      semanticFieldCount++;
    }
  }

  // 🆕 交互状态字段（关键场景增强）
  // 可点击状态（区分按钮与文本）
  if (el.clickable === 'true') {
    if (push('clickable', el.clickable)) {
      semanticFieldCount++;
    }
  }
  
  // 选中状态（复选框、单选框、Tab等）
  if (el.checkable === 'true' && el.checked) {
    if (push('checked', el.checked)) {
      semanticFieldCount++;
    }
  }
  
  // 可滚动（列表、ScrollView等）
  if (el.scrollable === 'true') {
    if (push('scrollable', el.scrollable)) {
      semanticFieldCount++;
    }
  }
  
  // 密码框（特殊输入类型）
  if (el.password === 'true') {
    if (push('password', el.password)) {
      semanticFieldCount++;
    }
  }
  
  // 启用状态（区分可用/禁用控件）
  if (el.enabled === 'false') { // 只有禁用时才添加，因为enabled=true是默认状态
    if (push('enabled', el.enabled)) {
      semanticFieldCount++;
    }
  }
  
  // 🆕 子节点字段收集（解决子容器有意义文本问题）
  // 第一层子节点文本（最常见的场景：按钮文本在内层TextView）
  if (el.first_child_text && isValidText(el.first_child_text)) {
    if (push('first_child_text', el.first_child_text)) {
      semanticFieldCount++;
    }
  }
  
  // 第一层子节点内容描述
  if (el.first_child_content_desc && isValidContentDesc(el.first_child_content_desc)) {
    if (push('first_child_content_desc', el.first_child_content_desc)) {
      semanticFieldCount++;
    }
  }
  
  // 深度子节点文本收集（处理多层嵌套）
  if (el.descendant_texts && el.descendant_texts.length > 0) {
    const meaningfulTexts = el.descendant_texts.filter(text => isValidText(text));
    if (meaningfulTexts.length > 0) {
      // 优先使用最短的有意义文本（通常是最直接的标签）
      const bestText = meaningfulTexts.reduce((a, b) => a.length <= b.length ? a : b);
      if (push('descendant_text', bestText)) {
        semanticFieldCount++;
      }
    }
  }
  
  // 子节点资源ID（有时候子节点有更具体的ID）
  if (el.first_child_resource_id) {
    if (push('first_child_resource_id', el.first_child_resource_id)) {
      semanticFieldCount++;
    }
  }
  
  // 索引位置（同级元素区分）
  if (el.index && semanticFieldCount >= 2) { // 有足够语义字段时才添加index
    push('index', el.index);
  }
  
  // 包名（通常稳定，作为额外约束）
  // 注意：这里假设包名会通过其他方式获取，因为 ElementLike 接口中没有 package 字段
  // 在实际使用中，可以从 XML 节点中提取
  
  // 如果语义字段不足，且有 bounds，则添加 bounds（但不推荐作为主要匹配依据）
  if (semanticFieldCount < 2 && el.bounds) {
    push('bounds', el.bounds);
  }

  // 至少要有一个字段
  if (fields.length === 0) {
    console.warn('🚨 构建匹配配置失败: 所有字段都无有效值', el);
    // 仍无字段，则给一个标记位，避免空结构（不会用于后端）
    return { strategy: 'standard', fields: [], values: {} };
  }

  // 📊 策略选择逻辑（统一默认 standard）
  // - 绝大多数场景：统一默认使用 standard（跨设备、分辨率无关，更稳健）
  // - 特殊兜底：当仅有位置字段（bounds/index）且语义字段不足时，才使用 absolute
  //   以避免 standard 策略下忽略位置字段导致完全失配
  let strategy = 'standard';

  // 判断是否属于“仅位置字段或几乎仅位置字段”的兜底情形
  const hasBounds = fields.includes('bounds');
  const hasIndexOnly = fields.length === 1 && fields[0] === 'index';
  const isPositionOnly = (semanticFieldCount === 0) && (hasBounds || hasIndexOnly);

  if (isPositionOnly) {
    strategy = 'absolute';
  }

  console.log(`🎯 智能匹配配置: 策略=${strategy}, 字段=${fields.length}个, 语义字段=${semanticFieldCount}个, 父节点字段=${parentFieldCount}个`, { strategy, fields, values });

  return { strategy, fields, values };
}

/**
 * 判断文本是否有意义（过滤空白、数字、单字符等）
 */
function isValidText(text: string): boolean {
  if (!text || text.trim().length === 0) return false;
  if (text.trim().length === 1) return false; // 单字符通常无意义
  if (/^\d+$/.test(text.trim())) return false; // 纯数字
  if (/^[^\w\u4e00-\u9fa5]+$/.test(text.trim())) return false; // 只有特殊字符
  return true;
}

/**
 * 判断 content-desc 是否有意义
 */
function isValidContentDesc(desc: string): boolean {
  if (!desc || desc.trim().length === 0) return false;
  // 过滤一些无意义的描述
  const meaningless = ['clickable', 'focusable', 'enabled', 'selected', ''];
  return !meaningless.includes(desc.trim().toLowerCase());
}

/**
 * 判断类名是否有意义（过滤过于泛化的类名）
 */
function isValidClassName(className: string): boolean {
  if (!className) return false;
  // 过滤过于泛化的类名
  const generic = ['android.view.View', 'android.view.ViewGroup'];
  if (generic.includes(className)) return false;
  // 优先选择具体的 UI 组件类名
  const specific = ['TextView', 'Button', 'ImageView', 'EditText', 'RecyclerView'];
  return specific.some(s => className.includes(s)) || className.includes('.');
}
