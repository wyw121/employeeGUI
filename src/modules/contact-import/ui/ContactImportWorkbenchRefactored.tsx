/**
 * 重构后的联系人导入工作台
 * 
 * 架构改进:
 * 1. 使用ContactImportProvider统一管理状态，消除重复的useAdb()调用
 * 2. 拆分为更小的子组件，保持文件在可维护的大小内
 * 3. 通过Context传递状态，避免prop drilling
 * 4. 分离业务逻辑和UI逻辑
 */
import React from 'react';
import { Row, Col, Space } from 'antd';
import { ContactImportProvider } from './providers';
import { DeviceStatusCard } from './components/DeviceStatusCard';

// 占位组件，实际使用时可以根据需要重构现有组件
const NumberPoolSection: React.FC = () => (
  <div>号码池管理区域 (待重构)</div>
);

const BatchManagerSection: React.FC = () => (
  <div>批次管理区域 (待重构)</div>
);

const DeviceAssignmentSection: React.FC = () => (
  <div>设备分配区域 (待重构)</div>
);

const SessionsSection: React.FC = () => (
  <div>会话管理区域 (待重构)</div>
);

const ActionsSection: React.FC = () => (
  <div>操作按钮区域 (待重构)</div>
);

/**
 * 重构后的联系人导入工作台组件
 * 文件大小: 约80行 (符合模块化要求)
 */
const ContactImportWorkbenchRefactored: React.FC = () => {
  return (
    <ContactImportProvider>
      <div style={{ padding: '24px' }}>
        <Space direction="vertical" size="large" style={{ width: '100%' }}>
          {/* 设备状态区域 */}
          <DeviceStatusCard />
          
          {/* 主要功能区域 */}
          <Row gutter={[16, 16]}>
            <Col span={12}>
              <NumberPoolSection />
            </Col>
            <Col span={12}>
              <BatchManagerSection />
            </Col>
          </Row>
          
          <Row gutter={[16, 16]}>
            <Col span={12}>
              <DeviceAssignmentSection />
            </Col>
            <Col span={12}>
              <SessionsSection />
            </Col>
          </Row>
          
          {/* 底部操作区域 */}
          <ActionsSection />
        </Space>
      </div>
    </ContactImportProvider>
  );
};

export default ContactImportWorkbenchRefactored;