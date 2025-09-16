import { invoke } from "@tauri-apps/api/core";

// ===== 数据类型定义 =====

export interface AppStatusResult {
  app_installed: boolean;
  app_running: boolean;
  message: string;
  app_version?: string;
  package_name?: string;
}

export interface NavigationResult {
  success: boolean;
  message: string;
}

export interface XiaohongshuFollowOptions {
  max_pages?: number;
  follow_interval?: number;
  skip_existing?: boolean;
  return_to_home?: boolean;
}

export interface XiaohongshuFollowResult {
  success: boolean;
  total_followed: number;
  pages_processed: number;
  duration: number;
  details: FollowDetail[];
  message: string;
}

export interface FollowDetail {
  user_position: [number, number];
  follow_success: boolean;
  button_text_before?: string;
  button_text_after?: string;
  error?: string;
}

export interface XiaohongshuServiceStatus {
  initialized: boolean;
  current_device_id?: string;
}

export interface CompleteWorkflowResult {
  initialization: boolean;
  app_status: AppStatusResult;
  navigation: NavigationResult;
  follow_result: XiaohongshuFollowResult;
}

// ===== 小红书服务类 =====

export class XiaohongshuService {
  /**
   * 初始化小红书自动化服务
   * @param deviceId Android设备ID，例如 "emulator-5554"
   */
  static async initializeService(deviceId: string): Promise<void> {
    console.log("🚀 初始化小红书服务，设备ID:", deviceId);
    return invoke("initialize_xiaohongshu_service", { deviceId });
  }

  /**
   * 检查小红书应用状态
   * @returns 应用安装和运行状态
   */
  static async checkAppStatus(): Promise<AppStatusResult> {
    console.log("📱 检查小红书应用状态");
    return invoke("check_xiaohongshu_status");
  }

  /**
   * 导航到小红书通讯录页面
   * @returns 导航操作结果
   */
  static async navigateToContacts(): Promise<NavigationResult> {
    console.log("🧭 导航到小红书通讯录页面");
    return invoke("navigate_to_contacts_page");
  }

  /**
   * 执行小红书自动关注
   * @param options 关注配置选项
   * @returns 关注操作结果
   */
  static async autoFollowContacts(
    options?: XiaohongshuFollowOptions
  ): Promise<XiaohongshuFollowResult> {
    console.log("❤️ 开始执行小红书自动关注", options);
    return invoke("auto_follow_contacts", { options });
  }

  /**
   * 获取服务状态
   * @returns 当前服务状态
   */
  static async getServiceStatus(): Promise<XiaohongshuServiceStatus> {
    return invoke("get_xiaohongshu_service_status");
  }

  /**
   * 执行完整的小红书关注工作流程
   * 包含初始化 -> 状态检查 -> 导航 -> 关注的完整流程
   * @param deviceId Android设备ID
   * @param options 关注配置选项
   * @returns 完整工作流程结果
   */
  static async executeCompleteWorkflow(
    deviceId: string,
    options?: XiaohongshuFollowOptions
  ): Promise<CompleteWorkflowResult> {
    console.log("🚀 执行完整的小红书关注工作流程");
    console.log("设备ID:", deviceId);
    console.log("配置选项:", options);

    try {
      const result = await invoke<CompleteWorkflowResult>(
        "execute_complete_xiaohongshu_workflow",
        { deviceId, options }
      );

      console.log("✅ 工作流程执行完成:", result);
      return result;
    } catch (error) {
      console.error("❌ 工作流程执行失败:", error);
      throw new Error(`工作流程执行失败: ${error}`);
    }
  }

  // ===== 工具方法 =====

  /**
   * 验证设备连接状态
   * @param deviceId 设备ID
   * @returns 是否连接成功
   */
  static async validateDeviceConnection(deviceId: string): Promise<boolean> {
    try {
      await this.initializeService(deviceId);
      const status = await this.checkAppStatus();
      return status.app_installed;
    } catch (error) {
      console.error("设备连接验证失败:", error);
      return false;
    }
  }

  /**
   * 获取推荐的关注配置
   * @param mode 模式：'conservative' | 'normal' | 'aggressive'
   * @returns 配置选项
   */
  static getRecommendedOptions(
    mode: "conservative" | "normal" | "aggressive" = "normal"
  ): XiaohongshuFollowOptions {
    const configs = {
      conservative: {
        max_pages: 3,
        follow_interval: 5000, // 5秒
        skip_existing: true,
        return_to_home: true,
      },
      normal: {
        max_pages: 5,
        follow_interval: 2000, // 2秒
        skip_existing: true,
        return_to_home: true,
      },
      aggressive: {
        max_pages: 10,
        follow_interval: 1000, // 1秒
        skip_existing: true,
        return_to_home: true,
      },
    };

    return configs[mode];
  }

  /**
   * 检查关注结果是否成功
   * @param result 关注结果
   * @returns 是否成功及统计信息
   */
  static analyzeFollowResult(result: XiaohongshuFollowResult): {
    isSuccess: boolean;
    successRate: number;
    totalAttempts: number;
    errorSummary: string[];
  } {
    const totalAttempts = result.details.length;
    const successCount = result.details.filter((d) => d.follow_success).length;
    const successRate =
      totalAttempts > 0 ? (successCount / totalAttempts) * 100 : 0;

    const errors = result.details
      .filter((d) => !d.follow_success && d.error)
      .map((d) => d.error!)
      .reduce((acc, error) => {
        acc[error] = (acc[error] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);

    const errorSummary = Object.entries(errors).map(
      ([error, count]) => `${error}: ${count}次`
    );

    return {
      isSuccess: result.success && successRate > 50, // 成功率超过50%才算成功
      successRate,
      totalAttempts,
      errorSummary,
    };
  }

  /**
   * 格式化持续时间
   * @param seconds 秒数
   * @returns 格式化的时间字符串
   */
  static formatDuration(seconds: number): string {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;

    if (minutes > 0) {
      return `${minutes}分${remainingSeconds}秒`;
    }
    return `${remainingSeconds}秒`;
  }

  /**
   * 估算关注所需时间
   * @param options 关注选项
   * @param estimatedContactsPerPage 每页估计联系人数
   * @returns 估算时间（秒）
   */
  static estimateFollowTime(
    options: XiaohongshuFollowOptions,
    estimatedContactsPerPage: number = 10
  ): number {
    const maxPages = options.max_pages || 5;
    const followInterval = options.follow_interval || 2000;
    const totalContacts = maxPages * estimatedContactsPerPage;

    // 基础时间：关注间隔 * 联系人数
    const followTime = (totalContacts * followInterval) / 1000;

    // 导航和滚动时间：每页约3秒
    const navigationTime = maxPages * 3;

    // 总时间包含一些缓冲
    return Math.ceil(followTime + navigationTime + 30); // 额外30秒缓冲
  }
}

// ===== 导出默认配置 =====

export const DEFAULT_FOLLOW_OPTIONS: XiaohongshuFollowOptions = {
  max_pages: 5,
  follow_interval: 2000,
  skip_existing: true,
  return_to_home: true,
};

export const CONSERVATIVE_FOLLOW_OPTIONS: XiaohongshuFollowOptions = {
  max_pages: 3,
  follow_interval: 5000,
  skip_existing: true,
  return_to_home: true,
};

export const AGGRESSIVE_FOLLOW_OPTIONS: XiaohongshuFollowOptions = {
  max_pages: 10,
  follow_interval: 1000,
  skip_existing: true,
  return_to_home: true,
};

