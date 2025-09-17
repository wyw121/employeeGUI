import { invoke } from '@tauri-apps/api/core';

/**
 * 动态通讯录按钮定位服务
 * 基于真机ADB测试结果的智能UI解析服务
 */

export interface ContactsButtonLocation {
  success: boolean;
  coordinates: {
    x: number;
    y: number;
  };
  method: string;
  screen_resolution?: {
    width: number;
    height: number;
  };
  validation?: {
    is_valid: boolean;
    within_bounds: boolean;
  };
  message: string;
  note?: string;
}

export interface NavigationTestResult {
  success: boolean;
  message: string;
  test_type: string;
  device_id: string;
  timestamp: string;
  navigation_steps?: string[];
  error?: string;
}

export class DynamicContactsService {
  /**
   * 动态定位通讯录按钮位置
   * 使用真机测试验证的动态UI解析算法
   * 
   * @param deviceId 设备ID
   * @returns 通讯录按钮位置信息
   */
  static async locateContactsButton(deviceId: string): Promise<ContactsButtonLocation> {
    try {
      console.log(`🎯 开始动态定位通讯录按钮 - 设备: ${deviceId}`);
      
      const result = await invoke<ContactsButtonLocation>('dynamic_locate_contacts_button', {
        deviceId
      });
      
      console.log('✅ 动态定位结果:', result);
      return result;
    } catch (error) {
      console.error('❌ 动态定位失败:', error);
      throw new Error(`动态定位通讯录按钮失败: ${error}`);
    }
  }

  /**
   * 测试完整的通讯录导航流程
   * 端到端测试：从任意页面导航到通讯录好友列表
   * 
   * @param deviceId 设备ID
   * @returns 导航测试结果
   */
  static async testNavigationFlow(deviceId: string): Promise<NavigationTestResult> {
    try {
      console.log(`🚀 开始测试通讯录导航流程 - 设备: ${deviceId}`);
      
      const result = await invoke<NavigationTestResult>('test_contacts_navigation', {
        deviceId
      });
      
      console.log('✅ 导航测试结果:', result);
      return result;
    } catch (error) {
      console.error('❌ 导航测试失败:', error);
      throw new Error(`通讯录导航测试失败: ${error}`);
    }
  }

  /**
   * 分析动态定位结果的质量
   * 
   * @param result 定位结果
   * @returns 质量分析
   */
  static analyzeLocationQuality(result: ContactsButtonLocation): {
    confidence: number;
    recommendations: string[];
    risk_level: 'low' | 'medium' | 'high';
  } {
    const { coordinates, method, validation } = result;
    let confidence = 0;
    const recommendations: string[] = [];
    let risk_level: 'low' | 'medium' | 'high' = 'medium';

    // 基于定位方法评估置信度
    if (method === 'dynamic_ui_parsing') {
      confidence = 0.9; // 动态UI解析成功，高置信度
      risk_level = 'low';
    } else if (method === 'real_device_tested_fallback') {
      confidence = 0.75; // 真机测试验证的备用坐标，中等置信度
      risk_level = 'medium';
      recommendations.push('建议检查当前UI状态是否与测试环境一致');
    }

    // 基于坐标验证评估
    if (validation?.is_valid && validation?.within_bounds) {
      confidence += 0.05;
    } else {
      confidence -= 0.1;
      risk_level = 'high';
      recommendations.push('坐标验证失败，建议重新获取屏幕信息');
    }

    // 基于坐标位置合理性评估（通讯录按钮通常在左侧中上部）
    if (coordinates.x > 50 && coordinates.x < 400 && 
        coordinates.y > 200 && coordinates.y < 600) {
      confidence += 0.05;
    } else {
      recommendations.push('坐标位置异常，可能不是通讯录按钮的典型位置');
      if (risk_level !== 'high') risk_level = 'medium';
    }

    // 确保置信度在合理范围内
    confidence = Math.max(0, Math.min(1, confidence));

    return {
      confidence,
      recommendations,
      risk_level
    };
  }

  /**
   * 格式化导航步骤为用户友好的描述
   * 
   * @param steps 导航步骤数组
   * @returns 格式化的步骤描述
   */
  static formatNavigationSteps(steps?: string[]): string[] {
    if (!steps) return [];
    
    const stepDescriptions: Record<string, string> = {
      '识别当前页面状态': '🔍 分析当前页面状态',
      '动态定位头像位置': '👤 智能定位用户头像',
      '点击头像打开侧边栏': '📱 点击头像打开侧边栏',
      '动态定位发现好友按钮': '🔍 动态查找发现好友选项',
      '点击发现好友进入页面': '👥 进入发现好友页面',
      '动态定位通讯录按钮': '📋 智能定位通讯录按钮',
      '点击通讯录进入好友列表': '📞 进入通讯录好友列表',
      '验证最终页面状态': '✅ 验证导航成功'
    };

    return steps.map(step => stepDescriptions[step] || step);
  }

  /**
   * 获取设备适配建议
   * 
   * @param deviceId 设备ID
   * @param screenResolution 屏幕分辨率
   * @returns 适配建议
   */
  static getDeviceAdaptationAdvice(
    deviceId: string, 
    screenResolution?: { width: number; height: number }
  ): {
    device_type: string;
    adaptation_notes: string[];
    recommended_settings: Record<string, any>;
  } {
    const advice = {
      device_type: 'unknown',
      adaptation_notes: [] as string[],
      recommended_settings: {} as Record<string, any>
    };

    // 基于设备ID判断设备类型
    if (deviceId.includes('emulator') || deviceId.includes('127.0.0.1')) {
      advice.device_type = 'emulator';
      advice.adaptation_notes.push('模拟器环境，UI布局可能与真机不同');
      advice.recommended_settings.tap_delay = 1000;
    } else {
      advice.device_type = 'real_device';
      advice.adaptation_notes.push('真机环境，使用经过验证的坐标');
      advice.recommended_settings.tap_delay = 500;
    }

    // 基于屏幕分辨率提供建议
    if (screenResolution) {
      const { width, height } = screenResolution;
      const aspectRatio = width / height;

      if (aspectRatio > 0.6) {
        advice.adaptation_notes.push('宽屏设备，注意UI元素位置适配');
      }
      
      if (width < 720) {
        advice.adaptation_notes.push('小屏设备，可能需要调整坐标精度');
        advice.recommended_settings.coordinate_offset = 5;
      } else if (width > 1200) {
        advice.adaptation_notes.push('大屏设备，UI元素可能有缩放');
        advice.recommended_settings.coordinate_scale = 1.2;
      }
    }

    return advice;
  }
}