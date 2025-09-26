import React, { useEffect, useState } from 'react';
import { Button, Card, Select, Space, Tag, Typography, Alert, Divider, Tooltip, Input, InputNumber, Switch, Form } from 'antd';
import { invoke } from '@tauri-apps/api/core';
import { useAdb } from '../../../../application/hooks/useAdb';

const { Text, Title, Paragraph } = Typography;

export const ScrcpyControlView: React.FC = () => {
  // 使用统一的 useAdb() 获取设备与刷新能力
  const { onlineDevices, selectedDevice, selectDevice, refreshDevices } = useAdb();
  const [selected, setSelected] = useState<string | undefined>(undefined);
  const [busy, setBusy] = useState(false);
  const [runningMap, setRunningMap] = useState<Record<string, boolean>>({});
  const [error, setError] = useState<string | null>(null);
  // 参数设置
  const [sessionName, setSessionName] = useState<string>("");
  const [resolution, setResolution] = useState<string>(""); // 例如：1280 或 1280x720
  const [bitrate, setBitrate] = useState<string>("8M");
  const [maxFps, setMaxFps] = useState<number | null>(60);
  const [windowTitle, setWindowTitle] = useState<string>("EmployeeGUI Mirror");
  const [stayAwake, setStayAwake] = useState<boolean>(true);
  const [turnScreenOff, setTurnScreenOff] = useState<boolean>(false);
  // 默认选择：优先已选设备，否则第一个在线设备
  useEffect(() => {
    if (!selected) {
      if (selectedDevice) setSelected(selectedDevice.id);
      else if (onlineDevices.length > 0) setSelected(onlineDevices[0].id);
    }
  }, [selectedDevice, onlineDevices, selected]);

  const startMirror = async () => {
    if (!selected) return;
    setBusy(true);
    setError(null);
    try {
      const options: any = {
        stayAwake,
        turnScreenOff,
        bitrate,
        windowTitle,
      };
      if (resolution) options.resolution = resolution;
      if (maxFps && maxFps > 0) options.maxFps = maxFps;
      if (sessionName) options.sessionName = sessionName;
      const session: string = await invoke('start_device_mirror', { deviceId: selected, options });
      // 记录运行状态（按设备标记即可；如需细分会话可扩展成 Record<device, Record<session, boolean>>）
      setRunningMap((m) => ({ ...m, [selected]: true }));
    } catch (e: any) {
      setError(e?.message ?? String(e));
    } finally {
      setBusy(false);
    }
  };

  const stopMirror = async () => {
    if (!selected) return;
    setBusy(true);
    setError(null);
    try {
      if (sessionName) {
        await invoke('stop_device_mirror_session', { deviceId: selected, sessionName });
      } else {
        await invoke('stop_device_mirror', { deviceId: selected });
      }
      setRunningMap((m) => ({ ...m, [selected]: false }));
    } catch (e: any) {
      setError(e?.message ?? String(e));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="p-4">
      <Title level={4}>设备镜像控制（Scrcpy）</Title>
      <Paragraph type="secondary">
        最小可用方案：通过 Tauri 后端启动系统 scrcpy 进程，提供鼠标键盘操控能力。后续可切换为嵌入式解码（ya-webadb / WebCodecs）。
      </Paragraph>

      {error && (
        <Alert type="error" showIcon message="操作失败" description={error} className="mb-3" />
      )}

      <Card size="small">
        <Space align="center" wrap>
          <Text>选择设备：</Text>
          <Select
            style={{ minWidth: 260 }}
            value={selected}
            onChange={(val) => {
              setSelected(val);
              selectDevice(val);
            }}
            placeholder="请选择在线设备"
            options={onlineDevices.map((d) => ({
              value: d.id,
              label: (
                <Space>
                  <Text code>{d.id}</Text>
                  {d.model && <Tag color="blue">{d.model}</Tag>}
                </Space>
              ),
            }))}
            notFoundContent={<Text type="secondary">暂无在线设备</Text>}
          />
          <Button onClick={refreshDevices}>刷新</Button>
          <Tooltip title="在外部窗口打开 scrcpy（系统进程）">
            <Button type="primary" loading={busy} onClick={startMirror} disabled={!selected}>
              启动镜像
            </Button>
          </Tooltip>
          <Button danger loading={busy} onClick={stopMirror} disabled={!selected}>
            停止镜像
          </Button>
          {selected && runningMap[selected] && <Tag color="green">运行中</Tag>}
        </Space>
      </Card>

      <Divider />
      <Card size="small" title="镜像参数设置" className="mb-3">
        <Form layout="vertical">
          <Space size="large" wrap>
            <Form.Item label="会话名称">
              <Input placeholder="默认 default" value={sessionName} onChange={(e) => setSessionName(e.target.value)} style={{ width: 220 }} />
            </Form.Item>
            <Form.Item label="分辨率/最大边像素">
              <Input placeholder="如 1280 或 1280x720" value={resolution} onChange={(e) => setResolution(e.target.value)} style={{ width: 220 }} />
            </Form.Item>
            <Form.Item label="码率">
              <Input placeholder="如 8M" value={bitrate} onChange={(e) => setBitrate(e.target.value)} style={{ width: 160 }} />
            </Form.Item>
            <Form.Item label="最大 FPS">
              <InputNumber min={1} max={240} value={maxFps ?? undefined} onChange={(v) => setMaxFps((v ?? null) as any)} style={{ width: 120 }} />
            </Form.Item>
            <Form.Item label="窗口标题">
              <Input value={windowTitle} onChange={(e) => setWindowTitle(e.target.value)} style={{ width: 260 }} />
            </Form.Item>
            <Form.Item label="保持常亮">
              <Switch checked={stayAwake} onChange={setStayAwake} />
            </Form.Item>
            <Form.Item label="关闭手机屏幕">
              <Switch checked={turnScreenOff} onChange={setTurnScreenOff} />
            </Form.Item>
          </Space>
        </Form>
      </Card>

      <Divider />
      <Card>
        <Title level={5}>嵌入式画布占位</Title>
        <Paragraph type="secondary">
          未来可替换为 ya-webadb 的 scrcpy 客户端（WebCodecs/Canvas 渲染），实现内嵌预览与操控。
        </Paragraph>
        <div style={{ width: '100%', height: 520, background: '#0b0f19', borderRadius: 8 }} />
      </Card>
    </div>
  );
};

export default ScrcpyControlView;
