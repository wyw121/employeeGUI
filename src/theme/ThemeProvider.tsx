import React from 'react';
import { ConfigProvider, theme as antdTheme, App } from 'antd';
import { ThemeMode, antdTokens, cssVars } from './tokens';

export interface ThemeContextValue {
  mode: ThemeMode;
  setMode: (m: ThemeMode) => void;
}

const ThemeContext = React.createContext<ThemeContextValue>({ mode: 'dark', setMode: () => {} });

export const useTheme = () => React.useContext(ThemeContext);

export const AppThemeProvider: React.FC<{ children: React.ReactNode; defaultMode?: ThemeMode }>=({ children, defaultMode = 'dark' }) =>{
  const [mode, setMode] = React.useState<ThemeMode>(() => (localStorage.getItem('app.theme') as ThemeMode) || defaultMode);

  React.useEffect(() => {
    localStorage.setItem('app.theme', mode);
    const root = document.documentElement;
    // 切换根类名，便于全局选择器使用 .theme-dark/.theme-light
    root.classList.remove('theme-dark', 'theme-light');
    root.classList.add(mode === 'dark' ? 'theme-dark' : 'theme-light');
    // 写入 CSS 变量
    const vars = cssVars[mode];
    Object.entries(vars).forEach(([k, v]) => { root.style.setProperty(k, v); });
  }, [mode]);

  return (
    <ThemeContext.Provider value={{ mode, setMode }}>
      <ConfigProvider
        theme={{
          algorithm: mode === 'dark' ? antdTheme.darkAlgorithm : antdTheme.defaultAlgorithm,
          token: antdTokens(mode) as any,
          components: {
            Layout: {
              headerBg: cssVars[mode]['--color-bg-container'],
              bodyBg: cssVars[mode]['--color-bg-layout'],
            },
            Menu: {
              colorBgContainer: cssVars[mode]['--color-bg-container'],
              itemBg: 'transparent',
              itemSelectedBg: 'rgba(255, 107, 138, 0.1)',
              itemSelectedColor: cssVars[mode]['--color-primary'],
              itemHoverBg: 'rgba(255, 255, 255, 0.05)',
            },
            Card: {
              colorBgContainer: cssVars[mode]['--card-glass-bg'],
              colorBorderSecondary: cssVars[mode]['--card-glass-border'],
            },
            Table: {
              colorBgContainer: mode === 'dark' ? 'rgba(255, 255, 255, 0.02)' : '#fff',
              colorBorderSecondary: cssVars[mode]['--card-glass-border'],
            },
            Button: {
              controlHeight: 36,
              borderRadius: 10,
              fontWeight: 500,
            },
          },
        }}
      >
        <App>{children}</App>
      </ConfigProvider>
    </ThemeContext.Provider>
  );
}
