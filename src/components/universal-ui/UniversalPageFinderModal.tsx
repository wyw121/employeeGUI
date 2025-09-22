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
  Tabs,
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
// 🆕 导入增强类型
import type { EnhancedUIElement } from "./xml-parser/types";
// 🆕 使用外置的视图组件
import { VisualElementView, ElementListView, UIElementTree } from "./views";
import { useElementSelectionManager, ElementSelectionPopover } from "./element-selection";
// 🆕 使用专门的可视化页面分析组件
import { VisualPageAnalyzerContent } from "./views/visual-view/VisualPageAnalyzerContent";

const { Text, Title } = Typography;
const { Option } = Select;
const { TabPane } = Tabs;
const { Search } = Input;

interface UniversalPageFinderModalProps {
  visible: boolean;
  onClose: () => void;
  onElementSelected?: (element: UIElement) => void;
}

const UniversalPageFinderModal: React.FC<UniversalPageFinderModalProps> = ({
  visible,
  onClose,
  onElementSelected,
}) => {
  // === 状态管理 ===
  const [selectedDevice, setSelectedDevice] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const [currentXmlContent, setCurrentXmlContent] = useState<string>("");
  const [activeTab, setActiveTab] = useState<string>("device");
  const [uiElements, setUIElements] = useState<UIElement[]>([]);
  const [searchText, setSearchText] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [showOnlyClickable, setShowOnlyClickable] = useState(false);

  // ADB Hook
  const { devices, refreshDevices, isLoading: isConnecting } = useAdb();

  // 🆕 使用新的模块化XML解析功能
  const [elements, setElements] = useState<VisualUIElement[]>([]);
  const [categories, setCategories] = useState<VisualElementCategory[]>([]);

  // 使用新的元素选择管理器
  const selectionManager = useElementSelectionManager(uiElements, (selectedElement) => {
    console.log("✅ 用户确认选择元素:", selectedElement);
    if (onElementSelected) {
      onElementSelected(selectedElement);
    }
    onClose();
  });

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
          console.log('🚀 新模块化XML解析完成:', {
            elementsCount: parseResult.elements.length,
            categoriesCount: parseResult.categories.length,
            appInfo: parseResult.appInfo
          });
        } catch (parseError) {
          console.error('🚨 XML解析失败:', parseError);
          setElements([]);
          setCategories([]);
        }
      }
      
      setActiveTab("analyzer");
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
      const pageContent: XmlPageContent = await XmlPageCacheService.loadPageContent(page);
      
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
          console.log('🚀 缓存页面XML解析完成:', {
            elementsCount: parseResult.elements.length,
            categoriesCount: parseResult.categories.length,
            appInfo: parseResult.appInfo
          });
        } catch (parseError) {
          console.error('🚨 缓存页面XML解析失败:', parseError);
          setElements([]);
          setCategories([]);
        }
      }
      
      setActiveTab("analyzer");
      message.success(`已加载缓存页面: ${page.description}`);
    } catch (error) {
      console.error("加载缓存页面失败:", error);
      message.error("缓存页面数据加载失败");
    }
  };

  // 智能元素选择处理
  const handleSmartElementSelect = (element: UIElement) => {
    console.log("🎯 智能元素选择:", element);

    // 检查是否有增强信息
    const anyElement = element as any;
    if (anyElement.isEnhanced) {
      console.log("🚀 传递增强元素信息:", {
        xmlCacheId: anyElement.xmlCacheId,
        smartDescription: anyElement.smartDescription,
        hasXmlContent: !!anyElement.xmlContent,
      });
    }

    if (onElementSelected) {
      onElementSelected(element);
    }
    onClose();
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

  // 设备选择Tab
  const renderDeviceTab = () => (
    <div>
      <Card title="设备连接" className="mb-4">
        <Space direction="vertical" style={{ width: "100%" }}>
          <Select
            value={selectedDevice}
            onChange={setSelectedDevice}
            placeholder="选择ADB设备"
            style={{ width: "100%" }}
            loading={isConnecting}
          >
            {devices.map((device) => (
              <Option key={device.id} value={device.id}>
                {device.name} ({device.id})
              </Option>
            ))}
          </Select>
          <Space>
            <Button onClick={refreshDevices} icon={<ReloadOutlined />}>
              刷新设备列表
            </Button>
            <Button
              type="primary"
              onClick={() => getPageUIElements(selectedDevice)}
              disabled={!selectedDevice}
              loading={loading}
              icon={<MobileOutlined />}
            >
              获取当前页面
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
      <Card title="历史页面缓存">
        <XmlCachePageSelector onPageSelected={handleCachedPageSelect} />
      </Card>
    </div>
  );

  // 可视化分析Tab
  const renderAnalyzerTab = () => {
    if (!currentXmlContent) {
      return (
        <Alert
          message="暂无页面数据"
          description="请先选择设备获取页面信息，或从历史缓存中选择页面"
          type="info"
          showIcon
        />
      );
    }

    return (
      <ErrorBoundary>
        <VisualPageAnalyzerContent
          xmlContent={currentXmlContent}
          onElementSelected={handleSmartElementSelect}
        />
      </ErrorBoundary>
    );
  };

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
      width={1200}
      footer={null}
      className="universal-page-finder-modal"
    >
      <Tabs
        activeKey={activeTab}
        onChange={setActiveTab}
        items={[
          {
            key: "device",
            label: (
              <span>
                <MobileOutlined />
                设备连接
              </span>
            ),
            children: renderDeviceTab(),
          },
          {
            key: "analyzer",
            label: (
              <span>
                <EyeOutlined />
                可视化分析
              </span>
            ),
            children: renderAnalyzerTab(),
          },
          {
            key: "list",
            label: (
              <span>
                <UnorderedListOutlined />
                列表视图
              </span>
            ),
            children: renderListTab(),
          },
          {
            key: "tree",
            label: (
              <span>
                <BranchesOutlined />
                树形视图
              </span>
            ),
            children: renderTreeTab(),
          },
        ]}
      />

      {/* 使用新的元素选择弹出框组件 */}
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