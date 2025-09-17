// 智能元素查找器共享类型定义
// 供新旧版本组件共同使用，确保类型一致性

export interface NavigationBarConfig {
    position_type: 'bottom' | 'top' | 'side' | 'floating';
    position_ratio?: {
        x_start: number;
        x_end: number;
        y_start: number;
        y_end: number;
    };
    button_count?: number;
    button_patterns: string[];
    target_button: string;
    click_action: 'single_tap' | 'double_tap' | 'long_press';
}

export interface DetectedElement {
    text: string;
    bounds: string;
    content_desc: string;
    clickable: boolean;
    position: [number, number];
}

export interface ElementFinderResult {
    success: boolean;
    message: string;
    found_elements?: DetectedElement[];
    target_element?: DetectedElement;
}

export interface ClickResult {
    success: boolean;
    message: string;
}

// 共享的预设配置
export const NAVIGATION_PRESETS = {
    '小红书_底部导航': {
        position_type: 'bottom' as const,
        position_ratio: { x_start: 0.0, x_end: 1.0, y_start: 0.93, y_end: 1.0 },
        button_count: 5,
        button_patterns: ['首页', '市集', '发布', '消息', '我'],
        target_button: '我',
        click_action: 'single_tap' as const,
    },
    '微信_底部导航': {
        position_type: 'bottom' as const,
        position_ratio: { x_start: 0.0, x_end: 1.0, y_start: 0.90, y_end: 1.0 },
        button_count: 4,
        button_patterns: ['微信', '通讯录', '发现', '我'],
        target_button: '我',
        click_action: 'single_tap' as const,
    },
    '抖音_底部导航': {
        position_type: 'bottom' as const,
        position_ratio: { x_start: 0.0, x_end: 1.0, y_start: 0.88, y_end: 1.0 },
        button_count: 5,
        button_patterns: ['首页', '朋友', '拍摄', '消息', '我'],
        target_button: '我',
        click_action: 'single_tap' as const,
    },
} as const;

export type PresetKey = keyof typeof NAVIGATION_PRESETS;