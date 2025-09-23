import React, { useCallback, useEffect, useState } from 'react';
import { Drawer, Descriptions, Spin, message, Tag, Space, Button, Tooltip, Divider } from 'antd';
import { CopyOutlined, GlobalOutlined } from '@ant-design/icons';
import { normalizeDeviceDetail } from './utils/detailNormalize';
import { useAdb } from '../../application/hooks/useAdb';
import { DeviceLogPanel } from '../adb/logs/DeviceLogPanel';

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
        <>
          <Space style={{ marginBottom: 12 }} wrap>
            <Tooltip title="复制设备详情 JSON">
              <Button
                icon={<CopyOutlined />}
                onClick={async () => {
                  try {
                    await navigator.clipboard.writeText(JSON.stringify(info, null, 2));
                    message.success('已复制 JSON');
                  } catch (e) {
                    message.error('复制失败');
                  }
                }}
              >复制 JSON</Button>
            </Tooltip>
            <Tooltip title="复制设备 IP">
              <Button
                icon={<GlobalOutlined />}
                onClick={async () => {
                  const ip = (info as any).ip || (info as any).wlan0 || (info as any).ip_address;
                  if (!ip) return message.info('未找到 IP');
                  try {
                    await navigator.clipboard.writeText(String(ip));
                    message.success('已复制 IP');
                  } catch {
                    message.error('复制失败');
                  }
                }}
                disabled={!( (info as any).ip || (info as any).wlan0 || (info as any).ip_address )}
              >复制 IP</Button>
            </Tooltip>
          </Space>
          <Descriptions column={1} bordered size="small" style={{ marginBottom: 12 }}>
            {(() => {
              const norm = normalizeDeviceDetail(info as any);
              return (
                <>
                  {norm.brand && <Descriptions.Item label="品牌">{norm.brand}</Descriptions.Item>}
                  {norm.model && <Descriptions.Item label="机型">{norm.model}</Descriptions.Item>}
                  {(norm.sdkInt != null || norm.androidVersion) && (
                    <Descriptions.Item label="SDK">
                      {norm.sdkInt != null ? `API ${norm.sdkInt}` : '-'}
                      {norm.androidVersion ? `（${norm.androidVersion}）` : ''}
                      {norm.sdkSource && <Tag style={{ marginLeft: 8 }} color="default">{norm.sdkSource}</Tag>}
                    </Descriptions.Item>
                  )}
                  {norm.resolution && (
                    <Descriptions.Item label="分辨率">
                      {`${norm.resolution.width} x ${norm.resolution.height}`}
                      {norm.resolutionSource && <Tag style={{ marginLeft: 8 }} color="default">{norm.resolutionSource}</Tag>}
                    </Descriptions.Item>
                  )}
                  {norm.ip && <Descriptions.Item label="IP">{norm.ip}{norm.ipSource && <Tag style={{ marginLeft: 8 }} color="default">{norm.ipSource}</Tag>}</Descriptions.Item>}
                  {norm.status && (
                    <Descriptions.Item label="状态">
                      <Tooltip title={`来源: ${norm.statusSource ?? '未知'}`}>
                        <Tag color={
                          norm.status.toLowerCase().includes('unauth') ? 'gold' :
                          norm.status.toLowerCase().includes('offline') ? 'default' :
                          (norm.status.toLowerCase().includes('device') || norm.status.toLowerCase().includes('online')) ? 'green' : 'blue'
                        }>
                          {norm.status}
                        </Tag>
                      </Tooltip>
                    </Descriptions.Item>
                  )}
                  {norm.conn && (
                    <Descriptions.Item label="连接">
                      <Tooltip title={`来源: ${norm.connSource ?? '未知'}`}>
                        <Tag color={
                          norm.conn.toLowerCase().includes('usb') ? 'geekblue' :
                          (norm.conn.toLowerCase().includes('wifi') || norm.conn.toLowerCase().includes('tcp') || norm.conn.toLowerCase().includes('wireless')) ? 'purple' :
                          norm.conn.toLowerCase().includes('emulator') ? 'cyan' : 'default'
                        }>
                          {norm.conn}
                        </Tag>
                      </Tooltip>
                    </Descriptions.Item>
                  )}
                </>
              );
            })()}
          </Descriptions>
          <Descriptions column={1} bordered size="small" title="所有字段">
            {Object.entries(info).map(([k, v]) => (
              <Descriptions.Item key={k} label={k}>
                {typeof v === 'string' || typeof v === 'number' || typeof v === 'boolean' ? String(v) : JSON.stringify(v)}
              </Descriptions.Item>
            ))}
          </Descriptions>

          {/* 设备专属日志 */}
          {selectedDevice?.id && (
            <>
              <Divider style={{ margin: '12px 0' }} />
              <DeviceLogPanel deviceId={selectedDevice.id} title="该设备相关日志" />
            </>
          )}
        </>
      )}
    </Drawer>
  );
};

export default DeviceDetailDrawer;
