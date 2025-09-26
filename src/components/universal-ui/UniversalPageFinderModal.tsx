/**
 * Universal UI智能页面查找模态框
 * 提供设备连接、页面分析、元素选择功能
 */

import React, { useState, useEffect } from "react";
import "./UniversalPageFinder.css";
import {
  Modal,
  Button,
  Select,
  Card,
  List,
  Input,
  Space,
  Tag,
  Typography,
  Row,
  Col,
  Alert,
  Spin,
  message,
  Divider,
  Popconfirm,
} from "antd";
import {
  SearchOutlined,
  ReloadOutlined,
  MobileOutlined,
  EyeOutlined,
  FilterOutlined,
  BugOutlined,
  BranchesOutlined,
  UnorderedListOutlined,
  AppstoreOutlined,
  EyeInvisibleOutlined,
  CheckOutlined,
} from "@ant-design/icons";
import { useAdb } from "../../application/hooks/useAdb";
import UniversalUIAPI, {
  UIElement,
  ElementBounds,
} from "../../api/universalUIAPI";
import VisualPageAnalyzer from "../VisualPageAnalyzer";
import {
  UniversalElementAnalyzer,
  SmartStepDescriptionGenerator,
  ElementAnalysisResult,
} from "./UniversalElementAnalyzer";
import {
  RealXMLAnalysisService,
  RealElementAnalysis,
} from "../../services/RealXMLAnalysisService";
import { XmlCachePageSelector } from "../xml-cache/XmlCachePageSelector";
import { CacheHistoryPanel } from "./views/cache-view";
import {
  XmlPageCacheService,
  CachedXmlPage,
  XmlPageContent,
} from "../../services/XmlPageCacheService";
import XmlCacheManager from "../../services/XmlCacheManager";
import { ErrorBoundary } from "../ErrorBoundary";
import { LocalStepRepository } from "../../infrastructure/inspector/LocalStepRepository";
// 🆕 导入分布式检查器服务
import { DistributedInspectorService } from "../../application/services/DistributedInspectorService";
import { distributedStepLookupService } from "../../application/services/DistributedStepLookupService";
// 🆕 引入定位类型与工具，用于网格检查器的自动定位
import type { NodeLocator } from "../../domain/inspector/entities/NodeLocator";
import {
  findByXPathRoot,
  findAllByPredicateXPath,
  findNearestClickableAncestor,
} from "./views/grid-view/utils";
// 🆕 自包含快照类型
import type { XmlSnapshot } from "../../types/selfContainedScript";
import { createXmlSnapshot } from "../../types/selfContainedScript";
// 🆕 自动构建自包含快照（容错）
import { buildSnapshotIfPossible } from "../../modules/self-contained/XmlSnapshotAutoBuilder";
import { assessSnapshotHealth, hashXmlContent } from "../../modules/self-contained/XmlSnapshotHealth";

// 🆕 使用新的模块化XML解析功能
import {
  parseXML,
  analyzeAppAndPageInfo,
  VisualUIElement,
  VisualElementCategory,
} from "./xml-parser";
import {
  convertVisualToUIElement,
  createElementContext,
  createContextFromUIElement,
  convertUIToVisualElement,
} from "./data-transform";
// 🆕 导入增强元素创建器
import {
  EnhancedElementCreator,
  EnhancedElementCreationOptions,
} from "./enhanced-element-creation";
import { EnhancedUIElement } from "../../modules/enhanced-element-info/types";
// 🆕 使用外置的视图组件
import {
  VisualElementView,
  ElementListView,
  UIElementTree,
  GridElementView,
  ScrcpyControlView,
} from "./views";
import { saveLatestMatching } from "./views/grid-view/matchingCache";
import type { MatchCriteria as UIMatchCriteria } from "./views/grid-view/panels/node-detail/types";
import {
  useElementSelectionManager,
  ElementSelectionPopover,
} from "./element-selection";
// 抽离的属性匹配服务
import { pickByAttributes } from './page-finder/services/pickByAttributes';
import { handleLoadFromDirectXmlContent as serviceLoadDirectXml } from './page-finder/services/directXmlLoader';
import { handleLoadFromDistributedStep as serviceLoadDistributedStep } from './page-finder/services/distributedStepLoader';
import { handleLoadFromStepXmlCache as serviceLoadFromStepXmlCache } from './page-finder/services/stepXmlCacheLoader';
import { handleLoadFromLocalStep as serviceLoadFromLocalStep } from './page-finder/services/localStepLoader';
// 🆕 使用专门的可视化页面分析组件
// 移除基于 Tab 的外置可视化容器，改为旧版两列布局中的三视图切换

const { Text, Title } = Typography;
const { Option } = Select;
const { Search } = Input;

interface UniversalPageFinderModalProps {
  visible: boolean;
  onClose: () => void;
  onElementSelected?: (element: UIElement) => void;
  // 🆕 仅采集快照模式：打开后直接采集当前设备页面快照并通过回调返回，不进行元素选择
  snapshotOnlyMode?: boolean;
  onSnapshotCaptured?: (snapshot: XmlSnapshot) => void;
  onXmlContentUpdated?: (
    xmlContent: string,
    deviceInfo?: any,
    pageInfo?: any
  ) => void; // 🆕 XML内容更新回调
  // 🆕 当任意来源加载XML后，统一回调已构建的 XmlSnapshot（保证父级随时可用）
  onSnapshotUpdated?: (snapshot: XmlSnapshot) => void;
  initialViewMode?: "visual" | "tree" | "list" | "grid" | "mirror"; // 🆕 初始视图模式，新增镜像视图
  loadFromStepXml?: {
    // 🆕 从步骤XML源加载
    stepId: string;
    xmlCacheId?: string;
    xmlContent?: string; // 🆕 优先使用内嵌的XML数据（自包含脚本）
    deviceId?: string; // 🆕 设备信息（用于显示）
    deviceName?: string; // 🆕 设备名称
  };
  // 🆕 修改参数时预选元素定位器（基于步骤指纹构建）
  preselectLocator?: NodeLocator;
  // 新增：当在“网格检查器/节点详情”里选择了匹配策略并点击“应用到步骤”时回调
  onApplyCriteria?: (criteria: { 
    strategy: string; 
    fields: string[]; 
    values: Record<string,string>; 
    includes?: Record<string,string[]>; 
    excludes?: Record<string,string[]>;
    // 🆕 添加正则表达式相关参数
    matchMode?: Record<string, 'equals' | 'contains' | 'regex'>;
    regexIncludes?: Record<string, string[]>;
    regexExcludes?: Record<string, string[]>;
  }) => void;
  // 🆕 初始匹配预设（来自步骤参数.matching），用于覆盖“最近缓存”
  initialMatching?: UIMatchCriteria;
}

const UniversalPageFinderModal: React.FC<UniversalPageFinderModalProps> = ({
  visible,
  onClose,
  onElementSelected,
  snapshotOnlyMode,
  onSnapshotCaptured,
  onXmlContentUpdated, // 🆕 XML内容更新回调
  onSnapshotUpdated, // 🆕 XML快照更新回调
  initialViewMode = "visual", // 🆕 默认为 visual 视图
  loadFromStepXml, // 🆕 从步骤XML源加载
  preselectLocator,
  onApplyCriteria,
  initialMatching,
}) => {
  // === 状态管理 ===
  const [selectedDevice, setSelectedDevice] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const [currentXmlContent, setCurrentXmlContent] = useState<string>("");
  const [currentXmlCacheId, setCurrentXmlCacheId] = useState<string>(""); // XML缓存ID
  const [viewMode, setViewMode] = useState<"visual" | "tree" | "list" | "grid" | "mirror">(
    initialViewMode // 🆕 使用传入的初始视图模式（包含 mirror）
  ); // 可视化分析区内部的多视图切换
  const [uiElements, setUIElements] = useState<UIElement[]>([]);
  const [searchText, setSearchText] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [showOnlyClickable, setShowOnlyClickable] = useState(false);
  const [selectedElementId, setSelectedElementId] = useState<string>(""); // 选中的元素

  // ADB Hook
  const { devices, refreshDevices, isLoading: isConnecting } = useAdb();

  // 🆕 使用新的模块化XML解析功能
  const [elements, setElements] = useState<VisualUIElement[]>([]);
  const [categories, setCategories] = useState<VisualElementCategory[]>([]);

  // 使用新的元素选择管理器
  const selectionManager = useElementSelectionManager(
    uiElements,
    async (selectedElement) => {
      console.log("✅ 用户确认选择元素:", selectedElement);
      // 统一走增强元素构建逻辑，确保带上 xmlContent/xmlCacheId 等上下文
      await handleSmartElementSelect(selectedElement as any);
    }
  );

  // === 设备连接处理 ===
  useEffect(() => {
    if (visible) {
      refreshDevices();
    }
  }, [visible, refreshDevices]);

  // === 从步骤XML源加载处理 ===
  useEffect(() => {
    if (visible && loadFromStepXml?.stepId) {
      // 🔧 防重复处理：检查是否已经加载了相同的XML内容
      const currentXmlLength = currentXmlContent.length;
      const targetXmlLength = loadFromStepXml.xmlContent?.length || 0;
      
      if (currentXmlLength > 0 && currentXmlLength === targetXmlLength) {
        console.log("⏸️ 跳过重复的XML加载:", {
          stepId: loadFromStepXml.stepId,
          currentLength: currentXmlLength,
          targetLength: targetXmlLength
        });
        return;
      }

      (async () => {
        console.log("🔄 从步骤XML源加载数据:", loadFromStepXml);
        let ok = false;

        // 🆕 优先级0: 直接从传递的XML内容加载（最高优先级）
        if (loadFromStepXml.xmlContent) {
          ok = await handleLoadFromDirectXmlContent({
            stepId: loadFromStepXml.stepId,
            xmlContent: loadFromStepXml.xmlContent,
            deviceId: loadFromStepXml.deviceId,
            deviceName: loadFromStepXml.deviceName,
          });
        }

        // 优先级1: 尝试从分布式脚本的嵌入式XML快照加载
        if (!ok) {
          ok = await handleLoadFromDistributedStep(loadFromStepXml.stepId);
        }

        // 优先级2: 从XML缓存加载
        if (!ok && loadFromStepXml.xmlCacheId) {
          ok = await handleLoadFromStepXml(loadFromStepXml.xmlCacheId);
        }

        // 优先级3: 从本地步骤仓储加载
        if (!ok) {
          await handleLoadFromStepByStepId(loadFromStepXml.stepId);
        }
      })();
    }
  }, [visible, loadFromStepXml?.stepId, loadFromStepXml?.xmlContent?.length]); // 🔧 使用更稳定的依赖项

  // 🆕 统一的快照上报封装：健康检查 + 去重告警（按 xmlHash）
  const shownHealthWarnsRef = React.useRef<Set<string>>(new Set());
  const emitSnapshotUpdated = (snapshot: XmlSnapshot) => {
    try {
      // 健康检查
      const health = assessSnapshotHealth(snapshot);
      const xmlHash = hashXmlContent(snapshot.xmlContent || '');
      if (health.level === 'error') {
        if (!shownHealthWarnsRef.current.has(xmlHash)) {
          message.error({
            content: (
              <div>
                <div style={{ fontWeight: 600 }}>XML 内容损坏，功能可能受限</div>
                <div style={{ fontSize: 12, color: '#8c8c8c' }}>{health.messages[0]}</div>
              </div>
            ),
            duration: 4,
          });
          shownHealthWarnsRef.current.add(xmlHash);
        }
      } else if (health.level === 'warn') {
        if (!shownHealthWarnsRef.current.has(xmlHash)) {
          message.warning({
            content: (
              <div>
                <div style={{ fontWeight: 600 }}>XML 可能不完整</div>
                <ul style={{ margin: 0, paddingLeft: 18 }}>
                  {health.messages.slice(0, 2).map((m, i) => (
                    <li key={i} style={{ fontSize: 12, color: '#8c8c8c' }}>{m}</li>
                  ))}
                </ul>
              </div>
            ),
            duration: 4,
          });
          shownHealthWarnsRef.current.add(xmlHash);
        }
      }

      onSnapshotUpdated?.(snapshot);
    } catch (e) {
      // 健康检查失败不影响主流程
      onSnapshotUpdated?.(snapshot);
    }
  };

  // 重定向到抽离的 directXmlLoader 服务
  const handleLoadFromDirectXmlContent = (info: { stepId: string; xmlContent: string; deviceId?: string; deviceName?: string; }) =>
    serviceLoadDirectXml(info, {
      currentXmlContent,
      setCurrentXmlContent,
      setCurrentXmlCacheId,
      setSelectedDevice,
      setUIElements,
      setElements,
      setCategories,
      setViewMode,
      onXmlContentUpdated,
      emitSnapshotUpdated
    });

  // 抽离后的封装：调用分布式步骤 XML 加载 service
  const handleLoadFromDistributedStep = (stepId: string) =>
    serviceLoadDistributedStep(stepId, {
      currentXmlContent,
      setCurrentXmlContent,
      setCurrentXmlCacheId,
      setSelectedDevice,
      setUIElements,
      setElements,
      setCategories,
      setViewMode,
      onXmlContentUpdated,
      emitSnapshotUpdated
    }, { findDistributedStepById });

  // 🆕 查找分布式步骤的辅助方法
  const findDistributedStepById = async (stepId: string): Promise<any> => {
    return await distributedStepLookupService.findDistributedStepById(stepId);
  };

  // 抽离后的封装：步骤 XML 缓存加载
  const handleLoadFromStepXml = (xmlCacheId: string) =>
    serviceLoadFromStepXmlCache(xmlCacheId, {
      currentXmlContent,
      setCurrentXmlContent,
      setCurrentXmlCacheId,
      setSelectedDevice,
      setUIElements,
      setElements,
      setCategories,
      setViewMode,
      onXmlContentUpdated,
      emitSnapshotUpdated
    });

  // 抽离后的封装：本地步骤仓储快照加载
  const handleLoadFromStepByStepId = (stepId: string) =>
    serviceLoadFromLocalStep(stepId, {
      currentXmlContent,
      setCurrentXmlContent,
      setCurrentXmlCacheId,
      setSelectedDevice,
      setUIElements,
      setElements,
      setCategories,
      setViewMode,
      onXmlContentUpdated,
      emitSnapshotUpdated
    });

  // 获取页面UI结构
  const getPageUIElements = async (device: string) => {
    if (!device) {
      message.error("请选择设备");
      return;
    }

    setLoading(true);
    try {
      // 首先获取XML内容
      const xmlContent = await UniversalUIAPI.analyzeUniversalUIPage(device);
      setCurrentXmlContent(xmlContent);

      // 🆕 通知父组件XML内容已更新
      if (onXmlContentUpdated) {
        const deviceInfo = {
          deviceId: device,
          deviceName: devices.find((d) => d.id === device)?.name || device,
          appPackage: "com.xingin.xhs",
          activityName: "unknown",
        };
        const pageInfo = {
          pageTitle: "当前页面",
          pageType: "分析页面",
          elementCount: 0, // 会在解析后更新
        };
        onXmlContentUpdated(xmlContent, deviceInfo, pageInfo);

        // 🆕 预先构建一次快照（元素数量稍后更新，不影响核心）
        {
          const snap = buildSnapshotIfPossible(xmlContent, deviceInfo, pageInfo as any);
          if (snap) emitSnapshotUpdated(snap);
        }
      }

      // 生成唯一的XML缓存ID并保存
      const uniqueCacheId = `xml_${Date.now()}_${device}`;
      setCurrentXmlCacheId(uniqueCacheId);

      console.log("📦 生成XML缓存ID:", uniqueCacheId);

      // 缓存XML数据到管理器
      const xmlCacheManager = XmlCacheManager.getInstance();
      const cacheEntry = {
        cacheId: uniqueCacheId,
        xmlContent: xmlContent,
        deviceId: device,
        deviceName: devices.find((d) => d.id === device)?.name || device,
        timestamp: Date.now(),
        pageInfo: {
          appPackage: "com.xingin.xhs", // TODO: 动态获取包名
          activityName: "未知Activity", // TODO: 动态获取Activity
          pageTitle: "当前页面",
          pageType: "分析页面",
          elementCount: 0, // 会在解析后更新
        },
      };

      xmlCacheManager.cacheXmlPage(cacheEntry);

      console.log("✅ XML页面已缓存:", uniqueCacheId);

      // 然后提取元素
      const elements = await UniversalUIAPI.extractPageElements(xmlContent);
      setUIElements(elements);

      // 更新缓存条目的元素数量
      cacheEntry.pageInfo.elementCount = elements.length;

      // 🆕 使用新的模块化XML解析功能解析视觉元素
      if (xmlContent) {
        try {
          const parseResult = parseXML(xmlContent);
          setElements(parseResult.elements);
          setCategories(parseResult.categories);
          console.log("🚀 新模块化XML解析完成:", {
            elementsCount: parseResult.elements.length,
            categoriesCount: parseResult.categories.length,
            appInfo: parseResult.appInfo,
          });

          // 🆕 元素数量明确后，再次上报一次包含正确 elementCount 的快照
          {
            const deviceInfo = {
              deviceId: device,
              deviceName: devices.find((d) => d.id === device)?.name || device,
              appPackage: "com.xingin.xhs",
              activityName: "unknown",
            };
            const pageInfo = {
              pageTitle: "当前页面",
              pageType: "分析页面",
              elementCount: parseResult.elements.length,
            } as any;
            const snap = buildSnapshotIfPossible(xmlContent, deviceInfo, pageInfo);
            if (snap) emitSnapshotUpdated(snap);
          }
        } catch (parseError) {
          console.error("🚨 XML解析失败:", parseError);
          setElements([]);
          setCategories([]);
        }
      }

      // 若处于仅采集快照模式，则通过回调返回数据并自动关闭（统一为 XmlSnapshot）
      if (snapshotOnlyMode && onSnapshotCaptured) {
        try {
          const snapshot: XmlSnapshot = createXmlSnapshot(
            xmlContent,
            {
              deviceId: cacheEntry.deviceId,
              deviceName: cacheEntry.deviceName,
              appPackage: cacheEntry.pageInfo?.appPackage || 'com.xingin.xhs',
              activityName: cacheEntry.pageInfo?.activityName || 'unknown',
            },
            {
              pageTitle: cacheEntry.pageInfo?.pageTitle || '未知页面',
              pageType: cacheEntry.pageInfo?.pageType || 'unknown',
              elementCount: elements.length,
            }
          );
          onSnapshotCaptured(snapshot);
          message.success("已采集并返回页面快照");
          onClose();
          return;
        } catch (cbErr) {
          console.warn("快照回调处理失败:", cbErr);
        }
      }

      // 切换到可视化视图（两列布局下不再使用外层Tabs）
      setViewMode("visual");
      message.success(`获取到 ${elements.length} 个UI元素`);
    } catch (error: any) {
      message.error(`API调用失败: ${error.message || error}`);
      console.error("获取页面元素失败:", error);
    } finally {
      setLoading(false);
    }
  };

  // XML缓存页面选择处理
  const handleCachedPageSelect = async (page: CachedXmlPage) => {
    console.log("🔄 选择缓存页面:", page);
    try {
      // 加载缓存页面内容
      const pageContent: XmlPageContent =
        await XmlPageCacheService.loadPageContent(page);

      setCurrentXmlContent(pageContent.xmlContent);

      // 🆕 关键修复：基于缓存页面信息生成统一的XML缓存ID
      const xmlCacheId = `cache_${page.deviceId}_${page.timestamp}`;
      setCurrentXmlCacheId(xmlCacheId);
      console.log("🔗 设置XML缓存ID:", xmlCacheId);

      // 🆕 通知父组件 XML 内容已更新（用于父级构建 xmlSnapshot）
      if (onXmlContentUpdated) {
        const deviceInfo = {
          deviceId: page.deviceId,
          deviceName: page.deviceId,
          appPackage: page.appPackage || "com.xingin.xhs",
          activityName: "unknown",
        } as any;
        const pageInfo = {
          pageTitle: page.pageTitle || "缓存页面",
          pageType: page.pageType || "cached",
          elementCount: page.elementCount || 0,
          appName: "小红书",
        } as any;
        onXmlContentUpdated(pageContent.xmlContent, deviceInfo, pageInfo);

        // 🆕 构建并上报快照
        {
          const snap = buildSnapshotIfPossible(
            pageContent.xmlContent,
            deviceInfo,
            pageInfo
          );
          if (snap) emitSnapshotUpdated(snap);
        }
      }
      // 同步选择设备，便于后续生成定位器时引用
      if (page.deviceId) setSelectedDevice(page.deviceId);

      // 🆕 将页面内容同步到XmlCacheManager中，确保两套缓存系统保持一致
      const xmlCacheManager = XmlCacheManager.getInstance();
      const cacheEntry = {
        cacheId: xmlCacheId,
        xmlContent: pageContent.xmlContent,
        deviceId: page.deviceId,
        deviceName: page.deviceId, // 暂时使用deviceId作为名称
        timestamp: Date.now(),
        pageInfo: {
          appPackage: page.appPackage,
          activityName: "未知Activity",
          pageTitle: page.pageTitle,
          pageType: page.pageType,
          elementCount: page.elementCount,
        },
      };
      xmlCacheManager.cacheXmlPage(cacheEntry);
      console.log("✅ 已同步到XmlCacheManager:", xmlCacheId);

      // 如果有UI元素数据，也设置它
      if (pageContent.elements && pageContent.elements.length > 0) {
        setUIElements(pageContent.elements);
      }

      // 🆕 使用新的模块化XML解析功能解析视觉元素
      if (pageContent.xmlContent) {
        try {
          const parseResult = parseXML(pageContent.xmlContent);
          setElements(parseResult.elements);
          setCategories(parseResult.categories);
          console.log("🚀 缓存页面XML解析完成:", {
            elementsCount: parseResult.elements.length,
            categoriesCount: parseResult.categories.length,
            appInfo: parseResult.appInfo,
          });
        } catch (parseError) {
          console.error("🚨 缓存页面XML解析失败:", parseError);
          setElements([]);
          setCategories([]);
        }
      }

      // 切换到可视化视图（两列布局下不再使用外层Tabs）
      setViewMode("visual");
      message.success(`已加载缓存页面: ${page.description}`);
    } catch (error) {
      console.error("加载缓存页面失败:", error);
      message.error("缓存页面数据加载失败");
    }
  };

  // 智能元素选择处理
  const handleSmartElementSelect = async (element: UIElement) => {
    console.log("🎯 智能元素选择:", element);
    console.log("🔍 使用XML缓存ID:", {
      currentXmlCacheId,
      hasContent: !!currentXmlContent,
    });

    try {
      // 使用正确的XML缓存ID，确保步骤能正确关联到其原始XML源
      const xmlCacheId = currentXmlCacheId || `xml_${Date.now()}`;
      console.log("📋 最终使用的XML缓存ID:", xmlCacheId);

      // 🆕 创建增强元素信息，包含完整XML上下文
      const enhancedElement =
        await EnhancedElementCreator.createEnhancedElement(element, {
          xmlContent: currentXmlContent,
          xmlCacheId: xmlCacheId,
          packageName: "com.xingin.xhs", // 小红书包名，TODO: 动态获取
          pageInfo: {
            appName: "小红书",
            pageName: "当前页面",
          },
          deviceInfo: selectedDevice
            ? {
                deviceId: selectedDevice,
                deviceName:
                  devices.find((d) => d.id === selectedDevice)?.name ||
                  selectedDevice,
                resolution: { width: 1080, height: 1920 }, // TODO: 动态获取设备分辨率
              }
            : undefined,
          enableSmartAnalysis: true,
        });

      console.log("✅ 增强元素信息创建完成:", {
        xmlContentLength: enhancedElement.xmlContext.xmlSourceContent.length,
        xmlCacheId: enhancedElement.xmlContext.xmlCacheId,
        hasSmartAnalysis: !!enhancedElement.smartAnalysis,
        smartDescription: enhancedElement.smartDescription,
      });

      // 🆕 将增强信息附加到原始element上，保持兼容性
      const enhancedElementWithCompat = {
        ...element,
        // 兼容旧版本的标识
        isEnhanced: true,
        xmlCacheId: enhancedElement.xmlContext.xmlCacheId,
        xmlContent: enhancedElement.xmlContext.xmlSourceContent,
        smartDescription: enhancedElement.smartDescription,

        // 新版本的完整增强信息
        enhancedElement: enhancedElement,

        // 快速访问的元素摘要
        elementSummary: {
          displayName:
            enhancedElement.smartDescription ||
            element.text ||
            element.element_type,
          elementType: element.element_type,
          position: {
            x: element.bounds.left,
            y: element.bounds.top,
            width: element.bounds.right - element.bounds.left,
            height: element.bounds.bottom - element.bounds.top,
          },
          xmlSource: enhancedElement.xmlContext.xmlCacheId,
          confidence: enhancedElement.smartAnalysis?.confidence || 0.5,
        },
      } as UIElement;

      console.log("🚀 传递增强元素信息:", {
        hasEnhancedElement: !!(enhancedElementWithCompat as any)
          .enhancedElement,
        hasXmlContent: !!(enhancedElementWithCompat as any).xmlContent,
        hasElementSummary: !!(enhancedElementWithCompat as any).elementSummary,
        smartDescription: (enhancedElementWithCompat as any).smartDescription,
      });

      if (onElementSelected) {
        onElementSelected(enhancedElementWithCompat);
      }
    } catch (error) {
      console.error("❌ 创建增强元素信息失败:", error);
      message.error("创建增强元素信息失败");

      // 降级到基础元素选择
      if (onElementSelected) {
        onElementSelected(element);
      }
    }

    onClose();
  };

  // 处理可视化元素选择（适配函数）
  const handleVisualElementSelect = async (element: VisualUIElement) => {
    // 转换 VisualUIElement 到 UIElement
    const uiElement = convertVisualToUIElement(element);
    await handleSmartElementSelect(uiElement);
  };

  // 过滤元素
  const filteredElements = uiElements.filter((element) => {
    const matchesSearch =
      searchText === "" ||
      element.text.toLowerCase().includes(searchText.toLowerCase()) ||
      (element.content_desc &&
        element.content_desc.toLowerCase().includes(searchText.toLowerCase()));

    const matchesClickable = !showOnlyClickable || element.is_clickable;

    return matchesSearch && matchesClickable;
  });

  // 📊 统计信息
  const stats = {
    total: uiElements.length,
    clickable: uiElements.filter((e) => e.is_clickable).length,
    withText: uiElements.filter((e) => e.text.trim() !== "").length,
  };

  // === 渲染函数 ===

  // 内置列表视图渲染
  const renderInlineListView = () => (
    <div>
      <Card title="元素筛选" className="mb-4">
        <Space direction="vertical" style={{ width: "100%" }}>
          <Input
            placeholder="搜索元素..."
            prefix={<SearchOutlined />}
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
          />
          <Space>
            <label>
              <input
                type="checkbox"
                checked={showOnlyClickable}
                onChange={(e) => setShowOnlyClickable(e.target.checked)}
              />
              <span style={{ marginLeft: 8 }}>只显示可点击元素</span>
            </label>
          </Space>
        </Space>
      </Card>

      <Card
        title={`元素列表 (${filteredElements.length}/${uiElements.length})`}
        extra={
          <Space>
            <Tag color="blue">总数: {stats.total}</Tag>
            <Tag color="green">可点击: {stats.clickable}</Tag>
            <Tag color="orange">含文本: {stats.withText}</Tag>
          </Space>
        }
      >
        <List
          dataSource={filteredElements}
          renderItem={(element) => (
            <List.Item
              key={element.id}
              actions={[
                <Button
                  key="select"
                  type="primary"
                  size="small"
                  onClick={() => handleSmartElementSelect(element)}
                  disabled={!element.is_clickable}
                >
                  选择
                </Button>,
              ]}
            >
              <List.Item.Meta
                title={
                  <Space>
                    <Text strong>{element.text || element.element_type}</Text>
                    {element.is_clickable && <Tag color="green">可点击</Tag>}
                    {element.is_scrollable && <Tag color="blue">可滚动</Tag>}
                  </Space>
                }
                description={
                  <div>
                    <Text type="secondary">
                      {element.content_desc || "无描述"}
                    </Text>
                    <br />
                    <Text type="secondary" style={{ fontSize: 12 }}>
                      位置: ({element.bounds.left}, {element.bounds.top}) 大小:{" "}
                      {element.bounds.right - element.bounds.left} ×{" "}
                      {element.bounds.bottom - element.bounds.top}
                    </Text>
                  </div>
                }
              />
            </List.Item>
          )}
        />
      </Card>
    </div>
  );

  // 内置树形视图渲染
  const renderInlineTreeView = () => (
    <div>
      <Card title="页面结构树">
        {uiElements.length > 0 ? (
          <ErrorBoundary>
            <UIElementTree
              elements={uiElements}
              onElementSelect={(selectedElements) => {
                if (selectedElements.length > 0) {
                  handleSmartElementSelect(selectedElements[0]);
                }
              }}
              showOnlyClickable={showOnlyClickable}
            />
          </ErrorBoundary>
        ) : (
          <Alert
            message="暂无页面数据"
            description="请先获取页面信息"
            type="info"
            showIcon
          />
        )}
      </Card>
    </div>
  );

  // 设备选择Tab - 优化窄列布局
  const renderDeviceTab = () => (
    <div>
      <Card title="设备连接" size="small" className="mb-4">
        <Space direction="vertical" style={{ width: "100%" }} size="small">
          <Select
            value={selectedDevice}
            onChange={setSelectedDevice}
            placeholder="选择ADB设备"
            style={{ width: "100%" }}
            loading={isConnecting}
            size="small"
          >
            {devices.map((device) => (
              <Option key={device.id} value={device.id}>
                {device.name} ({device.id})
              </Option>
            ))}
          </Select>

          {/* 改为垂直布局，避免水平空间不足 */}
          <Space direction="vertical" style={{ width: "100%" }} size="small">
            <Button
              onClick={refreshDevices}
              icon={<ReloadOutlined />}
              style={{ width: "100%" }}
              size="small"
            >
              刷新设备
            </Button>
            <Button
              type="primary"
              onClick={() => getPageUIElements(selectedDevice)}
              disabled={!selectedDevice}
              loading={loading}
              icon={<MobileOutlined />}
              style={{ width: "100%" }}
              size="small"
            >
              获取页面
            </Button>
          </Space>

          {devices.length === 0 && (
            <Alert
              message="未检测到设备"
              description="请确保设备已连接并开启ADB调试"
              type="warning"
              showIcon
            />
          )}
        </Space>
      </Card>

      {/* XML缓存页面选择器 */}
      <CacheHistoryPanel onPageSelected={handleCachedPageSelect} />
    </div>
  );

  // 右侧分析区（两列布局）- 与旧版一致：顶部三视图切换 + 下方内容
  const renderAnalyzerPanel = () => (
    <Card
      title={
        <div className="flex items-center justify-between">
          <span>页面元素</span>
          {
            <Space.Compact size="small">
              <Button
                type={viewMode === "visual" ? "primary" : "default"}
                icon={<EyeOutlined />}
                onClick={() => setViewMode("visual")}
              >
                可视化视图
              </Button>
              <Button
                type={viewMode === "mirror" ? "primary" : "default"}
                onClick={() => setViewMode("mirror")}
              >
                镜像视图
              </Button>
              <Button
                type={viewMode === "tree" ? "primary" : "default"}
                icon={<BranchesOutlined />}
                onClick={() => setViewMode("tree")}
              >
                层级树
              </Button>
              <Button
                type={viewMode === "list" ? "primary" : "default"}
                icon={<UnorderedListOutlined />}
                onClick={() => setViewMode("list")}
              >
                列表视图
              </Button>
              <Button
                type={viewMode === "grid" ? "primary" : "default"}
                icon={<AppstoreOutlined />}
                onClick={() => setViewMode("grid")}
              >
                网格检查器
              </Button>
            </Space.Compact>
          }
        </div>
      }
      size="small"
    >
      {loading ? (
        <div style={{ textAlign: "center", padding: 50 }}>
          <Spin size="large" />
          <div style={{ marginTop: 16 }}>正在分析页面...</div>
        </div>
    ) : elements.length > 0 || uiElements.length > 0 || viewMode === "mirror" ? (
        <div>
          {viewMode === "tree" ? (
            <ErrorBoundary>
              <UIElementTree
                elements={uiElements}
                onElementSelect={(selectedElements) => {
                  if (selectedElements.length > 0) {
                    handleSmartElementSelect(selectedElements[0]);
                  }
                }}
                showOnlyClickable={showOnlyClickable}
              />
            </ErrorBoundary>
          ) : viewMode === "visual" ? (
            <VisualElementView
              elements={elements}
              selectedElementId={selectedElementId}
              selectionManager={selectionManager}
            />
              ) : viewMode === "mirror" ? (
                <ScrcpyControlView />
          ) : viewMode === "grid" ? (
            <ErrorBoundary>
              <GridElementView
                xmlContent={currentXmlContent}
                elements={elements}
                onElementSelect={handleVisualElementSelect}
                selectedElementId={selectedElementId}
                // 🆕 传入定位器以在解析后自动选中步骤元素
                locator={preselectLocator}
                locatorResolve={(root, locator) => {
                  console.log('🔍 [UniversalPageFinderModal] locatorResolve 被调用:', { root: !!root, locator });
                  try {
                    if (!root || !locator) return null;
                    // 0) 基于 bounds 的快速预选（如果提供）
                    try {
                      const anyLoc: any = locator;
                      const boundsStr: string | undefined =
                        (anyLoc.additionalInfo && anyLoc.additionalInfo.bounds) ||
                        undefined;
                      const boundsFromSelected = (anyLoc.selectedBounds &&
                        `[${anyLoc.selectedBounds.left},${anyLoc.selectedBounds.top}][${anyLoc.selectedBounds.right},${anyLoc.selectedBounds.bottom}]`) as
                        | string
                        | undefined;
                      const wantBounds = boundsFromSelected || boundsStr;
                      if (wantBounds) {
                        // 在整棵树中按 bounds 匹配（一次 DFS）
                        const stk: any[] = root ? [root] : [];
                        while (stk.length) {
                          const n = stk.pop();
                          if (n?.attrs?.['bounds'] === wantBounds) {
                            return n;
                          }
                          for (let i = n.children.length - 1; i >= 0; i--) stk.push(n.children[i]);
                        }
                      }
                    } catch { /* ignore bounds preselect failure */ }
                    // 1) 绝对 XPath 优先
                    if (locator.absoluteXPath) {
                      const n = findByXPathRoot(root, locator.absoluteXPath);
                      if (n) return n;
                    }
                    // 2) 谓词 XPath
                    if (locator.predicateXPath) {
                      const all = findAllByPredicateXPath(
                        root,
                        locator.predicateXPath
                      );
                      const picked = pickByAttributes(all, locator);
                      if (picked) return picked;
                    }
                    // 3) 基于属性的回退匹配
                    const allNodes: any[] = [];
                    const stk: any[] = root ? [root] : [];
                    while (stk.length) {
                      const n = stk.pop();
                      allNodes.push(n);
                      for (let i = n.children.length - 1; i >= 0; i--)
                        stk.push(n.children[i]);
                    }
                    const picked = pickByAttributes(allNodes, locator);
                    if (picked) return picked;
                    // 4) 可点击祖先
                    return findNearestClickableAncestor(picked);
                  } catch {
                    return null;
                  }
                }}
                onApplyCriteria={handleApplyCriteria}
                onLatestMatchingChange={(m) => { saveLatestMatching(m); }}
                initialMatching={initialMatching as any}
              />
            </ErrorBoundary>
          ) : (
            renderInlineListView()
          )}
        </div>
      ) : (
        <div style={{ textAlign: "center", padding: 50, color: "#999" }}>
          <EyeOutlined style={{ fontSize: 48, marginBottom: 16 }} />
          <div>选择设备并点击"获取当前页面"开始</div>
        </div>
      )}
    </Card>
  );


  // 列表视图Tab
  const renderListTab = () => (
    <div>
      <Card title="元素筛选" className="mb-4">
        <Space direction="vertical" style={{ width: "100%" }}>
          <Input
            placeholder="搜索元素..."
            prefix={<SearchOutlined />}
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
          />
          <Space>
            <label>
              <input
                type="checkbox"
                checked={showOnlyClickable}
                onChange={(e) => setShowOnlyClickable(e.target.checked)}
              />
              <span style={{ marginLeft: 8 }}>只显示可点击元素</span>
            </label>
          </Space>
        </Space>
      </Card>

      <Card
        title={`元素列表 (${filteredElements.length}/${uiElements.length})`}
        extra={
          <Space>
            <Tag color="blue">总数: {stats.total}</Tag>
            <Tag color="green">可点击: {stats.clickable}</Tag>
            <Tag color="orange">含文本: {stats.withText}</Tag>
          </Space>
        }
      >
        <List
          dataSource={filteredElements}
          renderItem={(element) => (
            <List.Item
              key={element.id}
              actions={[
                <Button
                  key="select"
                  type="primary"
                  size="small"
                  onClick={() => handleSmartElementSelect(element)}
                  disabled={!element.is_clickable}
                >
                  选择
                </Button>,
              ]}
            >
              <List.Item.Meta
                title={
                  <Space>
                    <Text strong>{element.text || element.element_type}</Text>
                    {element.is_clickable && <Tag color="green">可点击</Tag>}
                    {element.is_scrollable && <Tag color="blue">可滚动</Tag>}
                  </Space>
                }
                description={
                  <div>
                    <Text type="secondary">
                      {element.content_desc || "无描述"}
                    </Text>
                    <br />
                    <Text type="secondary" style={{ fontSize: 12 }}>
                      位置: ({element.bounds.left}, {element.bounds.top}) 大小:{" "}
                      {element.bounds.right - element.bounds.left} ×{" "}
                      {element.bounds.bottom - element.bounds.top}
                    </Text>
                  </div>
                }
              />
            </List.Item>
          )}
        />
      </Card>
    </div>
  );

  // 🆕 统一封装：应用到步骤后自动关闭模态框
  const handleApplyCriteria = (criteria: { strategy: string; fields: string[]; values: Record<string,string> }) => {
    console.log('🎯 [UniversalPageFinderModal] handleApplyCriteria 被调用，criteria:', criteria);
    try {
      onApplyCriteria?.(criteria);
      console.log('🎯 [UniversalPageFinderModal] onApplyCriteria 调用成功');
    } catch (error) {
      console.error('❌ [UniversalPageFinderModal] onApplyCriteria 调用失败:', error);
    } finally {
      // 成功或失败都关闭，以便用户回到步骤卡查看/继续
      console.log('🎯 [UniversalPageFinderModal] 关闭模态框');
      onClose();
    }
  };

  // 树形视图Tab
  const renderTreeTab = () => (
    <div>
      <Card title="页面结构树">
        {uiElements.length > 0 ? (
          <ErrorBoundary>
            <UIElementTree
              elements={uiElements}
              onElementSelect={(selectedElements) => {
                if (selectedElements.length > 0) {
                  handleSmartElementSelect(selectedElements[0]);
                }
              }}
              showOnlyClickable={showOnlyClickable}
            />
          </ErrorBoundary>
        ) : (
          <Alert
            message="暂无页面数据"
            description="请先获取页面信息"
            type="info"
            showIcon
          />
        )}
      </Card>
    </div>
  );

  return (
    <Modal
      title="Universal UI 智能页面查找器"
      open={visible}
      onCancel={() => {
        // 关闭 = 取消回填。仅关闭模态，不写回步骤，不应用缓存的匹配策略/字段。
        onClose();
      }}
      width="98vw" // 几乎全屏，确保四列不换行
      style={{ top: 10 }}
      footer={null}
      className="universal-page-finder"
      styles={{
        body: {
          padding: "16px", // 减少内边距
        },
      }}
    >
      <Row gutter={10} style={{ flexWrap: "nowrap" }}>
        {" "}
        {/* 强制不换行 */}
        {/* 左侧：设备连接与缓存（进一步缩小） */}
        <Col flex="0 0 clamp(260px, 16vw, 300px)" style={{ minWidth: 260 }}>
          {renderDeviceTab()}

          {/* 统计信息卡片 */}
          {stats.total > 0 && (
            <Card style={{ marginTop: 16 }}>
              <div style={{ display: "flex", gap: 12 }}>
                <Tag color="blue">总数: {stats.total}</Tag>
                <Tag color="green">可点击: {stats.clickable}</Tag>
                <Tag color="orange">含文本: {stats.withText}</Tag>
              </div>
            </Card>
          )}
        </Col>
        {/* 右侧：页面元素三视图（明确flex设置，确保占用剩余空间） */}
        <Col flex="1 1 auto" style={{ minWidth: 0, overflow: "hidden" }}>
          {renderAnalyzerPanel()}
        </Col>
      </Row>

      {/* 使用新的元素选择弹出框组件（保留模块化交互） */}
      <ElementSelectionPopover
        visible={!!selectionManager.pendingSelection}
        selection={selectionManager.pendingSelection}
        onConfirm={selectionManager.confirmSelection}
        onCancel={selectionManager.hideElement}
      />
    </Modal>
  );
};

// 同时提供命名导出和默认导出，确保兼容性
export { UniversalPageFinderModal };
export default UniversalPageFinderModal;
