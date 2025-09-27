import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Card, Col, Row, Space, Typography, Button, Table, Input, Pagination, message, Divider, Tag, Select } from 'antd';
import { DatabaseOutlined, FileTextOutlined, FolderOpenOutlined, MobileOutlined, FileDoneOutlined } from '@ant-design/icons';
import { useAdb } from '../../../application/hooks/useAdb';
import { selectFolder, selectTxtFile } from './utils/dialog';
import { fetchContactNumbers, importNumbersFromFolder, importNumbersFromTxtFile, listContactNumbers, ContactNumberDto } from './services/contactNumberService';
import { VcfImportService } from '../../../services/VcfImportService';
import { DeviceAssignmentTable } from './components/DeviceAssignmentTable';

const { Title, Text } = Typography;

// 简单VCF文本生成（按号码池生成联系人）
function buildVcfFromNumbers(numbers: ContactNumberDto[]): string {
  return numbers
    .map((n, idx) => [
      'BEGIN:VCARD',
      'VERSION:3.0',
      `FN:${n.name || `联系人${idx + 1}`}`,
      `N:${n.name || `联系人${idx + 1}`};;;;`,
      `TEL:${n.phone}`,
      'END:VCARD',
    ].join('\n'))
    .join('\n\n');
}

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

  return (
    <Row gutter={[16, 16]}>
      {/* 面板1：导入TXT到号码池 */}
      <Col span={8}>
        <Card title={<Space><DatabaseOutlined />导入 TXT 到号码池</Space>}>
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
          <DeviceAssignmentTable value={assignment} onChange={setAssignment} />
        </Card>
      </Col>
    </Row>
  );
};

export default ContactImportWorkbench;
