import React, { useEffect, useState } from 'react';
import styles from "../GridElementView.module.css";
import { loadPrefs, savePrefs, GridViewPrefs } from "../prefs";

export const PreferencesPanel: React.FC = () => {
  const [prefs, setPrefs] = useState<GridViewPrefs>(() => loadPrefs());
  useEffect(() => { savePrefs(prefs); }, [prefs]);
  return (
    <div className={styles.card}>
      <div className={styles.cardHeader}>首选项</div>
      <div className={styles.cardBody}>
        <div className="flex flex-wrap gap-4 text-sm text-neutral-700 dark:text-neutral-300">
          <label className="flex items-center gap-2">
            <input type="checkbox" checked={!!prefs.autoSwitchTab} onChange={(e) => setPrefs(p => ({ ...p, autoSwitchTab: e.target.checked }))} />
            自动切换到对应页签
          </label>
          <label className="flex items-center gap-2">
            <input type="checkbox" checked={!!prefs.enableFlashHighlight} onChange={(e) => setPrefs(p => ({ ...p, enableFlashHighlight: e.target.checked }))} />
            启用高亮闪烁
          </label>
          <label className="flex items-center gap-2">
            <input type="checkbox" checked={!!prefs.previewAutoCenter} onChange={(e) => setPrefs(p => ({ ...p, previewAutoCenter: e.target.checked }))} />
            屏幕预览自动居中
          </label>
        </div>
      </div>
    </div>
  );
};

export default PreferencesPanel;
