import React from 'react';
import { Space, Button, Tag, Tooltip } from 'antd';
import { QuestionCircleOutlined } from '@ant-design/icons';

export interface SelectedSessionsToolbarProps {
  selectedCount: number;
  pendingOnly?: boolean;
  onTogglePendingOnly?: (next: boolean) => void;
  onSelectAllPendingThisPage?: () => void;
  onReimportSelected?: () => void;
  onDeleteSelected?: () => void;
  actionsDisabled?: boolean;
  deleteLoading?: boolean;
}

const SelectedSessionsToolbar: React.FC<SelectedSessionsToolbarProps> = ({
  selectedCount,
  pendingOnly = false,
  onTogglePendingOnly,
  onSelectAllPendingThisPage,
  onReimportSelected,
  onDeleteSelected,
  actionsDisabled = false,
  deleteLoading = false,
}) => {
  const disableBulkActions = actionsDisabled || selectedCount === 0;

  return (
    <Space
      direction="horizontal"
      size={12}
      style={{
        width: '100%',
        justifyContent: 'space-between',
        alignItems: 'center',
        flexWrap: 'wrap',
      }}
    >
      <Space size={10} align="center">
        <label style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
          <input
            type="checkbox"
            checked={pendingOnly}
            onChange={(e) => onTogglePendingOnly?.(e.target.checked)}
            style={{ verticalAlign: 'middle' }}
          />
          <span style={{ fontSize: 12, color: '#666' }}>只显示未导入</span>
        </label>
        <Tooltip title="批量操作仅对未导入 (pending) 会话有效">
          <QuestionCircleOutlined style={{ color: '#999' }} />
        </Tooltip>
        <Tag color={selectedCount > 0 ? 'blue' : 'default'}>
          已选 {selectedCount} 项
        </Tag>
      </Space>

      <Space size={8} wrap>
        <Button size="small" onClick={onSelectAllPendingThisPage}>
          全选本页未导入
        </Button>
        <Button
          size="small"
          type="primary"
          disabled={disableBulkActions}
          onClick={onReimportSelected}
        >
          重新导入所选
        </Button>
        <Button
          size="small"
          danger
          ghost
          onClick={onDeleteSelected}
          disabled={disableBulkActions}
          loading={deleteLoading}
        >
          删除所选
        </Button>
      </Space>
    </Space>
  );
};

export default SelectedSessionsToolbar;
