import React, { useMemo, useState } from 'react';
import { Modal, Form, Input, Space, Button } from 'antd';
import type { ExportOptions } from '../../../utils/exportTypes';

interface Props {
  open: boolean;
  onClose: () => void;
  options: ExportOptions;
  onChange: (next: ExportOptions) => void;
}

const defaultLabelMap: Record<string, string> = {
  deviceId: '设备ID',
  success: '结果',
  message: '消息',
  importedContacts: '导入数',
  totalContacts: '总数',
  industry: '行业',
  idStart: 'ID起',
  idEnd: 'ID止',
};

const candidateKeys = ['deviceId', 'success', 'message', 'importedContacts', 'totalContacts', 'industry', 'idStart', 'idEnd'];

const ExportHeaderMapModal: React.FC<Props> = ({ open, onClose, options, onChange }) => {
  const [form] = Form.useForm();
  const initial = useMemo(() => ({ ...defaultLabelMap, ...(options.customHeaderMap || {}) }), [options.customHeaderMap]);
  const [working, setWorking] = useState(initial);

  return (
    <Modal
      open={open}
      onCancel={onClose}
      title="自定义列名"
      onOk={() => { onChange({ ...options, customHeaderMap: working }); onClose(); }}
      footer={
        <Space>
          <Button onClick={onClose}>取消</Button>
          <Button onClick={() => { setWorking(initial); }}>恢复默认</Button>
          <Button type="primary" onClick={() => { onChange({ ...options, customHeaderMap: working }); onClose(); }}>保存</Button>
        </Space>
      }
    >
      <Form form={form} layout="vertical">
        {candidateKeys.map(k => (
          <Form.Item key={k} label={k}>
            <Input value={working[k] ?? ''} onChange={(e) => setWorking({ ...working, [k]: e.target.value })} placeholder={`显示名（默认：${defaultLabelMap[k] || k}）`} />
          </Form.Item>
        ))}
      </Form>
    </Modal>
  );
};

export default ExportHeaderMapModal;
