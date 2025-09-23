/**
 * 自包含XML快照数据结构定义
 * 用于实现真正的自包含脚本，每个步骤都包含完整的XML页面快照
 */

// XML快照数据结构
export interface XmlSnapshot {
  /** 完整XML内容 - 核心数据 */
  xmlContent: string;
  
  /** XML内容哈希值，用于验证数据完整性 */
  xmlHash: string;
  
  /** 快照创建时间戳 */
  timestamp: number;
  
  /** 设备信息 */
  deviceInfo: {
    deviceId: string;
    deviceName: string;
    appPackage: string;
    activityName: string;
  };
  
  /** 页面信息 */
  pageInfo: {
    pageTitle: string;
    pageType: string;
    elementCount: number;
    appVersion?: string;
  };
}

// 元素定位信息
export interface ElementLocator {
  /** 元素选中时的边界信息 */
  selectedBounds: {
    left: number;
    top: number;
    right: number;
    bottom: number;
  };
  
  /** 元素在XML中的路径 */
  elementPath: string;
  
  /** 选择置信度 */
  confidence: number;
  
  /** 额外的定位信息 */
  additionalInfo?: {
    xpath?: string;
    resourceId?: string;
    text?: string;
    contentDesc?: string;
    className?: string;
  };
}

// 自包含步骤参数
export interface SelfContainedStepParameters {
  // 传统参数保持不变
  text?: string;
  element_text?: string;
  element_type?: string;
  resource_id?: string;
  content_desc?: string;
  bounds?: any;
  xpath?: string;
  
  // 🆕 自包含XML快照 - 核心功能
  xmlSnapshot?: XmlSnapshot;
  
  // 🆕 元素定位信息
  elementLocator?: ElementLocator;
  
  // 智能分析信息（保持兼容）
  smartDescription?: string;
  smartAnalysis?: any;
  isEnhanced?: boolean;
  
  // 废弃字段（保持向后兼容，但新系统不再使用）
  xmlCacheId?: string; // 废弃：改用 xmlSnapshot
  xmlContent?: string; // 废弃：改用 xmlSnapshot.xmlContent
  xmlTimestamp?: number; // 废弃：改用 xmlSnapshot.timestamp
  deviceId?: string; // 废弃：改用 xmlSnapshot.deviceInfo.deviceId
  deviceName?: string; // 废弃：改用 xmlSnapshot.deviceInfo.deviceName
}

// 工具函数：生成XML哈希
export const generateXmlHash = (xmlContent: string): string => {
  // 简单哈希算法（生产环境可考虑使用更强的哈希）
  let hash = 0;
  if (xmlContent.length === 0) return hash.toString();
  for (let i = 0; i < xmlContent.length; i++) {
    const char = xmlContent.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // 转换为32位整数
  }
  return Math.abs(hash).toString(16);
};

// 工具函数：创建XML快照
export const createXmlSnapshot = (
  xmlContent: string,
  deviceInfo: XmlSnapshot['deviceInfo'],
  pageInfo: XmlSnapshot['pageInfo']
): XmlSnapshot => {
  return {
    xmlContent,
    xmlHash: generateXmlHash(xmlContent),
    timestamp: Date.now(),
    deviceInfo,
    pageInfo,
  };
};

// 工具函数：验证XML快照完整性
export const validateXmlSnapshot = (snapshot: XmlSnapshot): boolean => {
  if (!snapshot.xmlContent || !snapshot.xmlHash) {
    return false;
  }
  
  const computedHash = generateXmlHash(snapshot.xmlContent);
  return computedHash === snapshot.xmlHash;
};

// 工具函数：从旧格式参数迁移到新格式
export const migrateToSelfContainedParameters = (
  oldParams: any,
  currentXmlContent?: string,
  currentDeviceInfo?: Partial<XmlSnapshot['deviceInfo']>,
  currentPageInfo?: Partial<XmlSnapshot['pageInfo']>
): SelfContainedStepParameters => {
  // 保留所有传统参数
  const newParams: SelfContainedStepParameters = { ...oldParams };
  
  // 如果有旧的XML信息，迁移到新结构
  if (oldParams.xmlContent || currentXmlContent) {
    const xmlContent = oldParams.xmlContent || currentXmlContent || '';
    
    if (xmlContent) {
      newParams.xmlSnapshot = createXmlSnapshot(
        xmlContent,
        {
          deviceId: oldParams.deviceId || currentDeviceInfo?.deviceId || 'unknown',
          deviceName: oldParams.deviceName || currentDeviceInfo?.deviceName || 'unknown',
          appPackage: currentDeviceInfo?.appPackage || 'com.xingin.xhs',
          activityName: currentDeviceInfo?.activityName || 'unknown',
        },
        {
          pageTitle: currentPageInfo?.pageTitle || '未知页面',
          pageType: currentPageInfo?.pageType || 'unknown',
          elementCount: currentPageInfo?.elementCount || 0,
          appVersion: currentPageInfo?.appVersion,
        }
      );
      
      // 如果有边界信息，创建定位器
      if (oldParams.bounds) {
        newParams.elementLocator = {
          selectedBounds: oldParams.bounds,
          elementPath: oldParams.xpath || oldParams.element_path || '',
          confidence: oldParams.smartAnalysis?.confidence || 0.8,
          additionalInfo: {
            xpath: oldParams.xpath,
            resourceId: oldParams.resource_id,
            text: oldParams.text,
            contentDesc: oldParams.content_desc,
            className: oldParams.class_name,
          },
        };
      }
      
      // 清理旧字段（保持向后兼容，但标记为废弃）
      // 注释：这些字段在新系统中不再使用，但保留以防止破坏现有功能
    }
  }
  
  return newParams;
};