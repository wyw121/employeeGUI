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
import { ErrorBoundary } from "../ErrorBoundary";

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
  EnhancedElementCreationOptions 
} from "./enhanced-element-creation";
import { EnhancedUIElement } from "../../modules/enhanced-element-info/types";
// 🆕 使用外置的视图组件
import { VisualElementView, ElementListView, UIElementTree, GridElementView } from "./views";
import {
  useElementSelectionManager,
  ElementSelectionPopover,
} from "./element-selection";
// 🆕 使用专门的可视化页面分析组件
// 移除基于 Tab 的外置可视化容器，改为旧版两列布局中的三视图切换

const { Text, Title } = Typography;
const { Option } = Select;
const { Search } = Input;

interface UniversalPageFinderModalProps {
  visible: boolean;
  onClose: () => void;
  onElementSelected?: (element: UIElement) => void;
  initialViewMode?: "visual" | "tree" | "list" | "grid"; // 🆕 初始视图模式
}

const UniversalPageFinderModal: React.FC<UniversalPageFinderModalProps> = ({
  visible,
  onClose,
  onElementSelected,
  initialViewMode = "visual", // 🆕 默认为 visual 视图
}) => {
  // === 状态管理 ===
  const [selectedDevice, setSelectedDevice] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const [currentXmlContent, setCurrentXmlContent] = useState<string>("");
  const [viewMode, setViewMode] = useState<"visual" | "tree" | "list" | "grid">(
    initialViewMode // 🆕 使用传入的初始视图模式
  ); // 可视化分析Tab内部的四视图切换
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
    (selectedElement) => {
      console.log("✅ 用户确认选择元素:", selectedElement);
      if (onElementSelected) {
        onElementSelected(selectedElement);
      }
      onClose();
    }
  );

  // === 设备连接处理 ===
  useEffect(() => {
    if (visible) {
      refreshDevices();
    }
  }, [visible, refreshDevices]);

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

      // 然后提取元素
      const elements = await UniversalUIAPI.extractPageElements(xmlContent);
      setUIElements(elements);

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
        } catch (parseError) {
          console.error("🚨 XML解析失败:", parseError);
          setElements([]);
          setCategories([]);
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

    try {
      // 🆕 创建增强元素信息，包含完整XML上下文
      const enhancedElement = await EnhancedElementCreator.createEnhancedElement(element, {
        xmlContent: currentXmlContent,
        xmlCacheId: `xml_${Date.now()}`,
        packageName: 'com.xingin.xhs', // 小红书包名，TODO: 动态获取
        pageInfo: {
          appName: '小红书',
          pageName: '当前页面'
        },
        deviceInfo: selectedDevice ? {
          deviceId: selectedDevice,
          deviceName: devices.find(d => d.id === selectedDevice)?.name || selectedDevice,
          resolution: { width: 1080, height: 1920 } // TODO: 动态获取设备分辨率
        } : undefined,
        enableSmartAnalysis: true
      });

      console.log("✅ 增强元素信息创建完成:", {
        xmlContentLength: enhancedElement.xmlContext.xmlSourceContent.length,
        xmlCacheId: enhancedElement.xmlContext.xmlCacheId,
        hasSmartAnalysis: !!enhancedElement.smartAnalysis,
        smartDescription: enhancedElement.smartDescription
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
          displayName: enhancedElement.smartDescription || element.text || element.element_type,
          elementType: element.element_type,
          position: {
            x: element.bounds.left,
            y: element.bounds.top,
            width: element.bounds.right - element.bounds.left,
            height: element.bounds.bottom - element.bounds.top
          },
          xmlSource: enhancedElement.xmlContext.xmlCacheId,
          confidence: enhancedElement.smartAnalysis?.confidence || 0.5
        }
      } as UIElement;

      console.log("🚀 传递增强元素信息:", {
        hasEnhancedElement: !!(enhancedElementWithCompat as any).enhancedElement,
        hasXmlContent: !!(enhancedElementWithCompat as any).xmlContent,
        hasElementSummary: !!(enhancedElementWithCompat as any).elementSummary,
        smartDescription: (enhancedElementWithCompat as any).smartDescription
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
          {(elements.length > 0 || uiElements.length > 0) && (
            <Space.Compact size="small">
              <Button
                type={viewMode === "visual" ? "primary" : "default"}
                icon={<EyeOutlined />}
                onClick={() => setViewMode("visual")}
              >
                可视化视图
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
          )}
        </div>
      }
      size="small"
    >
      {loading ? (
        <div style={{ textAlign: "center", padding: 50 }}>
          <Spin size="large" />
          <div style={{ marginTop: 16 }}>正在分析页面...</div>
        </div>
      ) : elements.length > 0 || uiElements.length > 0 ? (
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
          ) : viewMode === "grid" ? (
            <ErrorBoundary>
              <GridElementView
                xmlContent={currentXmlContent}
                elements={elements}
                onElementSelect={handleVisualElementSelect}
                selectedElementId={selectedElementId}
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
      onCancel={onClose}
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
      <Row gutter={10} style={{ flexWrap: "nowrap" }}> {/* 强制不换行 */}
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
        <Col flex="1 1 auto" style={{ minWidth: 0, overflow: "hidden" }}>{renderAnalyzerPanel()}</Col>
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
