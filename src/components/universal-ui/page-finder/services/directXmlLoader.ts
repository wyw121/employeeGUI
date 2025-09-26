import UniversalUIAPI from "../../../../api/universalUIAPI";
import { buildSnapshotIfPossible } from "../../../../modules/self-contained/XmlSnapshotAutoBuilder";
import { parseXML } from "../../xml-parser";
import { message } from "antd";
import { PageFinderLoadContext } from "./loadContext";


export interface DirectXmlLoadParams {
  stepId: string;
  xmlContent: string;
  deviceId?: string;
  deviceName?: string;
}

// 兼容历史：原 DirectXmlLoadContext 被统一抽象为 PageFinderLoadContext
export type DirectXmlLoadContext = PageFinderLoadContext;

/**
 * 抽离：从步骤内嵌 XML 内容加载页面。
 * 保持原日志/行为一致（包括重复跳过、快照构建、解析、视图切换）。
 */
export async function handleLoadFromDirectXmlContent(
  info: DirectXmlLoadParams,
  ctx: DirectXmlLoadContext
): Promise<boolean> {
  const {
    currentXmlContent,
    setCurrentXmlContent,
    setCurrentXmlCacheId,
    setSelectedDevice,
    setUIElements,
    setElements,
    setCategories,
    setViewMode,
    onXmlContentUpdated,
    emitSnapshotUpdated,
  } = ctx;

  try {
    if (currentXmlContent === info.xmlContent) {
      console.log("⏸️ XML内容相同，跳过重复加载:", {
        stepId: info.stepId,
        xmlLength: info.xmlContent.length,
      });
      return true;
    }

    console.log("✨ 从步骤直接传递的XML内容加载:", info);
    setCurrentXmlContent(info.xmlContent);
    setCurrentXmlCacheId(`direct_${info.stepId}_${Date.now()}`);

    if (onXmlContentUpdated && currentXmlContent !== info.xmlContent) {
      const deviceInfo = info.deviceId
        ? {
            deviceId: info.deviceId,
            deviceName: info.deviceName || info.deviceId,
            appPackage: "com.xingin.xhs",
            activityName: "unknown",
          }
        : undefined;
      onXmlContentUpdated(info.xmlContent, deviceInfo, {
        appName: "小红书",
        pageTitle: "步骤内置XML",
      });
      const snap = buildSnapshotIfPossible(info.xmlContent, deviceInfo, {
        pageTitle: "步骤内置XML",
      } as any);
      if (snap) emitSnapshotUpdated(snap);
    }

    if (info.deviceId) setSelectedDevice(info.deviceId);

    const elements = await UniversalUIAPI.extractPageElements(info.xmlContent);
    setUIElements(elements);

    try {
      const parseResult = parseXML(info.xmlContent);
      setElements(parseResult.elements);
      setCategories(parseResult.categories);
      console.log("✅ 步骤XML直接解析完成:", {
        elementsCount: parseResult.elements.length,
        categoriesCount: parseResult.categories.length,
      });
    } catch (e) {
      console.error("❌ 步骤XML直接解析失败:", e);
    }

    setViewMode("grid");
    message.success(`已从步骤加载原始XML页面 (${elements.length} 个元素)`);
    return true;
  } catch (e) {
    console.error("❌ 从步骤XML内容加载失败:", e);
    message.error("从步骤XML内容加载失败");
    return false;
  }
}
