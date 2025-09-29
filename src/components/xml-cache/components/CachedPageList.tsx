import React from "react";
import { List, Empty, Skeleton } from "antd";
import type { CachedXmlPage } from "../../../services/XmlPageCacheService";
import CachedPageCard from "./CachedPageCard";
import VirtualizedCachedPageList from "./VirtualizedCachedPageList";

export interface CachedPageListProps {
  pages: CachedXmlPage[];
  loading: boolean;
  searchText: string;
  onSelect: (page: CachedXmlPage) => void;
  onDelete: (page: CachedXmlPage) => void;
  onCopyPath: (page: CachedXmlPage) => void;
  onReveal: (page: CachedXmlPage) => void;
  formatFileSize: (bytes: number) => string;
  formatTime: (date: Date) => string;
  getAppIcon: (appPackage: string) => string;
}

const listItemStyles = `
  .xml-cache-list-item .ant-list-item-action {
    margin-left: 8px !important;
    min-width: 32px !important;
    flex: 0 0 32px !important;
  }
  .xml-cache-list-item .ant-list-item-action > li {
    padding: 0 !important;
    margin: 0 !important;
  }
`;

export const CachedPageList: React.FC<CachedPageListProps> = ({
  pages,
  loading,
  searchText,
  onSelect,
  onDelete,
  onCopyPath,
  onReveal,
  formatFileSize,
  formatTime,
  getAppIcon,
}) => {
  const VIRTUALIZE_THRESHOLD = 60;
  if (loading) {
    return (
      <List
        grid={{ gutter: 16, column: 1 }}
        dataSource={Array.from({ length: 6 }).map((_, i) => i)}
        renderItem={(i) => (
          <List.Item key={`skeleton-${i}`}>
            <div style={{ padding: 8, border: "1px solid #374151", borderRadius: 6, background: "#374151" }}>
              <Skeleton.Image active style={{ width: "100%", height: 180, marginBottom: 8 }} />
              <Skeleton active paragraph={{ rows: 2 }} title={{ width: "60%" }} />
            </div>
          </List.Item>
        )}
      />
    );
  }

  if (pages.length === 0) {
    return (
      <Empty
        image={Empty.PRESENTED_IMAGE_SIMPLE}
        description={
          searchText ? `没有找到匹配 "${searchText}" 的缓存页面` : "暂无XML缓存页面\n请先连接设备并分析页面"
        }
      />
    );
  }

  // Use virtualization for large lists to improve performance
  if (pages.length >= VIRTUALIZE_THRESHOLD) {
    return (
      <>
        <style dangerouslySetInnerHTML={{ __html: listItemStyles }} />
        <VirtualizedCachedPageList
          pages={pages}
          height={640}
          columns={1}
          gutter={16}
          onSelect={onSelect}
          onDelete={onDelete}
          onCopyPath={onCopyPath}
          onReveal={onReveal}
          formatFileSize={formatFileSize}
          formatTime={formatTime}
          getAppIcon={getAppIcon}
        />
      </>
    );
  }

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: listItemStyles }} />
      <List
        grid={{ gutter: 16, column: 1 }}
        dataSource={pages}
        renderItem={(page) => (
          <List.Item>
            <CachedPageCard
              page={page}
              formatFileSize={formatFileSize}
              formatTime={formatTime}
              getAppIcon={getAppIcon}
              onSelect={onSelect}
              onDelete={onDelete}
              onCopyPath={onCopyPath}
              onReveal={onReveal}
            />
          </List.Item>
        )}
      />
    </>
  );
};

export default CachedPageList;
