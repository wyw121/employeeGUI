import { useCallback } from 'react';
import { message } from 'antd';
import { EnhancedElementCreator } from '../../enhanced-element-creation';
import { convertVisualToUIElement } from '../../data-transform';
import type { UIElement } from '../../../../api/universalUIAPI';
import type { VisualUIElement } from '../../xml-parser';

export interface UsePageFinderSelectionParams {
  currentXmlContent: string;
  currentXmlCacheId: string;
  selectedDeviceId?: string;
  findDeviceName?: (id?: string) => string | undefined;
  onElementSelected?: (element: UIElement) => void;
  onClose: () => void;
}

export default function usePageFinderSelection(params: UsePageFinderSelectionParams) {
  const {
    currentXmlContent,
    currentXmlCacheId,
    selectedDeviceId,
    findDeviceName,
    onElementSelected,
    onClose,
  } = params;

  const handleSmartElementSelect = useCallback(async (element: UIElement) => {
    try {
      const xmlCacheId = currentXmlCacheId || `xml_${Date.now()}`;
      const enhancedElement = await EnhancedElementCreator.createEnhancedElement(element, {
        xmlContent: currentXmlContent,
        xmlCacheId,
        packageName: 'com.xingin.xhs',
        pageInfo: { appName: '小红书', pageName: '当前页面' },
        deviceInfo: selectedDeviceId ? {
          deviceId: selectedDeviceId,
          deviceName: findDeviceName?.(selectedDeviceId) || selectedDeviceId,
          resolution: { width: 1080, height: 1920 },
        } : undefined,
        enableSmartAnalysis: true,
      });

      const enhancedElementWithCompat = {
        ...element,
        isEnhanced: true,
        xmlCacheId: enhancedElement.xmlContext.xmlCacheId,
        xmlContent: enhancedElement.xmlContext.xmlSourceContent,
        smartDescription: enhancedElement.smartDescription,
        enhancedElement,
        elementSummary: {
          displayName: enhancedElement.smartDescription || (element as any).text || (element as any).element_type,
          elementType: (element as any).element_type,
          position: {
            x: (element as any).bounds.left,
            y: (element as any).bounds.top,
            width: (element as any).bounds.right - (element as any).bounds.left,
            height: (element as any).bounds.bottom - (element as any).bounds.top,
          },
          xmlSource: enhancedElement.xmlContext.xmlCacheId,
          confidence: enhancedElement.smartAnalysis?.confidence || 0.5,
        },
      } as UIElement;

      onElementSelected?.(enhancedElementWithCompat);
    } catch (error) {
      console.error('❌ 创建增强元素信息失败:', error);
      message.error('创建增强元素信息失败');
      onElementSelected?.(element);
    }

    onClose();
  }, [currentXmlCacheId, currentXmlContent, selectedDeviceId, findDeviceName, onElementSelected, onClose]);

  const handleVisualElementSelect = useCallback(async (element: VisualUIElement) => {
    const uiElement = convertVisualToUIElement(element);
    await handleSmartElementSelect(uiElement);
  }, [handleSmartElementSelect]);

  return {
    handleSmartElementSelect,
    handleVisualElementSelect,
  };
}
