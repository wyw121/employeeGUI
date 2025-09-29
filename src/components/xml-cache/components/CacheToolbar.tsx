import React from "react";
import { Card, Space, Button, Input, Typography } from "antd";
import { ReloadOutlined, FileTextOutlined } from "@ant-design/icons";

const { Title } = Typography;
const { Search } = Input;

export interface CacheToolbarProps {
  loading: boolean;
  searchText: string;
  onSearch: (value: string) => void;
  onRefresh: () => void;
  showStats: boolean;
  cacheStats: {
    totalPages: number;
    totalSize: number;
  } | null;
  formatFileSize: (bytes: number) => string;
}

export const CacheToolbar: React.FC<CacheToolbarProps> = ({
  loading,
  searchText,
  onSearch,
  onRefresh,
  showStats,
  cacheStats,
  formatFileSize,
}) => {
  return (
    <div style={{ marginBottom: "16px" }}>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: "12px",
        }}
      >
        <Title
          level={4}
          style={{ margin: 0, display: "flex", alignItems: "center", color: "#f9fafb" }}
        >
          <FileTextOutlined style={{ marginRight: "8px", color: "#6366f1" }} />
          XML页面缓存
        </Title>

        <Space>
          <Button icon={<ReloadOutlined />} onClick={onRefresh} loading={loading} size="small">
            刷新
          </Button>
        </Space>
      </div>

      <Search
        placeholder="搜索页面标题、应用或设备..."
        allowClear
        size="small"
        style={{ marginBottom: "12px" }}
        value={searchText}
        onSearch={onSearch}
        onChange={(e) => onSearch(e.target.value)}
      />

      {showStats && cacheStats && (
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(2, 1fr)",
            gap: "8px",
            marginBottom: "12px",
          }}
        >
          <Card
            size="small"
            style={{ textAlign: "center", padding: "8px 4px", minHeight: "auto" }}
            bodyStyle={{ padding: "8px 4px" }}
          >
            <div style={{ fontSize: "10px", color: "#666", marginBottom: "2px" }}>总页面数</div>
            <div style={{ fontSize: "14px", fontWeight: "bold", color: "#1890ff" }}>
              {cacheStats.totalPages}
            </div>
          </Card>
          <Card
            size="small"
            style={{ textAlign: "center", padding: "8px 4px", minHeight: "auto" }}
            bodyStyle={{ padding: "8px 4px" }}
          >
            <div style={{ fontSize: "10px", color: "#666", marginBottom: "2px" }}>缓存大小</div>
            <div style={{ fontSize: "14px", fontWeight: "bold", color: "#52c41a" }}>
              {formatFileSize(cacheStats.totalSize)}
            </div>
          </Card>
        </div>
      )}
    </div>
  );
};

export default CacheToolbar;
