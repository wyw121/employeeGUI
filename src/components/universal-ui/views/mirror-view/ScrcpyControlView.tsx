import React, { useEffect, useState } from 'react';
import { Button, Card, Select, Space, Tag, Typography, Alert, Divider, Tooltip, Input, InputNumber, Switch, Form, Popconfirm, Radio } from 'antd';
import { invoke } from '@tauri-apps/api/core';
import { useAdb } from '../../../../application/hooks/useAdb';
import EmbeddedScrcpyPlayer from './EmbeddedScrcpyPlayer';

const { Text, Title, Paragraph } = Typography;

export const ScrcpyControlView: React.FC = () => {
  // 使用统一的 useAdb() 获取设备与刷新能力
  const { onlineDevices, selectedDevice, selectDevice, refreshDevices } = useAdb();
  const [selected, setSelected] = useState<string | undefined>(undefined);
  const [busy, setBusy] = useState(false);
  const [runningMap, setRunningMap] = useState<Record<string, boolean>>({});
  const [error, setError] = useState<string | null>(null);
  const [sessions, setSessions] = useState<string[]>([]);
  // 参数设置
  const [sessionName, setSessionName] = useState<string>("");
  const [resolution, setResolution] = useState<string>(""); // 例如：1280 或 1280x720
  const [bitrate, setBitrate] = useState<string>("8M");
  const [maxFps, setMaxFps] = useState<number | null>(60);
  const [windowTitle, setWindowTitle] = useState<string>("EmployeeGUI Mirror");
  const [stayAwake, setStayAwake] = useState<boolean>(true);
  const [turnScreenOff, setTurnScreenOff] = useState<boolean>(false);
  const [alwaysOnTop, setAlwaysOnTop] = useState<boolean>(false);
  const [borderless, setBorderless] = useState<boolean>(false);
  const [renderMode, setRenderMode] = useState<'external' | 'embedded'>('external');
  // 默认选择：优先已选设备，否则第一个在线设备
  useEffect(() => {
    if (!selected) {
      if (selectedDevice) setSelected(selectedDevice.id);
      else if (onlineDevices.length > 0) setSelected(onlineDevices[0].id);
    }
  }, [selectedDevice, onlineDevices, selected]);

  const startMirror = async () => {
    if (!selected) return;
    // 简单校验分辨率格式：空 或 数字 或 数字x数字/数字:数字
    const res = (resolution || '').trim();
    if (res) {
      const ok = /^\d+$/.test(res) || /^\d+[x:X:]\d+$/.test(res);
      if (!ok) {
        setError('分辨率格式不合法，请输入形如 1280 或 1280x720');
        return;
      }
    }
    setBusy(true);
    setError(null);
    try {
      const options: any = {
        stayAwake,
        turnScreenOff,
        bitrate,
        windowTitle,
        alwaysOnTop,
        borderless,
      };
      if (resolution) options.resolution = resolution;
      if (maxFps && maxFps > 0) options.maxFps = maxFps;
      if (sessionName) options.sessionName = sessionName;
      const session: string = await invoke('start_device_mirror', { deviceId: selected, options });
      // 记录运行状态（按设备标记即可；如需细分会话可扩展成 Record<device, Record<session, boolean>>）
      setRunningMap((m) => ({ ...m, [selected]: true }));
      refreshSessions();
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

  const refreshSessions = async () => {
    if (!selected) { setSessions([]); return; }
    try {
      const list: string[] = await invoke('list_device_mirror_sessions', { deviceId: selected });
      setSessions(list);
    } catch (e: any) {
      // 忽略列出失败
    }
  };

  // 切换设备/启动/停止后刷新会话列表
  useEffect(() => { refreshSessions(); }, [selected]);

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
          <Space size={8} align="center">
            <Text type="secondary">渲染模式：</Text>
            <Radio.Group value={renderMode} onChange={(e) => setRenderMode(e.target.value)}>
              <Radio.Button value="external">外部窗口</Radio.Button>
              <Radio.Button value="embedded">嵌入式</Radio.Button>
            </Radio.Group>
          </Space>
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
              <Space>
                <Input placeholder="如 8M" value={bitrate} onChange={(e) => setBitrate(e.target.value)} style={{ width: 160 }} />
                <Space size={4}>
                  {["4M","8M","16M"].map(p => (
                    <Button key={p} size="small" onClick={() => setBitrate(p)}>{p}</Button>
                  ))}
                </Space>
              </Space>
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
            <Form.Item label="置顶窗口">
              <Switch checked={alwaysOnTop} onChange={setAlwaysOnTop} />
            </Form.Item>
            <Form.Item label="无边框窗口">
              <Switch checked={borderless} onChange={setBorderless} />
            </Form.Item>
          </Space>
        </Form>
      </Card>

      <Divider />
      <Card size="small" title="已运行会话">
        <Space direction="vertical" style={{ width: '100%' }}>
          <Button size="small" onClick={refreshSessions} disabled={!selected}>刷新会话列表</Button>
          {sessions.length === 0 ? (
            <Text type="secondary">暂无会话</Text>
          ) : (
            <Space wrap>
              {sessions.map((s) => (
                <Popconfirm
                  key={s}
                  title={`停止会话 ${s} ？`}
                  onConfirm={async () => {
                    try {
                      await invoke('stop_device_mirror_session', { deviceId: selected, sessionName: s });
                      refreshSessions();
                    } catch (e) { /* ignore */ }
                  }}
                >
                  <Tag color="geekblue" style={{ cursor: 'pointer' }}>{s}</Tag>
                </Popconfirm>
              ))}
            </Space>
          )}
        </Space>
      </Card>

      {renderMode === 'embedded' && (
        <>
          <Divider />
          <EmbeddedScrcpyPlayer />
        </>
      )}
    </div>
  );
};

export default ScrcpyControlView;
