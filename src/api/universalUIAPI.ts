// Universal UI Finder 前端API服务
// 对接后端Universal UI服务的Tauri命令

import { invoke } from '@tauri-apps/api/core';

export interface SmartNavigationParams {
  navigation_type?: string;  // "bottom", "top", "side", "floating"
  target_button: string;     // "我", "首页", "消息"
  click_action?: string;     // "single_tap", "double_tap", "long_press"
  app_name?: string;         // "小红书", "微信" - undefined表示直接ADB模式
  position_ratio?: PositionRatio;  // 详细位置配置（专业模式）
  custom_config?: any;       // 自定义配置
}

export interface PositionRatio {
  x_start: number;
  x_end: number;
  y_start: number;
  y_end: number;
}

export interface UniversalClickResult {
  success: boolean;
  element_found: boolean;
  click_executed: boolean;
  execution_time_ms: number;
  error_message?: string;
  found_element?: FoundElement;
  mode: string; // "指定应用模式" | "直接ADB模式"
}

export interface FoundElement {
  text: string;
  bounds: string;
  position: [number, number];
}

export interface NavigationPresets {
  apps: Array<{
    name: string;
    buttons: string[];
    navigation_type: string;
  }>;
  navigation_types: Array<{
    key: string;
    label: string;
    position: [number, number, number, number];
  }>;
}

/**
 * Universal UI Finder API 服务
 * 桥接前端智能导航和后端Universal UI Finder模块
 */
export class UniversalUIService {

  /**
   * 执行智能导航点击（统一入口）
   * 支持双模式：指定应用模式 vs 直接ADB模式
   */
  static async executeUIClick(
    deviceId: string,
    params: SmartNavigationParams
  ): Promise<UniversalClickResult> {
    return await invoke<UniversalClickResult>('execute_universal_ui_click', {
      deviceId,
      params,
    });
  }

  /**
   * 快速点击（简化接口）
   * 自动使用指定应用模式
   */
  static async quickClick(
    deviceId: string,
    appName: string,
    buttonText: string
  ): Promise<UniversalClickResult> {
    return await invoke<UniversalClickResult>('execute_universal_quick_click', {
      deviceId,
      appName,
      buttonText,
    });
  }

  /**
   * 直接ADB点击（跳过应用检测）
   * 用于快速测试当前界面
   */
  static async directClick(
    deviceId: string,
    buttonText: string,
    positionHint?: string
  ): Promise<UniversalClickResult> {
    return await invoke<UniversalClickResult>('execute_universal_direct_click', {
      deviceId,
      buttonText,
      positionHint,
    });
  }

  /**
   * 获取预设配置信息
   * 包含应用列表和导航类型定义
   */
  static async getNavigationPresets(): Promise<NavigationPresets> {
    return await invoke<NavigationPresets>('get_universal_navigation_presets');
  }

  /**
   * 从SmartScriptStep参数转换为SmartNavigationParams
   */
  static convertFromScriptStep(stepParams: any): SmartNavigationParams {
    return {
      navigation_type: stepParams.navigation_type,
      target_button: stepParams.target_button,
      click_action: stepParams.click_action || 'single_tap',
      app_name: stepParams.app_name, // 来自向导模式的应用选择
      position_ratio: stepParams.position_ratio,
      custom_config: stepParams.custom_config,
    };
  }

  /**
   * 智能推断导航参数
   * 从前端配置中推断完整的导航参数
   */
  static inferNavigationParams(config: {
    app?: string;
    navType?: string;
    targetButton?: string;
    clickAction?: string;
  }): SmartNavigationParams {
    return {
      navigation_type: config.navType || 'bottom',
      target_button: config.targetButton || '我',
      click_action: config.clickAction || 'single_tap',
      app_name: config.app, // undefined表示直接ADB模式
    };
  }

  /**
   * 解析专业模式配置
   */
  static parseAdvancedConfig(professionalConfig: any): SmartNavigationParams {
    // 转换专业模式的详细配置
    const positionRatio = professionalConfig.position_ratio ? {
      x_start: professionalConfig.position_ratio.x_start || 0,
      x_end: professionalConfig.position_ratio.x_end || 1,
      y_start: professionalConfig.position_ratio.y_start || 0.85,
      y_end: professionalConfig.position_ratio.y_end || 1,
    } : undefined;

    return {
      navigation_type: professionalConfig.position_type,
      target_button: professionalConfig.target_button,
      click_action: professionalConfig.click_action,
      app_name: professionalConfig.app_name,
      position_ratio: positionRatio,
      custom_config: professionalConfig,
    };
  }

  /**
   * 格式化执行结果信息
   */
  static formatResult(result: UniversalClickResult): {
    statusText: string;
    detailText: string;
    success: boolean;
  } {
    const { success, element_found, click_executed, execution_time_ms, mode, error_message } = result;

    let statusText = '';
    let detailText = '';

    if (success) {
      statusText = '✅ 执行成功';
      detailText = `模式: ${mode}, 执行时间: ${execution_time_ms}ms`;
    } else if (!element_found) {
      statusText = '❌ 未找到元素';
      detailText = error_message || '目标按钮未在指定区域找到';
    } else if (!click_executed) {
      statusText = '⚠️ 点击失败';
      detailText = error_message || '找到元素但点击操作失败';
    } else {
      statusText = '❌ 执行失败';
      detailText = error_message || '未知错误';
    }

    return { statusText, detailText, success };
  }

  /**
   * 判断是否应该使用指定应用模式
   */
  static shouldUseAppMode(config: any): boolean {
    // 如果明确指定了应用名，使用指定应用模式
    return !!(config.app_name || config.app);
  }

  /**
   * 生成执行报告
   */
  static generateExecutionReport(result: UniversalClickResult, params: SmartNavigationParams): string {
    const { statusText, detailText } = this.formatResult(result);
    const mode = result.mode;
    const target = params.target_button;
    const app = params.app_name || '当前界面';

    return `
智能导航执行报告:
- 目标: ${app} -> ${target}
- 模式: ${mode}  
- 结果: ${statusText}
- 详情: ${detailText}
- 执行时间: ${result.execution_time_ms}ms
${result.found_element ? `- 找到元素: "${result.found_element.text}" at ${result.found_element.position}` : ''}
    `.trim();
  }
}

// 默认导出
export default UniversalUIService;