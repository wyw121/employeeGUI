/**
 * 可视化页面预览组件
 * 从 UniversalPageFinderModal 的 renderPagePreview 函数提取
 */

import React from 'react';
import { Typography } from 'antd';
import type { VisualUIElement, VisualElementCategory } from '../../types';
import type { UIElement } from '../../../../api/universalUIAPI';
import { useElementSelectionManager } from '../../element-selection';
import {
  calculateCanvasScale,
  analyzeAppAndPageInfo,
  calculateScaledElementBounds,
  generateElementTooltip,
  shouldShowElementLabel,
  calculateLabelFontSize,
  type AppPageInfo,
} from './VisualViewUtils';

const { Text, Title } = Typography;

interface VisualPagePreviewProps {
  xmlContent: string;
  elements: VisualUIElement[];
  categories: VisualElementCategory[];
  filteredElements: VisualUIElement[];
  selectionManager: ReturnType<typeof useElementSelectionManager>;
  onElementClick: (element: VisualUIElement) => void;
  convertVisualToUIElement: (element: VisualUIElement) => UIElement;
}

export const VisualPagePreview: React.FC<VisualPagePreviewProps> = ({
  xmlContent,
  elements,
  categories,
  filteredElements,
  selectionManager,
  onElementClick,
  convertVisualToUIElement,
}) => {
  // 如果没有元素，显示等待状态
  if (elements.length === 0) {
    return (
      <div
        style={{
          width: "100%",
          height: 600,
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

  // 计算画布尺寸和缩放比例
  const canvasData = calculateCanvasScale(elements, 380, 550);
  const { maxX, maxY, scale, scaledWidth, scaledHeight } = canvasData;

  // 智能分析APP和页面信息
  const { appName, pageName }: AppPageInfo = analyzeAppAndPageInfo(xmlContent);

  return (
    <div
      style={{
        width: "100%",
        height: 600,
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

      {/* 可滚动的预览区域 */}
      <div
        style={{
          flex: 1,
          overflow: "auto",
          padding: "16px",
          position: "relative",
          backgroundColor: "#1f2937",
        }}
      >
        {/* 设备边框模拟 */}
        <div
          style={{
            width: scaledWidth + 20,
            height: scaledHeight + 20,
            margin: "0 auto",
            position: "relative",
            backgroundColor: "#000",
            borderRadius: "20px",
            padding: "10px",
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
              const scaledBounds = calculateScaledElementBounds(element, scale);

              // 获取元素的显示状态
              const displayState = selectionManager.getElementDisplayState(
                element.id
              );

              return (
                <div
                  key={element.id}
                  title={generateElementTooltip(element)}
                  style={{
                    position: "absolute",
                    left: scaledBounds.left,
                    top: scaledBounds.top,
                    width: scaledBounds.width,
                    height: scaledBounds.height,
                    backgroundColor: category?.color || "#8b5cf6",
                    opacity: displayState.isHidden
                      ? 0.1
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
                      Math.min(scaledBounds.width, scaledBounds.height) > 10
                        ? "2px"
                        : "1px",
                    cursor: displayState.isHidden
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
                    filter: displayState.isHidden
                      ? "grayscale(100%) blur(1px)"
                      : "none",
                  }}
                  onClick={(e) => {
                    if (!element.clickable || displayState.isHidden) return;

                    // 阻止事件冒泡
                    e.stopPropagation();

                    // 获取预览容器的位置信息
                    const previewContainer = e.currentTarget.parentElement;
                    if (!previewContainer) return;

                    const containerRect =
                      previewContainer.getBoundingClientRect();

                    // 计算相对于预览容器的点击位置
                    const relativeX = e.clientX - containerRect.left;
                    const relativeY = e.clientY - containerRect.top;

                    // 获取点击位置（相对于页面的绝对位置，用于定位气泡）
                    const clickPosition = {
                      x: e.clientX, // 使用页面绝对坐标来定位气泡
                      y: e.clientY,
                    };

                    console.log(
                      "🎯 点击坐标 - 页面绝对:",
                      e.clientX,
                      e.clientY,
                      "相对容器:",
                      relativeX,
                      relativeY
                    );

                    // 使用选择管理器处理点击
                    const uiElement = convertVisualToUIElement(element);
                    selectionManager.handleElementClick(
                      uiElement,
                      clickPosition
                    );
                  }}
                  onMouseEnter={(e) => {
                    if (displayState.isHidden) return;

                    // 通知选择管理器悬停状态
                    selectionManager.handleElementHover(element.id);
                  }}
                  onMouseLeave={(e) => {
                    // 清除悬停状态
                    selectionManager.handleElementHover(null);
                  }}
                >
                  {/* 元素标签（仅在足够大时显示）*/}
                  {shouldShowElementLabel(scaledBounds.width, scaledBounds.height, element.text) && (
                    <div
                      style={{
                        fontSize: calculateLabelFontSize(scaledBounds.height),
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

        {/* 缩放控制提示 */}
        <div
          style={{
            position: "absolute",
            bottom: "8px",
            right: "8px",
            background: "rgba(0, 0, 0, 0.7)",
            color: "#fff",
            padding: "4px 8px",
            borderRadius: "4px",
            fontSize: "10px",
          }}
        >
          💡 滚动查看完整页面
        </div>
      </div>
    </div>
  );
};

export default VisualPagePreview;
