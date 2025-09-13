/**
 * ADB设备管理和命令执行工具类
 */

import { invoke } from '@tauri-apps/api/core';

export interface DeviceInfo {
  id: string;
  name: string;
  status: 'device' | 'offline' | 'unauthorized';
  model?: string;
  androidVersion?: string;
}

export interface AdbCommandResult {
  success: boolean;
  output: string;
  error?: string;
}

export interface UIElement {
  className: string;
  text: string;
  bounds: {
    left: number;
    top: number;
    right: number;
    bottom: number;
  };
  center: {
    x: number;
    y: number;
  };
  clickable: boolean;
  enabled: boolean;
}

/**
 * ADB设备管理器
 */
export class AdbDeviceManager {
  private static instance: AdbDeviceManager;

  private constructor() {}

  public static getInstance(): AdbDeviceManager {
    if (!AdbDeviceManager.instance) {
      AdbDeviceManager.instance = new AdbDeviceManager();
    }
    return AdbDeviceManager.instance;
  }

  /**
   * 获取所有连接的设备
   */
  async getDevices(): Promise<DeviceInfo[]> {
    try {
      const result = await this.executeCommand('devices -l');
      const devices: DeviceInfo[] = [];
      
      const lines = result.output.split('\n');
      for (const line of lines) {
        if (line.includes('\t')) {
          const parts = line.split('\t');
          if (parts.length >= 2) {
            const deviceId = parts[0].trim();
            const status = parts[1].trim() as DeviceInfo['status'];
            
            // 解析设备信息
            const modelMatch = line.match(/model:([^\s]+)/);
            const model = modelMatch ? modelMatch[1] : undefined;
            
            devices.push({
              id: deviceId,
              name: model || `设备 ${deviceId}`,
              status,
              model
            });
          }
        }
      }
      
      return devices;
    } catch (error) {
      console.error('获取设备列表失败:', error);
      return [];
    }
  }

  /**
   * 检查设备是否在线
   */
  async isDeviceOnline(deviceId: string): Promise<boolean> {
    try {
      const devices = await this.getDevices();
      const device = devices.find(d => d.id === deviceId);
      return device?.status === 'device';
    } catch (error) {
      console.error(`检查设备 ${deviceId} 状态失败:`, error);
      return false;
    }
  }

  /**
   * 获取设备屏幕大小
   */
  async getScreenSize(deviceId: string): Promise<{ width: number; height: number } | null> {
    try {
      const result = await this.executeDeviceCommand(deviceId, 'shell wm size');
      const match = result.output.match(/(\d+)x(\d+)/);
      if (match) {
        return {
          width: parseInt(match[1]),
          height: parseInt(match[2])
        };
      }
      return null;
    } catch (error) {
      console.error(`获取设备 ${deviceId} 屏幕大小失败:`, error);
      return null;
    }
  }

  /**
   * 检查应用是否已安装
   */
  async isAppInstalled(deviceId: string, packageName: string): Promise<boolean> {
    try {
      const result = await this.executeDeviceCommand(deviceId, `shell pm list packages | grep ${packageName}`);
      return result.output.includes(packageName);
    } catch (error) {
      console.error(`检查应用 ${packageName} 安装状态失败:`, error);
      return false;
    }
  }

  /**
   * 启动应用
   */
  async launchApp(deviceId: string, packageName: string, activityName?: string): Promise<boolean> {
    try {
      const activity = activityName || '.MainActivity';
      const result = await this.executeDeviceCommand(
        deviceId, 
        `shell am start -n ${packageName}/${activity}`
      );
      return result.success;
    } catch (error) {
      console.error(`启动应用 ${packageName} 失败:`, error);
      return false;
    }
  }

  /**
   * 获取当前运行的应用
   */
  async getCurrentApp(deviceId: string): Promise<string | null> {
    try {
      const result = await this.executeDeviceCommand(
        deviceId, 
        'shell dumpsys window windows | grep -E "mCurrentFocus|mFocusedApp"'
      );
      
      // 解析包名
      const match = result.output.match(/([a-z0-9.]+\.[a-z0-9.]+)/);
      return match ? match[1] : null;
    } catch (error) {
      console.error(`获取当前应用失败:`, error);
      return null;
    }
  }

  /**
   * 点击坐标
   */
  async clickCoordinates(deviceId: string, x: number, y: number): Promise<boolean> {
    try {
      const result = await this.executeDeviceCommand(deviceId, `shell input tap ${x} ${y}`);
      return result.success;
    } catch (error) {
      console.error(`点击坐标 (${x}, ${y}) 失败:`, error);
      return false;
    }
  }

  /**
   * 滑动屏幕
   */
  async swipe(
    deviceId: string, 
    startX: number, 
    startY: number, 
    endX: number, 
    endY: number, 
    duration: number = 500
  ): Promise<boolean> {
    try {
      const result = await this.executeDeviceCommand(
        deviceId, 
        `shell input swipe ${startX} ${startY} ${endX} ${endY} ${duration}`
      );
      return result.success;
    } catch (error) {
      console.error(`滑动操作失败:`, error);
      return false;
    }
  }

  /**
   * 输入文本
   */
  async inputText(deviceId: string, text: string): Promise<boolean> {
    try {
      // 转义特殊字符
      const escapedText = text.replace(/"/g, '\\"');
      const result = await this.executeDeviceCommand(deviceId, `shell input text "${escapedText}"`);
      return result.success;
    } catch (error) {
      console.error(`输入文本失败:`, error);
      return false;
    }
  }

  /**
   * 按下按键
   */
  async pressKey(deviceId: string, keyCode: number): Promise<boolean> {
    try {
      const result = await this.executeDeviceCommand(deviceId, `shell input keyevent ${keyCode}`);
      return result.success;
    } catch (error) {
      console.error(`按键操作失败:`, error);
      return false;
    }
  }

  /**
   * 获取UI布局XML
   */
  async getUILayout(deviceId: string): Promise<string | null> {
    try {
      const result = await this.executeDeviceCommand(deviceId, 'shell uiautomator dump /dev/stdout');
      return result.success ? result.output : null;
    } catch (error) {
      console.error('获取UI布局失败:', error);
      return null;
    }
  }

  /**
   * 解析UI元素
   */
  parseUIElements(xmlContent: string): UIElement[] {
    const elements: UIElement[] = [];
    
    // 简单的XML解析，实际项目中建议使用专业的XML解析库
    const nodeRegex = /<node[^>]+>/g;
    let match;
    
    while ((match = nodeRegex.exec(xmlContent)) !== null) {
      const nodeString = match[0];
      
      // 解析属性
      const classMatch = nodeString.match(/class="([^"]+)"/);
      const textMatch = nodeString.match(/text="([^"]+)"/);
      const boundsMatch = nodeString.match(/bounds="\[(\d+),(\d+)\]\[(\d+),(\d+)\]"/);
      const clickableMatch = nodeString.match(/clickable="([^"]+)"/);
      const enabledMatch = nodeString.match(/enabled="([^"]+)"/);
      
      if (boundsMatch) {
        const left = parseInt(boundsMatch[1]);
        const top = parseInt(boundsMatch[2]);
        const right = parseInt(boundsMatch[3]);
        const bottom = parseInt(boundsMatch[4]);
        
        elements.push({
          className: classMatch ? classMatch[1] : '',
          text: textMatch ? textMatch[1] : '',
          bounds: { left, top, right, bottom },
          center: {
            x: Math.floor((left + right) / 2),
            y: Math.floor((top + bottom) / 2)
          },
          clickable: clickableMatch ? clickableMatch[1] === 'true' : false,
          enabled: enabledMatch ? enabledMatch[1] === 'true' : true
        });
      }
    }
    
    return elements;
  }

  /**
   * 查找包含指定文本的元素
   */
  async findElementByText(deviceId: string, text: string): Promise<UIElement | null> {
    try {
      const xmlContent = await this.getUILayout(deviceId);
      if (!xmlContent) return null;
      
      const elements = this.parseUIElements(xmlContent);
      return elements.find(el => el.text.includes(text)) || null;
    } catch (error) {
      console.error(`查找文本元素 "${text}" 失败:`, error);
      return null;
    }
  }

  /**
   * 查找指定类名的元素
   */
  async findElementsByClass(deviceId: string, className: string): Promise<UIElement[]> {
    try {
      const xmlContent = await this.getUILayout(deviceId);
      if (!xmlContent) return [];
      
      const elements = this.parseUIElements(xmlContent);
      return elements.filter(el => el.className.includes(className));
    } catch (error) {
      console.error(`查找类名元素 "${className}" 失败:`, error);
      return [];
    }
  }

  /**
   * 查找所有可点击的元素
   */
  async findClickableElements(deviceId: string): Promise<UIElement[]> {
    try {
      const xmlContent = await this.getUILayout(deviceId);
      if (!xmlContent) return [];
      
      const elements = this.parseUIElements(xmlContent);
      return elements.filter(el => el.clickable && el.enabled);
    } catch (error) {
      console.error('查找可点击元素失败:', error);
      return [];
    }
  }

  /**
   * 截屏
   */
  async takeScreenshot(deviceId: string, savePath?: string): Promise<string | null> {
    try {
      const remotePath = '/sdcard/screenshot.png';
      const localPath = savePath || `screenshot_${deviceId}_${Date.now()}.png`;
      
      // 在设备上截屏
      await this.executeDeviceCommand(deviceId, `shell screencap -p ${remotePath}`);
      
      // 拉取到本地
      const result = await this.executeDeviceCommand(deviceId, `pull ${remotePath} ${localPath}`);
      
      if (result.success) {
        // 删除设备上的临时文件
        await this.executeDeviceCommand(deviceId, `shell rm ${remotePath}`);
        return localPath;
      }
      
      return null;
    } catch (error) {
      console.error('截屏失败:', error);
      return null;
    }
  }

  /**
   * 等待元素出现
   */
  async waitForElement(
    deviceId: string, 
    text: string, 
    timeout: number = 10000
  ): Promise<UIElement | null> {
    const startTime = Date.now();
    
    while (Date.now() - startTime < timeout) {
      const element = await this.findElementByText(deviceId, text);
      if (element) {
        return element;
      }
      
      // 等待500ms后重试
      await new Promise(resolve => setTimeout(resolve, 500));
    }
    
    return null;
  }

  /**
   * 执行设备命令
   */
  private async executeDeviceCommand(deviceId: string, command: string): Promise<AdbCommandResult> {
    try {
      const output = await invoke<string>('execute_adb_command', {
        deviceId: deviceId,
        command: command
      });
      
      return {
        success: true,
        output: output || ''
      };
    } catch (error) {
      return {
        success: false,
        output: '',
        error: String(error)
      };
    }
  }

  /**
   * 执行ADB命令
   */
  private async executeCommand(command: string): Promise<AdbCommandResult> {
    try {
      const output = await invoke<string>('execute_adb_command', {
        deviceId: '', // 对于全局命令，设备ID为空
        command: command
      });
      
      return {
        success: true,
        output: output || ''
      };
    } catch (error) {
      return {
        success: false,
        output: '',
        error: String(error)
      };
    }
  }

  /**
   * 休眠
   */
  async sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

// 常用按键代码
export const KeyCodes = {
  BACK: 4,
  HOME: 3,
  MENU: 82,
  POWER: 26,
  VOLUME_UP: 24,
  VOLUME_DOWN: 25,
  ENTER: 66,
  SPACE: 62,
  DELETE: 67,
} as const;

// 导出单例实例
export const adbManager = AdbDeviceManager.getInstance();