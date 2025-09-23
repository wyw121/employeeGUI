// 统一主题设计令牌（Sindre 风格）
// 提供 AntD token、CSS 变量映射和通用颜色

export type ThemeMode = 'dark' | 'light';

export const cssVars = {
  dark: {
    '--color-bg-layout': '#0d1117',
    '--color-bg-container': '#161b22',
    '--color-bg-elevated': '#21262d',
    '--color-text': '#f0f6fc',
    '--color-text-secondary': '#8b949e',
    '--color-text-tertiary': '#6e7681',
    '--color-border': '#30363d',
    '--color-split': '#21262d',
    '--color-primary': '#ff6b8a',
    '--color-success': '#43e97b',
    '--color-warning': '#faad14',
    '--color-error': '#f5576c',
    '--color-info': '#4facfe',
    '--card-glass-bg': 'rgba(255, 255, 255, 0.05)',
    '--card-glass-border': 'rgba(255, 255, 255, 0.1)'
  },
  light: {
    '--color-bg-layout': '#ffffff',
    '--color-bg-container': '#fafafa',
    '--color-bg-elevated': '#ffffff',
    '--color-text': '#1f2937',
    '--color-text-secondary': '#4b5563',
    '--color-text-tertiary': '#6b7280',
    '--color-border': '#e5e7eb',
    '--color-split': '#f3f4f6',
    '--color-primary': '#ef476f',
    '--color-success': '#22c55e',
    '--color-warning': '#f59e0b',
    '--color-error': '#ef4444',
    '--color-info': '#0ea5e9',
    '--card-glass-bg': 'rgba(0, 0, 0, 0.02)',
    '--card-glass-border': 'rgba(0, 0, 0, 0.06)'
  }
} as const;

export const antdTokens = (mode: ThemeMode) => ({
  // 对齐 AntD token
  colorBgLayout: getVar('--color-bg-layout', mode),
  colorBgContainer: getVar('--color-bg-container', mode),
  colorBgElevated: getVar('--color-bg-elevated', mode),
  colorText: getVar('--color-text', mode),
  colorTextSecondary: getVar('--color-text-secondary', mode),
  colorTextTertiary: getVar('--color-text-tertiary', mode),
  colorBorder: getVar('--color-border', mode),
  colorSplit: getVar('--color-split', mode),
  colorPrimary: getVar('--color-primary', mode),
  colorSuccess: getVar('--color-success', mode),
  colorWarning: getVar('--color-warning', mode),
  colorError: getVar('--color-error', mode),
  colorInfo: getVar('--color-info', mode),
  borderRadius: 12,
  borderRadiusLG: 16,
});

export function getVar(name: keyof typeof cssVars.dark | string, mode: ThemeMode) {
  const map = cssVars[mode] as Record<string, string>;
  return map[name] || '';
}
