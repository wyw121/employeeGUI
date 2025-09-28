import React, { useState } from 'react';
import { Button, Space, Tooltip } from 'antd';
import { ExperimentOutlined, ImportOutlined, InfoCircleOutlined } from '@ant-design/icons';
import { ImportStrategyDialog, ImportResult } from '../../import-strategies';

interface VcfImportButtonProps {
  vcfFilePath: string;
  disabled?: boolean;
  onImportSuccess?: (result: ImportResult) => void;
  onImportStart?: () => void;
  onImportEnd?: () => void;
}

/**
 * 增强的 VCF 导入按钮
 * 集成了导入策略选择功能
 */
export const VcfImportButton: React.FC<VcfImportButtonProps> = ({
  vcfFilePath,
  disabled = false,
  onImportSuccess,
  onImportStart,
  onImportEnd
}) => {
  const [strategyDialogVisible, setStrategyDialogVisible] = useState(false);

  const handleImportClick = () => {
    setStrategyDialogVisible(true);
    onImportStart?.();
  };

  const handleDialogClose = () => {
    setStrategyDialogVisible(false);
    onImportEnd?.();
  };

  const handleImportSuccess = (result: ImportResult) => {
    onImportSuccess?.(result);
    // 对话框会在用户点击"完成"后关闭
  };

  return (
    <>
      <Space>
        <Button
          type="primary"
          icon={<ImportOutlined />}
          onClick={handleImportClick}
          disabled={disabled}
          size="large"
        >
          导入到手机
        </Button>
        
        <Tooltip title="支持多种导入方式，包括 vCard 2.1/3.0/4.0 和不同的触发策略">
          <Button
            icon={<ExperimentOutlined />}
            onClick={handleImportClick}
            disabled={disabled}
            type="dashed"
          >
            选择导入策略
          </Button>
        </Tooltip>
        
        <Tooltip title="新的导入系统支持Honor/Xiaomi/Samsung等多厂商设备，包含A/B/C三种触发方式">
          <InfoCircleOutlined style={{ color: '#1890ff' }} />
        </Tooltip>
      </Space>

      <ImportStrategyDialog
        visible={strategyDialogVisible}
        vcfFilePath={vcfFilePath}
        onClose={handleDialogClose}
        onSuccess={handleImportSuccess}
      />
    </>
  );
};

// 使用示例注释
/*
使用示例:

// 在 ContactImportPage 或其他联系人导入页面中
import { VcfImportButton } from './VcfImportButton';

function ContactImportPage() {
  const [vcfFile, setVcfFile] = useState<string>('');
  
  const handleImportSuccess = (result: ImportResult) => {
    console.log('导入成功:', result);
    // 更新UI状态，显示成功消息等
  };

  return (
    <div>
      {vcfFile && (
        <VcfImportButton
          vcfFilePath={vcfFile}
          onImportSuccess={handleImportSuccess}
          onImportStart={() => console.log('开始导入')}
          onImportEnd={() => console.log('导入结束')}
        />
      )}
    </div>
  );
}

// 或者在现有的设备卡片中添加策略选择按钮
import { ImportStrategyDialog } from '../import-strategies';

function DeviceCard({ device, vcfFile }) {
  const [showStrategyDialog, setShowStrategyDialog] = useState(false);
  
  return (
    <Card>
      <Button onClick={() => setShowStrategyDialog(true)}>
        选择导入策略
      </Button>
      
      <ImportStrategyDialog
        visible={showStrategyDialog}
        vcfFilePath={vcfFile}
        onClose={() => setShowStrategyDialog(false)}
      />
    </Card>
  );
}
*/