/**
 * 可视化页面分析器内容组件
 * 从 UniversalPageFinderModal 中的内联 VisualPageAnalyzerContent 组件提取
 */

import React, { useState } from 'react';
import { Input, Button, Space, Alert, Typography, Tag, Card } from 'antd';
import { SearchOutlined, AppstoreOutlined } from '@ant-design/icons';

import type { VisualUIElement, VisualElementCategory } from '../../types';
import type { UIElement } from '../../../../api/universalUIAPI';
import {
  UniversalElementAnalyzer,
  SmartStepDescriptionGenerator,
  ElementAnalysisResult,
} from '../../UniversalElementAnalyzer';
import {
  RealXMLAnalysisService,
} from '../../../../services/RealXMLAnalysisService';
import { parseXML, analyzeAppAndPageInfo } from '../../xml-parser';
import { convertVisualToUIElement, createElementContext } from '../../data-transform';
import { useElementSelectionManager, ElementSelectionPopover } from '../../element-selection';
import { VisualPagePreview } from './VisualPagePreview';

const { Text, Title } = Typography;
const { Search } = Input;

// 从 VisualPageAnalyzer 提取的核心内容组件接口
interface VisualPageAnalyzerContentProps {
  xmlContent: string;
  onElementSelected?: (element: UIElement) => void;
}

export const VisualPageAnalyzerContent: React.FC<VisualPageAnalyzerContentProps> = ({
  xmlContent,
  onElementSelected,
}) => {
  const [searchText, setSearchText] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("all");

  // 🆕 使用新模块化的XML解析功能
  const [showOnlyClickable, setShowOnlyClickable] = useState(false);
  const [elements, setElements] = useState<VisualUIElement[]>([]);
  const [categories, setCategories] = useState<VisualElementCategory[]>([]);

  // 创建完整的ElementContext的辅助函数
  const createElementContextHelper = (element: VisualUIElement): any => {
    return {
      text: element.text,
      contentDesc: element.description,
      resourceId: "",
      className: element.type,
      bounds: `[${element.position.x},${element.position.y}][${
        element.position.x + element.position.width
      },${element.position.y + element.position.height}]`,
      clickable: element.clickable,
      selected: false,
      enabled: true,
      focusable: false,
      scrollable: false,
      checkable: false,
      checked: false,
      position: element.position,
      screenWidth: 1080, // 默认屏幕宽度
      screenHeight: 1920, // 默认屏幕高度
      parentElements: [],
      siblingElements: [],
      childElements: [],
    };
  };

  // 智能分析元素的函数（在VisualPageAnalyzerContent内部）
  const analyzeVisualElement = (
    element: VisualUIElement
  ): ElementAnalysisResult | null => {
    try {
      const elementContext = createElementContextHelper(element);
      return UniversalElementAnalyzer.analyzeElement(
        elementContext,
        "com.xingin.xhs"
      );
    } catch (error) {
      console.error("可视化元素分析失败:", error);
      return null;
    }
  };

  // 智能元素选择处理函数
  const handleSmartElementSelect = (element: VisualUIElement) => {
    if (!element.clickable || !onElementSelected) return;

    // 安全地获取position数据，提供默认值
    const position = element.position || { x: 0, y: 0, width: 100, height: 50 };

    // 转换为 UIElement 格式
    const uiElement: UIElement = {
      id: element.id,
      text: element.text,
      element_type: element.type,
      xpath: "",
      bounds: {
        left: position.x,
        top: position.y,
        right: position.x + position.width,
        bottom: position.y + position.height,
      },
      is_clickable: element.clickable,
      is_scrollable: false,
      is_enabled: true,
      is_focused: false,
      checkable: false,
      checked: false,
      selected: false,
      password: false,
      // 不将友好描述写入 content_desc，保持其为真实 XML 值（此处未知则置空）
      content_desc: "",
    };

    // 执行智能分析
    const analysis = analyzeVisualElement(element);

    // 生成增强的步骤描述
    let smartDescription: string;
    try {
      // 使用真实XML分析服务进行增强分析
      const realAnalysis = RealXMLAnalysisService.analyzeElement(
        element.text || "",
        element.description || "",
        {
          x: element.position?.x || 0,
          y: element.position?.y || 0,
          width: element.position?.width || 0,
          height: element.position?.height || 0,
        },
        element.type || "",
        "com.xingin.xhs",
        element.clickable || false
      );

      smartDescription =
        RealXMLAnalysisService.generateEnhancedStepDescription(realAnalysis);
    } catch (error) {
      console.error("可视化元素真实XML分析失败，使用备用方案:", error);
      smartDescription = analysis
        ? SmartStepDescriptionGenerator.generateStepDescription(
            analysis,
            createElementContextHelper(element)
          )
        : `点击 ${element.text || element.type} 元素`;
    }

    // 🆕 使用简化的增强信息传递方案
    // 直接在UIElement上添加增强信息，保持向后兼容
    const enhancedUIElement = {
      ...uiElement,
      // 增强标识
      isEnhanced: true,
      // XML上下文信息（临时简化方案）
      xmlCacheId: "current_analysis",
      xmlContent: "", // 这里需要从外部传入
      xmlTimestamp: Date.now(),
      // 智能分析结果
      smartAnalysis: analysis,
      smartDescription: smartDescription,
    };

    console.log("🚀 传递增强元素信息给外部:", {
      isEnhanced: enhancedUIElement.isEnhanced,
      xmlCacheId: enhancedUIElement.xmlCacheId,
      hasXmlContent: !!enhancedUIElement.xmlContent,
      enhancedUIElement,
    });

    onElementSelected(enhancedUIElement as any);

    // 显示智能分析结果
    if (analysis) {
      console.log("🎯 可视化元素智能分析结果:", {
        userDescription: analysis.userDescription,
        confidence: analysis.confidence,
        actionSuggestion: analysis.actionSuggestion,
        elementType: analysis.elementType,
      });
    }
  };

  // UIElement数组用于API调用（提升到组件顶部，确保唯一）
  const convertVisualToUIElementLocal = (
    visualElement: VisualUIElement
  ): UIElement => {
    // 安全地获取position数据，提供默认值
    const position = visualElement.position || {
      x: 0,
      y: 0,
      width: 100,
      height: 50,
    };

    return {
      id: visualElement.id,
      text: visualElement.text,
      element_type: visualElement.type,
      xpath: "",
      bounds: {
        left: position.x,
        top: position.y,
        right: position.x + position.width,
        bottom: position.y + position.height,
      },
      is_clickable: visualElement.clickable,
      is_scrollable: false,
      is_enabled: true,
      is_focused: false,
      checkable: false,
      checked: false,
      selected: false,
      password: false,
      // 不写入友好描述
      content_desc: "",
    };
  };

  const uiElements = elements.map(convertVisualToUIElementLocal);

  // 使用新的元素选择管理器
  const selectionManager = useElementSelectionManager(
    uiElements,
    (selectedElement) => {
      // 元素被确认选择后的处理逻辑
      console.log("✅ 用户确认选择元素:", selectedElement);

      // 找到对应的VisualUIElement
      const visualElement = elements.find((el) => el.id === selectedElement.id);
      if (visualElement) {
        handleSmartElementSelect(visualElement);
      }
    }
  );

  // 🆕 使用新模块化的XML解析功能
  const handleXmlParsing = (xmlString: string) => {
    if (!xmlString) return;
    
    try {
      // 使用新的模块化解析器
      const parseResult = parseXML(xmlString);
      
      setElements(parseResult.elements);
      setCategories(parseResult.categories);
      
      console.log('🚀 新模块化XML解析完成:', {
        elementsCount: parseResult.elements.length,
        categoriesCount: parseResult.categories.length,
        appInfo: parseResult.appInfo
      });
      
    } catch (error) {
      console.error('🚨 XML解析失败:', error);
      setElements([]);
      setCategories([]);
    }
  };

  // 解析XML内容
  React.useEffect(() => {
    if (xmlContent) {
      handleXmlParsing(xmlContent);
    }
  }, [xmlContent]);

  // 过滤元素
  const filteredElements = elements.filter((element) => {
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

  return (
    <div style={{ display: "flex", gap: 16, height: 600 }}>
      {/* 左侧控制面板 */}
      <div
        style={{
          width: 300,
          borderRight: "1px solid #f0f0f0",
          paddingRight: 16,
        }}
      >
        <Space direction="vertical" style={{ width: "100%" }} size={16}>
          {/* 搜索框 */}
          <Input
            placeholder="搜索元素..."
            prefix={<SearchOutlined />}
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
          />

          {/* 过滤选项 */}
          <div>
            <Space direction="vertical" style={{ width: "100%" }}>
              <Space>
                <input
                  type="checkbox"
                  checked={showOnlyClickable}
                  onChange={(e) => setShowOnlyClickable(e.target.checked)}
                />
                <Text>只显示可点击元素</Text>
              </Space>

              {/* 隐藏元素管理 */}
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

          {/* 分类选择 */}
          <div>
            <Title level={5}>按功能分类</Title>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              <Button
                type={selectedCategory === "all" ? "primary" : "default"}
                size="small"
                onClick={() => setSelectedCategory("all")}
                style={{ textAlign: "left" }}
              >
                <AppstoreOutlined /> 全部 ({elements.length})
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
                    borderColor: category.color,
                    backgroundColor:
                      selectedCategory === category.name
                        ? category.color
                        : undefined,
                  }}
                >
                  {category.icon} {category.name} ({category.elements.length})
                </Button>
              ))}
            </div>
          </div>

          {/* 统计信息 */}
          <Alert
            message="页面统计"
            description={
              <div>
                <p>总元素: {elements.length} 个</p>
                <p>可点击: {elements.filter((e) => e.clickable).length} 个</p>
                <p>
                  高重要性:{" "}
                  {elements.filter((e) => e.importance === "high").length} 个
                </p>
              </div>
            }
            type="info"
          />
        </Space>
      </div>

      {/* 中间页面预览 */}
      <div
        style={{
          flex: 1,
          display: "flex",
          justifyContent: "center",
          alignItems: "flex-start",
        }}
      >
        <VisualPagePreview
          xmlContent={xmlContent}
          elements={elements}
          categories={categories}
          filteredElements={filteredElements}
          selectionManager={selectionManager}
          onElementClick={handleSmartElementSelect}
          convertVisualToUIElement={convertVisualToUIElementLocal}
        />
      </div>

      {/* 右侧元素列表 */}
      <div style={{ width: 400, maxHeight: 600, overflowY: "auto" }}>
        <Title level={5}>元素列表 ({filteredElements.length})</Title>
        <Space direction="vertical" style={{ width: "100%" }} size={8}>
          {filteredElements.map((element) => {
            const category = categories.find(
              (cat) => cat.name === element.category
            );
            return (
              <Card
                key={element.id}
                size="small"
                title={
                  <div
                    style={{ display: "flex", alignItems: "center", gap: 8 }}
                  >
                    {category?.icon}
                    <span style={{ color: category?.color }}>
                      {element.userFriendlyName}
                    </span>
                    {element.clickable && <Tag color="green">可点击</Tag>}
                  </div>
                }
                extra={
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
                }
              >
                <div style={{ fontSize: 12 }}>
                  <p style={{ margin: 0 }}>
                    <strong>功能:</strong> {element.description}
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
                      <strong>文本:</strong> {element.text}
                    </p>
                  )}
                </div>
              </Card>
            );
          })}
        </Space>
      </div>

      {/* 使用新的元素选择弹出框组件 */}
      <ElementSelectionPopover
        visible={!!selectionManager.pendingSelection}
        selection={selectionManager.pendingSelection}
        onConfirm={selectionManager.confirmSelection}
        onCancel={selectionManager.hideElement}
      />
    </div>
  );
};

export default VisualPageAnalyzerContent;
