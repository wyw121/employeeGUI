import { Device } from '../../../../domain/adb/entities/Device';
import { useAdb } from '../../../../application/hooks/useAdb';
import { AuthError, DeviceInfo, WirelessConfig, AuthStep } from '../types';

/**
 * ADB 授权服务
 * 封装复杂的授权业务逻辑，提供高级的授权操作API
 */
export class AuthorizationService {
  private adb: ReturnType<typeof useAdb>;

  constructor(adb: ReturnType<typeof useAdb>) {
    this.adb = adb;
  }

  /**
   * 执行完整的设备授权检查
   */
  async checkDeviceAuthorization(deviceId?: string): Promise<{
    authorized: boolean;
    device: DeviceInfo | null;
    issues: AuthError[];
  }> {
    const issues: AuthError[] = [];
    
    try {
      // 获取设备列表
      await this.adb.refreshDevices();
      const devices = this.adb.devices;
      
      if (devices.length === 0) {
        issues.push({
          code: 'NO_DEVICES',
          message: '未检测到任何设备',
          timestamp: Date.now(),
        });
        return { authorized: false, device: null, issues };
      }

      // 选择目标设备
      let targetDevice: Device | undefined;
      if (deviceId) {
        targetDevice = devices.find(d => d.id === deviceId);
        if (!targetDevice) {
          issues.push({
            code: 'DEVICE_NOT_FOUND',
            message: `设备 ${deviceId} 未找到`,
            timestamp: Date.now(),
          });
        }
      } else {
        targetDevice = devices[0]; // 使用第一个设备
      }

      if (!targetDevice) {
        return { authorized: false, device: null, issues };
      }

      const deviceInfo = this.mapDeviceToInfo(targetDevice);

      // 检查设备状态
      if (targetDevice.status !== 'online') {
        issues.push({
          code: 'DEVICE_NOT_ONLINE',
          message: `设备 ${targetDevice.name} 状态异常: ${targetDevice.status}`,
          timestamp: Date.now(),
        });
        
        if (targetDevice.status === 'unauthorized') {
          issues.push({
            code: 'DEVICE_UNAUTHORIZED',
            message: '设备未授权，请在手机上确认 USB 调试授权',
            timestamp: Date.now(),
          });
        }
        
        return { authorized: false, device: deviceInfo, issues };
      }

      return { authorized: true, device: deviceInfo, issues };
      
    } catch (error) {
      issues.push({
        code: 'CHECK_FAILED',
        message: `授权检查失败: ${error}`,
        details: error,
        timestamp: Date.now(),
      });
      
      return { authorized: false, device: null, issues };
    }
  }

  /**
   * 执行一键修复操作
   */
  async performOneClickRecover(): Promise<{ success: boolean; errors: AuthError[] }> {
    const errors: AuthError[] = [];
    
    try {
      // 1. 清理本机 ADB 密钥
      await this.adb.clearAdbKeys();
      
      // 2. 重启 ADB 服务
      await this.adb.restartAdbServer();
      
      // 等待服务重启
      await this.delay(2000);
      
      // 3. 刷新设备列表
      await this.adb.refreshDevices();
      
      return { success: true, errors };
      
    } catch (error) {
      errors.push({
        code: 'RECOVERY_FAILED',
        message: `修复操作失败: ${error}`,
        details: error,
        timestamp: Date.now(),
      });
      
      return { success: false, errors };
    }
  }

  /**
   * 配置无线调试
   */
  async setupWirelessDebugging(config: WirelessConfig): Promise<{
    success: boolean;
    errors: AuthError[];
    finalConfig?: WirelessConfig;
  }> {
    const errors: AuthError[] = [];
    
    try {
      // 验证配置
      if (!this.isValidIpAddress(config.ip)) {
        errors.push({
          code: 'INVALID_IP',
          message: '无效的 IP 地址格式',
          timestamp: Date.now(),
        });
        return { success: false, errors };
      }

      if (config.port < 1024 || config.port > 65535) {
        errors.push({
          code: 'INVALID_PORT',
          message: '端口号必须在 1024-65535 范围内',
          timestamp: Date.now(),
        });
        return { success: false, errors };
      }

      let finalConfig = { ...config };

      // 如果需要配对，先执行配对
      if (config.pairPort && config.pairCode) {
        await this.adb.pairWireless(`${config.ip}:${config.pairPort}`, config.pairCode);
        // 配对成功后更新连接状态
        finalConfig.isConnected = true;
      }

      // 连接无线调试
      await this.adb.wirelessConnect(config.ip, config.port);
      
      // 刷新设备列表验证连接
      await this.adb.refreshDevices();
      
      finalConfig.isConnected = true;
      
      return { success: true, errors, finalConfig };
      
    } catch (error) {
      errors.push({
        code: 'WIRELESS_SETUP_FAILED',
        message: `无线调试设置失败: ${error}`,
        details: error,
        timestamp: Date.now(),
      });
      
      return { success: false, errors };
    }
  }

  /**
   * 验证授权步骤的完成状态
   */
  async validateStepCompletion(step: AuthStep): Promise<{
    completed: boolean;
    canProceed: boolean;
    issues: AuthError[];
  }> {
    const issues: AuthError[] = [];
    
    try {
      switch (step) {
        case AuthStep.PREREQUISITES: {
          // 检查 ADB 连接和基本环境
          try {
            await this.adb.refreshDevices();
            const hasAdb = this.adb.connection !== null;
            if (!hasAdb) {
              issues.push({
                code: 'ADB_NOT_READY',
                message: 'ADB 服务未就绪',
                timestamp: Date.now(),
              });
            }
            return { completed: hasAdb, canProceed: hasAdb, issues };
          } catch (error) {
            issues.push({
              code: 'ADB_CHECK_FAILED',
              message: 'ADB 状态检查失败',
              details: error,
              timestamp: Date.now(),
            });
            return { completed: false, canProceed: false, issues };
          }
        }

        case AuthStep.USB_TRUST: {
          // 检查是否有授权设备
          const result = await this.checkDeviceAuthorization();
          return {
            completed: result.authorized,
            canProceed: result.authorized,
            issues: result.issues,
          };
        }

        case AuthStep.WIRELESS: {
          // 无线调试是可选的
          return { completed: true, canProceed: true, issues };
        }

        case AuthStep.VERIFY: {
          // 最终验证
          const result = await this.checkDeviceAuthorization();
          const hasOnlineDevices = this.adb.devices.some(d => d.status === 'online');
          return {
            completed: hasOnlineDevices,
            canProceed: result.authorized,
            issues: result.issues,
          };
        }

        default:
          return { completed: true, canProceed: true, issues };
      }
      
    } catch (error) {
      issues.push({
        code: 'VALIDATION_FAILED',
        message: `步骤验证失败: ${error}`,
        details: error,
        timestamp: Date.now(),
      });
      
      return { completed: false, canProceed: false, issues };
    }
  }

  /**
   * 获取当前连接的设备信息
   */
  getConnectedDevices(): DeviceInfo[] {
    return this.adb.devices.map(device => this.mapDeviceToInfo(device));
  }

  /**
   * 生成步骤建议
   */
  generateStepSuggestions(step: AuthStep, errors: AuthError[]): string[] {
    const suggestions: string[] = [];
    
    switch (step) {
      case AuthStep.PREREQUISITES:
        suggestions.push('确保手机已开启开发者选项和 USB 调试');
        suggestions.push('使用原装数据线连接设备');
        if (errors.some(e => e.code === 'ADB_NOT_READY')) {
          suggestions.push('尝试重启 ADB 服务或重新安装 ADB');
        }
        break;

      case AuthStep.USB_TRUST:
        suggestions.push('确保手机屏幕已解锁');
        suggestions.push('查看手机是否有授权弹窗，选择"始终允许"');
        if (errors.some(e => e.code === 'DEVICE_UNAUTHORIZED')) {
          suggestions.push('尝试重新插拔数据线');
          suggestions.push('使用一键修复功能重置授权状态');
        }
        break;

      case AuthStep.WIRELESS:
        suggestions.push('确保手机和电脑在同一个网络');
        suggestions.push('检查防火墙设置，允许 ADB 端口通信');
        if (errors.some(e => e.code === 'INVALID_IP')) {
          suggestions.push('验证 IP 地址格式（例：192.168.1.100）');
        }
        break;
    }
    
    return suggestions;
  }

  private mapDeviceToInfo(device: Device): DeviceInfo {
    return {
      id: device.id,
      name: device.name,
      status: device.status as DeviceInfo['status'],
      isWireless: device.id.includes(':'), // 无线设备通常包含端口号
      apiLevel: undefined, // API级别需要通过其他方式获取
    };
  }

  private isValidIpAddress(ip: string): boolean {
    const ipRegex = /^((25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/;
    return ipRegex.test(ip);
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

/**
 * 创建授权服务实例的工厂函数
 */
export const createAuthorizationService = (adb: ReturnType<typeof useAdb>) => {
  return new AuthorizationService(adb);
};