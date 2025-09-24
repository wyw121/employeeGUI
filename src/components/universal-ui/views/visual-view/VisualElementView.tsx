/**
 * 可视化视图组件 - 完整还原旧版VisualPageAnalyzerContent
 * 从原 UniversalPageFinderModal 的 VisualPageAnalyzerContent 迁移
 */

import React, { useState, useMemo, useEffect } from "react";
import { useRef, useLayoutEffect } from "react";
import { Input, Button, Space, Alert, Typography, Tag } from "antd";
import { SearchOutlined, AppstoreOutlined } from "@ant-design/icons";
import type { VisualUIElement, VisualElementCategory } from "../../types/";
import {
  useElementSelectionManager,
  ElementSelectionPopover,
} from "../../element-selection";
import type { UIElement } from "../../../../api/universalUIAPI";

const { Title, Text } = Typography;

// 可视化视图属性接口
interface VisualElementViewProps {
  xmlContent?: string;
  elements?: VisualUIElement[];
  onElementSelect?: (element: VisualUIElement) => void;
  selectedElementId?: string;
  selectionManager?: ReturnType<typeof useElementSelectionManager>;
}

export const VisualElementView: React.FC<VisualElementViewProps> = ({
  xmlContent = "",
  elements = [],
  onElementSelect,
  selectedElementId = "",
  selectionManager: externalSelectionManager,
}) => {
  // 设备外框（bezel）内边距，让设备看起来比页面更大，但不改变页面坐标/缩放
  const DEVICE_FRAME_PADDING = 24; // px，可调
  // 页面统计与控制面板的固定宽度（两者一致，避免被压缩）
  const STATS_FIXED_WIDTH = 360; // px，可按需调整
  const [searchText, setSearchText] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [showOnlyClickable, setShowOnlyClickable] = useState(true); // 🎯 默认勾选只显示可点击元素
  const [hideCompletely, setHideCompletely] = useState(false); // 🎯 默认不勾选：使用半透明显示模式
  const [hoveredElement, setHoveredElement] = useState<string | null>(null);

  // 转换 VisualUIElement 到 UIElement 用于气泡弹窗
  const convertVisualToUIElement = (element: VisualUIElement): UIElement => {
    // 安全地获取position数据，提供默认值
    const position = element.position || { x: 0, y: 0, width: 100, height: 50 };

    return {
      id: element.id,
      element_type: element.type || "",
      text: element.text || "",
      bounds: {
        left: position.x,
        top: position.y,
        right: position.x + position.width,
        bottom: position.y + position.height,
      },
      xpath: element.id, // 使用id作为xpath
      resource_id: "",
      class_name: "",
      is_clickable: element.clickable || false,
      is_scrollable: false,
      is_enabled: true,
      is_focused: false,
      checkable: false,
      checked: false,
      selected: element.id === selectedElementId,
      password: false,
      // 不写入友好描述，保持真实 XML 才能填入（此处置空）
      content_desc: "",
    };
  };

  // 将所有VisualUIElement转换为UIElement用于选择管理器
  const convertedElements = useMemo(
    () => elements.map(convertVisualToUIElement),
    [elements, selectedElementId]
  );

  // 初始化元素选择管理器 - 恢复气泡弹窗功能
  // 🎯 关键修复：只在需要时创建内部管理器，避免不必要的资源消耗和状态冲突
  const internalSelectionManager = useElementSelectionManager(
    externalSelectionManager ? [] : convertedElements, // 如果有外部管理器，传入空数组
    (element: UIElement) => {
      // 当选择管理器确认选择时，转换回VisualUIElement并调用原回调
      const originalElement = elements.find((e) => e.id === element.id);
      if (originalElement && onElementSelect) {
        onElementSelect(originalElement);
      }
    },
    {
      enableHover: !externalSelectionManager, // 只在没有外部管理器时启用悬停
      hoverDelay: 300,
      autoRestoreTime: 60000,
    }
  );

  // 🎯 关键修复：确保只使用一个管理器，避免状态冲突
  const selectionManager = externalSelectionManager || internalSelectionManager;

  // 🔍 添加调试：监听pendingSelection变化
  useEffect(() => {
    const isVisible = !!selectionManager.pendingSelection;
    console.log('🎯 VisualElementView: pendingSelection 状态变化 =', {
      visible: isVisible,
      hasSelection: !!selectionManager.pendingSelection,
      elementId: selectionManager.pendingSelection?.element?.id
    });
  }, [selectionManager.pendingSelection]);

  // 从 VisualPageAnalyzer 复制的解析函数
  const parseBounds = (
    bounds: string
  ): { x: number; y: number; width: number; height: number } => {
    const match = bounds.match(/\[(\d+),(\d+)\]\[(\d+),(\d+)\]/);
    if (!match) return { x: 0, y: 0, width: 0, height: 0 };

    const [, x1, y1, x2, y2] = match.map(Number);
    return {
      x: x1,
      y: y1,
      width: x2 - x1,
      height: y2 - y1,
    };
  };

  // 获取元素的用户友好名称（完全还原旧版）
  const getUserFriendlyName = (node: any): string => {
    if (node["content-desc"] && node["content-desc"].trim()) {
      return node["content-desc"];
    }
    if (node.text && node.text.trim()) {
      return node.text;
    }

    const className = node.class || "";
    if (className.includes("Button")) return "按钮";
    if (className.includes("TextView")) return "文本";
    if (className.includes("ImageView")) return "图片";
    if (className.includes("EditText")) return "输入框";
    if (className.includes("RecyclerView")) return "列表";
    if (className.includes("ViewPager")) return "滑动页面";
    if (className.includes("Tab")) return "标签页";

    return "未知元素";
  };

  // 判断元素类别（完全还原旧版）
  const categorizeElement = (node: any): string => {
    const contentDesc = node["content-desc"] || "";
    const text = node.text || "";
    const className = node.class || "";

    if (
      contentDesc.includes("首页") ||
      contentDesc.includes("消息") ||
      contentDesc.includes("我") ||
      contentDesc.includes("市集") ||
      contentDesc.includes("发布") ||
      text.includes("首页") ||
      text.includes("消息") ||
      text.includes("我")
    ) {
      return "navigation";
    }

    if (
      contentDesc.includes("关注") ||
      contentDesc.includes("发现") ||
      contentDesc.includes("视频") ||
      text.includes("关注") ||
      text.includes("发现") ||
      text.includes("视频")
    ) {
      return "tabs";
    }

    if (contentDesc.includes("搜索") || className.includes("search")) {
      return "search";
    }

    if (
      contentDesc.includes("笔记") ||
      contentDesc.includes("视频") ||
      (node.clickable === "true" && contentDesc.includes("来自"))
    ) {
      return "content";
    }

    if (className.includes("Button") || node.clickable === "true") {
      return "buttons";
    }

    if (className.includes("TextView") && text.trim()) {
      return "text";
    }

    if (className.includes("ImageView")) {
      return "images";
    }

    return "others";
  };

  // 获取元素重要性（完全还原旧版）
  const getElementImportance = (node: any): "high" | "medium" | "low" => {
    const contentDesc = node["content-desc"] || "";

    if (
      contentDesc.includes("首页") ||
      contentDesc.includes("搜索") ||
      contentDesc.includes("笔记") ||
      contentDesc.includes("视频") ||
      contentDesc.includes("发布")
    ) {
      return "high";
    }

    if (
      contentDesc.includes("关注") ||
      contentDesc.includes("发现") ||
      contentDesc.includes("消息") ||
      node.clickable === "true"
    ) {
      return "medium";
    }

    return "low";
  };

  // 智能分析APP和页面信息（完全还原旧版）
  const analyzeAppAndPageInfo = (
    xmlString: string
  ): { appName: string; pageName: string } => {
    if (!xmlString) return { appName: "未知应用", pageName: "未知页面" };

    try {
      const parser = new DOMParser();
      const xmlDoc = parser.parseFromString(xmlString, "text/xml");

      // 1. 分析APP名称
      let appName = "未知应用";

      // 从package属性分析APP
      const rootNode = xmlDoc.querySelector("hierarchy node");
      if (rootNode) {
        const packageName = rootNode.getAttribute("package") || "";

        // 常见APP包名映射
        const appMappings: { [key: string]: string } = {
          "com.xingin.xhs": "小红书",
          "com.tencent.mm": "微信",
          "com.taobao.taobao": "淘宝",
          "com.jingdong.app.mall": "京东",
          "com.tmall.wireless": "天猫",
          "com.sina.weibo": "微博",
          "com.ss.android.ugc.aweme": "抖音",
          "com.tencent.mobileqq": "QQ",
          "com.alibaba.android.rimet": "钉钉",
          "com.autonavi.minimap": "高德地图",
          "com.baidu.BaiduMap": "百度地图",
          "com.netease.cloudmusic": "网易云音乐",
          "com.tencent.qqmusic": "QQ音乐",
        };

        appName =
          appMappings[packageName] ||
          packageName.split(".").pop() ||
          "未知应用";
      }

      // 2. 分析页面名称
      let pageName = "未知页面";

      // 分析底部导航栏确定当前页面
      const allNodes = xmlDoc.querySelectorAll("node");
      const navigationTexts: string[] = [];
      const selectedTabs: string[] = [];

      allNodes.forEach((node) => {
        const text = node.getAttribute("text") || "";
        const contentDesc = node.getAttribute("content-desc") || "";
        const selected = node.getAttribute("selected") === "true";

        // 检查底部导航
        if (
          contentDesc.includes("首页") ||
          contentDesc.includes("市集") ||
          contentDesc.includes("发布") ||
          contentDesc.includes("消息") ||
          contentDesc.includes("我") ||
          text === "首页" ||
          text === "市集" ||
          text === "消息" ||
          text === "我"
        ) {
          navigationTexts.push(text || contentDesc);
          if (selected) {
            selectedTabs.push(text || contentDesc);
          }
        }

        // 检查顶部标签页
        if (
          (text === "关注" || text === "发现" || text === "视频") &&
          selected
        ) {
          selectedTabs.push(text);
        }
      });

      // 根据选中的标签确定页面名称
      if (selectedTabs.length > 0) {
        // 组合底部导航和顶部标签
        const bottomNav =
          selectedTabs.find((tab) =>
            ["首页", "市集", "发布", "消息", "我"].includes(tab)
          ) || "";
        const topTab =
          selectedTabs.find((tab) => ["关注", "发现", "视频"].includes(tab)) ||
          "";

        if (bottomNav && topTab) {
          pageName = `${bottomNav}-${topTab}页面`;
        } else if (bottomNav) {
          pageName = `${bottomNav}页面`;
        } else if (topTab) {
          pageName = `${topTab}页面`;
        }
      }

      // 特殊页面检测
      if (pageName === "未知页面") {
        // 检查是否有特殊关键词
        const allText = Array.from(allNodes)
          .map(
            (node) =>
              `${node.getAttribute("text") || ""} ${
                node.getAttribute("content-desc") || ""
              }`
          )
          .join(" ")
          .toLowerCase();

        if (allText.includes("登录") || allText.includes("注册")) {
          pageName = "登录注册页面";
        } else if (allText.includes("设置")) {
          pageName = "设置页面";
        } else if (allText.includes("搜索")) {
          pageName = "搜索页面";
        } else {
          pageName = "主页面";
        }
      }

      return { appName, pageName };
    } catch (error) {
      console.error("分析APP和页面信息失败:", error);
      return { appName: "未知应用", pageName: "未知页面" };
    }
  };

  // 解析XML并提取元素（完全还原旧版）
  const [parsedElements, setParsedElements] = useState<VisualUIElement[]>([]);
  const [categories, setCategories] = useState<VisualElementCategory[]>([]);

  const parseXML = (xmlString: string) => {
    if (!xmlString) return;

    try {
      const parser = new DOMParser();
      const xmlDoc = parser.parseFromString(xmlString, "text/xml");
      const allNodes = xmlDoc.querySelectorAll("node");

      const extractedElements: VisualUIElement[] = [];
      const elementCategories: { [key: string]: VisualElementCategory } = {
        navigation: {
          name: "底部导航",
          icon: <AppstoreOutlined />,
          color: "#1890ff",
          description: "应用主要导航按钮",
          elements: [],
        },
        tabs: {
          name: "顶部标签",
          icon: <AppstoreOutlined />,
          color: "#722ed1",
          description: "页面切换标签",
          elements: [],
        },
        search: {
          name: "搜索功能",
          icon: <SearchOutlined />,
          color: "#13c2c2",
          description: "搜索相关功能",
          elements: [],
        },
        content: {
          name: "内容卡片",
          icon: <AppstoreOutlined />,
          color: "#52c41a",
          description: "主要内容区域",
          elements: [],
        },
        buttons: {
          name: "按钮控件",
          icon: <AppstoreOutlined />,
          color: "#fa8c16",
          description: "可点击的按钮",
          elements: [],
        },
        text: {
          name: "文本内容",
          icon: <AppstoreOutlined />,
          color: "#eb2f96",
          description: "文本信息显示",
          elements: [],
        },
        images: {
          name: "图片内容",
          icon: <AppstoreOutlined />,
          color: "#f5222d",
          description: "图片和图标",
          elements: [],
        },
        others: {
          name: "其他元素",
          icon: <AppstoreOutlined />,
          color: "#8c8c8c",
          description: "其他UI元素",
          elements: [],
        },
      };

      allNodes.forEach((node, index) => {
        const bounds = node.getAttribute("bounds") || "";
        const text = node.getAttribute("text") || "";
        const contentDesc = node.getAttribute("content-desc") || "";
        const className = node.getAttribute("class") || "";
        const clickable = node.getAttribute("clickable") === "true";

        if (!bounds || bounds === "[0,0][0,0]") return;
        if (!text && !contentDesc && !clickable) return;

        const position = parseBounds(bounds);
        if (position.width <= 0 || position.height <= 0) return;

        const category = categorizeElement(node);
        const userFriendlyName = getUserFriendlyName(node);
        const importance = getElementImportance(node);

        const element: VisualUIElement = {
          id: `element-${index}`,
          text: text,
          description:
            contentDesc ||
            `${userFriendlyName}${clickable ? "（可点击）" : ""}`,
          type: className.split(".").pop() || "Unknown",
          category,
          position,
          clickable,
          importance,
          userFriendlyName,
        };

        extractedElements.push(element);
        elementCategories[category].elements.push(element);
      });

      setParsedElements(extractedElements);
      setCategories(
        Object.values(elementCategories).filter(
          (cat) => cat.elements.length > 0
        )
      );
    } catch (error) {
      console.error("XML解析失败:", error);
    }
  };

  // 解析XML内容
  React.useEffect(() => {
    if (xmlContent) {
      parseXML(xmlContent);
    }
  }, [xmlContent]);

  // 使用解析出的元素或传入的元素
  const finalElements = parsedElements.length > 0 ? parsedElements : elements;

  // 🔥 修复隐藏逻辑：不要完全过滤掉隐藏元素，而是显示它们但用视觉效果区分
  const filteredElements = useMemo(() => {
    return finalElements.filter((element) => {
      // 🎯 第一优先级：隐藏功能独立处理
      if (hideCompletely) {
        const isHidden = selectionManager.hiddenElements.some(
          (hidden) => hidden.id === element.id
        );
        if (isHidden) return false; // 完全隐藏：直接排除，不管其他条件
      }

      // 🔍 第二优先级：其他过滤条件
      const matchesSearch =
        searchText === "" ||
        element.userFriendlyName
          .toLowerCase()
          .includes(searchText.toLowerCase()) ||
        element.description.toLowerCase().includes(searchText.toLowerCase());

      const matchesCategory =
        selectedCategory === "all" || element.category === selectedCategory;
      const matchesClickable = !showOnlyClickable || element.clickable;

      return matchesSearch && matchesCategory && matchesClickable;
    });
  }, [
    finalElements,
    selectedCategory,
    showOnlyClickable,
    searchText,
    selectionManager.hiddenElements,
    hideCompletely,
  ]);

  // 控制面板与页面统计宽度固定：不随窗口变化而压缩

  // 渲染可视化页面预览（完全还原旧版）
  const renderPagePreview = () => {
    if (finalElements.length === 0) {
      return (
        <div
          style={{
            width: "100%",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            border: "1px solid #d1d5db",
            borderRadius: 8,
            backgroundColor: "#f9fafb",
          }}
        >
          <Text type="secondary">等待页面分析数据...</Text>
        </div>
      );
    }

    // 分析设备实际分辨率
    const maxX = Math.max(
      ...finalElements.map((e) => e.position.x + e.position.width)
    );
    const maxY = Math.max(
      ...finalElements.map((e) => e.position.y + e.position.height)
    );

    // 智能缩放计算（考虑页面预览区域的实际宽度）
    // 页面预览区域现在使用 flex: "1 1 auto"，最大宽度为 50vw
    const maxPreviewWidth = Math.min(window.innerWidth * 0.5, 600); // 最大不超过600px
    const availableWidth = maxPreviewWidth - 40; // 减去容器padding和border
    const maxDeviceWidth = availableWidth - DEVICE_FRAME_PADDING * 2 - 32; // 减去设备框架和外层padding
    
    let scale = maxDeviceWidth / (maxX || maxDeviceWidth);

    // 设置最小和最大缩放比例，确保可用性
    const minScale = 0.2; // 最小20%，确保大分辨率设备内容不会太小
    const maxScale = 2.0; // 最大200%，确保小分辨率设备不会过大
    scale = Math.max(minScale, Math.min(maxScale, scale));

    // 计算缩放后的实际尺寸
    const scaledWidth = maxX * scale;
    const scaledHeight = maxY * scale;

    // 智能分析APP和页面信息
    const { appName, pageName } = analyzeAppAndPageInfo(xmlContent);

    return (
      <div
        style={{
          width: "100%",
          border: "1px solid #4b5563",
          borderRadius: 8,
          backgroundColor: "#1f2937",
          display: "flex",
          flexDirection: "column",
        }}
      >
        {/* 标题栏 */}
        <div
          style={{
            padding: "12px",
            borderBottom: "1px solid #374151",
            backgroundColor: "#111827",
          }}
        >
          <Title
            level={5}
            style={{
              textAlign: "center",
              margin: 0,
              color: "#e5e7eb",
              fontWeight: "bold",
            }}
          >
            📱 {appName}的{pageName}
          </Title>
          <div
            style={{
              textAlign: "center",
              fontSize: "12px",
              color: "#9ca3af",
              marginTop: "4px",
            }}
          >
            设备分辨率: {maxX} × {maxY} | 缩放比例: {(scale * 100).toFixed(0)}%
          </div>
        </div>

        {/* 预览区域（自适应高度，无需滚动） */}
        <div
          style={{
            padding: "16px",
            position: "relative",
            backgroundColor: "#1f2937",
            overflow: "hidden", // 防止设备框架溢出
            display: "flex",
            justifyContent: "center", // 居中显示设备框架
          }}
        >
          {/* 设备边框模拟（外框有额外 padding，不影响内层页面坐标） */}
          <div
            style={{
              // 注意：width/height 指的是内容宽高，不含 padding
              // 这里设置为（页面宽高 + 2*padding），再配合等量 padding，实现外框比页面更大
              width: scaledWidth + DEVICE_FRAME_PADDING * 2,
              height: scaledHeight + DEVICE_FRAME_PADDING * 2,
              margin: "0 auto",
              position: "relative",
              backgroundColor: "#000",
              borderRadius: "20px",
              padding: `${DEVICE_FRAME_PADDING}px`,
              boxShadow: "0 8px 32px rgba(0, 0, 0, 0.3)",
            }}
          >
            {/* 实际页面内容区域 */}
            <div
              style={{
                width: scaledWidth,
                height: scaledHeight,
                position: "relative",
                backgroundColor: "#ffffff",
                borderRadius: "12px",
                overflow: "hidden",
              }}
            >
              {filteredElements.map((element) => {
                const category = categories.find(
                  (cat) => cat.name === element.category
                );
                // 计算元素在缩放后的位置和大小
                const elementLeft = element.position.x * scale;
                const elementTop = element.position.y * scale;
                const elementWidth = Math.max(
                  element.position.width * scale,
                  1
                );
                const elementHeight = Math.max(
                  element.position.height * scale,
                  1
                );

                // 🔥 重要修复：使用选择管理器获取元素显示状态
                const displayState = selectionManager.getElementDisplayState(
                  element.id
                );

                return (
                  <div
                    key={element.id}
                    title={`${element.userFriendlyName}: ${
                      element.description
                    }\n位置: (${element.position.x}, ${
                      element.position.y
                    })\n大小: ${element.position.width} × ${
                      element.position.height
                    }${
                      !hideCompletely && displayState.isHidden
                        ? "\n🙈 已隐藏"
                        : ""
                    }`}
                    style={{
                      position: "absolute",
                      left: elementLeft,
                      top: elementTop,
                      width: elementWidth,
                      height: elementHeight,
                      backgroundColor: category?.color || "#8b5cf6",
                      opacity:
                        !hideCompletely && displayState.isHidden
                          ? 0.1 // 半透明模式下显示隐藏效果
                          : displayState.isPending
                          ? 1
                          : element.clickable
                          ? 0.7
                          : 0.4,
                      border: displayState.isPending
                        ? "2px solid #52c41a"
                        : displayState.isHovered
                        ? "2px solid #faad14"
                        : element.clickable
                        ? "1px solid #fff"
                        : "1px solid rgba(255,255,255,0.3)",
                      borderRadius:
                        Math.min(elementWidth, elementHeight) > 10
                          ? "2px"
                          : "1px",
                      cursor:
                        !hideCompletely && displayState.isHidden
                          ? "default"
                          : element.clickable
                          ? "pointer"
                          : "default",
                      transition: "all 0.2s ease",
                      zIndex: displayState.isPending
                        ? 50
                        : displayState.isHovered
                        ? 30
                        : element.clickable
                        ? 10
                        : 5,
                      transform: displayState.isPending
                        ? "scale(1.1)"
                        : displayState.isHovered
                        ? "scale(1.05)"
                        : "scale(1)",
                      boxShadow: displayState.isPending
                        ? "0 4px 16px rgba(82, 196, 26, 0.4)"
                        : displayState.isHovered
                        ? "0 2px 8px rgba(0,0,0,0.2)"
                        : "none",
                      filter:
                        !hideCompletely && displayState.isHidden
                          ? "grayscale(100%) blur(1px)"
                          : "none", // 半透明模式下的模糊效果
                    }}
                    onClick={(e) => {
                      if (
                        !element.clickable ||
                        (!hideCompletely && displayState.isHidden)
                      )
                        return;
                      // 阻止事件冒泡
                      e.stopPropagation();

                      // 获取点击位置（相对于页面的绝对位置，用于定位气泡）
                      const clickPosition = {
                        x: e.clientX, // 使用页面绝对坐标来定位气泡
                        y: e.clientY,
                      };

                      console.log(
                        "🎯 点击坐标 - 页面绝对:",
                        e.clientX,
                        e.clientY
                      );

                      // 使用选择管理器处理点击，显示气泡弹窗
                      const uiElement = convertVisualToUIElement(element);
                      selectionManager.handleElementClick(
                        uiElement,
                        clickPosition
                      );
                    }}
                    onMouseEnter={(e) => {
                      if (displayState.isHidden) return;

                      setHoveredElement(element.id);
                      // 通知选择管理器悬停状态
                      selectionManager.handleElementHover(element.id);
                    }}
                    onMouseLeave={(e) => {
                      if (displayState.isHidden) return;

                      setHoveredElement(null);
                      // 清除悬停状态
                      selectionManager.handleElementHover(null);
                    }}
                  >
                    {/* 元素标签（仅在足够大时显示）*/}
                    {elementWidth > 40 &&
                      elementHeight > 20 &&
                      element.text && (
                        <div
                          style={{
                            fontSize: Math.max(
                              8,
                              Math.min(12, elementHeight / 3)
                            ),
                            color: "#fff",
                            textShadow: "0 1px 2px rgba(0,0,0,0.8)",
                            padding: "1px 2px",
                            overflow: "hidden",
                            whiteSpace: "nowrap",
                            textOverflow: "ellipsis",
                            lineHeight: 1.2,
                          }}
                        >
                          {element.text.substring(0, 10)}
                        </div>
                      )}
                  </div>
                );
              })}

              {/* 网格辅助线（可选） */}
              {scaledWidth > 200 && (
                <>
                  {/* 垂直辅助线 */}
                  {[0.25, 0.5, 0.75].map((ratio, index) => (
                    <div
                      key={`v-${index}`}
                      style={{
                        position: "absolute",
                        left: scaledWidth * ratio,
                        top: 0,
                        bottom: 0,
                        width: "1px",
                        backgroundColor: "rgba(156, 163, 175, 0.1)",
                        pointerEvents: "none",
                      }}
                    />
                  ))}

                  {/* 水平辅助线 */}
                  {[0.25, 0.5, 0.75].map((ratio, index) => (
                    <div
                      key={`h-${index}`}
                      style={{
                        position: "absolute",
                        top: scaledHeight * ratio,
                        left: 0,
                        right: 0,
                        height: "1px",
                        backgroundColor: "rgba(156, 163, 175, 0.1)",
                        pointerEvents: "none",
                      }}
                    />
                  ))}
                </>
              )}
            </div>
          </div>

          {/* 取消滚动提示：父容器已自适应高度 */}
        </div>
      </div>
    );
  };

  // 保持中间预览在可视核心位置：容器与中列引用
  const rowRef = useRef<HTMLDivElement | null>(null);
  const middleRef = useRef<HTMLDivElement | null>(null);

  useLayoutEffect(() => {
    const centerMiddle = () => {
      const row = rowRef.current;
      const mid = middleRef.current;
      if (!row || !mid) return;
      const rowRect = row.getBoundingClientRect();
      const midRect = mid.getBoundingClientRect();
      // 将中列中心滚动到容器中心
      const desiredScrollLeft =
        mid.offsetLeft + midRect.width / 2 - row.clientWidth / 2;
      row.scrollTo({ left: desiredScrollLeft, behavior: "smooth" });
    };
    centerMiddle();
    window.addEventListener("resize", centerMiddle);
    return () => window.removeEventListener("resize", centerMiddle);
  }, []);

  return (
    <div
      ref={rowRef}
      style={{
        display: "flex",
        gap: 8,
        flexWrap: "nowrap",
        width: "100%",
        alignItems: "flex-start",
        minWidth: "900px", // 减少最小宽度要求
      }}
    >
      {/* 左侧控制面板（宽度固定，与“页面统计”一致） */}
      <div
        style={{
          width: "clamp(120px, 10vw, 140px)", // 压缩到约一半宽度
          minWidth: 120,
          borderRight: "1px solid #f0f0f0",
          paddingRight: 6,
          flex: "0 0 clamp(120px, 10vw, 140px)",
          flexShrink: 0,
        }}
      >
        <Space direction="vertical" style={{ width: "100%" }} size={12}>
          {/* 搜索框 - 紧凑设计 */}
          <Input
            placeholder="搜索..."
            prefix={<SearchOutlined />}
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
            size="small"
            style={{ fontSize: '12px' }}
          />

          {/* 过滤选项 - 优化文本布局 */}
          <div>
            <Space direction="vertical" style={{ width: "100%" }} size={12}>
              <Space align="center" size={8}>
                <input
                  type="checkbox"
                  checked={showOnlyClickable}
                  onChange={(e) => setShowOnlyClickable(e.target.checked)}
                />
                <Text style={{ fontSize: '13px' }}>只显示可点击元素</Text>
              </Space>

              {/* 🎯 隐藏模式选择 - 优化长文本布局 */}
              <div>
                <Space align="start" size={8}>
                  <input
                    type="checkbox"
                    checked={hideCompletely}
                    onChange={(e) => setHideCompletely(e.target.checked)}
                    style={{ marginTop: 2 }} // 对齐多行文本
                  />
                  <div style={{ flex: 1, lineHeight: 1.4 }}>
                    <Text 
                      style={{ 
                        fontSize: '13px',
                        wordBreak: 'break-word',
                        hyphens: 'auto'
                      }}
                    >
                      完全隐藏元素
                      <br />
                      <Text 
                        type="secondary" 
                        style={{ 
                          fontSize: '11px',
                          lineHeight: 1.2 
                        }}
                      >
                        （否则半透明显示）
                      </Text>
                    </Text>
                  </div>
                </Space>
              </div>

              {/* 🔥 添加隐藏元素管理 */}
              {selectionManager.hiddenElements.length > 0 && (
                <div
                  style={{
                    padding: "8px",
                    backgroundColor: "#f6ffed",
                    border: "1px solid #b7eb8f",
                    borderRadius: "4px",
                    fontSize: "12px",
                  }}
                >
                  <Space
                    direction="vertical"
                    size={4}
                    style={{ width: "100%" }}
                  >
                    <Text style={{ fontSize: "12px", color: "#52c41a" }}>
                      已隐藏 {selectionManager.hiddenElements.length} 个元素
                      {hideCompletely ? "（完全隐藏）" : "（半透明显示）"}
                    </Text>
                    <Button
                      size="small"
                      type="link"
                      onClick={selectionManager.restoreAllElements}
                      style={{ padding: 0, height: "auto", fontSize: "11px" }}
                    >
                      恢复所有隐藏元素
                    </Button>
                  </Space>
                </div>
              )}
            </Space>
          </div>

          {/* 分类选择 - 紧凑设计 */}
          <div>
            <Title level={5} style={{ fontSize: '13px', marginBottom: '8px' }}>
              分类
            </Title>
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              <Button
                type={selectedCategory === "all" ? "primary" : "default"}
                size="small"
                onClick={() => setSelectedCategory("all")}
                style={{ 
                  textAlign: "left",
                  fontSize: '11px',
                  height: '28px',
                  padding: '0 6px'
                }}
              >
                <AppstoreOutlined /> 全部 ({finalElements.length})
              </Button>
              {categories.map((category) => (
                <Button
                  key={category.name}
                  type={
                    selectedCategory === category.name ? "primary" : "default"
                  }
                  size="small"
                  onClick={() => setSelectedCategory(category.name)}
                  style={{
                    textAlign: "left",
                    fontSize: '11px',
                    height: '28px',
                    padding: '0 6px',
                    borderColor: category.color,
                    backgroundColor:
                      selectedCategory === category.name
                        ? category.color
                        : undefined,
                  }}
                  title={`${category.name} (${category.elements.length})`} // Tooltip for full info
                >
                  {category.icon} {category.name.length > 4 
                    ? category.name.substring(0, 4) + '...' 
                    : category.name} ({category.elements.length})
                </Button>
              ))}
            </div>
          </div>

          {/* 统计信息 - 紧凑设计 */}
          <div style={{ width: "100%" }}>
            <Alert
              message="统计"
              description={
                <div style={{ fontSize: '11px', lineHeight: 1.3 }}>
                  <div>总数: {finalElements.length}</div>
                  <div>
                    可见:{" "}
                    {
                      finalElements.filter(
                        (e) => !selectionManager.isElementHidden(e.id)
                      ).length
                    }
                  </div>
                  <div>
                    隐藏:{" "}
                    {
                      finalElements.filter((e) =>
                        selectionManager.isElementHidden(e.id)
                      ).length
                    }
                  </div>
                  <div>
                    可点击:{" "}
                    {
                      finalElements.filter(
                        (e) =>
                          e.clickable && !selectionManager.isElementHidden(e.id)
                      ).length
                    }
                  </div>
                  <div>
                    重要:{" "}
                    {
                      finalElements.filter(
                        (e) =>
                          e.importance === "high" &&
                          !selectionManager.isElementHidden(e.id)
                      ).length
                    }
                  </div>
                </div>
              }
              type="info"
            />
          </div>

          {/* 🔥 隐藏元素状态提示 */}
          {selectionManager.hiddenElements.length > 0 && (
            <Alert
              message={
                <span>
                  🙈 已隐藏 {selectionManager.hiddenElements.length} 个元素
                </span>
              }
              description="隐藏的元素仍会显示但呈现半透明状态，60秒后自动恢复"
              type="warning"
              showIcon
              closable={false}
            />
          )}
        </Space>
      </div>

      {/* 中间页面预览（主要区域，增加宽度） */}
      <div
        ref={middleRef}
        style={{
          flex: "1 1 auto", // 使用剩余空间作为主要区域
          minWidth: 400,
          maxWidth: "50vw", // 限制最大宽度不超过视口一半
          display: "flex",
          justifyContent: "center",
          alignItems: "flex-start",
          flexShrink: 0,
        }}
      >
        {renderPagePreview()}
      </div>

      {/* 右侧元素列表（缩小为辅助区域） */}
      <div
        style={{
          width: "clamp(240px, 18vw, 320px)", // 明显缩小宽度
          minWidth: 240,
          flex: "0 0 clamp(240px, 18vw, 320px)",
          flexShrink: 0,
        }}
      >
        <Title level={5}>元素列表 ({filteredElements.length})</Title>
        <Space direction="vertical" style={{ width: "100%" }} size={8}>
          {filteredElements.map((element) => {
            const category = categories.find(
              (cat) => cat.name === element.category
            );
            return (
              <div
                key={element.id}
                style={{
                  border: "1px solid #d9d9d9",
                  borderRadius: "6px",
                  padding: "12px",
                  cursor: "pointer",
                  transition: "all 0.2s",
                  backgroundColor: "#fff",
                  wordBreak: "break-word",
                }}
                onClick={(e) => {
                  const clickPosition = {
                    x: e.clientX,
                    y: e.clientY
                  };
                  
                  // 🎯 修复：统一使用同一个选择管理器，避免状态冲突
                  if (externalSelectionManager) {
                    // 使用外部管理器时，转换元素类型
                    const uiElement = convertVisualToUIElement(element);
                    selectionManager.handleElementClick(uiElement, clickPosition);
                  } else {
                    // 使用内部管理器时，直接从转换后的元素中查找
                    const uiElement = convertedElements.find(el => el.id === element.id);
                    if (uiElement) {
                      selectionManager.handleElementClick(uiElement, clickPosition);
                    }
                  }
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.borderColor =
                    category?.color || "#1890ff";
                  e.currentTarget.style.boxShadow = `0 2px 8px ${
                    category?.color || "#1890ff"
                  }20`;
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.borderColor = "#d9d9d9";
                  e.currentTarget.style.boxShadow = "none";
                }}
              >
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 8,
                    marginBottom: 8,
                  }}
                >
                  {category?.icon}
                  <span style={{ color: category?.color, fontWeight: "bold" }}>
                    {element.userFriendlyName}
                  </span>
                  {element.clickable && <Tag color="green">可点击</Tag>}
                  <Tag
                    color={
                      element.importance === "high"
                        ? "red"
                        : element.importance === "medium"
                        ? "orange"
                        : "default"
                    }
                  >
                    {element.importance === "high"
                      ? "重要"
                      : element.importance === "medium"
                      ? "中等"
                      : "一般"}
                  </Tag>
                </div>
                <div style={{ fontSize: 12, color: "#666" }}>
                  <p style={{ margin: 0 }}>
                    <strong>功能:</strong>{" "}
                    <span style={{ wordBreak: "break-word" }}>
                      {element.description}
                    </span>
                  </p>
                  <p style={{ margin: 0 }}>
                    <strong>位置:</strong> ({element.position.x},{" "}
                    {element.position.y})
                  </p>
                  <p style={{ margin: 0 }}>
                    <strong>大小:</strong> {element.position.width} ×{" "}
                    {element.position.height}
                  </p>
                  {element.text && (
                    <p style={{ margin: 0 }}>
                      <strong>文本:</strong>{" "}
                      <span style={{ wordBreak: "break-word" }}>
                        {element.text}
                      </span>
                    </p>
                  )}
                </div>
              </div>
            );
          })}
        </Space>
      </div>

      {/* 🎯 重新添加气泡弹窗功能 */}
      <ElementSelectionPopover
        visible={!!selectionManager.pendingSelection}
        selection={selectionManager.pendingSelection}
        onConfirm={selectionManager.confirmSelection}
        onCancel={selectionManager.hideElement}
      />
    </div>
  );
};
