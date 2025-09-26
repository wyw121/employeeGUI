// 通用页面查找加载上下文，供各类 XML/步骤加载 service 复用
// 若后续需要新增字段（例如性能指标采集），统一在此扩展即可，避免多文件重复修改
export interface PageFinderLoadContext {
  currentXmlContent: string;
  setCurrentXmlContent: (c: string) => void;
  setCurrentXmlCacheId: (id: string) => void;
  setSelectedDevice: (id: string) => void;
  setUIElements: (els: any[]) => void;
  setElements: (els: any[]) => void;
  setCategories: (cats: any[]) => void;
  setViewMode: (mode: any) => void;
  emitSnapshotUpdated: (snap: any) => void;
  onXmlContentUpdated?: (xml: string, deviceInfo?: any, pageInfo?: any) => void;
}

export type { PageFinderLoadContext as DirectXmlLoadContext }; // 兼容旧命名（已被引用）
