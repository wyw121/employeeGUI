import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Card, Col, Row, Space, Typography, Button, Table, Input, Pagination, message, Divider, Tag, Select, Alert } from 'antd';
import { DatabaseOutlined, FileTextOutlined, FolderOpenOutlined, MobileOutlined, FileDoneOutlined } from '@ant-design/icons';
import { useAdb } from '../../../application/hooks/useAdb';
import { selectFolder, selectTxtFile } from './utils/dialog';
import { fetchContactNumbers, importNumbersFromFolder, importNumbersFromTxtFile, listContactNumbers, ContactNumberDto } from './services/contactNumberService';
import { VcfImportService } from '../../../services/VcfImportService';
import { buildVcfFromNumbers } from '../utils/vcf';
import BatchPreviewModal from './components/BatchPreviewModal';
import { executeBatches } from './services/batchExecutor';
import { DeviceAssignmentTable } from './components/DeviceAssignmentTable';
import ServiceFactory from '../../../application/services/ServiceFactory';
import { findRangeConflicts } from '../utils/assignmentValidation';
import BatchResultModal from './components/BatchResultModal';
import ConflictNavigator from './components/ConflictNavigator';
import type { BatchExecuteResult } from './services/batchExecutor';
import { BatchManagerDrawer } from './batch-manager';

const { Title, Text } = Typography;

// 复用工具函数 buildVcfFromNumbers

export const ContactImportWorkbench: React.FC = () => {
  // 设备
  const { devices, refreshDevices } = useAdb();
  const [selectedDeviceId, setSelectedDeviceId] = useState<string | undefined>(undefined);

  // 号码池列表
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [total, setTotal] = useState(0);
  const [items, setItems] = useState<ContactNumberDto[]>([]);
  const [selectedRowKeys, setSelectedRowKeys] = useState<React.Key[]>([]);
  const [assignment, setAssignment] = useState<Record<string, { industry?: string; idStart?: number; idEnd?: number }>>({});
  const contactImportApp = useMemo(() => ServiceFactory.getContactImportApplicationService(), []);

  const loadList = useCallback(async () => {
    setLoading(true);
    try {
      const res = await listContactNumbers({ limit: pageSize, offset: (page - 1) * pageSize, search: search.trim() || undefined });
      setItems(res.items);
      setTotal(res.total);
    } catch (e) {
      console.error(e);
      message.error('加载号码池失败');
    } finally {
      setLoading(false);
    }
  }, [page, pageSize, search]);

  useEffect(() => { loadList(); }, [loadList]);

  // 导入面板
  const handleImportTxt = async () => {
    const file = await selectTxtFile();
    if (!file) return;
    setLoading(true);
    try {
      const res = await importNumbersFromTxtFile(file);
      message.success(`写入 ${res.inserted} 条，重复 ${res.duplicates}`);
      loadList();
    } catch (e) {
      message.error(`导入失败: ${e}`);
    } finally { setLoading(false); }
  };

  const handleImportFolder = async () => {
    const folder = await selectFolder();
    if (!folder) return;
    setLoading(true);
    try {
      const res = await importNumbersFromFolder(folder);
      message.success(`文件 ${res.total_files}，写入 ${res.inserted}，重复 ${res.duplicates}`);
      loadList();
    } catch (e) {
      message.error(`导入失败: ${e}`);
    } finally { setLoading(false); }
  };

  // 生成并导入VCF
  const selectedItems = useMemo(() => items.filter(i => selectedRowKeys.includes(i.id)), [items, selectedRowKeys]);

  const handleGenerateAndImportVcf = async () => {
    if (!selectedDeviceId) {
      message.warning('请选择目标设备');
      return;
    }
    if (selectedItems.length === 0) {
      message.warning('请先选择至少一个号码');
      return;
    }
    try {
      const vcfContent = buildVcfFromNumbers(selectedItems);
      const tempPath = VcfImportService.generateTempVcfPath();
      await VcfImportService.writeVcfFile(tempPath, vcfContent);
      const result = await VcfImportService.importVcfFile(tempPath, selectedDeviceId);
      if (result.success) {
        message.success(`导入成功：${result.importedContacts}/${result.totalContacts}`);
      } else {
        message.error(result.message || '导入失败');
      }
    } catch (e) {
      message.error(`执行失败: ${e}`);
    }
  };

  const columns = [
    { title: 'ID', dataIndex: 'id', width: 80 },
    { title: '号码', dataIndex: 'phone' },
    { title: '姓名', dataIndex: 'name', width: 180 },
    { title: '来源', dataIndex: 'source_file', ellipsis: true },
    { title: '时间', dataIndex: 'created_at', width: 200 },
  ];

  const hasInvalidRanges = useMemo(() => {
    return Object.values(assignment).some(cfg => {
      if (typeof cfg.idStart === 'number' && typeof cfg.idEnd === 'number') {
        return cfg.idStart > cfg.idEnd;
      }
      return false;
    });
  }, [assignment]);

  const allRangesEmpty = useMemo(() => {
    return Object.values(assignment).every(cfg => (typeof cfg.idStart !== 'number' || typeof cfg.idEnd !== 'number'));
  }, [assignment]);

  const [onlyUnconsumed, setOnlyUnconsumed] = useState<boolean>(true);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewBatches, setPreviewBatches] = useState<Array<{ deviceId: string; industry?: string; numbers: ContactNumberDto[] }>>([]);
  const [resultOpen, setResultOpen] = useState(false);
  const [lastResult, setLastResult] = useState<null | BatchExecuteResult>(null);
  const rangeConflicts = useMemo(() => {
    return findRangeConflicts(
      Object.fromEntries(Object.entries(assignment).map(([id, a]) => [id, { idStart: a.idStart, idEnd: a.idEnd }]))
    );
  }, [assignment]);
  const conflictDeviceIds = useMemo(() => {
    const s = new Set<string>();
    for (const c of rangeConflicts) { s.add(c.deviceA); s.add(c.deviceB); }
    return Array.from(s);
  }, [rangeConflicts]);
  const conflictPeersByDevice = useMemo(() => {
    const map: Record<string, Array<{ peerId: string; start: number; end: number }>> = {};
    for (const c of rangeConflicts) {
      (map[c.deviceA] ||= []).push({ peerId: c.deviceB, start: c.rangeB.start, end: c.rangeB.end });
      (map[c.deviceB] ||= []).push({ peerId: c.deviceA, start: c.rangeA.start, end: c.rangeA.end });
    }
    return map;
  }, [rangeConflicts]);

  const [currentJumpId, setCurrentJumpId] = useState<string | null>(null);
  const [batchDrawerOpen, setBatchDrawerOpen] = useState(false);
  const handleJumpToDevice = useCallback((deviceId: string) => {
    // antd Table 行上会带 data-row-key
    const el = document.querySelector(`[data-row-key="${deviceId}"]`);
    if (el && 'scrollIntoView' in el) {
      (el as HTMLElement).scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
    setCurrentJumpId(deviceId);
  }, []);

  const handleGenerateBatches = async () => {
    try {
      // 生成前：区间冲突校验
      const conflicts = findRangeConflicts(
        Object.fromEntries(Object.entries(assignment).map(([id, a]) => [id, { idStart: a.idStart, idEnd: a.idEnd }]))
      );
      if (conflicts.length > 0) {
        message.error('发现区间冲突，请先修正再生成');
        return;
      }
      const batches = await contactImportApp.generateVcfBatches(assignment, { onlyUnconsumed });
      setPreviewBatches(batches as any);
      setPreviewOpen(true);
    } catch (e) {
      message.error(`生成批次失败：${e}`);
    }
  };

  const handleExecuteFromPreview = async (selectedDeviceIds: string[], options: { markConsumed: boolean }) => {
    try {
      const target = previewBatches.filter(b => selectedDeviceIds.includes(b.deviceId));
      const res = await executeBatches(target as any, options.markConsumed ? {
        markConsumed: async (batchId: string) => {
          // 使用应用层统一入口进行区间消费标记
          await contactImportApp.markConsumed(assignment, batchId);
        },
        perDeviceMaxRetries: 2,
        perDeviceRetryDelayMs: 500,
        interDeviceDelayMs: 150,
      } : {
        perDeviceMaxRetries: 2,
        perDeviceRetryDelayMs: 500,
        interDeviceDelayMs: 150,
      });
      message.success(`导入完成：成功 ${res.successDevices}/${res.totalDevices}`);
      setPreviewOpen(false);
      setLastResult(res);
      setResultOpen(true);
    } catch (e) {
      message.error(`批次导入失败：${e}`);
    }
  };

  return (
    <Row gutter={[16, 16]}>
      {/* 面板1：导入TXT到号码池 */}
      <Col span={8}>
  <Card title={<Space><DatabaseOutlined />导入 TXT 到号码池</Space>} extra={<Button onClick={() => setBatchDrawerOpen(true)}>按批次/设备筛选</Button>}>
          <Space direction="vertical" style={{ width: '100%' }}>
            <Text type="secondary">支持单个 TXT 或TXT文件夹，自动提取手机号码并去重入库</Text>
            <Space>
              <Button icon={<FileTextOutlined />} onClick={handleImportTxt}>导入TXT文件</Button>
              <Button icon={<FolderOpenOutlined />} onClick={handleImportFolder}>导入文件夹</Button>
            </Space>
            <Divider style={{ margin: '12px 0' }} />
            <Space>
              <Input.Search placeholder="搜索 号码/姓名" allowClear onSearch={(v) => { setSearch(v); setPage(1);} } style={{ width: 260 }} />
              <Button onClick={loadList}>刷新列表</Button>
            </Space>
          </Space>
        </Card>
      </Col>

      {/* 面板2：号码池 */}
      <Col span={16}>
        <Card title={<Space><DatabaseOutlined />号码池</Space>} extra={<Tag color="blue">共 {total} 条</Tag>}>
          <Table
            rowKey="id"
            columns={columns as any}
            dataSource={items}
            loading={loading}
            size="middle"
            rowSelection={{ selectedRowKeys, onChange: setSelectedRowKeys }}
            pagination={false}
          />
          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 12 }}>
            <Pagination current={page} pageSize={pageSize} total={total} onChange={(p, ps) => { setPage(p); setPageSize(ps); }} showSizeChanger />
            <Text type="secondary">已选 {selectedRowKeys.length} 条</Text>
          </div>
        </Card>
      </Col>

      {/* 面板3：设备与VCF */}
      <Col span={24}>
        <Card title={<Space><MobileOutlined />设备与VCF</Space>}>
          {rangeConflicts.length > 0 && (
            <Alert
              type="error"
              showIcon
              style={{ marginBottom: 12 }}
              message={`发现 ${rangeConflicts.length} 处区间冲突`}
              description={
                <div>
                  {rangeConflicts.slice(0, 5).map((c, i) => (
                    <div key={i}>设备 {c.deviceA} [{c.rangeA.start}-{c.rangeA.end}] 与 设备 {c.deviceB} [{c.rangeB.start}-{c.rangeB.end}] 重叠</div>
                  ))}
                  {rangeConflicts.length > 5 && <div style={{ opacity: 0.7 }}>仅显示前5条</div>}
                </div>
              }
            />
          )}
          <Space wrap>
            <Select
              style={{ width: 280 }}
              placeholder="选择设备"
              value={selectedDeviceId}
              onChange={setSelectedDeviceId}
              options={(devices || []).map(d => ({ label: `${d.name || d.id} (${d.id})`, value: d.id }))}
            />
            <Button onClick={() => refreshDevices?.()}>刷新设备</Button>
            <Button type="primary" icon={<FileDoneOutlined />} onClick={handleGenerateAndImportVcf}>
              将所选号码生成VCF并导入设备
            </Button>
          </Space>
          <Divider />
          <ConflictNavigator conflictIds={conflictDeviceIds} currentTargetId={currentJumpId} onJump={handleJumpToDevice} />
          <DeviceAssignmentTable value={assignment} onChange={setAssignment} conflictingDeviceIds={conflictDeviceIds} conflictPeersByDevice={conflictPeersByDevice} onJumpToDevice={handleJumpToDevice} />
          <div style={{ marginTop: 12, display: 'flex', gap: 12, alignItems: 'center' }}>
            <Button type="primary" onClick={handleGenerateBatches} disabled={hasInvalidRanges || allRangesEmpty}>
              根据分配生成VCF批次
            </Button>
            <label style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <input type="checkbox" checked={onlyUnconsumed} onChange={e => setOnlyUnconsumed(e.target.checked)} />
              仅使用未消费号码
            </label>
            {hasInvalidRanges && <Text type="danger">存在非法区间（起始大于结束）</Text>}
            {allRangesEmpty && <Text type="secondary">请为至少一台设备设置有效区间</Text>}
          </div>
        </Card>
      </Col>
      <BatchPreviewModal
        open={previewOpen}
        batches={previewBatches as any}
        onCancel={() => setPreviewOpen(false)}
        onExecute={handleExecuteFromPreview}
      />
      <BatchResultModal
        open={resultOpen}
        result={lastResult}
        onClose={() => setResultOpen(false)}
        assignmentSnapshot={assignment}
        onRetryFailed={async () => {
          if (!lastResult) return;
          const failedIds = lastResult.deviceResults.filter(d => !d.success).map(d => d.deviceId);
          if (failedIds.length === 0) {
            message.info('没有失败的设备需要重试');
            return;
          }
          try {
            const retryBatches = previewBatches.filter(b => failedIds.includes(b.deviceId));
            const res = await executeBatches(retryBatches as any, {
              perDeviceMaxRetries: 2,
              perDeviceRetryDelayMs: 500,
              interDeviceDelayMs: 150,
            });
            setLastResult(res);
            message.success(`重试完成：成功 ${res.successDevices}/${res.totalDevices}`);
          } catch (e) {
            message.error(`重试失败：${e}`);
          }
        }}
      />
  <BatchManagerDrawer open={batchDrawerOpen} onClose={() => setBatchDrawerOpen(false)} />
    </Row>
  );
};

export default ContactImportWorkbench;
