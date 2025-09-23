export interface FieldDoc {
  key: string;
  label: string;      // 中文名
  desc?: string;      // 说明
}

// 常见字段中文说明（可扩展）
export const FIELD_DOCS: FieldDoc[] = [
  { key: 'resource-id', label: '资源ID', desc: '控件的资源标识（通常最稳定），形如 包名:id/控件ID' },
  { key: 'text', label: '文本', desc: '控件显示的文字，可能随内容或语言变化' },
  { key: 'content-desc', label: '无障碍描述', desc: '用于辅助功能（TalkBack 等）的描述，可用于定位' },
  { key: 'class', label: '类名', desc: 'Android 控件类名，例如 android.widget.Button' },
  { key: 'package', label: '包名', desc: '应用包名，例如 com.xingin.xhs' },
  { key: 'bounds', label: '边界矩形', desc: '屏幕内位置与大小：[left,top][right,bottom]' },
  { key: 'clickable', label: '可点击', desc: '是否可点击' },
  { key: 'enabled', label: '可用', desc: '是否处于可交互状态' },
  { key: 'visible-to-user', label: '对用户可见', desc: '是否可见（可能受遮挡/滚动影响）' },
  { key: 'focusable', label: '可获取焦点', desc: '是否可被焦点选中' },
  { key: 'focused', label: '已获取焦点', desc: '当前是否处于焦点状态' },
  { key: 'scrollable', label: '可滚动', desc: '是否可滚动' },
  { key: 'long-clickable', label: '可长按', desc: '是否支持长按' },
  { key: 'checkable', label: '可勾选', desc: '是否可勾选（如复选框）' },
  { key: 'checked', label: '已勾选', desc: '当前是否为勾选状态' },
  { key: 'selected', label: '已选中', desc: '当前是否为选中状态' },
  { key: 'password', label: '密码输入', desc: '是否为密码输入控件' },
  { key: 'index', label: '兄弟序号', desc: '该节点在同层级的序号' },
];

export const FIELD_DOC_MAP: Record<string, FieldDoc> = Object.fromEntries(
  FIELD_DOCS.map(d => [d.key, d])
);

// 值格式化：布尔字段显示“是/否”，其余原样
export function formatAttrValue(key: string, value: unknown): string {
  const boolKeys = new Set([
    'clickable','enabled','visible-to-user','focusable','focused','scrollable','long-clickable','checkable','checked','selected','password'
  ]);
  if (boolKeys.has(key)) {
    const v = String(value).toLowerCase();
    if (v === 'true') return '是';
    if (v === 'false') return '否';
  }
  return String(value ?? '');
}
