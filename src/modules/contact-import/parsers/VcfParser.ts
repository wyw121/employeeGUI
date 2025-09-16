/**
 * VCF (vCard) 格式联系人解析器
 * 支持 vCard 2.1, 3.0, 4.0 格式
 */

import { Contact, ParseOptions, SocialProfile } from "../types";
import { AbstractContactParser } from "./IContactParser";

export class VcfParser extends AbstractContactParser {
  constructor() {
    super("VCF Parser", [".vcf", ".vcard"]);
  }

  async parse(content: string, options?: ParseOptions): Promise<Contact[]> {
    const contacts: Contact[] = [];
    const vcards = this.splitVCards(content);

    for (const vcard of vcards) {
      if (vcard.trim()) {
        try {
          const contact = this.parseVCard(vcard);
          if (contact) {
            contacts.push(contact);
          }
        } catch (error) {
          console.warn(
            "解析vCard失败:",
            error,
            "内容:",
            vcard.substring(0, 100)
          );
          // 如果不是严格模式，继续处理其他联系人
          if (options?.strict) {
            throw new Error(
              `vCard解析失败: ${
                error instanceof Error ? error.message : String(error)
              }`
            );
          }
        }
      }
    }

    return contacts;
  }

  validateFormat(content: string): boolean {
    const trimmed = content.trim();
    return trimmed.includes("BEGIN:VCARD") && trimmed.includes("END:VCARD");
  }

  protected estimateContactCount(content: string): number {
    const matches = content.match(/BEGIN:VCARD/gi);
    return matches ? matches.length : 0;
  }

  /**
   * 分割多个vCard
   * @param content VCF文件内容
   * @returns vCard数组
   */
  private splitVCards(content: string): string[] {
    const vcards: string[] = [];
    const lines = content.split(/\r?\n/);
    let currentVCard: string[] = [];
    let inVCard = false;

    for (const line of lines) {
      const trimmedLine = line.trim();

      if (trimmedLine === "BEGIN:VCARD") {
        inVCard = true;
        currentVCard = [line];
      } else if (trimmedLine === "END:VCARD" && inVCard) {
        currentVCard.push(line);
        vcards.push(currentVCard.join("\n"));
        currentVCard = [];
        inVCard = false;
      } else if (inVCard) {
        currentVCard.push(line);
      }
    }

    return vcards;
  }

  /**
   * 解析单个vCard
   * @param vcardContent vCard内容
   * @returns Contact对象
   */
  private parseVCard(vcardContent: string): Contact | null {
    const lines = vcardContent.split(/\r?\n/);
    const contact: Partial<Contact> = {
      socialProfiles: [],
    };

    // 处理多行属性（以空格或制表符开头的行是上一行的续行）
    const processedLines = this.unfoldLines(lines);

    for (const line of processedLines) {
      const trimmedLine = line.trim();
      if (
        !trimmedLine ||
        trimmedLine === "BEGIN:VCARD" ||
        trimmedLine === "END:VCARD"
      ) {
        continue;
      }

      try {
        this.parseVCardLine(trimmedLine, contact);
      } catch (error) {
        console.warn("解析vCard行失败:", trimmedLine, error);
      }
    }

    // 验证必要字段
    if (!contact.name || contact.name.trim() === "") {
      return null;
    }

    // 生成ID和元数据
    const finalContact: Contact = {
      id: this.generateContactId(contact),
      name: contact.name,
      phone: contact.phone,
      email: contact.email,
      organization: contact.organization,
      title: contact.title,
      address: contact.address,
      note: contact.note,
      photoUrl: contact.photoUrl,
      socialProfiles: contact.socialProfiles || [],
      customFields: contact.customFields || {},
      metadata: {
        source: "VCF Import",
        importedAt: new Date(),
        originalFormat: "vcf",
      },
    };

    return finalContact;
  }

  /**
   * 展开多行属性（处理vCard的行折叠）
   * @param lines 原始行数组
   * @returns 处理后的行数组
   */
  private unfoldLines(lines: string[]): string[] {
    const unfolded: string[] = [];
    let currentLine = "";

    for (const line of lines) {
      if (line.startsWith(" ") || line.startsWith("\t")) {
        // 这是前一行的续行
        currentLine += line.substring(1);
      } else {
        if (currentLine) {
          unfolded.push(currentLine);
        }
        currentLine = line;
      }
    }

    if (currentLine) {
      unfolded.push(currentLine);
    }

    return unfolded;
  }

  /**
   * 解析vCard中的单行属性
   * @param line vCard行
   * @param contact 联系人对象
   */
  private parseVCardLine(line: string, contact: Partial<Contact>): void {
    const colonIndex = line.indexOf(":");
    if (colonIndex === -1) return;

    const propertyPart = line.substring(0, colonIndex);
    const value = line.substring(colonIndex + 1);

    // 解析属性名和参数
    const { property, params } = this.parseProperty(propertyPart);

    switch (property.toUpperCase()) {
      case "FN":
      case "N":
        if (!contact.name || property.toUpperCase() === "FN") {
          contact.name = this.unescapeVCardValue(value);
        }
        break;

      case "TEL":
        if (!contact.phone) {
          contact.phone = this.cleanPhoneNumber(this.unescapeVCardValue(value));
        }
        break;

      case "EMAIL":
        if (!contact.email) {
          contact.email = this.unescapeVCardValue(value);
        }
        break;

      case "ORG":
        contact.organization = this.unescapeVCardValue(value);
        break;

      case "TITLE":
        contact.title = this.unescapeVCardValue(value);
        break;

      case "ADR":
        contact.address = this.parseAddress(this.unescapeVCardValue(value));
        break;

      case "NOTE":
        contact.note = this.unescapeVCardValue(value);
        break;

      case "PHOTO":
        contact.photoUrl = this.parsePhoto(value, params);
        break;

      case "URL":
        this.parseSocialProfile(value, contact);
        break;

      case "X-SOCIALPROFILE":
        this.parseCustomSocialProfile(value, params, contact);
        break;

      default:
        // 处理自定义字段
        if (property.startsWith("X-") || property.startsWith("x-")) {
          if (!contact.customFields) {
            contact.customFields = {};
          }
          contact.customFields[property] = this.unescapeVCardValue(value);
        }
        break;
    }
  }

  /**
   * 解析vCard属性和参数
   * @param propertyPart 属性部分
   * @returns 属性名和参数
   */
  private parseProperty(propertyPart: string): {
    property: string;
    params: Record<string, string>;
  } {
    const parts = propertyPart.split(";");
    const property = parts[0];
    const params: Record<string, string> = {};

    for (let i = 1; i < parts.length; i++) {
      const paramPart = parts[i];
      const equalIndex = paramPart.indexOf("=");
      if (equalIndex !== -1) {
        const paramName = paramPart.substring(0, equalIndex).trim();
        const paramValue = paramPart.substring(equalIndex + 1).trim();
        params[paramName.toUpperCase()] = paramValue;
      }
    }

    return { property, params };
  }

  /**
   * 反转义vCard值
   * @param value 原始值
   * @returns 反转义后的值
   */
  private unescapeVCardValue(value: string): string {
    return value
      .replace(/\\n/g, "\n")
      .replace(/\\r/g, "\r")
      .replace(/\\t/g, "\t")
      .replace(/\\;/g, ";")
      .replace(/\\,/g, ",")
      .replace(/\\\\/g, "\\");
  }

  /**
   * 清理电话号码
   * @param phone 原始电话号码
   * @returns 清理后的电话号码
   */
  private cleanPhoneNumber(phone: string): string {
    // 移除常见的格式化字符，但保留数字、+、-、空格、括号
    return phone.replace(/[^\d+\-\s()]/g, "").trim();
  }

  /**
   * 解析地址
   * @param addressValue 地址值
   * @returns 格式化的地址
   */
  private parseAddress(addressValue: string): string {
    // vCard地址格式: PO Box;Extended Address;Street;City;State;Postal Code;Country
    const parts = addressValue.split(";");
    const addressParts = parts.filter((part) => part && part.trim() !== "");
    return addressParts.join(", ");
  }

  /**
   * 解析照片
   * @param value 照片值
   * @param params 参数
   * @returns 照片URL或base64数据
   */
  private parsePhoto(
    value: string,
    params: Record<string, string>
  ): string | undefined {
    if (params.VALUE === "URI" || value.startsWith("http")) {
      return value;
    } else if (params.ENCODING === "BASE64" || params.ENCODING === "b") {
      // 返回base64数据URL
      const mediaType = params.TYPE || "image/jpeg";
      return `data:${mediaType};base64,${value}`;
    }
    return undefined;
  }

  /**
   * 解析社交资料
   * @param url URL
   * @param contact 联系人对象
   */
  private parseSocialProfile(url: string, contact: Partial<Contact>): void {
    const socialProfile = this.identifySocialPlatform(url);
    if (socialProfile) {
      if (!contact.socialProfiles) {
        contact.socialProfiles = [];
      }
      contact.socialProfiles.push(socialProfile);
    }
  }

  /**
   * 解析自定义社交资料
   * @param value 值
   * @param params 参数
   * @param contact 联系人对象
   */
  private parseCustomSocialProfile(
    value: string,
    params: Record<string, string>,
    contact: Partial<Contact>
  ): void {
    if (!contact.socialProfiles) {
      contact.socialProfiles = [];
    }

    const platform = (
      params.TYPE || "other"
    ).toLowerCase() as SocialProfile["platform"];
    contact.socialProfiles.push({
      platform: ["xiaohongshu", "weibo", "wechat", "qq"].includes(platform)
        ? (platform as SocialProfile["platform"])
        : "other",
      username: value,
      url: params.URL,
    });
  }

  /**
   * 识别社交平台
   * @param url URL
   * @returns 社交资料对象
   */
  private identifySocialPlatform(url: string): SocialProfile | null {
    const lowercaseUrl = url.toLowerCase();

    if (
      lowercaseUrl.includes("xiaohongshu.com") ||
      lowercaseUrl.includes("redbook.com")
    ) {
      return {
        platform: "xiaohongshu",
        username: this.extractUsernameFromUrl(url),
        url,
      };
    } else if (lowercaseUrl.includes("weibo.com")) {
      return {
        platform: "weibo",
        username: this.extractUsernameFromUrl(url),
        url,
      };
    } else if (
      lowercaseUrl.includes("wechat") ||
      lowercaseUrl.includes("weixin")
    ) {
      return {
        platform: "wechat",
        username: this.extractUsernameFromUrl(url),
        url,
      };
    } else if (lowercaseUrl.includes("qq.com")) {
      return {
        platform: "qq",
        username: this.extractUsernameFromUrl(url),
        url,
      };
    }

    return null;
  }

  /**
   * 从URL中提取用户名
   * @param url URL
   * @returns 用户名
   */
  private extractUsernameFromUrl(url: string): string {
    try {
      const urlObj = new URL(url);
      const pathname = urlObj.pathname;
      const segments = pathname.split("/").filter((segment) => segment);
      return segments[segments.length - 1] || url;
    } catch {
      return url;
    }
  }
}

