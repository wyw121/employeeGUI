import { invoke } from '@tauri-apps/api/core';

export interface VcfOpenResult {
  success: boolean;
  message: string;
  details?: string;
  steps_completed: string[];
}

/**
 * 雷电模拟器VCF文件操作服务
 * 专门为雷电模拟器优化的VCF文件传输和打开功能
 */
export class LDPlayerVcfService {
  
  /**
   * 打开已存在的VCF文件（适用于文件已传输到设备的情况）
   * @param deviceId 设备ID（如 emulator-5554）
   * @param vcfFilePath 设备上的VCF文件路径
   * @returns 打开结果
   */
  static async openVcfFile(
    deviceId: string,
    vcfFilePath: string
  ): Promise<VcfOpenResult> {
    try {
      console.log("🎯 开始雷电模拟器VCF文件打开:", { deviceId, vcfFilePath });

      const result = await invoke<VcfOpenResult>("open_vcf_file_ldplayer", {
        deviceId: deviceId,
        vcfFilePath: vcfFilePath,
      });

      console.log("✅ VCF文件打开完成:", result);
      return result;
    } catch (error) {
      console.error("❌ VCF文件打开失败:", error);

      return {
        success: false,
        message: `打开失败: ${
          error instanceof Error ? error.message : String(error)
        }`,
        details: error instanceof Error ? error.stack : undefined,
        steps_completed: [],
      };
    }
  }

  /**
   * 完整的VCF导入和打开流程
   * 包括：1. 传输VCF文件到设备  2. 自动打开文件并完成导入
   * @param deviceId 设备ID（如 emulator-5554）
   * @param contactsFilePath 本地联系人文件路径
   * @returns 导入和打开结果
   */
  static async importAndOpenVcf(
    deviceId: string,
    contactsFilePath: string
  ): Promise<VcfOpenResult> {
    try {
      console.log("🚀 开始完整VCF导入和打开流程:", { deviceId, contactsFilePath });

      const result = await invoke<VcfOpenResult>("import_and_open_vcf_ldplayer", {
        deviceId: deviceId,
        contactsFilePath: contactsFilePath,
      });

      console.log("🎉 完整流程完成:", result);
      return result;
    } catch (error) {
      console.error("💥 完整流程失败:", error);

      return {
        success: false,
        message: `导入和打开失败: ${
          error instanceof Error ? error.message : String(error)
        }`,
        details: error instanceof Error ? error.stack : undefined,
        steps_completed: [],
      };
    }
  }

  /**
   * 检查设备上是否存在VCF文件
   * @param deviceId 设备ID
   * @param vcfFilePath VCF文件路径
   * @returns 是否存在
   */
  static async checkVcfFileExists(
    deviceId: string,
    vcfFilePath: string = "/sdcard/Download/contacts_import.vcf"
  ): Promise<boolean> {
    try {
      // 这里可以添加一个专门的检查命令，暂时返回true
      return true;
    } catch (error) {
      console.error("检查VCF文件存在性失败:", error);
      return false;
    }
  }

  /**
   * 获取建议的操作步骤
   * @param currentStep 当前步骤
   * @returns 建议的下一步操作
   */
  static getNextStepSuggestion(currentStep: string): string {
    const suggestions: Record<string, string> = {
      "文件传输": "请使用 '打开VCF文件' 功能完成导入",
      "启动文件管理器": "请检查设备屏幕是否显示文件管理器",
      "导航到下载目录": "请确认已进入下载文件夹",
      "点击VCF文件": "请在设备上手动点击VCF文件",
      "处理应用选择": "请选择联系人应用",
      "确认导入联系人": "请点击导入按钮",
      "导入完成": "导入已完成，请检查联系人列表",
    };

    return suggestions[currentStep] || "请检查设备状态并重试";
  }

  /**
   * 格式化步骤完成状态为用户友好的消息
   * @param steps 已完成的步骤列表
   * @returns 格式化的状态消息
   */
  static formatStepsStatus(steps: string[]): string {
    if (steps.length === 0) {
      return "尚未开始";
    }

    const stepEmojis: Record<string, string> = {
      "文件存在验证": "📄",
      "设备解锁检查": "🔓",
      "启动文件管理器": "📂",
      "导航到下载目录": "📁",
      "点击VCF文件": "👆",
      "处理应用选择": "📱",
      "确认导入联系人": "✅",
      "导入完成": "🎉",
    };

    const formattedSteps = steps.map(step => {
      const emoji = stepEmojis[step] || "✓";
      return `${emoji} ${step}`;
    });

    return formattedSteps.join(" → ");
  }

  /**
   * 获取雷电模拟器的设备信息
   * @param deviceId 设备ID
   * @returns 设备信息
   */
  static getDeviceInfo(deviceId: string): { name: string; type: string } {
    if (deviceId.startsWith("emulator-")) {
      const port = deviceId.split("-")[1];
      return {
        name: `雷电模拟器 (端口 ${port})`,
        type: "LDPlayer"
      };
    }
    
    return {
      name: deviceId,
      type: "Unknown"
    };
  }
}

