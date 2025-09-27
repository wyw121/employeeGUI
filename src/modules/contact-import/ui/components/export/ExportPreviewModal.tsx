import React, { useMemo } from 'react';
import { Modal, Table, Space, Button, Typography, message } from 'antd';
import type { BatchExecuteResult } from '../../services/batchExecutor';
import type { ExportOptions, AssignmentSnapshot } from '../../../utils/exportTypes';
import { buildRows, buildKeysAndLabels } from '../../services/exportService';
import { toCsvWithLabels, downloadCsvWithBom } from '../../../utils/csv';
import { buildCsvNameFromTemplate } from '../../../utils/filename';

interface Props {
  open: boolean;
  onClose: () => void;
  viewLabel?: string; // 用于导出文件名，如 all/success/fail
  viewData: NonNullable<BatchExecuteResult['deviceResults']>;
  assignmentSnapshot?: AssignmentSnapshot;
  options: ExportOptions;
}

const MAX_PREVIEW_ROWS = 20;

const ExportPreviewModal: React.FC<Props> = ({ open, onClose, viewLabel = 'view', viewData, assignmentSnapshot, options }) => {
  const rows = useMemo(() => buildRows(viewData, assignmentSnapshot, options), [viewData, assignmentSnapshot, options]);
  const { keys, labels } = useMemo(() => buildKeysAndLabels(assignmentSnapshot, options), [assignmentSnapshot, options]);

  const previewRows = rows.slice(0, MAX_PREVIEW_ROWS);
  const columns = keys.map((k, idx) => ({
    title: labels[idx] ?? k,
    dataIndex: k,
    key: k,
    render: (v: any) => v ?? '',
  }));

  const handleCopyCsv = async () => {
    const csv = toCsvWithLabels(rows, keys, labels);
    try {
      await navigator.clipboard.writeText(csv);
      message.success('CSV 已复制到剪贴板');
    } catch (e) {
      message.error('复制失败，可能未授权访问剪贴板');
    }
  };

  const handleDownload = () => {
    const csv = toCsvWithLabels(rows, keys, labels);
    const filename = buildCsvNameFromTemplate(options?.filenameTemplate, { prefix: 'batch-result', view: viewLabel });
    downloadCsvWithBom(filename, csv);
  };

  return (
    <Modal
      open={open}
      onCancel={onClose}
      width={960}
      title={<Space style={{ justifyContent: 'space-between', width: '100%' }}><span>导出预览</span><Typography.Text type="secondary">共 {rows.length} 行，显示前 {previewRows.length} 行</Typography.Text></Space>}
      footer={<Space><Button onClick={onClose}>关闭</Button><Button onClick={handleCopyCsv}>复制CSV</Button><Button type="primary" onClick={handleDownload}>下载CSV</Button></Space>}
    >
      <Table
        size="small"
        rowKey={(r) => keys.map(k => (r as any)[k]).join('|')}
        columns={columns as any}
        dataSource={previewRows}
        pagination={false}
        scroll={{ x: true, y: 380 }}
      />
    </Modal>
  );
};

export default ExportPreviewModal;
