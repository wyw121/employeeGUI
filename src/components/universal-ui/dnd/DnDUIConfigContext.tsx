import React from 'react';
import { loadDnDUIConfig, saveDnDUIConfig } from './storage';

export interface DnDUIConfig {
  /** 是否启用拖拽中的幽灵预览层（DragOverlayGhost） */
  useGhostOverlay: boolean;
}

const defaultConfig: DnDUIConfig = {
  useGhostOverlay: true,
};

export interface DnDUIConfigContextValue {
  config: DnDUIConfig;
  setConfig: React.Dispatch<React.SetStateAction<DnDUIConfig>>;
  setUseGhostOverlay: (enabled: boolean) => void;
  /** 兼容旧用法：直接解构 useGhostOverlay */
  useGhostOverlay: boolean;
}

export const DnDUIConfigContext = React.createContext<DnDUIConfigContextValue | null>(null);

export const DnDUIConfigProvider: React.FC<React.PropsWithChildren<{ value?: Partial<DnDUIConfig> }>> = ({ value, children }) => {
  // 初始化：default < persisted < provider.value
  const initial = React.useMemo<DnDUIConfig>(() => {
    const persisted = loadDnDUIConfig() || {};
    return { ...defaultConfig, ...persisted, ...(value || {}) };
  }, [value]);
  const [config, setConfig] = React.useState<DnDUIConfig>(initial);
  const ctx = React.useMemo<DnDUIConfigContextValue>(() => ({
    config,
    setConfig,
    setUseGhostOverlay: (enabled: boolean) => setConfig(prev => ({ ...prev, useGhostOverlay: enabled })),
    useGhostOverlay: config.useGhostOverlay,
  }), [config]);

  return (
    <DnDUIConfigContext.Provider value={ctx}>
      {children}
    </DnDUIConfigContext.Provider>
  );
};

export const useDnDUIConfig = (): DnDUIConfigContextValue => {
  const ctx = React.useContext(DnDUIConfigContext);
  if (!ctx) {
    // 提供开发期保护：若未包 Provider，也返回默认只读实现，防止崩溃
    const [config, setConfig] = React.useState<DnDUIConfig>(defaultConfig);
    React.useEffect(() => {
      const persisted = loadDnDUIConfig();
      if (persisted) {
        setConfig(prev => ({ ...prev, ...persisted }));
      }
    }, []);
    React.useEffect(() => {
      saveDnDUIConfig({ useGhostOverlay: config.useGhostOverlay });
    }, [config.useGhostOverlay]);
    return {
      config,
      setConfig,
      setUseGhostOverlay: (enabled: boolean) => setConfig(prev => ({ ...prev, useGhostOverlay: enabled })),
      useGhostOverlay: config.useGhostOverlay,
    };
  }
  return ctx;
};

// 将持久化写入挂在 Provider 内部，确保 value 变化也会触发保存
export const DnDUIConfigPersistence: React.FC = () => {
  const { config } = useDnDUIConfig();
  React.useEffect(() => {
    saveDnDUIConfig({ useGhostOverlay: config.useGhostOverlay });
  }, [config.useGhostOverlay]);
  return null;
};


export default DnDUIConfigProvider;
