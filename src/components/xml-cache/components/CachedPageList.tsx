import React from "react";
import { List, Dropdown, Button, Popconfirm, Typography, Empty, Spin } from "antd";
import type { MenuProps } from "antd";
import { DeleteOutlined } from "@ant-design/icons";
import type { CachedXmlPage } from "../../../services/XmlPageCacheService";
import { toAssetUrl } from "../utils/fileUrl";
import Thumbnail from "./Thumbnail";

const { Text } = Typography;

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
  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: listItemStyles }} />
      <Spin spinning={loading}>
        {pages.length === 0 ? (
          <Empty
            image={Empty.PRESENTED_IMAGE_SIMPLE}
            description={
              searchText
                ? `没有找到匹配 "${searchText}" 的缓存页面`
                : "暂无XML缓存页面\n请先连接设备并分析页面"
            }
          />
        ) : (
          <List
            size="small"
            dataSource={pages}
            renderItem={(page) => {
              const thumbnailSrc = toAssetUrl(page.screenshotAbsolutePath);

              const contextMenuItems: MenuProps["items"] = [
                { key: "open-explorer", label: "在文件管理器中打开" },
                { key: "copy-path", label: "复制绝对路径" },
              ];

              return (
                <Dropdown
                  trigger={["contextMenu"]}
                  menu={{
                    items: contextMenuItems,
                    onClick: (info) => {
                      info.domEvent.stopPropagation();
                      switch (info.key) {
                        case "open-explorer":
                          onReveal(page);
                          break;
                        case "copy-path":
                          onCopyPath(page);
                          break;
                        default:
                          break;
                      }
                    },
                  }}
                >
                  <List.Item
                    className="xml-cache-list-item"
                    style={{
                      padding: "8px 8px",
                      border: "1px solid #374151",
                      borderRadius: "6px",
                      marginBottom: "4px",
                      backgroundColor: "#374151",
                      cursor: "pointer",
                      transition: "all 0.2s",
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.backgroundColor = "#4b5563";
                      e.currentTarget.style.borderColor = "#6366f1";
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.backgroundColor = "#374151";
                      e.currentTarget.style.borderColor = "#374151";
                    }}
                    onClick={() => onSelect(page)}
                  >
                    <div style={{ display: "flex", flexDirection: "column", width: "100%", gap: 8 }}>
                      <div style={{ position: "relative", width: "100%", paddingTop: "56.25%" }}>
                        <div style={{ position: "absolute", inset: 0 }}>
                          <Thumbnail
                            src={thumbnailSrc}
                            alt={page.pageTitle}
                            borderRadius={6}
                            fullWidth
                            height="100%"
                            absolutePathForFallback={page.screenshotAbsolutePath}
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
                        </div>
                      </div>
                      <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                        <Text
                          strong
                          style={{
                            fontSize: "12px",
                            color: "#f9fafb",
                            lineHeight: "1.2",
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
                            <Button
                              type="text"
                              danger
                              size="small"
                              icon={<DeleteOutlined />}
                              onClick={(e) => e.stopPropagation()}
                            />
                          </Popconfirm>
                          <Button type="link" size="small" onClick={(e) => { e.stopPropagation(); onReveal(page); }}>打开位置</Button>
                          <Button type="link" size="small" onClick={(e) => { e.stopPropagation(); onCopyPath(page); }}>复制路径</Button>
                        </div>
                      </div>
                    </div>
                  </List.Item>
                </Dropdown>
              );
            }}
          />
        )}
      </Spin>
    </>
  );
};

export default CachedPageList;
