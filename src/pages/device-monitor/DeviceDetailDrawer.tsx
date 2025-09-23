import React, { useCallback, useEffect, useState } from 'react';
import { Drawer, Descriptions, Spin, message } from 'antd';
import { useAdb } from '../../application/hooks/useAdb';

interface Props {
  open: boolean;
  onClose: () => void;
}

export const DeviceDetailDrawer: React.FC<Props> = ({ open, onClose }) => {
  const { selectedDevice, getDeviceInfo } = useAdb();
  const [loading, setLoading] = useState(false);
  const [info, setInfo] = useState<Record<string, any> | null>(null);

  const load = useCallback(async () => {
    if (!selectedDevice?.id) return;
    setLoading(true);
    try {
      const data = await getDeviceInfo(selectedDevice.id);
      setInfo(data as any);
    } catch (e: any) {
      message.error(e?.message || '获取设备详情失败');
    } finally {
      setLoading(false);
    }
  }, [selectedDevice, getDeviceInfo]);

  useEffect(() => {
    if (open) load();
  }, [open, load]);

  return (
    <Drawer open={open} onClose={onClose} title="设备详情" width={520} destroyOnClose>
      {!info || loading ? (
        <Spin />
      ) : (
        <Descriptions column={1} bordered size="small">
          {Object.entries(info).map(([k, v]) => (
            <Descriptions.Item key={k} label={k}>{typeof v === 'string' ? v : JSON.stringify(v)}</Descriptions.Item>
          ))}
        </Descriptions>
      )}
    </Drawer>
  );
};

export default DeviceDetailDrawer;
