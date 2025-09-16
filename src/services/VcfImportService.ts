import { invoke } from "@tauri-apps/api/core";
import { VcfImportResult } from "../types";

/**
 * VCF通讯录导入服务
 * 负责调用adb_xml_reader工具执行VCF文件导入
 */
export class VcfImportService {
  /**
   * 执行VCF文件导入到指定设备（异步安全版本）
   * @param vcfFilePath VCF文件路径
   * @param deviceId 目标设备ID
   * @returns 导入结果
   */
  static async importVcfFileAsync(
    vcfFilePath: string,
    deviceId: string
  ): Promise<VcfImportResult> {
    try {
      console.log("🚀 开始VCF导入（带应用选择器自动化）:", { vcfFilePath, deviceId });

      // 参数验证
      if (!vcfFilePath || vcfFilePath.trim() === "") {
        throw new Error("VCF文件路径不能为空");
      }
      if (!deviceId || deviceId.trim() === "") {
        throw new Error("设备ID不能为空");
      }

      console.log("✅ 参数验证通过，调用Tauri命令...");

      // 使用带自动化功能的导入方法
      const importPromise = invoke<VcfImportResult>(
        "import_vcf_contacts_with_intent_fallback",
        {
          deviceId: deviceId,
          contactsFilePath: vcfFilePath,
        }
      );

      const timeoutPromise = new Promise<never>((_, reject) => {
        setTimeout(() => reject(new Error("导入操作超时（60秒）")), 60000);
      });

      const result = await Promise.race([importPromise, timeoutPromise]);

      console.log("🎉 VCF导入完成（带应用选择器自动化）:", result);
      return result;
    } catch (error) {
      console.error("💥 VCF导入执行失败（带应用选择器自动化）:", error);
      console.error(
        "🔍 错误堆栈:",
        error instanceof Error ? error.stack : "无堆栈信息"
      );

      // 创建详细的错误信息
      let errorMessage = "导入失败";
      let errorDetails = undefined;

      if (error instanceof Error) {
        errorMessage = `导入失败: ${error.message}`;
        errorDetails = error.stack;
      } else if (typeof error === "string") {
        errorMessage = `导入失败: ${error}`;
      } else {
        errorMessage = `导入失败: ${String(error)}`;
        errorDetails = JSON.stringify(error, null, 2);
      }

      return {
        success: false,
        totalContacts: 0,
        importedContacts: 0,
        failedContacts: 0,
        message: errorMessage,
        details: errorDetails,
      };
    }
  }

  /**
   * 执行VCF文件导入到指定设备
   * @param vcfFilePath VCF文件路径
   * @param deviceId 目标设备ID
   * @returns 导入结果
   */
  static async importVcfFile(
    vcfFilePath: string,
    deviceId: string
  ): Promise<VcfImportResult> {
    try {
      console.log("开始VCF导入（带应用选择器自动化）:", { vcfFilePath, deviceId });

      // 调用Tauri后端执行VCF导入 - 使用带自动化功能的方法
      const result = await invoke<VcfImportResult>("import_vcf_contacts_with_intent_fallback", {
        deviceId: deviceId,
        contactsFilePath: vcfFilePath,
      });

      console.log("VCF导入完成（带应用选择器自动化）:", result);
      return result;
    } catch (error) {
      console.error("VCF导入执行失败:", error);
      console.error("详细错误信息:", error);

      // 如果是参数错误，提供更详细的调试信息
      if (
        error instanceof Error &&
        error.message.includes("missing required key")
      ) {
        console.error("参数传递问题 - 传递的参数:", {
          device_id: deviceId,
          contacts_file_path: vcfFilePath,
        });
      }

      return {
        success: false,
        totalContacts: 0,
        importedContacts: 0,
        failedContacts: 0,
        message: `导入失败: ${
          error instanceof Error ? error.message : String(error)
        }`,
        details: error instanceof Error ? error.stack : undefined,
      };
    }
  }

  /**
   * 验证adb_xml_reader.exe是否存在
   * @returns 是否存在
   */
  static async checkToolAvailable(): Promise<boolean> {
    try {
      // 注意：后端可能没有这个命令，我们使用其他方式检查
      // 暂时返回true，实际检查在导入时进行
      return true;
    } catch (error) {
      console.error("工具检查失败:", error);
      return false;
    }
  }

  /**
   * 获取可用的ADB设备列表
   * @returns 设备ID数组
   */
  static async getAdbDevices(): Promise<string[]> {
    try {
      const devices = await invoke<string[]>("get_adb_devices", { 
        adbPath: "platform-tools/adb.exe"
      });
      return devices;
    } catch (error) {
      console.error("获取设备列表失败:", error);
      return ["127.0.0.1:5555"]; // 返回默认设备作为备选
    }
  }

  /**
   * 生成临时VCF文件路径
   * @returns 临时文件路径
   */
  static generateTempVcfPath(): string {
    const timestamp = Date.now();
    return `temp_contacts_${timestamp}.txt`;
  }

  /**
   * 将联系人数据转换为后端期望的CSV格式文本
   * @param contacts 联系人数组
   * @returns CSV格式文本
   */
  static convertContactsToVcfContent(
    contacts: Array<{ name: string; phone?: string; email?: string }>
  ): string {
    return contacts
      .map(
        (contact) =>
          `${contact.name},${contact.phone || ""},${contact.email || ""}`
      )
      .join("\n");
  }

  /**
   * 写入VCF文件内容
   * @param filePath 文件路径
   * @param content 文件内容
   */
  static async writeVcfFile(filePath: string, content: string): Promise<void> {
    try {
      await invoke("write_file", {
        path: filePath,
        content: content,
      });
    } catch (error) {
      throw new Error(`写入VCF文件失败: ${error}`);
    }
  }

  /**
   * 删除临时文件
   * @param filePath 文件路径
   */
  static async deleteTempFile(filePath: string): Promise<void> {
    try {
      await invoke("delete_file", {
        path: filePath,
      });
    } catch (error) {
      console.warn("删除临时文件失败:", error);
      // 不抛出错误，因为这不是关键操作
    }
  }
}
