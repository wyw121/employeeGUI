import React, { useState, useMemo } from 'react';
import { Button, Space, message, Typography, Popconfirm, Badge } from 'antd';
import { 
  InboxOutlined, 
  CheckCircleOutlined, 
  CloseOutlined,
  ReloadOutlined 
} from '@ant-design/icons';
import { ContactNumberDto, markContactNumbersAsNotImported } from '../../../services/contactNumberService';

const { Text } = Typography;

interface BulkActionsBarProps {
  selectedNumbers: ContactNumberDto[];
  onClearSelection: () => void;
  onArchiveComplete: () => void | Promise<void>;
  loading?: boolean;
}

/**
 * 批量操作栏组件
 * 当用户选择号码时显示，提供批量归档等操作
 */
export const BulkActionsBar: React.FC<BulkActionsBarProps> = ({
  selectedNumbers,
  onClearSelection,
  onArchiveComplete,
  loading = false
}) => {
  const [archiving, setArchiving] = useState(false);

  // 统计选中号码的状态分布
  const statistics = useMemo(() => {
    const stats = {
      total: selectedNumbers.length,
      imported: 0,
      notImported: 0,
      vcfGenerated: 0,
      archiveable: 0 // 可归档的数量（已导入或已生成VCF的）
    };

    selectedNumbers.forEach(number => {
      const status = number.status;
      if (status === 'imported') {
        stats.imported++;
        stats.archiveable++;
      } else if (status === 'not_imported') {
        stats.notImported++;
      } else if (status === 'vcf_generated') {
        stats.vcfGenerated++;
        stats.archiveable++;
      }
    });

    return stats;
  }, [selectedNumbers]);

  const handleArchive = async () => {
    if (statistics.archiveable === 0) {
      message.warning('所选号码中没有可归档的项目');
      return;
    }

    try {
      setArchiving(true);
      
      // 提取要归档的号码ID（只处理已导入或已生成VCF的）
      const archiveableNumbers = selectedNumbers.filter(n => 
        n.status === 'imported' || n.status === 'vcf_generated'
      );
      const numberIds = archiveableNumbers.map(number => number.id);
      
      // 批量重置号码状态
      await markContactNumbersAsNotImported(numberIds);
      
      message.success(`成功归档 ${numberIds.length} 个号码`);
      await onArchiveComplete();
      onClearSelection();
    } catch (error) {
      console.error('批量归档失败:', error);
      message.error('归档操作失败，请重试');
    } finally {
      setArchiving(false);
    }
  };

  if (selectedNumbers.length === 0) {
    return null;
  }

  return (
    <div style={{
      padding: '12px 16px',
      background: 'linear-gradient(90deg, #f0f9ff 0%, #e0f2fe 100%)',
      border: '1px solid #0ea5e9',
      borderRadius: '8px',
      margin: '8px 0'
    }}>
      <div style={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: '8px'
      }}>
        {/* 选择统计信息 */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
          <Badge count={statistics.total} showZero>
            <CheckCircleOutlined style={{ fontSize: '20px', color: '#0ea5e9' }} />
          </Badge>
          <Text strong style={{ color: '#0c4a6e' }}>
            已选择 {statistics.total} 个号码
          </Text>
          
          {statistics.total > 0 && (
            <Text type="secondary" style={{ fontSize: '12px' }}>
              已导入: {statistics.imported} | 
              待导入: {statistics.notImported} | 
              已生成VCF: {statistics.vcfGenerated}
            </Text>
          )}
        </div>

        {/* 操作按钮 */}
        <Space>
          <Button
            size="small"
            icon={<CloseOutlined />}
            onClick={onClearSelection}
            disabled={loading || archiving}
          >
            取消选择
          </Button>
          
          <Popconfirm
            title="归档确认"
            description={`将 ${statistics.archiveable} 个号码重置为未导入状态？`}
            onConfirm={handleArchive}
            disabled={statistics.archiveable === 0}
            okText="确认"
            cancelText="取消"
          >
            <Button
              type="primary"
              size="small"
              icon={<InboxOutlined />}
              loading={archiving}
              disabled={statistics.archiveable === 0 || loading}
            >
              批量归档 ({statistics.archiveable})
            </Button>
          </Popconfirm>
        </Space>
      </div>
    </div>
  );
};