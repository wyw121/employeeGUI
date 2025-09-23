import React from 'react';
import { Segmented, Space } from 'antd';

export type DeviceSortKey = 'online-first' | 'connection' | 'id-asc' | 'id-desc';

interface Props {
  value: DeviceSortKey;
  onChange: (v: DeviceSortKey) => void;
}

export const DeviceSortBar: React.FC<Props> = ({ value, onChange }) => {
  return (
    <Space>
      <Segmented
        options={[
          { label: '在线优先', value: 'online-first' },
          { label: '连接类型', value: 'connection' },
          { label: 'ID升序', value: 'id-asc' },
          { label: 'ID降序', value: 'id-desc' },
        ]}
        value={value}
        onChange={(v) => onChange(v as DeviceSortKey)}
      />
    </Space>
  );
};

export default DeviceSortBar;
