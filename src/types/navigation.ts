// 导航栏检测相关类型定义

export type NavigationBarType = 'Bottom' | 'Top' | 'Side' | 'FloatingAction';

export interface PositionRatio {
    start: number;
    end: number;
}

export interface NavigationBarPosition {
    bar_type: NavigationBarType;
    position_ratio: PositionRatio;
    size_ratio: number;
    min_size_threshold: number;
}

export interface NavigationButtonConfig {
    text?: string;
    content_desc?: string;
    resource_id_pattern?: string;
    class_name?: string;
    must_clickable: boolean;
    position_in_bar?: number;
}

export interface NavigationBarDetectionConfig {
    package_name: string;
    bar_position: NavigationBarPosition;
    target_buttons: Record<string, NavigationButtonConfig>;
    enable_smart_adaptation: boolean;
}

export interface DetectedNavigationButton {
    name: string;
    bounds: [number, number, number, number];
    text?: string;
    content_desc?: string;
    clickable: boolean;
    position_index: number;
    confidence: number;
}

export interface DetectedNavigationBar {
    bounds: [number, number, number, number];
    bar_type: string;
    buttons: DetectedNavigationButton[];
    confidence: number;
}

export interface NavigationDetectionResult {
    success: boolean;
    message: string;
    detected_bars: DetectedNavigationBar[];
    target_button?: DetectedNavigationButton;
    screen_size: [number, number];
    detection_time_ms: number;
}

// 智能脚本步骤相关类型
export interface NavigationClickStepData {
    type: 'navigation_click';
    name: string;
    description: string;
    config: NavigationBarDetectionConfig & {
        targetButtonText: string;
        deviceId: string;
    };
    parameters: {
        button_text: string;
        detection_config: NavigationBarDetectionConfig;
        wait_after_click: number;
    };
}

// 导航栏检测器属性
export interface NavigationBarDetectorProps {
    onStepCreate?: (stepData: NavigationClickStepData) => void;
    deviceId?: string;
    defaultButtonText?: string;
    showCreateStep?: boolean;
}