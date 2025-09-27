import React, { useMemo, useState } from 'react';
import { Modal, Input, Space, Button, Typography, Alert } from 'antd';
import type { ExportOptions } from '../../../utils/exportTypes';
import { buildCsvNameFromTemplate } from '../../../utils/filename';

interface Props {
  open: boolean;
  onClose: () => void;
  options: ExportOptions;
  onChange: (next: ExportOptions) => void;
}

const DEFAULT_TEMPLATE = 'batch-result-{view}-{yyyyMMdd_HHmmss}';

const ExportFilenameTemplateModal: React.FC<Props> = ({ open, onClose, options, onChange }) => {
  const [tpl, setTpl] = useState<string>(options.filenameTemplate ?? DEFAULT_TEMPLATE);
  const example = useMemo(() => buildCsvNameFromTemplate(tpl, { prefix: 'batch-result', view: 'all' }), [tpl]);

  return (
    <Modal
      open={open}
      onCancel={onClose}
      title="文件名模板"
      footer={
        <Space>
          <Button onClick={onClose}>取消</Button>
          <Button onClick={() => setTpl(DEFAULT_TEMPLATE)}>恢复默认</Button>
          <Button type="primary" onClick={() => { onChange({ ...options, filenameTemplate: tpl }); onClose(); }}>保存</Button>
        </Space>
      }
    >
      <Space direction="vertical" style={{ width: '100%' }}>
        <Alert type="info" showIcon message="支持占位：{prefix} {view} {timestamp} {yyyyMMdd_HHmmss} {yyyyMMdd-HHmmss}" />
        <Input value={tpl} onChange={(e) => setTpl(e.target.value)} />
        <Typography.Text type="secondary">示例：{example}</Typography.Text>
      </Space>
    </Modal>
  );
};

export default ExportFilenameTemplateModal;
