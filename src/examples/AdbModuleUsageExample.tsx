/**
 * ADB 统一接口使用示例
 * 展示如何在应用中使用统一的 useAdb() 接口
 */

import React from 'react';
import { Button, Card, Space, Typography, Tag } from 'antd';
import { useAdb } from '../application/hooks/useAdb';

const { Title, Text } = Typography;

const AdbModuleUsageExample: React.FC = () => {
  const { devices, isLoading, refreshDevices, selectedDevice, selectDevice } = useAdb();

  const handleTestLog = () => {
    console.log('测试日志记录功能 - 现在通过统一的 useAdb() 接口访问');
  };

  const handleRefreshDevices = async () => {
    try {
      await refreshDevices();
      console.log('设备刷新完成');
    } catch (error) {
      console.error('设备刷新失败:', error);
    }
  };

  return (
    <div style={{ padding: '24px' }}>
      <Title level={2}>ADB 统一接口示例</Title>
      
      <Space direction="vertical" size="large" style={{ width: '100%' }}>
        {/* 设备状态卡片 */}
        <Card title="设备状态">
          <Space wrap>
            <Text>设备总数: {devices.length}</Text>
            <Text>在线设备: {devices.filter(d => d.isOnline()).length}</Text>
            <Text>选中设备: {selectedDevice?.getDisplayName() || '无'}</Text>
            <Button onClick={handleRefreshDevices} loading={isLoading}>
              刷新设备
            </Button>
          </Space>
        </Card>

        {/* 设备列表 */}
        <Card title="设备列表">
          {devices.map(device => (
            <Card 
              key={device.id} 
              type="inner" 
              title={device.getDisplayName()}
              style={{ marginBottom: 8 }}
              extra={
                <Space>
                  <Tag color={device.isOnline() ? 'green' : 'red'}>
                    {device.isOnline() ? '在线' : '离线'}
                  </Tag>
                  <Button 
                    size="small" 
                    onClick={() => selectDevice(device.id)}
                    type={selectedDevice?.id === device.id ? 'primary' : 'default'}
                  >
                    {selectedDevice?.id === device.id ? '已选中' : '选择'}
                  </Button>
                </Space>
              }
            >
              <Text>设备ID: {device.id}</Text>
            </Card>
          ))}
        </Card>

        {/* 测试功能 */}
        <Card title="测试功能">
          <Space>
            <Button onClick={handleTestLog}>
              测试日志
            </Button>
          </Space>
        </Card>

        {/* 使用说明 */}
        <Card title="使用说明">
          <Space direction="vertical">
            <div>
              <h4>统一接口特点:</h4>
              <ul>
                <li>所有ADB功能通过 useAdb() 统一接口访问</li>
                <li>符合DDD架构设计，单一数据源</li>
                <li>自动设备状态管理和刷新</li>
                <li>类型安全的Device实体</li>
              </ul>
            </div>
          </Space>
        </Card>
      </Space>
    </div>
  );
};

export default AdbModuleUsageExample;
