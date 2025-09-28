import React from 'react';
import { Result, Card, Statistic, List, Tag, Alert, Space, Button, Descriptions } from 'antd';
import { 
  CheckCircleOutlined, 
  CloseCircleOutlined, 
  InfoCircleOutlined,
  PhoneOutlined,
  UserOutlined,
  ReloadOutlined
} from '@ant-design/icons';
import type { ImportResult, ImportStrategy } from '../types';

interface ImportResultDisplayProps {
  result: ImportResult;
  onRetry?: () => void;
  onClose?: () => void;
}

export const ImportResultDisplay: React.FC<ImportResultDisplayProps> = ({
  result,
  onRetry,
  onClose
}) => {
  const { success, importedCount, failedCount, strategy, errorMessage, verificationDetails } = result;

  const getResultIcon = () => {
    if (success) {
      return <CheckCircleOutlined style={{ color: '#52c41a', fontSize: '48px' }} />;
    } else {
      return <CloseCircleOutlined style={{ color: '#ff4d4f', fontSize: '48px' }} />;
    }
  };

  const getResultTitle = () => {
    if (success) {
      return importedCount > 0 
        ? `成功导入 ${importedCount} 个联系人` 
        : '导入操作已完成';
    } else {
      return '导入失败';
    }
  };

  const getResultSubTitle = () => {
    if (success) {
      return `使用策略: ${strategy.name}`;
    } else {
      return errorMessage || '未知错误';
    }
  };

  const getStrategyDetails = (strategy: ImportStrategy) => (
    <Descriptions size="small" column={1}>
      <Descriptions.Item label="vCard版本">
        <Tag color="blue">vCard {strategy.vCardVersion}</Tag>
      </Descriptions.Item>
      <Descriptions.Item label="触发方式">
        <Tag color="purple">
          {strategy.triggerMethod === 'DIRECT_ACTIVITY' ? '直接导入' : 
           strategy.triggerMethod === 'VIEW_X_VCARD' ? 'VIEW方式A' : 'VIEW方式B'}
        </Tag>
      </Descriptions.Item>
      <Descriptions.Item label="设备厂商">
        <Tag color="default">{strategy.manufacturer}</Tag>
      </Descriptions.Item>
      <Descriptions.Item label="MIME类型">
        <code>{strategy.mimeType}</code>
      </Descriptions.Item>
      {strategy.activityComponent && (
        <Descriptions.Item label="组件">
          <code style={{ fontSize: '11px' }}>{strategy.activityComponent}</code>
        </Descriptions.Item>
      )}
    </Descriptions>
  );

  const renderSuccessContent = () => (
    <div>
      <Space direction="vertical" size={16} style={{ width: '100%' }}>
        {/* 统计信息 */}
        <div style={{ display: 'flex', justifyContent: 'center', gap: 32 }}>
          <Statistic
            title="成功导入"
            value={importedCount}
            valueStyle={{ color: '#3f8600' }}
            prefix={<CheckCircleOutlined />}
          />
          {failedCount > 0 && (
            <Statistic
              title="导入失败"
              value={failedCount}
              valueStyle={{ color: '#cf1322' }}
              prefix={<CloseCircleOutlined />}
            />
          )}
        </div>

        {/* 验证结果 */}
        {verificationDetails && (
          <Card title="验证结果" size="small">
            <Alert
              message={`验证了 ${verificationDetails.sampledContacts.length} 个联系人样本`}
              description={`在设备联系人数据库中找到了 ${verificationDetails.totalFound} 个匹配的联系人记录`}
              type="success"
              showIcon
              style={{ marginBottom: 16 }}
            />
            
            {verificationDetails.sampledContacts.length > 0 && (
              <List
                size="small"
                dataSource={verificationDetails.sampledContacts}
                renderItem={(contact) => (
                  <List.Item>
                    <List.Item.Meta
                      avatar={<UserOutlined style={{ color: '#1890ff' }} />}
                      title={contact.displayName}
                      description={
                        <Space>
                          <PhoneOutlined />
                          {contact.phoneNumber}
                        </Space>
                      }
                    />
                  </List.Item>
                )}
              />
            )}
          </Card>
        )}

        {/* 策略详情 */}
        <Card title="使用的导入策略" size="small">
          {getStrategyDetails(strategy)}
          
          {strategy.notes && (
            <Alert
              message={strategy.notes}
              type="info"
              showIcon
              style={{ marginTop: 12 }}
            />
          )}
        </Card>
      </Space>
    </div>
  );

  const renderFailureContent = () => (
    <div>
      <Space direction="vertical" size={16} style={{ width: '100%' }}>
        {/* 错误信息 */}
        <Alert
          message="导入失败"
          description={errorMessage || '未知错误，请检查设备连接状态和VCF文件格式'}
          type="error"
          showIcon
        />

        {/* 策略详情 */}
        <Card title="使用的导入策略" size="small">
          {getStrategyDetails(strategy)}
          
          {strategy.successRate === 'failed' && (
            <Alert
              message="这是一个已知失败的策略"
              description="根据测试记录，此策略在类似设备上可能不兼容。建议尝试其他推荐策略。"
              type="warning"
              showIcon
              style={{ marginTop: 12 }}
            />
          )}
        </Card>

        {/* 建议操作 */}
        <Card title="建议操作" size="small">
          <Space direction="vertical" style={{ width: '100%' }}>
            <div>• 检查设备是否已连接且处于解锁状态</div>
            <div>• 确认VCF文件格式正确且包含有效联系人数据</div>
            <div>• 尝试其他成功率更高的导入策略</div>
            <div>• 检查设备是否已安装联系人应用</div>
          </Space>
        </Card>
      </Space>
    </div>
  );

  const actions = [];
  
  if (!success && onRetry) {
    actions.push(
      <Button 
        key="retry"
        type="primary" 
        icon={<ReloadOutlined />} 
        onClick={onRetry}
      >
        重新尝试
      </Button>
    );
  }
  
  if (onClose) {
    actions.push(
      <Button key="close" onClick={onClose}>
        关闭
      </Button>
    );
  }

  return (
    <Result
      icon={getResultIcon()}
      title={getResultTitle()}
      subTitle={getResultSubTitle()}
      extra={actions}
    >
      {success ? renderSuccessContent() : renderFailureContent()}
    </Result>
  );
};