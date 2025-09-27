import React, { useState } from 'react';
import { Button, Dropdown, Switch, Space } from 'antd';
import { SettingOutlined } from '@ant-design/icons';
import type { ExportOptions } from '../../../utils/exportTypes';
import ExportHeaderMapModal from './ExportHeaderMapModal';
import ExportColumnOrderModal from './ExportColumnOrderModal';
import ExportColumnVisibilityModal from './ExportColumnVisibilityModal';
import ExportFilenameTemplateModal from './ExportFilenameTemplateModal';

interface Props {
  options: ExportOptions;
  onChange: (next: ExportOptions) => void;
}

const ExportSettingsButton: React.FC<Props> = ({ options, onChange }) => {
  const [openHeaderMap, setOpenHeaderMap] = useState(false);
  const [openColumnOrder, setOpenColumnOrder] = useState(false);
  const [openVisibility, setOpenVisibility] = useState(false);
  const [openFilenameTpl, setOpenFilenameTpl] = useState(false);
  const availableKeys = options.includeAssignmentColumns
    ? ['deviceId','success','message','importedContacts','totalContacts','industry','idStart','idEnd']
    : ['deviceId','success','message','importedContacts','totalContacts'];
  const items = [
    {
      key: 'includeAssignmentColumns',
      label: (
        <Space>
          <span>导出行业与区间列</span>
          <Switch size="small" checked={!!options.includeAssignmentColumns} onChange={(v) => onChange({ ...options, includeAssignmentColumns: v })} />
        </Space>
      ),
    },
    {
      key: 'useChineseHeaders',
      label: (
        <Space>
          <span>使用中文列名</span>
          <Switch size="small" checked={!!options.useChineseHeaders} onChange={(v) => onChange({ ...options, useChineseHeaders: v })} />
        </Space>
      ),
    },
    {
      type: 'divider' as const,
    },
    {
      key: 'filenameTemplate',
      label: <span>文件名模板…</span>,
      onClick: () => setOpenFilenameTpl(true),
    },
    {
      key: 'customHeaderMap',
      label: <span>自定义列名…</span>,
      onClick: () => setOpenHeaderMap(true),
    },
    {
      key: 'visibleColumns',
      label: <span>选择导出列…</span>,
      onClick: () => setOpenVisibility(true),
    },
    {
      key: 'columnOrder',
      label: <span>列顺序…</span>,
      onClick: () => setOpenColumnOrder(true),
    },
  ];

  return (
    <>
      <Dropdown menu={{ items }} placement="topRight" trigger={["click"]}>
        <Button icon={<SettingOutlined />} size="small">导出设置</Button>
      </Dropdown>
      <ExportHeaderMapModal
        open={openHeaderMap}
        onClose={() => setOpenHeaderMap(false)}
        options={options}
        onChange={onChange}
      />
      <ExportColumnOrderModal
        open={openColumnOrder}
        onClose={() => setOpenColumnOrder(false)}
        options={options}
        onChange={onChange}
        availableKeys={availableKeys}
      />
      <ExportColumnVisibilityModal
        open={openVisibility}
        onClose={() => setOpenVisibility(false)}
        options={options}
        onChange={onChange}
        availableKeys={availableKeys}
      />
      <ExportFilenameTemplateModal
        open={openFilenameTpl}
        onClose={() => setOpenFilenameTpl(false)}
        options={options}
        onChange={onChange}
      />
    </>
  );
};

export default ExportSettingsButton;
