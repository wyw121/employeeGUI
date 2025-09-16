import { invoke } from "@tauri-apps/api/core";
import {
  AdbOperation,
  AdbOperationType,
  AppStatusResult,
  Contact,
  ContactDocument,
  ContactStatistics,
  ContactTask,
  EnhancedImportAndFollowResult,
  ImportAndFollowResult,
  NavigationResult,
  VcfImportResult,
  VcfVerifyResult,
  XiaohongshuFollowOptions,
  XiaohongshuFollowResult,
} from "../types";

/**
 * 通讯录管理API
 * 提供通讯录文档上传、解析、联系人管理等功能
 */
export class ContactAPI {
  /**
   * 上传通讯录文档
   */
  static async uploadContactDocument(
    filePath: string
  ): Promise<ContactDocument> {
    return await invoke<ContactDocument>("upload_contact_document", {
      filePath,
    });
  }

  /**
   * 解析通讯录文档
   */
  static async parseContactDocument(documentId: string): Promise<Contact[]> {
    return await invoke<Contact[]>("parse_contact_document", { documentId });
  }

  /**
   * 获取所有通讯录文档
   */
  static async getContactDocuments(): Promise<ContactDocument[]> {
    return await invoke<ContactDocument[]>("get_contact_documents");
  }

  /**
   * 删除通讯录文档
   */
  static async deleteContactDocument(documentId: string): Promise<void> {
    await invoke("delete_contact_document", { documentId });
  }

  /**
   * 获取联系人列表
   */
  static async getContacts(documentId?: string): Promise<Contact[]> {
    return await invoke<Contact[]>("get_contacts", { documentId });
  }

  /**
   * 搜索联系人
   */
  static async searchContacts(
    query: string,
    documentId?: string
  ): Promise<Contact[]> {
    return await invoke<Contact[]>("search_contacts", { query, documentId });
  }

  /**
   * 更新联系人信息
   */
  static async updateContact(contact: Contact): Promise<void> {
    await invoke("update_contact", { contact });
  }

  /**
   * 删除联系人
   */
  static async deleteContact(contactId: string): Promise<void> {
    await invoke("delete_contact", { contactId });
  }

  /**
   * 批量删除联系人
   */
  static async deleteContacts(contactIds: string[]): Promise<void> {
    await invoke("delete_contacts", { contactIds });
  }

  /**
   * 创建联系任务
   */
  static async createContactTask(
    task: Omit<ContactTask, "id" | "createdAt">
  ): Promise<ContactTask> {
    return await invoke<ContactTask>("create_contact_task", { task });
  }

  /**
   * 获取联系任务列表
   */
  static async getContactTasks(): Promise<ContactTask[]> {
    return await invoke<ContactTask[]>("get_contact_tasks");
  }

  /**
   * 开始执行联系任务
   */
  static async startContactTask(taskId: string): Promise<void> {
    await invoke("start_contact_task", { taskId });
  }

  /**
   * 暂停联系任务
   */
  static async pauseContactTask(taskId: string): Promise<void> {
    await invoke("pause_contact_task", { taskId });
  }

  /**
   * 停止联系任务
   */
  static async stopContactTask(taskId: string): Promise<void> {
    await invoke("stop_contact_task", { taskId });
  }

  /**
   * 删除联系任务
   */
  static async deleteContactTask(taskId: string): Promise<void> {
    await invoke("delete_contact_task", { taskId });
  }

  /**
   * 获取联系统计数据
   */
  static async getContactStatistics(
    timeRange?: "today" | "week" | "month" | "all"
  ): Promise<ContactStatistics> {
    return await invoke<ContactStatistics>("get_contact_statistics", {
      timeRange,
    });
  }

  /**
   * 执行VCF文件导入
   */
  static async executeVcfImport(
    vcfFilePath: string,
    deviceId: string
  ): Promise<any> {
    return await invoke("execute_vcf_import", { vcfFilePath, deviceId });
  }

  /**
   * 检查VCF导入工具是否可用
   */
  static async checkVcfImportTool(): Promise<boolean> {
    return await invoke<boolean>("check_vcf_import_tool");
  }

  /**
   * 写入文件内容
   */
  static async writeFile(path: string, content: string): Promise<void> {
    await invoke("write_file", { path, content });
  }

  /**
   * 删除文件
   */
  static async deleteFile(path: string): Promise<void> {
    await invoke("delete_file", { path });
  }
}

/**
 * ADB设备操作API
 * 提供Android设备的自动化操作功能
 */
export class AdbAPI {
  /**
   * 获取连接的ADB设备列表
   */
  static async getAdbDevices(adbPath: string = "platform-tools/adb.exe"): Promise<string[]> {
    return await invoke<string[]>("get_adb_devices", { adbPath: adbPath });
  }

  /**
   * 连接ADB设备
   */
  static async connectAdbDevice(deviceId: string): Promise<void> {
    await invoke("connect_adb_device", { deviceId });
  }

  /**
   * 断开ADB设备连接
   */
  static async disconnectAdbDevice(deviceId: string): Promise<void> {
    await invoke("disconnect_adb_device", { deviceId });
  }

  /**
   * 执行ADB命令
   */
  static async executeAdbCommand(
    deviceId: string,
    command: string
  ): Promise<string> {
    return await invoke<string>("execute_adb_command", { 
      adbPath: "platform-tools/adb.exe", 
      args: ['-s', deviceId, 'shell', command] 
    });
  }

  /**
   * 屏幕截图
   */
  static async takeScreenshot(deviceId: string): Promise<string> {
    return await invoke<string>("adb_screenshot", { deviceId });
  }

  /**
   * 点击屏幕坐标
   */
  static async tapScreen(
    deviceId: string,
    x: number,
    y: number
  ): Promise<void> {
    await invoke("adb_tap", { deviceId, x, y });
  }

  /**
   * 滑动屏幕
   */
  static async swipeScreen(
    deviceId: string,
    startX: number,
    startY: number,
    endX: number,
    endY: number,
    duration?: number
  ): Promise<void> {
    await invoke("adb_swipe", {
      deviceId,
      startX,
      startY,
      endX,
      endY,
      duration: duration || 1000,
    });
  }

  /**
   * 输入文本
   */
  static async inputText(deviceId: string, text: string): Promise<void> {
    await invoke("adb_input_text", { deviceId, text });
  }

  /**
   * 按键操作
   */
  static async pressKey(deviceId: string, keyCode: number): Promise<void> {
    await invoke("adb_press_key", { deviceId, keyCode });
  }

  /**
   * 启动应用
   */
  static async launchApp(deviceId: string, packageName: string): Promise<void> {
    await invoke("adb_launch_app", { deviceId, packageName });
  }

  /**
   * 关闭应用
   */
  static async closeApp(deviceId: string, packageName: string): Promise<void> {
    await invoke("adb_close_app", { deviceId, packageName });
  }

  /**
   * 安装APK
   */
  static async installApk(deviceId: string, apkPath: string): Promise<void> {
    await invoke("adb_install_apk", { deviceId, apkPath });
  }

  /**
   * 卸载应用
   */
  static async uninstallApp(
    deviceId: string,
    packageName: string
  ): Promise<void> {
    await invoke("adb_uninstall_app", { deviceId, packageName });
  }

  /**
   * 获取设备信息
   */
  static async getDeviceInfo(
    deviceId: string
  ): Promise<Record<string, string>> {
    return await invoke<Record<string, string>>("adb_get_device_info", {
      deviceId,
    });
  }

  /**
   * 获取设备屏幕尺寸
   */
  static async getScreenSize(
    deviceId: string
  ): Promise<{ width: number; height: number }> {
    return await invoke<{ width: number; height: number }>(
      "adb_get_screen_size",
      { deviceId }
    );
  }

  /**
   * 创建ADB操作记录
   */
  static async createAdbOperation(
    deviceId: string,
    type: AdbOperationType,
    command: string
  ): Promise<AdbOperation> {
    return await invoke<AdbOperation>("create_adb_operation", {
      deviceId,
      type,
      command,
    });
  }

  /**
   * 获取ADB操作历史
   */
  static async getAdbOperations(deviceId?: string): Promise<AdbOperation[]> {
    return await invoke<AdbOperation[]>("get_adb_operations", { deviceId });
  }

  /**
   * VCF通讯录导入到Android设备
   */
  static async importVcfContacts(
    deviceId: string,
    contactsFilePath: string
  ): Promise<VcfImportResult> {
    return await invoke<VcfImportResult>("import_vcf_contacts", {
      deviceId: deviceId,
      contactsFilePath: contactsFilePath,
    });
  }

  /**
   * VCF通讯录导入到Android设备（Intent方法 + 传统方法回退）
   */
  static async importVcfContactsWithIntentFallback(
    deviceId: string,
    contactsFilePath: string
  ): Promise<VcfImportResult> {
    return await invoke<VcfImportResult>("import_vcf_contacts_with_intent_fallback", {
      deviceId: deviceId,
      contactsFilePath: contactsFilePath,
    });
  }

  /**
   * 🌟 多设备兼容VCF通讯录导入
   * 支持华为、小米、OPPO、vivo、三星等多品牌设备
   * 自动尝试所有导入策略，直到找到适合当前设备的方法
   */
  static async importVcfContactsMultiDevice(
    deviceId: string,
    contactsFilePath: string
  ): Promise<VcfImportResult> {
    return await invoke<VcfImportResult>("import_vcf_contacts_multi_device", {
      deviceId: deviceId,
      contactsFilePath: contactsFilePath,
    });
  }

  /**
   * 🧪 测试多设备导入策略
   * 检测当前设备支持哪些导入方式，用于调试和分析
   */
  static async testMultiDeviceImportStrategies(
    deviceId: string
  ): Promise<string> {
    return await invoke<string>("test_multi_device_import_strategies", {
      deviceId: deviceId,
    });
  }

  /**
   * 生成VCF文件从联系人列表
   */
  static async generateVcfFile(
    contacts: Contact[],
    outputPath: string
  ): Promise<string> {
    return await invoke<string>("generate_vcf_file", {
      contacts,
      outputPath,
    });
  }

  /**
   * 验证VCF导入结果
   */
  static async verifyVcfImport(
    deviceId: string,
    expectedContacts: Contact[]
  ): Promise<VcfVerifyResult> {
    return await invoke<VcfVerifyResult>("verify_vcf_import", {
      deviceId,
      expectedContacts,
    });
  }

  /**
   * 小红书自动关注通讯录好友
   */
  static async xiaohongshuAutoFollow(
    deviceId: string,
    options?: XiaohongshuFollowOptions
  ): Promise<XiaohongshuFollowResult> {
    return await invoke<XiaohongshuFollowResult>("xiaohongshu_auto_follow", {
      deviceId,
      options,
    });
  }

  /**
   * 完整的VCF导入+小红书自动关注流程
   */
  static async importAndFollowXiaohongshu(
    deviceId: string,
    contactsFilePath: string,
    options?: XiaohongshuFollowOptions
  ): Promise<ImportAndFollowResult> {
    return await invoke<ImportAndFollowResult>(
      "import_and_follow_xiaohongshu",
      {
        deviceId,
        contactsFilePath,
        options,
      }
    );
  }

  /**
   * 完整的VCF导入+小红书自动关注流程（增强版 - 包含详细步骤信息和完整状态检查）
   */
  static async importAndFollowXiaohongshuEnhanced(
    deviceId: string,
    contactsFilePath: string,
    options?: XiaohongshuFollowOptions
  ): Promise<EnhancedImportAndFollowResult> {
    return await invoke<EnhancedImportAndFollowResult>(
      "import_and_follow_xiaohongshu_enhanced",
      {
        deviceId,
        contactsFilePath,
        options,
      }
    );
  }

  /**
   * 检查小红书应用状态
   */
  static async checkXiaohongshuAppStatus(
    deviceId: string
  ): Promise<AppStatusResult> {
    return await invoke<AppStatusResult>("check_xiaohongshu_app_status", {
      deviceId,
    });
  }

  /**
   * 导航到小红书通讯录页面
   */
  static async navigateToXiaohongshuContacts(
    deviceId: string
  ): Promise<NavigationResult> {
    return await invoke<NavigationResult>("navigate_to_xiaohongshu_contacts", {
      deviceId,
    });
  }

  /**
   * 使用权限测试中的可靠导入方法（直接调用基础VCF导入）
   */
  static async importVcfContactsReliable(
    deviceId: string,
    contactsFilePath: string
  ): Promise<VcfImportResult> {
    try {
      const result = await invoke<string>("test_vcf_import_with_permission", {
        device_id: deviceId,
        contacts_file: contactsFilePath,
      });
      
      // 解析权限测试返回的字符串结果
      const regex = /成功=(\w+), 总数=(\d+), 导入=(\d+), 失败=(\d+), 消息='([^']*)'/;
      const parts = regex.exec(result) || [];
      
      return {
        success: parts[1] === 'true',
        totalContacts: parseInt(parts[2]) || 0,
        importedContacts: parseInt(parts[3]) || 0,
        failedContacts: parseInt(parts[4]) || 0,
        message: parts[5] || result,
        details: result
      };
    } catch (error) {
      return {
        success: false,
        totalContacts: 0,
        importedContacts: 0,
        failedContacts: 0,
        message: `导入失败: ${String(error)}`,
        details: String(error)
      };
    }
  }
}

