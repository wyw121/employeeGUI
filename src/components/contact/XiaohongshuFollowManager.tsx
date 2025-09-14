import React, { useState, useEffect } from 'react';
import {
  Button,
  Card,
  Col,
  Row,
  Steps,
  Tag,
  Typography
} from 'antd';
import {
  CheckCircleOutlined,
  PlayCircleOutlined,
  SettingOutlined
} from '@ant-design/icons';

const { Step } = Steps;
const { Text } = Typography;

interface DeviceInfo {
  id: string;
  name: string;
  status: 'online' | 'offline';
}

const XiaohongshuFollowManager: React.FC = () => {
  const [currentStep] = useState(0);
  const [devices, setDevices] = useState<DeviceInfo[]>([]);

  useEffect(() => {
    setDevices([
      { id: 'device1', name: '模拟器 1', status: 'online' },
      { id: 'device2', name: '模拟器 2', status: 'offline' }
    ]);
  }, []);

  return (
    <div>
      <Card title="小红书自动关注管理">
        <Row gutter={[16, 16]}>
          <Col span={16}>
            <Steps current={currentStep}>
              <Step title="准备配置" icon={<SettingOutlined />} />
              <Step title="执行关注" icon={<PlayCircleOutlined />} />
              <Step title="查看结果" icon={<CheckCircleOutlined />} />
            </Steps>
            
            <div style={{ marginTop: 24, textAlign: 'center' }}>
              <Button type="primary" size="large">
                开始自动关注
              </Button>
            </div>
          </Col>
          
          <Col span={8}>
            <Card title="设备状态" size="small">
              {devices.map(device => (
                <div key={device.id} style={{ marginBottom: 8 }}>
                  <Text>{device.name}</Text>
                  <Tag color={device.status === 'online' ? 'green' : 'red'}>
                    {device.status}
                  </Tag>
                </div>
              ))}
            </Card>
          </Col>
        </Row>
      </Card>
    </div>
  );
};

export default XiaohongshuFollowManager;