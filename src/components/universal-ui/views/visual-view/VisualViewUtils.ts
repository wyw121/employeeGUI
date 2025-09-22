/**
 * 可视化视图工具函数
 * 提供缩放、坐标计算、应用信息分析等工具函数
 */

import type { VisualUIElement } from '../../types';

/**
 * 计算画布尺寸和缩放比例
 */
export interface CanvasCalculationResult {
  maxX: number;
  maxY: number;
  scale: number;
  scaledWidth: number;
  scaledHeight: number;
}

/**
 * 计算智能缩放参数
 */
export const calculateCanvasScale = (
  elements: VisualUIElement[],
  containerWidth: number = 380,
  containerHeight: number = 550
): CanvasCalculationResult => {
  if (elements.length === 0) {
    return {
      maxX: containerWidth,
      maxY: containerHeight,
      scale: 1,
      scaledWidth: containerWidth,
      scaledHeight: containerHeight,
    };
  }

  // 分析设备实际分辨率
  const maxX = Math.max(
    ...elements.map((e) => e.position.x + e.position.width)
  );
  const maxY = Math.max(
    ...elements.map((e) => e.position.y + e.position.height)
  );

  // 计算合适的缩放比例，确保内容可见但不过小
  const scaleX = containerWidth / maxX;
  const scaleY = containerHeight / maxY;
  let scale = Math.min(scaleX, scaleY);

  // 设置最小和最大缩放比例，确保可用性
  const minScale = 0.2; // 最小20%，确保大分辨率设备内容不会太小
  const maxScale = 2.0; // 最大200%，确保小分辨率设备不会过大
  scale = Math.max(minScale, Math.min(maxScale, scale));

  // 计算缩放后的实际尺寸
  const scaledWidth = maxX * scale;
  const scaledHeight = maxY * scale;

  return {
    maxX,
    maxY,
    scale,
    scaledWidth,
    scaledHeight,
  };
};

/**
 * 分析应用和页面信息
 */
export interface AppPageInfo {
  appName: string;
  pageName: string;
}

export const analyzeAppAndPageInfo = (xmlContent: string): AppPageInfo => {
  try {
    // 简单的XML解析来获取应用信息
    if (xmlContent.includes("com.xingin.xhs")) {
      return { appName: "小红书", pageName: "Unknown" };
    } else {
      return { appName: "Unknown", pageName: "Unknown" };
    }
  } catch (error) {
    console.error('分析应用和页面信息失败:', error);
    return { appName: "Unknown", pageName: "Unknown" };
  }
};

/**
 * 计算元素在缩放后的位置和大小
 */
export interface ScaledElementBounds {
  left: number;
  top: number;
  width: number;
  height: number;
}

export const calculateScaledElementBounds = (
  element: VisualUIElement,
  scale: number
): ScaledElementBounds => {
  return {
    left: element.position.x * scale,
    top: element.position.y * scale,
    width: Math.max(element.position.width * scale, 1),
    height: Math.max(element.position.height * scale, 1),
  };
};

/**
 * 生成元素工具提示信息
 */
export const generateElementTooltip = (element: VisualUIElement): string => {
  return `${element.userFriendlyName}: ${element.description}\n位置: (${element.position.x}, ${element.position.y})\n大小: ${element.position.width} × ${element.position.height}`;
};

/**
 * 判断是否应该显示元素标签
 */
export const shouldShowElementLabel = (
  scaledWidth: number,
  scaledHeight: number,
  text: string
): boolean => {
  return scaledWidth > 40 && scaledHeight > 20 && !!text;
};

/**
 * 计算元素标签字体大小
 */
export const calculateLabelFontSize = (elementHeight: number): number => {
  return Math.max(8, Math.min(12, elementHeight / 3));
};
