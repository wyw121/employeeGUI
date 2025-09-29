import { useState, useCallback, useEffect, useMemo } from 'react';
import { message } from 'antd';
import ServiceFactory from '../../../../application/services/ServiceFactory';
import { 
  listContactNumbers, 
  createImportSessionRecord, 
  finishImportSessionRecord,
  ContactNumberDto 
} from '../services/contactNumberService';
import { getContactNumberStats, ContactNumberStatsDto } from '../services/stats/contactStatsService';

export interface UseContactImportStateReturn {
  // 号码池状态
  loading: boolean;
  numbers: ContactNumberDto[];
  total: number;
  page: number;
  pageSize: number;
  search: string;
  selectedRowKeys: React.Key[];
  
  // 设备分配状态
  assignment: Record<string, { industry?: string; idStart?: number; idEnd?: number }>;
  onlyUnconsumed: boolean;
  
  // 统计状态
  stats: ContactNumberStatsDto | null;
  
  // 操作方法
  loadNumbers: () => Promise<void>;
  setSearch: (search: string) => void;
  setPage: (page: number) => void;
  setPageSize: (pageSize: number) => void;
  setSelectedRowKeys: (keys: React.Key[]) => void;
  updateAssignment: (deviceId: string, assignment: any) => void;
  setOnlyUnconsumed: (value: boolean) => void;
  loadStats: () => Promise<void>;
  generateVcfForDevice: (deviceId: string) => Promise<void>;
  importToDevice: (deviceId: string) => Promise<void>;
}

/**
 * 联系人导入业务状态管理Hook
 * 包含号码池、设备分配、统计等业务逻辑
 */
export const useContactImportState = (): UseContactImportStateReturn => {
  // 号码池状态
  const [loading, setLoading] = useState(false);
  const [numbers, setNumbers] = useState<ContactNumberDto[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [search, setSearch] = useState('');
  const [selectedRowKeys, setSelectedRowKeys] = useState<React.Key[]>([]);
  
  // 设备分配状态
  const [assignment, setAssignment] = useState<Record<string, { 
    industry?: string; 
    idStart?: number; 
    idEnd?: number; 
  }>>({});
  const [onlyUnconsumed, setOnlyUnconsumed] = useState<boolean>(true);
  
  // 统计状态
  const [stats, setStats] = useState<ContactNumberStatsDto | null>(null);
  
  // 服务实例
  const contactImportApp = useMemo(() => ServiceFactory.getContactImportApplicationService(), []);

  // 加载号码池数据
  const loadNumbers = useCallback(async () => {
    setLoading(true);
    try {
      const result = await listContactNumbers({
        limit: pageSize,
        offset: (page - 1) * pageSize,
        search: search || undefined,
      });
      setNumbers(result.items);
      setTotal(result.total);
    } catch (error) {
      message.error(`加载号码失败: ${error}`);
    } finally {
      setLoading(false);
    }
  }, [page, pageSize, search]);

  // 加载统计数据
  const loadStats = useCallback(async () => {
    try {
      const statsData = await getContactNumberStats();
      setStats(statsData);
    } catch (error) {
      console.error('加载统计数据失败:', error);
    }
  }, []);

  // 更新设备分配
  const updateAssignment = useCallback((deviceId: string, newAssignment: any) => {
    setAssignment(prev => ({
      ...prev,
      [deviceId]: newAssignment
    }));
  }, []);

  // 为设备生成VCF
  const generateVcfForDevice = useCallback(async (deviceId: string) => {
    try {
      message.loading(`正在为设备 ${deviceId} 生成VCF...`, 0);
      // 这里实现VCF生成逻辑
      await new Promise(resolve => setTimeout(resolve, 1000)); // 模拟异步操作
      message.destroy();
      message.success(`设备 ${deviceId} VCF生成成功`);
      await loadStats(); // 刷新统计
    } catch (error) {
      message.destroy();
      message.error(`VCF生成失败: ${error}`);
    }
  }, [loadStats]);

  // 导入到设备
  const importToDevice = useCallback(async (deviceId: string) => {
    try {
      message.loading(`正在导入到设备 ${deviceId}...`, 0);
      // 这里实现导入逻辑
      await new Promise(resolve => setTimeout(resolve, 1500)); // 模拟异步操作
      message.destroy();
      message.success(`导入到设备 ${deviceId} 成功`);
      await loadStats(); // 刷新统计
    } catch (error) {
      message.destroy();
      message.error(`导入失败: ${error}`);
    }
  }, [loadStats]);

  // 初始化加载
  useEffect(() => {
    loadNumbers();
  }, [loadNumbers]);

  useEffect(() => {
    loadStats();
  }, [loadStats]);

  return {
    // 状态
    loading,
    numbers,
    total,
    page,
    pageSize,
    search,
    selectedRowKeys,
    assignment,
    onlyUnconsumed,
    stats,
    
    // 操作方法
    loadNumbers,
    setSearch,
    setPage,
    setPageSize,
    setSelectedRowKeys,
    updateAssignment,
    setOnlyUnconsumed,
    loadStats,
    generateVcfForDevice,
    importToDevice,
  };
};