import React from 'react';
import { Alert, Button, Card, Progress, Space, Typography } from 'antd';
import { ImportPhase, ImportProgress, ImportResult } from '../../types';

const { Text, Title } = Typography;

interface StepProgressProps {
  isImporting: boolean;
  currentPhase: ImportPhase;
  progress?: ImportProgress;
  result?: ImportResult | null;
  onCancel: () => void;
  onRestart: () => void;
  onClose?: () => void;
}

const phaseText: Record<ImportPhase, string> = {
  [ImportPhase.INITIALIZING]: '正在初始化...',
  [ImportPhase.PARSING]: '正在解析联系人文件...',
  [ImportPhase.VALIDATING]: '正在验证联系人数据...',
  [ImportPhase.DISTRIBUTING]: '正在分配联系人到设备...',
  [ImportPhase.CONVERTING]: '正在转换文件格式...',
  [ImportPhase.IMPORTING]: '正在导入联系人...',
  [ImportPhase.VERIFYING]: '正在验证导入结果...',
  [ImportPhase.COMPLETED]: '导入完成',
};

export const StepProgress: React.FC<StepProgressProps> = ({ isImporting, currentPhase, progress, result, onCancel, onRestart, onClose }) => {
  return (
    <Card title="导入进度">
      <Space direction="vertical" style={{ width: '100%' }}>
        {isImporting && (
          <div>
            <Text strong>{phaseText[currentPhase]}</Text>
            {currentPhase === ImportPhase.IMPORTING && (
              <Alert type="info" message="多品牌智能导入" description="正在自动尝试不同品牌的导入方式，确保最佳兼容性" showIcon style={{ marginTop: 8, marginBottom: 8 }} />
            )}
            {progress && (
              <div style={{ marginTop: 8 }}>
                <Progress percent={progress.percentage} status={progress.status === 'failed' ? 'exception' : 'active'} />
                <div style={{ marginTop: 8 }}>
                  <Text>已处理: {progress.processedContacts} / {progress.totalContacts}</Text>
                  {progress.currentDevice && <Text style={{ marginLeft: 16 }}>当前设备: {progress.currentDevice}</Text>}
                  {currentPhase === ImportPhase.IMPORTING && (
                    <Text style={{ marginLeft: 16, color: '#1890ff' }}>🔄 智能品牌适配中...</Text>
                  )}
                </div>
              </div>
            )}
            <Button danger onClick={onCancel} style={{ marginTop: 16 }}>取消导入</Button>
          </div>
        )}

        {result && (
          <div>
            <Alert type={result.success ? 'success' : 'error'} message={result.success ? '导入完成' : '导入失败'} description={result.message} style={{ marginBottom: 16 }} />
            <div>
              <Title level={4}>导入统计</Title>
              <ul>
                <li>总计联系人: {result.totalContacts}</li>
                <li>成功导入: {result.importedContacts} ({Math.round((result.importedContacts / result.totalContacts) * 100)}%)</li>
                <li>导入失败: {result.failedContacts} ({Math.round((result.failedContacts / result.totalContacts) * 100)}%)</li>
                <li>跳过联系人: {result.skippedContacts} ({Math.round((result.skippedContacts / result.totalContacts) * 100)}%)</li>
                <li>重复联系人: {result.duplicateContacts} ({Math.round((result.duplicateContacts / result.totalContacts) * 100)}%)</li>
                <li>总耗时: {Math.round(result.duration / 1000)}秒</li>
              </ul>
            </div>
            <Space>
              <Button type="primary" onClick={onRestart}>重新导入</Button>
              {onClose && <Button onClick={onClose}>关闭</Button>}
            </Space>
          </div>
        )}
      </Space>
    </Card>
  );
};
