import React, { useCallback, useMemo, useState } from 'react';
import { Card, Steps, Space, Button, Alert, Divider, Typography } from 'antd';
import { SafetyOutlined, UsbOutlined, ThunderboltOutlined } from '@ant-design/icons';
import { useAdb } from '../application/hooks/useAdb';
import { PhoneGuidance } from './AdbAuthorizationWizard/PhoneGuidance';
import { PcFixes } from './AdbAuthorizationWizard/PcFixes';
import { WirelessPairing } from './AdbAuthorizationWizard/WirelessPairing';
import { DeviceStatusPanel } from './AdbAuthorizationWizard/DeviceStatusPanel';
import { ActionLogPanel } from './AdbAuthorizationWizard/ActionLogPanel';

const { Paragraph, Text } = Typography;

// ADB 授权向导（模块化）
const AdbAuthorizationWizard: React.FC = () => {
  const { isLoading, startAdbServer, restartAdbServer, clearAdbKeys, pairWireless, wirelessConnect, refreshDevices, devices } = useAdb();

  const [logs, setLogs] = useState<string[]>([]);
  const addLog = useCallback((msg: string) => setLogs((prev) => [...prev, msg]), []);
  const clearLog = useCallback(() => setLogs([]), []);

  const oneClickRecover = useCallback(async () => {
    addLog('🧹 清理本机 ADB 密钥...');
    await clearAdbKeys();
    addLog('🔁 重启 ADB 服务...');
    await restartAdbServer();
    addLog('🔄 刷新设备列表...');
    await refreshDevices();
    addLog('✅ 一键修复完成');
  }, [addLog, clearAdbKeys, restartAdbServer, refreshDevices]);

  const steps = useMemo(() => ([
    { title: '手机端开启开发者选项', description: <PhoneGuidance /> },
    { title: '电脑端一键修复（可选）', description: (
      <PcFixes
        isBusy={isLoading}
        onRestartAdb={async () => { addLog('🔁 重启 ADB 服务'); await restartAdbServer(); addLog('✅ 已重启'); }}
        onClearKeys={async () => { addLog('🧹 清理本机 ADB 密钥'); await clearAdbKeys(); addLog('✅ 已清理'); }}
        onRefreshDevices={async () => { addLog('🔄 刷新设备'); await refreshDevices(); addLog('✅ 刷新完成'); }}
        addLog={addLog}
      />
    ) },
    { title: '无线调试（可选，Android 11+）', description: (
      <WirelessPairing
        onPair={async (hostPort, code) => { addLog(`📡 配对 ${hostPort} ...`); const out = await pairWireless(hostPort, code); addLog(out.trim()); return out; }}
        onConnect={async (ip, port) => { addLog(`🔗 连接 ${ip}:${port} ...`); await wirelessConnect(ip, port); await refreshDevices(); addLog('✅ 无线连接完成'); }}
        addLog={addLog}
      />
    ) },
  ]), [PcFixes, WirelessPairing, isLoading, addLog, restartAdbServer, clearAdbKeys, refreshDevices, pairWireless, wirelessConnect]);

  return (
    <Card title={<Space><SafetyOutlined /><span>ADB 授权向导</span></Space>}>
      <Space direction="vertical" style={{ width: '100%' }}>
        <Alert showIcon type="info" message="目的" description="帮助不会使用命令行的用户，完成 USB 调试授权恢复与无线调试配对。" />

        <Space>
          <Button type="primary" icon={<ThunderboltOutlined />} loading={isLoading} onClick={oneClickRecover}>一键全链路修复</Button>
          <Text type="secondary">顺序：清理本机密钥 → 重启 ADB → 刷新设备</Text>
        </Space>

        <Steps direction="vertical" items={steps.map(s => ({ title: s.title, description: s.description }))} />

        <Divider />

        <Card size="small" title={<Space><UsbOutlined />已检测设备</Space>}>
          <DeviceStatusPanel devices={devices as any} isLoading={isLoading} onRefresh={refreshDevices} />
          <Space style={{ marginTop: 12 }}>
            <Button onClick={startAdbServer}>启动 ADB</Button>
            <Button onClick={restartAdbServer} loading={isLoading}>重启 ADB</Button>
            <Button onClick={refreshDevices}>刷新设备</Button>
          </Space>
        </Card>

        <ActionLogPanel logs={logs} onClear={clearLog} />
      </Space>
    </Card>
  );
};

export default AdbAuthorizationWizard;
