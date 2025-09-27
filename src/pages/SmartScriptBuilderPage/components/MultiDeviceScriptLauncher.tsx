import React, { useMemo, useState } from 'react';
import { Button, Modal, Checkbox, Space, Typography, Tag, message } from 'antd';
import { ClusterOutlined } from '@ant-design/icons';
import { useAdb } from '../../../application/hooks/useAdb';
import type { ExtendedSmartScriptStep } from '../../../types/loopScript';
import type { SmartExecutionResult } from '../../../types/execution';

interface Props {
  steps: ExtendedSmartScriptStep[];
  executorConfig: Partial<{
    continue_on_error: boolean;
    auto_verification_enabled: boolean;
    smart_recovery_enabled: boolean;
    detailed_logging: boolean;
  }>;
}

type ResultMap = Record<string, SmartExecutionResult>;

// 结果预览（简版）
const ResultsSummary: React.FC<{ results: ResultMap | null }> = ({ results }) => {
  if (!results) return null;
  const entries = Object.entries(results);
  const total = entries.length;
  const success = entries.filter(([_, r]) => r.success).length;
  const failed = total - success;
  return (
    <Space direction="vertical" style={{ width: '100%' }}>
      <Space>
        <Tag color="blue">设备数 {total}</Tag>
        <Tag color="green">成功 {success}</Tag>
        <Tag color="red">失败 {failed}</Tag>
      </Space>
      <div style={{ maxHeight: 260, overflow: 'auto', border: '1px solid #eee', padding: 8 }}>
        {entries.map(([id, r]) => (
          <div key={id} style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0' }}>
            <span>{id}</span>
            <span>{r.success ? <Tag color="green">成功</Tag> : <Tag color="red">失败</Tag>}</span>
          </div>
        ))}
      </div>
    </Space>
  );
};

/**
 * 多设备整脚本执行启动器
 * - 模块化独立组件，便于在控制面板或页面其他位置复用
 */
const MultiDeviceScriptLauncher: React.FC<Props> = ({ steps, executorConfig }) => {
  const { devices, executeSmartScriptOnDevices } = useAdb();
  const [open, setOpen] = useState(false);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [running, setRunning] = useState(false);
  const [results, setResults] = useState<ResultMap | null>(null);

  const online = useMemo(() => devices.filter((d: any) => d.status === 'online'), [devices]);

  const toggle = (id: string) => {
    setSelectedIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  };

  const handleRun = async () => {
    if (steps.length === 0) {
      message.warning('没有步骤可执行');
      return;
    }
    if (selectedIds.length === 0) {
      message.warning('请选择至少一台在线设备');
      return;
    }
    setRunning(true);
    setResults(null);
    try {
      const res = await executeSmartScriptOnDevices(selectedIds, steps, executorConfig);
      setResults(res);
    } catch (e) {
      message.error(`执行失败: ${e}`);
    } finally {
      setRunning(false);
    }
  };

  return (
    <>
      <Button icon={<ClusterOutlined />} onClick={() => setOpen(true)}>
        多设备执行脚本
      </Button>
      <Modal
        title={<Space><ClusterOutlined /> 多设备执行脚本</Space>}
        open={open}
        onCancel={() => setOpen(false)}
        width={680}
        footer={[
          <Button key="cancel" onClick={() => setOpen(false)} disabled={running}>关闭</Button>,
          <Button key="run" type="primary" onClick={handleRun} loading={running}>
            开始执行
          </Button>,
        ]}
      >
        <Space direction="vertical" style={{ width: '100%' }} size="large">
          <div>
            <Typography.Text strong>选择在线设备（{online.length}）</Typography.Text>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 8, marginTop: 8 }}>
              {online.map((d: any) => (
                <Checkbox
                  key={d.id}
                  checked={selectedIds.includes(d.id)}
                  onChange={() => toggle(d.id)}
                >
                  {d.name || d.id}
                </Checkbox>
              ))}
              {online.length === 0 && (
                <Typography.Text type="secondary">暂无在线设备</Typography.Text>
              )}
            </div>
          </div>

          <ResultsSummary results={results} />
        </Space>
      </Modal>
    </>
  );
};

export default MultiDeviceScriptLauncher;
