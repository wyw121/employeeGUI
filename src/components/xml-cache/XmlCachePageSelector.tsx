/**
 * XML页面缓存选择器组件
 * 用于显示和选择历史分析过的XML页面
 */

import React, { useCallback, useEffect, useState } from "react";
import { Typography, message } from "antd";
import type { CachedXmlPage } from "../../services/XmlPageCacheService";
import { XmlPageCacheService } from "../../services/XmlPageCacheService";
import { CacheToolbar } from "./components/CacheToolbar";
import { CachedPageList } from "./components/CachedPageList";

type CacheStats = Awaited<ReturnType<typeof XmlPageCacheService.getCacheStats>>;

const { Paragraph } = Typography;

interface XmlCachePageSelectorProps {
  /** 当选择缓存页面时的回调 */
  onPageSelected?: (cachedPage: CachedXmlPage) => void;
  /** 是否显示统计信息 */
  showStats?: boolean;
  /** 最大显示页面数量 */
  maxPages?: number;
}

export const XmlCachePageSelector: React.FC<XmlCachePageSelectorProps> = ({
  onPageSelected,
  showStats = true,
  maxPages = 20,
}) => {
  const [loading, setLoading] = useState(false);
  const [cachedPages, setCachedPages] = useState<CachedXmlPage[]>([]);
  const [filteredPages, setFilteredPages] = useState<CachedXmlPage[]>([]);
  const [cacheStats, setCacheStats] = useState<CacheStats | null>(null);
  const [searchText, setSearchText] = useState("");

  const formatFileSize = useCallback((bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
    return `${Math.round(bytes / (1024 * 1024))} MB`;
  }, []);

  const formatTime = useCallback((date: Date) => {
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const minutes = Math.floor(diff / (1000 * 60));
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));

    if (minutes < 60) return `${minutes}分钟前`;
    if (hours < 24) return `${hours}小时前`;
    if (days < 7) return `${days}天前`;
    return date.toLocaleDateString();
  }, []);

  const getAppIcon = useCallback((appPackage: string) => {
    if (appPackage.includes("xhs")) return "📱";
    if (appPackage.includes("tencent.mm")) return "💬";
    if (appPackage.includes("contacts")) return "📞";
    return "📋";
  }, []);

  const applyFiltering = useCallback(
    (pages: CachedXmlPage[], keyword: string) => {
      const trimmed = keyword.trim().toLowerCase();
      if (!trimmed) {
        return pages.slice(0, maxPages);
      }

      return pages
        .filter((page) => {
          const title = page.pageTitle.toLowerCase();
          const desc = page.description.toLowerCase();
          const app = page.appPackage.toLowerCase();
          const device = page.deviceId.toLowerCase();
          return (
            title.includes(trimmed) ||
            desc.includes(trimmed) ||
            app.includes(trimmed) ||
            device.includes(trimmed)
          );
        })
        .slice(0, maxPages);
    },
    [maxPages]
  );

  const loadCachedPages = useCallback(async () => {
    setLoading(true);
    try {
      const pages = await XmlPageCacheService.getCachedPages();
      const stats = await XmlPageCacheService.getCacheStats();

      setCachedPages(pages);
      setFilteredPages(applyFiltering(pages, searchText));
      setCacheStats(stats);

      if (pages.length === 0) {
        message.info("暂无XML缓存页面，请先连接设备分析页面");
      }
    } catch (error) {
      console.error("❌ 加载缓存页面失败:", error);
      message.error("加载缓存页面失败，请检查 debug_xml 目录");
    } finally {
      setLoading(false);
    }
  }, [applyFiltering, searchText]);

  useEffect(() => {
    loadCachedPages();
  }, [loadCachedPages]);

  // 刷新缓存
  const handleRefresh = useCallback(async () => {
    try {
      await XmlPageCacheService.refreshCache();
      await loadCachedPages();
      message.success("缓存刷新成功");
    } catch (error) {
      console.error("❌ 刷新缓存失败:", error);
      message.error("刷新缓存失败");
    }
  }, [loadCachedPages]);

  // 搜索过滤
  const handleSearch = useCallback(
    (value: string) => {
      setSearchText(value);
      setFilteredPages(applyFiltering(cachedPages, value));
    },
    [applyFiltering, cachedPages]
  );

  // 删除缓存页面
  const handleDeletePage = useCallback(
    async (page: CachedXmlPage) => {
      try {
        await XmlPageCacheService.deleteCachedPage(
          page.fileName,
          page.screenshotFileName
        );
        await loadCachedPages();
        message.success(`已删除: ${page.pageTitle}`);
      } catch (error) {
        console.error("❌ 删除页面失败:", error);
        message.error("删除页面失败");
      }
    },
    [loadCachedPages]
  );

  // 复制绝对路径
  const handleCopyAbsolutePath = useCallback(async (page: CachedXmlPage) => {
    if (!page.absoluteFilePath) {
      message.warning("未找到该 XML 的绝对路径");
      return;
    }

    try {
      await navigator.clipboard.writeText(page.absoluteFilePath);
      message.success({ content: "已复制 XML 文件绝对路径", duration: 1.8 });
    } catch (error) {
      console.error("❌ 复制 XML 绝对路径失败:", error);
      message.error("复制失败，请检查剪贴板权限");
    }
  }, []);

  // 在文件管理器中打开
  const handleRevealInFileManager = useCallback(async (page: CachedXmlPage) => {
    try {
      await XmlPageCacheService.revealCachedPage(page);
      message.success({ content: "已在文件管理器中打开", duration: 1.8 });
    } catch (error) {
      console.error("❌ 打开文件管理器失败:", error);
      message.error("打开文件管理器失败");
    }
  }, []);

  // 选择页面
  const handlePageSelect = useCallback(
    (page: CachedXmlPage) => {
      if (onPageSelected) {
        onPageSelected(page);
      }

      message.success({
        content: (
          <div>
            <div style={{ fontWeight: "bold", marginBottom: "4px" }}>📄 已选择缓存页面</div>
            <div style={{ fontSize: "12px", color: "#666" }}>{page.pageTitle}</div>
          </div>
        ),
        duration: 2,
      });
    },
    [onPageSelected]
  );

  return (
    <div style={{ padding: "16px", backgroundColor: "transparent" }}>
      {/* 工具栏 */}
      <CacheToolbar
        loading={loading}
        searchText={searchText}
        onSearch={handleSearch}
        onRefresh={handleRefresh}
        showStats={showStats}
        cacheStats={cacheStats}
        formatFileSize={formatFileSize}
      />

      {/* 页面列表 */}
      <CachedPageList
        pages={filteredPages}
        loading={loading}
        searchText={searchText}
        onSelect={handlePageSelect}
        onDelete={handleDeletePage}
        onCopyPath={handleCopyAbsolutePath}
        onReveal={handleRevealInFileManager}
        formatFileSize={formatFileSize}
        formatTime={formatTime}
        getAppIcon={getAppIcon}
      />

      {/* 提示信息 */}
      <Paragraph type="secondary" style={{ fontSize: 12, marginTop: 12 }}>
        提示：右键卡片可复制 XML 路径或打开所在目录；支持截图预览，更直观地识别页面。
      </Paragraph>
    </div>
  );
};

export default XmlCachePageSelector;