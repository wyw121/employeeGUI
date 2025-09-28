import React from 'react';
import { Card, InputNumber, Select, Button, Space, Typography, Tooltip, Tag, Badge, App } from 'antd';
import { ReloadOutlined, MobileOutlined } from '@ant-design/icons';
import styles from '../DeviceAssignmentGrid.module.css';

const { Text } = Typography;

export interface DeviceCardProps {
  row: {
    deviceId: string;
    deviceName?: string;
    industry?: string;
    idStart?: number;
    idEnd?: number;
    contactCount?: number;
  };
  industries: string[];
  isSelected: boolean;
  setSelected: (checked: boolean) => void;
  meta?: { manufacturer?: string; model?: string };
  loadingCount?: boolean;
  onRefreshCount: () => void;
  onUpdateRow: (patch: Partial<{ industry: string; idStart: number | undefined; idEnd: number | undefined }>) => void;
  assignCount: number;
  setAssignCount: (n: number) => void;
  onAutoAssign: () => void;
  onAllocate: () => Promise<void>;
  onGenerateVcf: () => Promise<void>;
  onImport: () => Promise<void>;
  importing?: boolean;
  allocating?: boolean;
  generating?: boolean;
  bindings: { pending: number; imported: number };
  onOpenSessions?: (status: 'pending' | 'success' | 'all') => void;
}

function PhoneVisual({ manufacturer, model }: { manufacturer?: string; model?: string }) {
  return (
    <div className={styles.phoneVisualWrap}>
      <div className={styles.phoneVisualIcon} aria-label={(manufacturer || model) ? `${manufacturer ?? ''} ${model ?? ''}` : 'mobile'}>
        <MobileOutlined style={{ fontSize: 24, color: '#1677ff' }} />
      </div>
    </div>
  );
}

export const DeviceCard: React.FC<DeviceCardProps> = (props) => {
  const { message } = App.useApp();
  const row = props.row;
  const hasSelfError = typeof row.idStart === 'number' && typeof row.idEnd === 'number' && (row.idStart > row.idEnd);
  return (
    <Card
      data-device-card={row.deviceId}
      hoverable
      size="small"
      style={{ height: '100%', borderColor: hasSelfError ? '#ff4d4f' : (props.isSelected ? '#1677ff' : undefined), cursor: 'pointer' }}
      onClick={(e) => {
        const target = e.target as HTMLElement | null;
        if (target && target.closest('input, button, select, textarea, [role="spinbutton"], .ant-select, .ant-input-number, .ant-btn, [data-no-card-toggle]')) return;
        props.setSelected(!props.isSelected);
      }}
      title={
        <Space>
          <input type="checkbox" checked={props.isSelected} onChange={(e) => props.setSelected(e.currentTarget.checked)} onClick={(e) => e.stopPropagation()} />
          <Badge status={hasSelfError ? 'error' : 'processing'} />
          <Text strong>{row.deviceName}</Text>
        </Space>
      }
    >
      <PhoneVisual manufacturer={props.meta?.manufacturer} model={props.meta?.model} />
      <div className={styles.deviceIdText}><Text type="secondary">{row.deviceId}</Text></div>
      <div style={{ marginBottom: 8 }}>
        <Space size={[4, 4]} wrap>
          {row.industry ? <Tag color="blue">{row.industry}</Tag> : <Tag>未选择行业</Tag>}
        </Space>
      </div>
      <Space direction="vertical" className={styles.assignRow}>
        <Select style={{ width: '100%' }} value={row.industry} options={props.industries.map(i => ({ label: i, value: i }))} onChange={(v) => props.onUpdateRow({ industry: v })} />
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <InputNumber size="small" style={{ width: 110 }} status={hasSelfError ? 'error' : undefined} min={0} value={row.idStart} placeholder="起" onChange={(v) => props.onUpdateRow({ idStart: typeof v === 'number' ? v : undefined })} />
          <Text type="secondary">~</Text>
          <InputNumber size="small" style={{ width: 110 }} status={hasSelfError ? 'error' : undefined} min={0} value={row.idEnd} placeholder="止" onChange={(v) => props.onUpdateRow({ idEnd: typeof v === 'number' ? v : undefined })} />
        </div>
        <div className={styles.autoBtnRow}>
          <InputNumber size="small" min={1} style={{ width: 100 }} value={props.assignCount} onChange={(v) => props.setAssignCount(typeof v === 'number' ? v : props.assignCount)} />
          <Tooltip title="按照数量自动分配区间（基于当前最大已用区间尾部）">
            <Button onClick={() => props.onAutoAssign()}>分配</Button>
          </Tooltip>
        </div>
      </Space>
      <div className={styles.contactsRow}>
        <Space>
          <Text>已有联系人：</Text>
          <Text strong>{typeof row.contactCount === 'number' ? row.contactCount : '-'}</Text>
        </Space>
        <Tooltip title="刷新该设备联系人数量">
          <Button size="small" loading={!!props.loadingCount} icon={<ReloadOutlined />} onClick={(e) => { e.stopPropagation(); props.onRefreshCount(); }} />
        </Tooltip>
      </div>
      <div style={{ marginTop: 8, display: 'flex', flexWrap: 'wrap', gap: 8, alignItems: 'center' }}>
        <Button size="small" onClick={(e) => { e.stopPropagation(); props.onAllocate(); }} loading={!!props.allocating} type="dashed">分配{Math.max(1, Math.floor(props.assignCount ?? 100))}</Button>
        <Button size="small" onClick={(e) => { e.stopPropagation(); props.onGenerateVcf(); }} loading={!!props.generating}>生成VCF</Button>
        <Button size="small" type="primary" onClick={(e) => { e.stopPropagation(); props.onImport(); }} loading={!!props.importing} style={{ flex: '0 0 auto' }}>导入</Button>
      </div>
      <div style={{ marginTop: 6, display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        <Tag color={props.bindings.pending > 0 ? 'gold' : undefined} data-no-card-toggle style={{ cursor: 'pointer' }} onClick={(e) => { e.stopPropagation(); props.onOpenSessions?.('pending'); }}>
          待导入: <Text strong>{props.bindings.pending}</Text>
        </Tag>
        <Tag color={props.bindings.imported > 0 ? 'green' : undefined} data-no-card-toggle style={{ cursor: 'pointer' }} onClick={(e) => { e.stopPropagation(); props.onOpenSessions?.('success'); }}>
          已导入: <Text strong>{props.bindings.imported}</Text>
        </Tag>
      </div>
    </Card>
  );
};
