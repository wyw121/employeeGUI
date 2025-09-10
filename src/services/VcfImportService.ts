import { invoke } from "@tauri-apps/api/core";
import { VcfImportResult } from "../types";

/**
 * VCF通讯录导入服务
 * 负责调用adb_xml_reader工具执行VCF文件导入
 */
export class VcfImportService {
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
      console.log("开始VCF导入:", { vcfFilePath, deviceId });

      // 调用Tauri后端执行VCF导入
      const result = await invoke<VcfImportResult>("execute_vcf_import", {
        vcfFilePath,
        deviceId,
      });

      console.log("VCF导入完成:", result);
      return result;
    } catch (error) {
      console.error("VCF导入执行失败:", error);
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
      const available = await invoke<boolean>("check_vcf_import_tool");
      return available;
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
      const devices = await invoke<string[]>("get_adb_devices");
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
   * 将联系人数据转换为VCF格式文本
   * @param contacts 联系人数组
   * @returns VCF格式文本
   */
  static convertContactsToVcfContent(
    contacts: Array<{ name: string; phone?: string; email?: string }>
  ): string {
    return contacts
      .map(
        (contact) =>
          `${contact.name},${contact.phone || ""},,,${contact.email || ""}`
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
