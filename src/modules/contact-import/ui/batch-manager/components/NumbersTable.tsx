import React, { useMemo, useState } from 'react';
import { Table, Tag, Space, Typography } from 'antd';
import type { ContactNumberList } from '../types';
import { getDistinctIndustries as fetchDistinctIndustries } from '../../services/contactNumberService';

interface Props {
  data?: ContactNumberList | null;
  loading?: boolean;
  pagination?: {
    current: number;
    pageSize: number;
    total: number;
    onChange: (page: number, pageSize: number) => void;
  };
  onRefresh?: () => void | Promise<void>;
  // 受控筛选（可选）：若传入则受控；提供重置按钮
  controlledFilters?: {
    status?: string | null;
    industry?: string | null;
    onChange?: (next: { status?: string | null; industry?: string | null }) => void;
  };
  // 行业下拉依赖：历史行业缓存（可选）。若不传则组件内部拉取一次并缓存于内存。
  industriesCache?: string[];
}

const NumbersTable: React.FC<Props> = ({ data, loading, pagination, controlledFilters, industriesCache }) => {
  const items = data?.items || [];

  // 内部筛选状态：行业/状态（仅对当前页数据做客户端过滤）
  const [statusFilterInner, setStatusFilterInner] = useState<string | null>(null);
  const [industryFilterInner, setIndustryFilterInner] = useState<string | null>(null);
  const statusFilter = controlledFilters?.status ?? statusFilterInner;
  const industryFilter = controlledFilters?.industry ?? industryFilterInner;

  const INDUSTRY_UNCLASSIFIED = '__UNCLASSIFIED__';

  const [distinctIndustries, setDistinctIndustries] = useState<string[]>(() => {
    const fromCache = industriesCache && industriesCache.length > 0 ? industriesCache : [];
    if (fromCache.length > 0) return fromCache.includes(INDUSTRY_UNCLASSIFIED) ? fromCache : [INDUSTRY_UNCLASSIFIED, ...fromCache];
    // 初始至少包含“未分类”
    return [INDUSTRY_UNCLASSIFIED];
  });

  // 初始化/更新行业列表缓存（合并当前页可见项，避免丢失历史）
  React.useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const globalList = await fetchDistinctIndustries().catch(() => [] as string[]);
        if (!mounted) return;
        const fromPage = Array.from(new Set(items.map(it => {
          const raw = (it as any).industry as string | null | undefined;
          return raw && raw.trim() ? raw.trim() : INDUSTRY_UNCLASSIFIED;
        })));
        const merged = Array.from(new Set([INDUSTRY_UNCLASSIFIED, ...globalList, ...fromPage]));
        // 未分类优先，其余按字母排序
        const sorted = merged.sort((a, b) => {
          if (a === INDUSTRY_UNCLASSIFIED) return -1;
          if (b === INDUSTRY_UNCLASSIFIED) return 1;
          return a.localeCompare(b);
        });
        setDistinctIndustries(sorted);
      } catch {
        // 忽略
      }
    })();
    return () => { mounted = false; };
  }, [items, industriesCache]);

  const filteredItems = useMemo(() => {
    return items.filter(it => {
      const s = (it as any).status as string | null | undefined;
      const rawInd = (it as any).industry as string | null | undefined;
      const ind = rawInd && rawInd.trim() ? rawInd.trim() : INDUSTRY_UNCLASSIFIED;
      if (statusFilter && s !== statusFilter) return false;
      if (industryFilter && ind !== industryFilter) return false;
      return true;
    });
  }, [items, statusFilter, industryFilter]);

  // 汇总（基于当前筛选 + 当前页数据）
  const { importedCount, notImportedCount, vcfGeneratedCount } = useMemo(() => {
    let imported = 0, notImported = 0, vcf = 0;
    for (const it of filteredItems) {
      const s = (it as any).status as string | null | undefined;
      if (s === 'imported') imported++;
      else if (s === 'not_imported') notImported++;
      else if (s === 'vcf_generated') vcf++;
    }
    return { importedCount: imported, notImportedCount: notImported, vcfGeneratedCount: vcf };
  }, [filteredItems]);

  const { Text } = Typography;

  return (
    <div>
      {/* 顶部汇总与筛选提示（本页统计） */}
      <Space size={[8, 8]} wrap style={{ marginBottom: 8 }}>
        <Text type="secondary">本页统计：</Text>
        <Tag
          color={statusFilter === 'imported' ? 'green' : 'default'}
          onClick={() => {
            if (controlledFilters?.onChange) {
              controlledFilters.onChange({ status: statusFilter === 'imported' ? null : 'imported', industry: industryFilter ?? null });
            } else {
              setStatusFilterInner(prev => (prev === 'imported' ? null : 'imported'));
            }
          }}
          style={{ cursor: 'pointer' }}
        >
          已导入 {importedCount}
        </Tag>
        <Tag
          color={statusFilter === 'not_imported' ? 'orange' : 'default'}
          onClick={() => {
            if (controlledFilters?.onChange) {
              controlledFilters.onChange({ status: statusFilter === 'not_imported' ? null : 'not_imported', industry: industryFilter ?? null });
            } else {
              setStatusFilterInner(prev => (prev === 'not_imported' ? null : 'not_imported'));
            }
          }}
          style={{ cursor: 'pointer' }}
        >
          待导入 {notImportedCount}
        </Tag>
        <Tag
          color={statusFilter === 'vcf_generated' ? 'blue' : 'default'}
          onClick={() => {
            if (controlledFilters?.onChange) {
              controlledFilters.onChange({ status: statusFilter === 'vcf_generated' ? null : 'vcf_generated', industry: industryFilter ?? null });
            } else {
              setStatusFilterInner(prev => (prev === 'vcf_generated' ? null : 'vcf_generated'));
            }
          }}
          style={{ cursor: 'pointer' }}
        >
          已生成VCF {vcfGeneratedCount}
        </Tag>
        {(statusFilter || industryFilter) && (
          <Tag
            color="magenta"
            onClick={() => {
              if (controlledFilters?.onChange) {
                controlledFilters.onChange({ status: null, industry: null });
              } else {
                setStatusFilterInner(null);
                setIndustryFilterInner(null);
              }
            }}
            style={{ cursor: 'pointer' }}
          >
            重置筛选
          </Tag>
        )}
      </Space>

      <Table
        rowKey="id"
        size="small"
        loading={loading}
        dataSource={filteredItems}
        pagination={pagination ? {
          current: pagination.current,
          pageSize: pagination.pageSize,
          total: pagination.total,
          onChange: pagination.onChange,
          showSizeChanger: true,
          showTotal: (t) => `共 ${t} 条`,
        } : false}
        columns={[
          { title: 'ID', dataIndex: 'id', width: 80 },
          { title: '号码', dataIndex: 'phone' },
          { title: '姓名', dataIndex: 'name', width: 160 },
          {
            title: '行业',
            dataIndex: 'industry',
            width: 120,
            filters: distinctIndustries.map(ind => ({
              text: ind === INDUSTRY_UNCLASSIFIED ? '未分类' : ind,
              value: ind,
            })),
            onFilter: (value, record) => {
              const indRaw = (record as any).industry as string | null | undefined;
              const ind = indRaw && indRaw.trim() ? indRaw.trim() : INDUSTRY_UNCLASSIFIED;
              return ind === value;
            },
            render: (v: string | null | undefined) => {
              const label = v && v.trim() ? v : '未分类';
              const key = v && v.trim() ? v.trim() : INDUSTRY_UNCLASSIFIED;
              const active = industryFilter === key;
              return (
                <Tag
                  color={active ? 'processing' : 'default'}
                  onClick={() => {
                    if (controlledFilters?.onChange) {
                      controlledFilters.onChange({ status: statusFilter ?? null, industry: industryFilter === key ? null : key });
                    } else {
                      setIndustryFilterInner(prev => (prev === key ? null : key));
                    }
                  }}
                  style={{ cursor: 'pointer' }}
                >
                  {label}
                </Tag>
              );
            },
          },
          {
            title: '状态',
            dataIndex: 'status',
            width: 140,
            filters: [
              { text: '已导入', value: 'imported' },
              { text: '待导入', value: 'not_imported' },
              { text: '已生成VCF', value: 'vcf_generated' },
            ],
            onFilter: (value, record) => (record as any).status === value,
            render: (s: string | null | undefined) => {
              if (s === 'imported') return (
                <Tag color={statusFilter === 'imported' ? 'green' : 'success'} style={{ cursor: 'pointer' }} onClick={() => {
                  if (controlledFilters?.onChange) {
                    controlledFilters.onChange({ status: statusFilter === 'imported' ? null : 'imported', industry: industryFilter ?? null });
                  } else {
                    setStatusFilterInner(prev => (prev === 'imported' ? null : 'imported'));
                  }
                }}>已导入</Tag>
              );
              if (s === 'not_imported') return (
                <Tag color={statusFilter === 'not_imported' ? 'orange' : 'warning'} style={{ cursor: 'pointer' }} onClick={() => {
                  if (controlledFilters?.onChange) {
                    controlledFilters.onChange({ status: statusFilter === 'not_imported' ? null : 'not_imported', industry: industryFilter ?? null });
                  } else {
                    setStatusFilterInner(prev => (prev === 'not_imported' ? null : 'not_imported'));
                  }
                }}>待导入</Tag>
              );
              if (s === 'vcf_generated') return (
                <Tag color={statusFilter === 'vcf_generated' ? 'blue' : 'processing'} style={{ cursor: 'pointer' }} onClick={() => {
                  if (controlledFilters?.onChange) {
                    controlledFilters.onChange({ status: statusFilter === 'vcf_generated' ? null : 'vcf_generated', industry: industryFilter ?? null });
                  } else {
                    setStatusFilterInner(prev => (prev === 'vcf_generated' ? null : 'vcf_generated'));
                  }
                }}>已生成VCF</Tag>
              );
              return <Tag>—</Tag>;
            }
          },
          { title: 'VCF 批次', dataIndex: 'used_batch', width: 160 },
          { title: '导入设备', dataIndex: 'imported_device_id', width: 140 },
          { title: '来源', dataIndex: 'source_file' },
          { title: '时间', dataIndex: 'created_at', width: 180 },
        ]}
      />
    </div>
  );
};

export default NumbersTable;
