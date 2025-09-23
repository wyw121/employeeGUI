import React from 'react';
import { Alert, Card, Space } from 'antd';
import { ExclamationCircleOutlined } from '@ant-design/icons';
 import AdbCenterPage from './adb/AdbCenterPage';

/**
 * @deprecated 本页面已废弃：请前往 ADB 中心 → ADB 授权向导。
 * 说明：为避免双入口与功能重复，此页仅作为向后兼容的过渡页，直接内嵌新页面。
 */
const AdbAuthorizationWizard: React.FC = () => {
  return (
    <Space direction="vertical" style={{ width: '100%' }}>
      <Card>
        <Alert
          showIcon
          type="warning"
          message={<Space><ExclamationCircleOutlined />ADB 授权向导（已废弃入口）</Space>}
          description={
            <>
              此入口已废弃，请使用「ADB 中心 → ADB 授权向导」。为兼容历史链接，本页已自动内嵌新页面内容。
            </>
          }
        />
      </Card>
      <AdbCenterPage />
    </Space>
  );
};

export default AdbAuthorizationWizard;
