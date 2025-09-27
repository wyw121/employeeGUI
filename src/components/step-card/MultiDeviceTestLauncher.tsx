import React, { useMemo, useState } from 'react';
import { Button, Modal, Checkbox, Space, Typography, message } from 'antd';
import { ClusterOutlined } from '@ant-design/icons';
import { useAdb } from '../../application/hooks/useAdb';
import type { SmartScriptStep } from '../../types/smartScript';
import { runSingleStepOnDevices } from '../../hooks/singleStepTest/multiDevice';
import { useSingleStepTest } from '../../hooks/useSingleStepTest';
import { MultiDeviceResultPanel } from './MultiDeviceResultPanel';

const { Text } = Typography;

interface MultiDeviceTestLauncherProps {
  step: SmartScriptStep;
}

export const MultiDeviceTestLauncher: React.FC<MultiDeviceTestLauncherProps> = ({ step }) => {
  const { devices } = useAdb();
  const { executeSingleStep } = useSingleStepTest();
  const [open, setOpen] = useState(false);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [running, setRunning] = useState(false);
  const [result, setResult] = useState<null | { results: any; summary: any }>(null);

  const options = useMemo(() => devices.map(d => ({ label: d.name || d.id, value: d.id, online: (d as any).isOnline?.() })), [devices]);
  const deviceNameMap = useMemo(() => Object.fromEntries(devices.map(d => [d.id, d.name || d.id])), [devices]);

  const onRun = async () => {
    if (selectedIds.length === 0) {
      message.info('请选择至少一台设备');
      return;
    }
    setRunning(true);
    try {
      const r = await runSingleStepOnDevices(
        step,
        selectedIds,
        async (deviceId) => {
          const res = await executeSingleStep(step, deviceId);
          return res as any;
        },
        { concurrency: 2 }
      );
      setResult(r as any);
    } catch (e) {
      console.error(e);
      message.error('多设备测试失败');
    } finally {
      setRunning(false);
    }
  };

  return (
    <>
      <Button size="small" type="text" icon={<ClusterOutlined />} onClick={(e) => { e.stopPropagation(); setOpen(true); }}>
        多设备
      </Button>
      <Modal
        title={<span>多设备单步测试 - <Text type="secondary">{step.name}</Text></span>}
        open={open}
        onCancel={() => { setOpen(false); setResult(null); }}
        okText={result ? '关闭' : '开始测试'}
        confirmLoading={running}
        onOk={() => {
          if (result) { setOpen(false); setResult(null); } else { onRun(); }
        }}
        width={720}
        className="light-surface"
      >
        {!result ? (
          <div className="light-surface">
            <div className="mb-2">选择需要测试的设备：</div>
            <Checkbox.Group
              options={options.map(o => ({ label: <span style={{ opacity: o.online ? 1 : 0.6 }}>{o.label}</span>, value: o.value }))}
              value={selectedIds}
              onChange={(v) => setSelectedIds(v as string[])}
            />
            <div className="mt-2 text-xs text-gray-500">可多选，默认并发 2</div>
          </div>
        ) : (
          <div className="light-surface">
            <MultiDeviceResultPanel results={result.results} summary={result.summary} deviceNameMap={deviceNameMap} />
          </div>
        )}
      </Modal>
    </>
  );
};

export default MultiDeviceTestLauncher;
