import React from "react";
import { Card } from "antd";
import { XmlCachePageSelector } from "../../../xml-cache/XmlCachePageSelector";
import type { CachedXmlPage } from "../../../../services/XmlPageCacheService";

export interface CacheHistoryPanelProps {
  title?: string;
  onPageSelected: (page: CachedXmlPage) => void;
}

/**
 * 历史页面缓存 视图模块
 * - 优化了小宽度下的显示效果，避免内容被挤压
 */
export const CacheHistoryPanel: React.FC<CacheHistoryPanelProps> = ({
  title = "历史页面缓存",
  onPageSelected,
}) => {
  return (
    <Card 
      title={title}
      size="small"
      styles={{
        body: {
          padding: '12px', // 减少内边距
          minWidth: '240px', // 确保最小宽度
        },
        header: {
          minHeight: 'auto',
          padding: '8px 12px', // 减少标题栏内边距
        }
      }}
    >
      <XmlCachePageSelector 
        onPageSelected={onPageSelected} 
        showStats={false} // 在小宽度下隐藏统计信息
        maxPages={8} // 限制显示数量
      />
    </Card>
  );
};

export default CacheHistoryPanel;
