import React, { useEffect, useMemo, useState } from 'react';
import { Button, Card, Select, Space, Tag, Typography, Alert, Divider, Tooltip, Input, InputNumber, Switch, Form, Popconfirm, Radio } from 'antd';
import { scrcpyService, ScrcpyCapabilities } from '../../../../application/services/ScrcpyApplicationService';
import { useAdb } from '../../../../application/hooks/useAdb';
import EmbeddedScrcpyPlayer from './EmbeddedScrcpyPlayer';
import CapabilityChips from './CapabilityChips';
import { useScrcpySessions } from '../../../../application/hooks/useScrcpySessions';
import { usePresets } from './presets/usePresets';

const { Text, Title, Paragraph } = Typography;

export const ScrcpyControlView: React.FC = () => {
  // 使用统一的 useAdb() 获取设备与刷新能力
  const { onlineDevices, selectedDevice, selectDevice, refreshDevices } = useAdb();
  const [selected, setSelected] = useState<string | undefined>(undefined);
  const [busy, setBusy] = useState(false);
  const [runningMap, setRunningMap] = useState<Record<string, boolean>>({});
  const [error, setError] = useState<string | null>(null);
  // 会话订阅（事件驱动）
  const { sessions, lastEvent, refresh } = useScrcpySessions(selected);
  // 参数设置
  const [sessionName, setSessionName] = useState<string>(localStorage.getItem('scrcpy.sessionName') || "");
  const [resolution, setResolution] = useState<string>(localStorage.getItem('scrcpy.resolution') || ""); // 例如：1280 或 1280x720
  const [bitrate, setBitrate] = useState<string>(localStorage.getItem('scrcpy.bitrate') || "8M");
  const [maxFps, setMaxFps] = useState<number | null>(() => {
    const v = localStorage.getItem('scrcpy.maxFps');
    return v ? Number(v) : 60;
  });
  const [windowTitle, setWindowTitle] = useState<string>(localStorage.getItem('scrcpy.windowTitle') || "EmployeeGUI Mirror");
  const [stayAwake, setStayAwake] = useState<boolean>(localStorage.getItem('scrcpy.stayAwake') !== 'false');
  const [turnScreenOff, setTurnScreenOff] = useState<boolean>(localStorage.getItem('scrcpy.turnScreenOff') === 'true');
  const [alwaysOnTop, setAlwaysOnTop] = useState<boolean>(localStorage.getItem('scrcpy.alwaysOnTop') === 'true');
  const [borderless, setBorderless] = useState<boolean>(localStorage.getItem('scrcpy.borderless') === 'true');
  const [renderMode, setRenderMode] = useState<'external' | 'embedded'>((localStorage.getItem('scrcpy.renderMode') as any) || 'external');
  const [caps, setCaps] = useState<ScrcpyCapabilities | null>(null);
  const { presets, savePreset, removePreset } = usePresets();
  // 默认选择：优先已选设备，否则第一个在线设备
  useEffect(() => {
    if (!selected) {
      if (selectedDevice) setSelected(selectedDevice.id);
      else if (onlineDevices.length > 0) setSelected(onlineDevices[0].id);
    }
  }, [selectedDevice, onlineDevices, selected]);

  // 持久化参数
  useEffect(() => { localStorage.setItem('scrcpy.sessionName', sessionName); }, [sessionName]);
  useEffect(() => { localStorage.setItem('scrcpy.resolution', resolution); }, [resolution]);
  useEffect(() => { if (maxFps != null) localStorage.setItem('scrcpy.maxFps', String(maxFps)); }, [maxFps]);
  useEffect(() => { localStorage.setItem('scrcpy.bitrate', bitrate); }, [bitrate]);
  useEffect(() => { localStorage.setItem('scrcpy.windowTitle', windowTitle); }, [windowTitle]);
  useEffect(() => { localStorage.setItem('scrcpy.stayAwake', String(stayAwake)); }, [stayAwake]);
  useEffect(() => { localStorage.setItem('scrcpy.turnScreenOff', String(turnScreenOff)); }, [turnScreenOff]);
  useEffect(() => { localStorage.setItem('scrcpy.alwaysOnTop', String(alwaysOnTop)); }, [alwaysOnTop]);
  useEffect(() => { localStorage.setItem('scrcpy.borderless', String(borderless)); }, [borderless]);
  useEffect(() => { localStorage.setItem('scrcpy.renderMode', renderMode); }, [renderMode]);

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
        // 嵌入式渲染模式下，不传仅对外部窗口有效的参数
        ...(renderMode === 'external' ? { alwaysOnTop, borderless } : {}),
      };
      if (resolution) options.resolution = resolution;
      if (maxFps && maxFps > 0) options.maxFps = maxFps;
      if (sessionName) options.sessionName = sessionName;
  const session: string = await scrcpyService.start(selected, options);
      // 记录运行状态（按设备标记即可；如需细分会话可扩展成 Record<device, Record<session, boolean>>）
      setRunningMap((m) => ({ ...m, [selected]: true }));
      // 事件会带动刷新；此处兜底主动拉一次
      refresh();
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
        await scrcpyService.stopSession(selected, sessionName);
      } else {
        await scrcpyService.stopAll(selected);
      }
      setRunningMap((m) => ({ ...m, [selected]: false }));
      refresh();
    } catch (e: any) {
      setError(e?.message ?? String(e));
    } finally {
      setBusy(false);
    }
  };

  const checkEnv = async () => {
    try {
      const version = await scrcpyService.checkAvailable();
      setError(null);
      // 使用浏览器原生提示或通知库，此处简化：
      console.info('scrcpy version:', version);
      // 同步探测能力
      try {
        const c = await scrcpyService.getCapabilities();
        setCaps(c);
      } catch {}
    } catch (e: any) {
      setError(e?.message ?? String(e));
    }
  };

  useEffect(() => {
    // 初次进入尝试探测能力（静默失败）
    (async () => {
      try { setCaps(await scrcpyService.getCapabilities()); } catch {}
    })();
  }, []);

  // 事件提示信息（最近一次）
  const lastEventAlert = useMemo(() => {
    if (!lastEvent) return null;
    if (lastEvent.error) {
      return (
        <Alert
          className="mb-3"
          type="warning"
          showIcon
          message={`会话异常（${lastEvent.deviceId}）`}
          description={lastEvent.error}
        />
      );
    }
    if (lastEvent.sessionName) {
      // 无法区分 started/stopped 的详细内容时，仅提示发生了状态变更
      return (
        <Alert
          className="mb-3"
          type="info"
          showIcon
          message={`会话事件：${lastEvent.sessionName}`}
          description={`设备 ${lastEvent.deviceId} 的会话状态已更新。`}
        />
      );
    }
    return null;
  }, [lastEvent]);

  return (
    <div className="p-4">
      <Title level={4}>设备镜像控制（Scrcpy）</Title>
      <Paragraph type="secondary">
        最小可用方案：通过 Tauri 后端启动系统 scrcpy 进程，提供鼠标键盘操控能力。后续可切换为嵌入式解码（ya-webadb / WebCodecs）。
      </Paragraph>

      {error && (
        <Alert type="error" showIcon message="操作失败" description={error} className="mb-3" />
      )}
      {lastEventAlert}

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
          {/* 预设应用与管理 */}
          <Select
            style={{ minWidth: 240 }}
            placeholder="选择参数预设"
            options={presets.map(p => ({ value: p.id, label: p.name }))}
            onChange={(id) => {
              const p = presets.find(x => x.id === id);
              if (!p) return;
              const o = p.options || {} as any;
              if (typeof o.resolution !== 'undefined') setResolution(String(o.resolution ?? ''));
              if (typeof o.bitrate !== 'undefined') setBitrate(String(o.bitrate ?? ''));
              if (typeof o.maxFps !== 'undefined') setMaxFps(Number(o.maxFps));
              if (typeof o.windowTitle !== 'undefined') setWindowTitle(String(o.windowTitle ?? 'EmployeeGUI Mirror'));
              if (typeof o.stayAwake !== 'undefined') setStayAwake(Boolean(o.stayAwake));
              if (typeof o.turnScreenOff !== 'undefined') setTurnScreenOff(Boolean(o.turnScreenOff));
              if (typeof o.alwaysOnTop !== 'undefined') setAlwaysOnTop(Boolean(o.alwaysOnTop));
              if (typeof o.borderless !== 'undefined') setBorderless(Boolean(o.borderless));
            }}
            dropdownRender={(menu) => (
              <div>
                {menu}
                <Divider style={{ margin: '4px 0' }} />
                <div className="px-2 pb-2">
                  <Button
                    size="small"
                    onClick={() => {
                      const name = prompt('保存当前参数为预设，输入名称：', '自定义预设');
                      if (!name) return;
                      const opts: any = {
                        resolution: resolution || undefined,
                        bitrate: bitrate || undefined,
                        maxFps: maxFps || undefined,
                        windowTitle,
                        stayAwake,
                        turnScreenOff,
                        alwaysOnTop,
                        borderless,
                      };
                      savePreset(name, opts);
                    }}
                  >保存为预设</Button>
                </div>
              </div>
            )}
          />
          <Button onClick={checkEnv}>环境检查</Button>
          <Button onClick={() => {
            setSessionName("");
            setResolution("");
            setBitrate("8M");
            setMaxFps(60);
            setWindowTitle("EmployeeGUI Mirror");
            setStayAwake(true);
            setTurnScreenOff(false);
            setAlwaysOnTop(false);
            setBorderless(false);
            setRenderMode('external');
          }}>重置默认</Button>
          {selected && runningMap[selected] && <Tag color="green">运行中</Tag>}
        </Space>
        <div className="mt-2">
          <CapabilityChips caps={caps} />
        </div>
      </Card>

      <Divider />
      <Card size="small" title="镜像参数设置" className="mb-3">
        <Form layout="vertical">
          <Space size="large" wrap>
            <Form.Item label="会话名称">
              <Input placeholder="默认 default" value={sessionName} onChange={(e) => setSessionName(e.target.value)} style={{ width: 220 }} />
            </Form.Item>
            <Form.Item label="分辨率/最大边像素">
              <Tooltip title={caps && !caps.maxSize ? '当前 scrcpy 不支持 --max-size' : ''}>
                <Input placeholder="如 1280 或 1280x720" value={resolution} onChange={(e) => setResolution(e.target.value)} style={{ width: 220 }} disabled={!!caps && !caps.maxSize} />
              </Tooltip>
            </Form.Item>
            <Form.Item label="码率">
              <Space>
                <Tooltip title={caps && !caps.bitRate ? '当前 scrcpy 不支持 --bit-rate' : ''}>
                  <Input placeholder="如 8M" value={bitrate} onChange={(e) => setBitrate(e.target.value)} style={{ width: 160 }} disabled={!!caps && !caps.bitRate} />
                </Tooltip>
                <Space size={4}>
                  {["4M","8M","16M"].map(p => (
                    <Button key={p} size="small" onClick={() => setBitrate(p)} disabled={!!caps && !caps.bitRate}>{p}</Button>
                  ))}
                </Space>
              </Space>
            </Form.Item>
            <Form.Item label="最大 FPS">
              <Tooltip title={caps && !caps.maxFps ? '当前 scrcpy 不支持 --max-fps' : ''}>
                <InputNumber min={1} max={240} value={maxFps ?? undefined} onChange={(v) => setMaxFps((v ?? null) as any)} style={{ width: 120 }} disabled={!!caps && !caps.maxFps} />
              </Tooltip>
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
              <Tooltip title={
                renderMode === 'embedded' ? '嵌入式模式下不生效（仅外部窗口）' : (caps && !caps.alwaysOnTop ? '当前 scrcpy 不支持 --always-on-top' : '')
              }>
                <Switch
                  checked={alwaysOnTop}
                  onChange={setAlwaysOnTop}
                  disabled={(!!caps && !caps.alwaysOnTop) || renderMode === 'embedded'}
                />
              </Tooltip>
            </Form.Item>
            <Form.Item label="无边框窗口">
              <Tooltip title={
                renderMode === 'embedded' ? '嵌入式模式下不生效（仅外部窗口）' : (caps && !caps.windowBorderless ? '当前 scrcpy 不支持 --window-borderless' : '')
              }>
                <Switch
                  checked={borderless}
                  onChange={setBorderless}
                  disabled={(!!caps && !caps.windowBorderless) || renderMode === 'embedded'}
                />
              </Tooltip>
            </Form.Item>
          </Space>
        </Form>
      </Card>

      <Divider />
      <Card size="small" title="已运行会话">
        <Space direction="vertical" style={{ width: '100%' }}>
          <Space>
            <Button size="small" onClick={refresh} disabled={!selected}>刷新会话列表</Button>
            {/* 允许删除自定义预设（不动内置） */}
            <Select
              size="small"
              style={{ minWidth: 220 }}
              placeholder="删除自定义预设"
              options={presets.filter(p => !p.builtIn).map(p => ({ value: p.id, label: p.name }))}
              onChange={(id) => { removePreset(id); }}
              allowClear
            />
          </Space>
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
                      await scrcpyService.stopSession(selected!, s);
                      refresh();
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
