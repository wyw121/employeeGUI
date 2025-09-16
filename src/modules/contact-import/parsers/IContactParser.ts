/**
 * 联系人解析器接口
 * 负责将不同格式的联系人文件解析为标准Contact对象
 */

import { Contact, ParseOptions, ValidationResult } from "../types";

export interface IContactParser {
  /**
   * 解析联系人文件内容
   * @param content 文件内容
   * @param options 解析选项
   * @returns 解析后的联系人数组
   */
  parse(content: string, options?: ParseOptions): Promise<Contact[]>;

  /**
   * 验证文件格式是否支持
   * @param content 文件内容
   * @returns 是否支持该格式
   */
  validateFormat(content: string): boolean;

  /**
   * 获取支持的文件扩展名
   * @returns 支持的扩展名数组
   */
  getSupportedExtensions(): string[];

  /**
   * 获取解析器名称
   * @returns 解析器名称
   */
  getName(): string;

  /**
   * 验证解析的联系人数据
   * @param contacts 联系人数组
   * @returns 验证结果
   */
  validateContacts(contacts: Contact[]): ValidationResult;

  /**
   * 获取解析统计信息
   * @param content 文件内容
   * @returns 统计信息
   */
  getParseStats(content: string): Promise<{
    estimatedCount: number;
    fileSize: number;
    encoding: string;
    format: string;
  }>;
}

/**
 * 抽象解析器基类
 * 提供通用的解析器功能实现
 */
export abstract class AbstractContactParser implements IContactParser {
  protected readonly name: string;
  protected readonly supportedExtensions: string[];

  constructor(name: string, supportedExtensions: string[]) {
    this.name = name;
    this.supportedExtensions = supportedExtensions;
  }

  abstract parse(content: string, options?: ParseOptions): Promise<Contact[]>;
  abstract validateFormat(content: string): boolean;

  getName(): string {
    return this.name;
  }

  getSupportedExtensions(): string[] {
    return [...this.supportedExtensions];
  }

  validateContacts(contacts: Contact[]): ValidationResult {
    const errors: any[] = [];
    const warnings: any[] = [];

    contacts.forEach((contact, index) => {
      // 基础验证
      if (!contact.name || contact.name.trim() === "") {
        errors.push({
          code: "MISSING_NAME",
          message: `联系人 #${index + 1} 缺少姓名`,
          field: "name",
          value: contact.name,
          severity: "error" as const,
        });
      }

      if (!contact.phone && !contact.email) {
        warnings.push({
          code: "NO_CONTACT_INFO",
          message: `联系人 "${contact.name}" 没有电话号码或邮箱`,
          field: "phone|email",
          severity: "warning" as const,
          suggestion: "建议提供至少一种联系方式",
        });
      }

      // 电话号码格式验证
      if (contact.phone && !this.validatePhoneNumber(contact.phone)) {
        warnings.push({
          code: "INVALID_PHONE_FORMAT",
          message: `联系人 "${contact.name}" 的电话号码格式可能不正确: ${contact.phone}`,
          field: "phone",
          value: contact.phone,
          severity: "warning" as const,
          suggestion: "建议检查电话号码格式",
        });
      }

      // 邮箱格式验证
      if (contact.email && !this.validateEmail(contact.email)) {
        warnings.push({
          code: "INVALID_EMAIL_FORMAT",
          message: `联系人 "${contact.name}" 的邮箱格式不正确: ${contact.email}`,
          field: "email",
          value: contact.email,
          severity: "warning" as const,
          suggestion: "建议检查邮箱地址格式",
        });
      }
    });

    return {
      valid: errors.length === 0,
      errors,
      warnings,
    };
  }

  async getParseStats(content: string): Promise<{
    estimatedCount: number;
    fileSize: number;
    encoding: string;
    format: string;
  }> {
    return {
      estimatedCount: this.estimateContactCount(content),
      fileSize: new Blob([content]).size,
      encoding: this.detectEncoding(content),
      format: this.getName(),
    };
  }

  /**
   * 估算联系人数量
   * @param content 文件内容
   * @returns 估算的联系人数量
   */
  protected abstract estimateContactCount(content: string): number;

  /**
   * 检测文件编码
   * @param content 文件内容
   * @returns 编码类型
   */
  protected detectEncoding(content: string): string {
    // 简单的编码检测逻辑
    try {
      // 检查是否包含中文字符
      if (/[\u4e00-\u9fa5]/.test(content)) {
        return "UTF-8";
      }
      return "ASCII";
    } catch {
      return "Unknown";
    }
  }

  /**
   * 验证电话号码格式
   * @param phone 电话号码
   * @returns 是否有效
   */
  protected validatePhoneNumber(phone: string): boolean {
    // 简单的电话号码验证
    const phoneRegex = /^[\d\s\-+()]{7,}$/;
    return phoneRegex.test(phone.trim());
  }

  /**
   * 验证邮箱格式
   * @param email 邮箱地址
   * @returns 是否有效
   */
  protected validateEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email.trim());
  }

  /**
   * 生成联系人ID
   * @param contact 联系人信息
   * @returns 唯一ID
   */
  protected generateContactId(contact: Partial<Contact>): string {
    const hash = this.simpleHash(
      `${contact.name}-${contact.phone}-${contact.email}`
    );
    return `contact_${hash}_${Date.now()}`;
  }

  /**
   * 简单哈希函数
   * @param str 字符串
   * @returns 哈希值
   */
  private simpleHash(str: string): string {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = (hash << 5) - hash + char;
      hash = hash & hash; // Convert to 32bit integer
    }
    return Math.abs(hash).toString(36);
  }
}

