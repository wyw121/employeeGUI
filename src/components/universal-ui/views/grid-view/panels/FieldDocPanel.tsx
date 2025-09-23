import React, { useState } from 'react';
import styles from "../GridElementView.module.css";

const FIELD_DOCS: Array<{ key: string; name: string; desc: string }> = [
  { key: 'resource-id', name: '资源ID', desc: '控件的资源标识（通常最稳定），形如 包名:id/控件ID' },
  { key: 'text', name: '文本', desc: '控件显示的文字，可能随内容或语言变化' },
  { key: 'content-desc', name: '无障碍描述', desc: '用于辅助功能（TalkBack 等）的描述，可用于定位' },
  { key: 'class', name: '类名', desc: 'Android 控件类名，例如 android.widget.Button' },
  { key: 'package', name: '包名', desc: '应用包名，例如 com.xingin.xhs' },
  { key: 'bounds', name: '边界矩形', desc: '屏幕内位置与大小：[left,top][right,bottom]' },
  { key: 'clickable', name: '可点击', desc: '是否可点击' },
  { key: 'enabled', name: '可用', desc: '是否处于可交互状态' },
  { key: 'visible-to-user', name: '对用户可见', desc: '是否可见（可能受遮挡/滚动影响）' },
  { key: 'index', name: '兄弟序号', desc: '该节点在同层级的序号' },
];

export const FieldDocPanel: React.FC = () => {
  const [collapsed, setCollapsed] = useState<boolean>(true);
  return (
    <div className={styles.card}>
      <div className={styles.cardHeader} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <span>字段说明</span>
        <button className={styles.btn} onClick={() => setCollapsed(c => !c)}>{collapsed ? '展开' : '收起'}</button>
      </div>
      {!collapsed && (
        <div className={styles.cardBody}>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
            {FIELD_DOCS.map(item => (
              <div key={item.key} className="flex flex-col">
                <span className="font-medium">{item.name} <span className="ml-1 text-[10px] text-neutral-400">({item.key})</span></span>
                <span className="text-neutral-600 dark:text-neutral-300">{item.desc}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default FieldDocPanel;
