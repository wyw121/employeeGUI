/**
 * 可视化视图组件 - 完整还原旧版VisualPageAnalyzerContent
 * 从原 UniversalPageFinderModal 的 VisualPageAnalyzerContent 迁移
 */

import React, { useState, useEffect, useMemo } from "react";
import { useRef, useLayoutEffect } from "react";
import { Space, Typography } from "antd";
import { LeftControlPanel } from "./components/LeftControlPanel";
import { PagePreview } from "./components/PagePreview";
import { ElementList } from "./components/ElementList";
import type { VisualElementCategory } from "../../types/";
import type { VisualUIElement } from "../../types";
import { convertVisualToUIElement } from "./utils/elementTransform";
import { useParsedVisualElements } from ".";
import { useFilteredVisualElements } from "./hooks/useFilteredVisualElements";
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
  // 已迁移：hover 逻辑在 PagePreview 内部直接驱动 selectionManager，不再需要本地 hoveredElement

  // 转换函数已抽离 utils/elementTransform.ts

  // 将所有VisualUIElement转换为UIElement用于选择管理器
  const convertedElements = useMemo(
    () =>
      elements.map(
        (el) =>
          convertVisualToUIElement(
            el,
            selectedElementId
          ) as unknown as UIElement
      ),
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
    console.log("🎯 VisualElementView: pendingSelection 状态变化 =", {
      visible: isVisible,
      hasSelection: !!selectionManager.pendingSelection,
      elementId: selectionManager.pendingSelection?.element?.id,
    });
  }, [selectionManager.pendingSelection]);

  // parseBounds 已抽离 utils/elementTransform.ts

  // getUserFriendlyName 已抽离 utils/categorization.ts

  // categorizeElement 已抽离 utils/categorization.ts

  // getElementImportance 已抽离 utils/appAnalysis.ts

  // analyzeAppAndPageInfo 已抽离 utils/appAnalysis.ts

  const { parsedElements, categories } = useParsedVisualElements(
    xmlContent,
    elements
  );

  // 使用解析出的元素或传入的元素
  const finalElements = parsedElements.length > 0 ? parsedElements : elements;

  // 🔥 修复隐藏逻辑：不要完全过滤掉隐藏元素，而是显示它们但用视觉效果区分
  const filteredElements = useFilteredVisualElements({
    elements: finalElements,
    searchText,
    selectedCategory,
    showOnlyClickable,
    hideCompletely,
    selectionManager,
  });

  // 控制面板与页面统计宽度固定：不随窗口变化而压缩

  // 页面预览已拆分为 PagePreview 组件

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
      <LeftControlPanel
        searchText={searchText}
        setSearchText={setSearchText}
        showOnlyClickable={showOnlyClickable}
        setShowOnlyClickable={setShowOnlyClickable}
        hideCompletely={hideCompletely}
        setHideCompletely={setHideCompletely}
        selectedCategory={selectedCategory}
        setSelectedCategory={setSelectedCategory}
        selectionManager={selectionManager}
        finalElements={finalElements}
        categories={categories}
      />

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
        <PagePreview
          finalElements={finalElements}
          filteredElements={filteredElements}
          categories={categories}
          hideCompletely={hideCompletely}
          xmlContent={xmlContent}
          deviceFramePadding={DEVICE_FRAME_PADDING}
          selectionManager={selectionManager}
          selectedElementId={selectedElementId}
        />
      </div>

      <ElementList
        filteredElements={filteredElements}
        categories={categories}
        selectionManager={selectionManager}
        externalSelectionManager={externalSelectionManager}
        convertedElements={convertedElements}
      />

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
