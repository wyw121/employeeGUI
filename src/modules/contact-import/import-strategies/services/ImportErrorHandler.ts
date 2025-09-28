/**
 * 导入策略执行错误处理工具
 * 
 * 提供统一的错误分类、用户友好提示和恢复建议
 */
export interface ImportError {
  type: 'device_offline' | 'file_not_found' | 'permission_denied' | 'command_failed' | 'unknown';
  message: string;
  userMessage: string;
  suggestions: string[];
  recoverable: boolean;
}

export class ImportErrorHandler {
  /**
   * 解析Tauri命令错误
   */
  static parseError(error: any, context: { deviceId: string; operation: string }): ImportError {
    const errorMessage = String(error);
    
    // 设备离线错误
    if (errorMessage.includes('设备') && errorMessage.includes('不在线')) {
      return {
        type: 'device_offline',
        message: errorMessage,
        userMessage: `设备 ${context.deviceId} 已断开连接`,
        suggestions: [
          '请检查USB连接',
          '确认设备已开启USB调试',
          '重新连接设备后再试'
        ],
        recoverable: true
      };
    }
    
    // 文件推送失败
    if (errorMessage.includes('文件传输失败') || errorMessage.includes('push')) {
      return {
        type: 'command_failed',
        message: errorMessage,
        userMessage: '文件传输到设备失败',
        suggestions: [
          '检查设备存储空间',
          '确认设备权限设置',
          '重启ADB服务后重试'
        ],
        recoverable: true
      };
    }
    
    // Shell命令执行失败
    if (errorMessage.includes('Shell命令执行失败')) {
      return {
        type: 'command_failed',
        message: errorMessage,
        userMessage: '设备命令执行失败',
        suggestions: [
          '检查设备系统版本兼容性',
          '确认设备root权限（如需要）',
          '使用其他导入策略'
        ],
        recoverable: true
      };
    }
    
    // ADB路径未找到
    if (errorMessage.includes('未找到安全的ADB路径')) {
      return {
        type: 'command_failed',
        message: errorMessage,
        userMessage: 'ADB工具未正确配置',
        suggestions: [
          '检查ADB工具是否正确安装',
          '重新启动应用',
          '联系技术支持'
        ],
        recoverable: false
      };
    }
    
    // 通用错误
    return {
      type: 'unknown',
      message: errorMessage,
      userMessage: `${context.operation}过程中出现未知错误`,
      suggestions: [
        '稍后重试',
        '检查设备连接状态',
        '重启应用'
      ],
      recoverable: true
    };
  }
  
  /**
   * 获取用户友好的错误展示
   */
  static formatErrorForUser(error: ImportError): {
    title: string;
    description: string;
    actions: string[];
  } {
    return {
      title: error.userMessage,
      description: `错误详情：${error.message}`,
      actions: error.suggestions
    };
  }
  
  /**
   * 判断是否可以自动重试
   */
  static shouldAutoRetry(error: ImportError): boolean {
    return error.recoverable && error.type !== 'device_offline';
  }
}