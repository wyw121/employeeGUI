import React, { useState, useEffect } from 'react';
import { Card, Row, Col, Select, Button, Space, Typography, Alert, Divider } from 'antd';
import { invoke } from '@tauri-apps/api/core';
import { SmartElementFinder } from '../components/smart-element-finder';
import { MobileOutlined, RobotOutlined, BugOutlined } from '@ant-design/icons';

const { Title, Text, Paragraph } = Typography;
const { Option } = Select;

interface Device {
    id: string;
    name: string;
    status: string;
}

const SmartElementFinderTestPage: React.FC = () => {
    const [devices, setDevices] = useState<Device[]>([]);
    const [selectedDevice, setSelectedDevice] = useState<string>('');
    const [loading, setLoading] = useState(false);

    // 获取设备列表
    useEffect(() => {
        const loadDevices = async () => {
            try {
                const result = await invoke<Device[]>('get_xiaohongshu_devices');
                setDevices(result);
                if (result.length > 0) {
                    setSelectedDevice(result[0].id);
                }
            } catch (error) {
                console.error('获取设备列表失败:', error);
            }
        };

        loadDevices();
    }, []);

    // 刷新设备列表
    const handleRefreshDevices = async () => {
        setLoading(true);
        try {
            const result = await invoke<Device[]>('get_xiaohongshu_devices');
            setDevices(result);
        } catch (error) {
            console.error('刷新设备列表失败:', error);
        } finally {
            setLoading(false);
        }
    };

    // 步骤创建回调
    const handleStepCreated = (step: any) => {
        console.log('创建的步骤:', step);
        // 这里可以添加到脚本构建器或执行队列
    };

    return (
        <div style={{ padding: '24px', maxWidth: '1200px', margin: '0 auto' }}>
            <Card>
                <div style={{ marginBottom: '24px' }}>
                    <Title level={2}>
                        <RobotOutlined style={{ marginRight: '8px' }} />
                        智能元素查找器测试页面
                    </Title>
                    <Paragraph>
                        这个工具可以智能识别应用的导航栏并精确定位特定按钮。
                        专为小红书等应用的自动化操作设计，支持底部导航、侧边导航等多种布局。
                    </Paragraph>
                </div>

                <Divider />

                {/* 设备选择区域 */}
                <Card size="small" title="设备连接" style={{ marginBottom: '24px' }}>
                    <Space style={{ width: '100%' }}>
                        <MobileOutlined />
                        <Text strong>选择设备：</Text>
                        <Select
                            value={selectedDevice}
                            onChange={setSelectedDevice}
                            style={{ width: 300 }}
                            placeholder="请选择设备"
                        >
                            {devices.map(device => (
                                <Option key={device.id} value={device.id}>
                                    {device.name} ({device.status})
                                </Option>
                            ))}
                        </Select>
                        <Button 
                            onClick={handleRefreshDevices} 
                            loading={loading}
                        >
                            刷新设备
                        </Button>
                    </Space>

                    {devices.length === 0 && (
                        <Alert
                            type="warning"
                            message="未找到连接的设备"
                            description="请确保设备已连接并启用USB调试"
                            style={{ marginTop: '16px' }}
                        />
                    )}
                </Card>

                {/* 智能元素查找器 */}
                {selectedDevice && (
                    <Row gutter={[24, 24]}>
                        <Col xs={24}>
                            <SmartElementFinder
                                deviceId={selectedDevice}
                                onStepCreated={handleStepCreated}
                            />
                        </Col>
                    </Row>
                )}

                {/* 使用说明 */}
                <Card size="small" title="功能说明" style={{ marginTop: '24px' }}>
                    <Row gutter={[16, 16]}>
                        <Col xs={24} md={8}>
                            <Card size="small" hoverable>
                                <Space direction="vertical">
                                    <Text strong>🎯 预设配置</Text>
                                    <Text type="secondary">
                                        内置小红书、微信、抖音等常用应用的导航栏配置，
                                        一键应用无需手动设置。
                                    </Text>
                                </Space>
                            </Card>
                        </Col>
                        <Col xs={24} md={8}>
                            <Card size="small" hoverable>
                                <Space direction="vertical">
                                    <Text strong>🤖 智能识别</Text>
                                    <Text type="secondary">
                                        基于UI结构分析，自动识别导航栏区域和按钮，
                                        无需手动指定坐标。
                                    </Text>
                                </Space>
                            </Card>
                        </Col>
                        <Col xs={24} md={8}>
                            <Card size="small" hoverable>
                                <Space direction="vertical">
                                    <Text strong>📱 多场景支持</Text>
                                    <Text type="secondary">
                                        支持底部导航、顶部导航、侧边导航等多种布局，
                                        适配不同应用设计。
                                    </Text>
                                </Space>
                            </Card>
                        </Col>
                    </Row>
                </Card>

                {/* 测试步骤指南 */}
                <Card size="small" title="测试指南" style={{ marginTop: '16px' }}>
                    <Space direction="vertical" style={{ width: '100%' }}>
                        <Text><BugOutlined /> <strong>步骤1：</strong> 确保设备已连接并打开小红书应用</Text>
                        <Text><BugOutlined /> <strong>步骤2：</strong> 选择预设配置"小红书_底部导航"</Text>
                        <Text><BugOutlined /> <strong>步骤3：</strong> 目标按钮设置为"我"</Text>
                        <Text><BugOutlined /> <strong>步骤4：</strong> 点击"智能检测"查看识别结果</Text>
                        <Text><BugOutlined /> <strong>步骤5：</strong> 如果检测成功，可以点击"点击元素"测试交互</Text>
                        <Text><BugOutlined /> <strong>步骤6：</strong> 点击"创建步骤"将配置保存为脚本步骤</Text>
                    </Space>
                </Card>
            </Card>
        </div>
    );
};

export default SmartElementFinderTestPage;