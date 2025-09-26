import React from 'react';
import { Alert, Card } from 'antd';
import CachedElementXmlHierarchyTab from '../../element-xml-hierarchy/CachedElementXmlHierarchyTab';
import adaptElementToUniversalUIType from '../toUniversalElement';
import { UIElement } from '../../../modules/ElementNameMapper';
import { colors } from './uiTokens';

interface HierarchyTabProps {
  element: UIElement | null;
  onSelectElement?: (e: any) => void;
}

const HierarchyTab: React.FC<HierarchyTabProps> = ({ element, onSelectElement }) => {
  if (!element) return <Alert message="未选择元素" type="info" showIcon />;

  return (
    <Card
      size="small"
      style={{ background: colors.surface, border: `1px solid ${colors.border}` }}
      headStyle={{ background: colors.surfaceAlt, borderBottom: `1px solid ${colors.border}`, color: '#fff' }}
      title={<span style={{ color: '#fff' }}>XML 层级结构查看器</span>}
      bodyStyle={{ background: colors.surface }}
    >
      <div className="space-y-4 p-2">
        <Alert
          message="XML层级结构查看器"
          description="查看元素在XML页面中的完整层级结构，支持智能匹配和多页面对比。基于 Universal UI 缓存数据，提供准确的元素定位信息。"
          type="info"
          showIcon
          style={{ background: colors.accentInfoBg, border: `1px solid ${colors.accentBlue}` }}
        />
        <CachedElementXmlHierarchyTab
            targetElement={adaptElementToUniversalUIType(element) as any}
            onElementSelect={(selected) => {
              onSelectElement?.(selected);
            }}
        />
      </div>
    </Card>
  );
};

export default HierarchyTab;
