import React from 'react';
import { Card, Typography, Tag, Space, Divider } from 'antd';
import { MobileOutlined, CaretRightOutlined } from '@ant-design/icons';
import { NavigationClickStepData } from '../../types/navigation';

const { Text } = Typography;

interface NavigationStepDisplayProps {
    stepData: NavigationClickStepData;
    isActive?: boolean;
    onEdit?: () => void;
}

const NavigationStepDisplay: React.FC<NavigationStepDisplayProps> = ({
    stepData,
    isActive = false,
    onEdit
}) => {
    const { config, parameters } = stepData;

    return (
        <Card 
            size="small"
            title={
                <Space>
                    <CaretRightOutlined />
                    {stepData.name}
                </Space>
            }
            style={{
                border: isActive ? '2px solid #1890ff' : '1px solid #d9d9d9',
                backgroundColor: isActive ? '#f0f7ff' : 'white'
            }}
            extra={
                <Tag color="blue">导航点击</Tag>
            }
        >
            <Space direction="vertical" style={{ width: '100%' }}>
                <div>
                    <Text strong>描述: </Text>
                    <Text>{stepData.description}</Text>
                </div>
                
                <Divider style={{ margin: '8px 0' }} />
                
                <div>
                    <Text strong>目标应用: </Text>
                    <Text>
                        {config.package_name === 'com.xingin.xhs' ? '小红书' : 
                         config.package_name || '通用应用'}
                    </Text>
                </div>
                
                <div>
                    <Text strong>目标按钮: </Text>
                    <Tag color="red">{parameters.button_text}</Tag>
                </div>
                
                <div>
                    <Text strong>设备: </Text>
                    <Tag icon={<MobileOutlined />}>{config.deviceId}</Tag>
                </div>
                
                <div>
                    <Text strong>导航栏类型: </Text>
                    <Tag color="green">{config.bar_position.bar_type}</Tag>
                </div>
                
                {parameters.wait_after_click > 0 && (
                    <div>
                        <Text strong>点击后等待: </Text>
                        <Text>{parameters.wait_after_click}ms</Text>
                    </div>
                )}
                
                {config.enable_smart_adaptation && (
                    <div>
                        <Tag color="orange">智能适配已启用</Tag>
                    </div>
                )}
            </Space>
            
            {onEdit && (
                <div style={{ marginTop: '8px', textAlign: 'right' }}>
                    <a onClick={onEdit}>编辑配置</a>
                </div>
            )}
        </Card>
    );
};

export default NavigationStepDisplay;