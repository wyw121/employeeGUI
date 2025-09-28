import React from 'react';
import { Space, Select, Input, Switch } from 'antd';
import type { BatchFilterState } from '../types';
import type { VcfBatchList } from '../../services/contactNumberService';
import { useAdb } from '../../../../../application/hooks/useAdb';

interface Props {
  value: BatchFilterState;
  onChange: (v: BatchFilterState) => void;
  batches?: VcfBatchList | null;
}

const FiltersBar: React.FC<Props> = ({ value, onChange, batches }) => {
  const { devices } = useAdb();
  const deviceOptions = devices.map(d => ({ 
    value: d.id, 
    label: `${d.name || d.model || d.id}` 
  }));

  return (
    <Space wrap>
      <Select
        style={{ width: 160 }}
        value={value.mode}
        onChange={(mode) => onChange({ ...value, mode })}
        options={[
          { value: 'all', label: '全部号码' },
          { value: 'by-device', label: '按设备' },
          { value: 'by-batch', label: '按批次' },
          { value: 'no-batch', label: '未生成VCF' },
        ]}
      />
      {value.mode === 'by-device' && (
        <Select
          style={{ width: 220 }}
          placeholder="选择设备"
          value={value.deviceId}
          onChange={(deviceId) => onChange({ ...value, deviceId })}
          options={deviceOptions}
          showSearch
        />
      )}
      {value.mode === 'by-batch' && (
        <Select
          style={{ width: 220 }}
          placeholder="选择批次"
          value={value.batchId}
          onChange={(batchId) => onChange({ ...value, batchId })}
          options={(batches?.items || []).map(b => ({ value: b.batch_id, label: `${b.batch_id} (${b.created_at})` }))}
          showSearch
        />
      )}
      {value.mode === 'all' && (
        <Input
          style={{ width: 220 }}
          placeholder="按设备ID筛选会话（可选）"
          value={value.deviceId}
          onChange={(e) => onChange({ ...value, deviceId: e.target.value })}
          allowClear
        />
      )}
      {(value.mode === 'all' || value.mode === 'no-batch') && (
        <Input
          style={{ width: 220 }}
          placeholder="搜索 号码/姓名"
          value={value.search}
          onChange={(e) => onChange({ ...value, search: e.target.value })}
          allowClear
        />
      )}
      {value.mode === 'by-batch' && (
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
          <Switch checked={!!value.onlyUsed} onChange={(v) => onChange({ ...value, onlyUsed: v })} />
          仅显示该批次
        </span>
      )}
    </Space>
  );
};

export default FiltersBar;
