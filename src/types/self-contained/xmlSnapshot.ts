/**
 * XmlSnapshot 及相关工具（哈希/创建/校验）
 */

export interface XmlSnapshot {
  xmlContent: string;
  xmlHash: string;
  timestamp: number;
  deviceInfo: {
    deviceId: string;
    deviceName: string;
    appPackage: string;
    activityName: string;
  };
  pageInfo: {
    pageTitle: string;
    pageType: string;
    elementCount: number;
    appVersion?: string;
  };
}

// 工具函数：生成XML哈希（保持现有实现与行为不变）
export const generateXmlHash = (xmlContent: string): string => {
  let hash = 0;
  if (xmlContent.length === 0) return hash.toString();
  for (let i = 0; i < xmlContent.length; i++) {
    const char = xmlContent.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // 转为32位
  }
  return Math.abs(hash).toString(16);
};

// 工具函数：创建XML快照（保持现有默认值与结构不变）
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

// 工具函数：验证XML快照完整性（保持现有实现）
export const validateXmlSnapshot = (snapshot: XmlSnapshot): boolean => {
  if (!snapshot.xmlContent || !snapshot.xmlHash) return false;
  const computedHash = generateXmlHash(snapshot.xmlContent);
  return computedHash === snapshot.xmlHash;
};
