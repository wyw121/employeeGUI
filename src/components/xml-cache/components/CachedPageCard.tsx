import React from "react";
import { Dropdown, MenuProps, Popconfirm, Button, Typography } from "antd";
import { DeleteOutlined, EllipsisOutlined } from "@ant-design/icons";
import { toAssetUrl } from "../utils/fileUrl";
import Thumbnail from "./Thumbnail";
import type { CachedXmlPage } from "../../../services/XmlPageCacheService";

const { Text } = Typography;

export interface CachedPageCardProps {
  page: CachedXmlPage;
  formatFileSize: (bytes: number) => string;
  formatTime: (date: Date) => string;
  getAppIcon: (appPackage: string) => string;
  onSelect: (page: CachedXmlPage) => void;
  onDelete: (page: CachedXmlPage) => void;
  onCopyPath: (page: CachedXmlPage) => void;
  onReveal: (page: CachedXmlPage) => void;
  enableHoverExpand?: boolean; // allow disabling expand in virtualized mode
}

export const CachedPageCard: React.FC<CachedPageCardProps> = ({
  page,
  formatFileSize,
  formatTime,
  getAppIcon,
  onSelect,
  onDelete,
  onCopyPath,
  onReveal,
  enableHoverExpand = true,
}) => {
  const menuItems: MenuProps["items"] = [
    { key: "open-explorer", label: "在文件管理器中打开", onClick: () => onReveal(page) },
    { key: "copy-path", label: "复制绝对路径", onClick: () => onCopyPath(page) },
  ];
  const thumbnailSrc = toAssetUrl(page.screenshotAbsolutePath);

  return (
    <div
      className="xml-cache-card"
      style={{
        display: "flex",
        flexDirection: "column",
        padding: 8,
        border: "1px solid #374151",
        borderRadius: 6,
        backgroundColor: "#374151",
        cursor: "pointer",
        transition: "all 0.2s",
      }}
      onClick={() => onSelect(page)}
      onMouseEnter={(e) => {
        (e.currentTarget as HTMLDivElement).style.backgroundColor = "#4b5563";
        (e.currentTarget as HTMLDivElement).style.borderColor = "#6366f1";
      }}
      onMouseLeave={(e) => {
        (e.currentTarget as HTMLDivElement).style.backgroundColor = "#374151";
        (e.currentTarget as HTMLDivElement).style.borderColor = "#374151";
      }}
    >
      <div style={{ position: "relative", width: "100%" }}>
        <Thumbnail
          src={thumbnailSrc}
          alt={page.pageTitle}
          borderRadius={6}
          fullWidth
          height={320}
          absolutePathForFallback={page.screenshotAbsolutePath}
          expandMode={enableHoverExpand ? 'hover' : 'click'}
          collapsedHeight={320}
          maxExpandedHeight="80vh"
        />
        <span
          style={{
            position: "absolute",
            bottom: 4,
            right: 6,
            fontSize: 12,
            color: "#f3f4f6",
            textShadow: "0 0 4px rgba(0,0,0,0.6)",
            pointerEvents: "none",
          }}
        >
          {getAppIcon(page.appPackage)}
        </span>
        <Dropdown menu={{ items: menuItems }} trigger={["click"]}>
          <EllipsisOutlined style={{ position: "absolute", top: 8, right: 8, fontSize: 18, color: "#e5e7eb" }} />
        </Dropdown>
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 4, marginTop: 8 }}>
        <Text
          strong
          style={{
            fontSize: 12,
            color: "#f9fafb",
            lineHeight: 1.2,
            wordBreak: "break-all",
            overflow: "hidden",
            display: "-webkit-box",
            WebkitLineClamp: 2,
            WebkitBoxOrient: "vertical" as any,
          }}
          title={page.pageTitle}
        >
          {page.pageTitle}
        </Text>
        <Text type="secondary" style={{ fontSize: 10, color: "#d1d5db" }}>
          {formatTime(page.createdAt)}
        </Text>
        <div style={{ fontSize: 10, color: "#9ca3af" }}>
          <div style={{ marginBottom: 2 }}>{page.deviceId}</div>
          <div>
            {page.clickableCount}个元素 • {formatFileSize(page.fileSize)}
          </div>
        </div>
        <div style={{ display: "flex", gap: 8, marginTop: 4 }}>
          <Popconfirm
            title="删除?"
            onConfirm={(e) => {
              e?.stopPropagation();
              onDelete(page);
            }}
            okText="删除"
            cancelText="取消"
          >
            <Button type="text" danger size="small" icon={<DeleteOutlined />} onClick={(e) => e.stopPropagation()} />
          </Popconfirm>
          <Button type="link" size="small" onClick={(e) => { e.stopPropagation(); onReveal(page); }}>打开位置</Button>
          <Button type="link" size="small" onClick={(e) => { e.stopPropagation(); onCopyPath(page); }}>复制路径</Button>
        </div>
      </div>
    </div>
  );
};

export default CachedPageCard;
