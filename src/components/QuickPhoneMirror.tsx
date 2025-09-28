/**
 * 快速手机镜像组件
 * 提供一键启动手机屏幕镜像功能
 * 自动选择第一个在线设备并启动scrcpy镜像
 */

import React, { useState } from 'react';
import { Button, message, Modal, Select, Space, Typography, Card, Alert } from 'antd';
import { EyeOutlined, MobileOutlined, PlayCircleOutlined, LoadingOutlined } from '@ant-design/icons';
import { invoke } from '@tauri-apps/api/core';
import { useAdb } from '../application/hooks/useAdb';
import type { Device } from '../domain/adb/entities/Device';
import { DeviceStatus } from '../domain/adb/entities/Device';

const { Text, Paragraph } = Typography;
const { Option } = Select;

/**
 * Scrcpy会话配置接口
 */
interface ScrcpyOptions {
  stayAwake?: boolean;
  turnScreenOff?: boolean;
  resolution?: string;
  bitrate?: string;
  maxFps?: number;
  windowTitle?: string;
  sessionName?: string;
  alwaysOnTop?: boolean;
  borderless?: boolean;
}

/**
 * Scrcpy会话启动结果
 */
interface ScrcpyStartResult {
  success: boolean;
  sessionId: string;
  message?: string;
}

/**
 * 组件Props
 */
interface QuickPhoneMirrorProps {
  /**
   * 按钮样式类型
   */
  type?: 'primary' | 'default' | 'dashed' | 'link' | 'text';
  /**
   * 按钮大小
   */
  size?: 'small' | 'middle' | 'large';
  /**
   * 是否显示图标
   */
  showIcon?: boolean;
  /**
   * 自定义按钮文本
   */
  text?: string;
  /**
   * 启动成功回调
   */
  onMirrorStarted?: (sessionId: string, deviceId: string) => void;
}

/**
 * 快速手机镜像组件
 */
export const QuickPhoneMirror: React.FC<QuickPhoneMirrorProps> = ({
  type = 'default',
  size = 'middle',
  showIcon = true,
  text = '查看手机',
  onMirrorStarted
}) => {
  const [loading, setLoading] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [selectedDeviceId, setSelectedDeviceId] = useState<string>('');
  
  const { devices, isLoading: devicesLoading } = useAdb();

  // 获取在线设备
  const getOnlineDevices = (): Device[] => {
    return devices.filter(device => device.status === DeviceStatus.ONLINE);
  };

  // 快速启动镜像（自动选择第一个在线设备）
  const handleQuickMirror = async () => {
    const onlineDevices = getOnlineDevices();
    
    if (onlineDevices.length === 0) {
      message.warning('没有找到在线设备，请确保设备已连接并启用USB调试');
      return;
    }

    if (onlineDevices.length === 1) {
      // 只有一个设备时直接启动
      await startMirror(onlineDevices[0].id);
    } else {
      // 多个设备时显示选择对话框
      setSelectedDeviceId(onlineDevices[0].id);
      setShowModal(true);
    }
  };

  // 启动镜像
  const startMirror = async (deviceId: string) => {
    if (!deviceId) {
      message.error('请选择要镜像的设备');
      return;
    }

    setLoading(true);
    
    try {
      const options: ScrcpyOptions = {
        resolution: '1080',
        bitrate: '8M',
        maxFps: 60,
        windowTitle: `手机镜像 - ${deviceId}`,
        stayAwake: true,
        alwaysOnTop: false,
        borderless: false
      };

      const sessionId = await invoke<string>('start_device_mirror', {
        deviceId,
        options
      });

      message.success('手机镜像启动成功');
      setShowModal(false);
      onMirrorStarted?.(sessionId, deviceId);
    } catch (error) {
      console.error('启动手机镜像失败:', error);
      message.error(`启动失败: ${error}`);
    } finally {
      setLoading(false);
    }
  };

  // 处理模态框确认
  const handleModalConfirm = async () => {
    if (selectedDeviceId) {
      await startMirror(selectedDeviceId);
    }
  };

  // 处理模态框取消
  const handleModalCancel = () => {
    setShowModal(false);
    setSelectedDeviceId('');
  };

  const onlineDevices = getOnlineDevices();
  const disabled = devicesLoading || loading || onlineDevices.length === 0;

  return (
    <>
      <Button
        type={type}
        size={size}
        icon={showIcon ? (loading ? <LoadingOutlined /> : <EyeOutlined />) : undefined}
        loading={loading}
        disabled={disabled}
        onClick={handleQuickMirror}
      >
        {text}
      </Button>

      <Modal
        title="选择要镜像的设备"
        open={showModal}
        onOk={handleModalConfirm}
        onCancel={handleModalCancel}
        confirmLoading={loading}
        okText="开始镜像"
        cancelText="取消"
        width={480}
      >
        <Space direction="vertical" style={{ width: '100%' }} size="middle">
          <Alert
            message="检测到多个在线设备"
            description="请选择要进行屏幕镜像的设备"
            type="info"
            showIcon
            icon={<MobileOutlined />}
          />

          <Card size="small" title="设备选择">
            <Select
              value={selectedDeviceId}
              onChange={setSelectedDeviceId}
              style={{ width: '100%' }}
              placeholder="选择设备"
              size="large"
            >
              {onlineDevices.map((device) => (
                <Option key={device.id} value={device.id}>
                  <Space>
                    <MobileOutlined style={{ color: '#52c41a' }} />
                    <Text strong>{device.id}</Text>
                    <Text type="secondary">({device.status})</Text>
                  </Space>
                </Option>
              ))}
            </Select>
          </Card>

          <Card size="small" title="镜像配置">
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
              <Text type="secondary">分辨率上限: 1080p</Text>
              <Text type="secondary">码率: 8M</Text>
              <Text type="secondary">帧率: 60fps</Text>
              <Text type="secondary">保持常亮: 开启</Text>
            </div>
          </Card>

          <Paragraph type="secondary" style={{ fontSize: '12px', margin: 0 }}>
            <PlayCircleOutlined style={{ marginRight: '4px' }} />
            镜像将在新窗口中打开，可以实时查看和操作手机屏幕
          </Paragraph>
        </Space>
      </Modal>
    </>
  );
};

export default QuickPhoneMirror;