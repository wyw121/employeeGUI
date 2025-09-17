import React, { useState } from 'react';
import { Card, Button, Space, message, Typography, Divider, List } from 'antd';
import { PlusOutlined, PlayCircleOutlined, DeleteOutlined } from '@ant-design/icons';
import NavigationBarDetector from '../components/navigation/NavigationBarDetector';
import NavigationStepDisplay from '../components/navigation/NavigationStepDisplay';
import { NavigationClickStepData } from '../types/navigation';

const { Title, Paragraph } = Typography;

const NavigationDetectorTestPage: React.FC = () => {
    const [steps, setSteps] = useState<NavigationClickStepData[]>([]);
    const [showDetector, setShowDetector] = useState(false);
    const [selectedDevice] = useState('emulator-5554');

    // 处理创建新步骤
    const handleStepCreate = (stepData: NavigationClickStepData) => {
        const newStep: NavigationClickStepData = {
            ...stepData,
            name: `步骤${steps.length + 1}: ${stepData.name}`
        };
        
        setSteps(prev => [...prev, newStep]);
        setShowDetector(false);
        message.success('导航点击步骤已添加');
    };

    // 删除步骤
    const handleDeleteStep = (index: number) => {
        setSteps(prev => prev.filter((_, i) => i !== index));
        message.success('步骤已删除');
    };

    // 执行所有步骤
    const handleExecuteSteps = async () => {
        if (steps.length === 0) {
            message.warning('请先添加导航点击步骤');
            return;
        }

        message.info(`开始执行 ${steps.length} 个导航点击步骤...`);
        
        for (let i = 0; i < steps.length; i++) {
            const step = steps[i];
            try {
                message.loading(`执行步骤 ${i + 1}: ${step.name}`, 2);
                // 这里可以调用实际的执行逻辑
                await new Promise(resolve => setTimeout(resolve, 1000));
                message.success(`步骤 ${i + 1} 执行完成`);
            } catch (error) {
                message.error(`步骤 ${i + 1} 执行失败: ${error}`);
                break;
            }
        }
        
        message.success('所有步骤执行完成！');
    };

    return (
        <div style={{ padding: '24px', backgroundColor: '#f0f2f5', minHeight: '100vh' }}>
            <Title level={2}>导航栏检测器测试页面</Title>
            
            <Paragraph>
                此页面用于测试通用导航栏检测功能。可以创建导航点击步骤，并将其集成到智能脚本中。
                主要功能包括：检测应用底部导航栏、识别特定按钮、执行点击操作。
            </Paragraph>

            {/* 操作按钮区域 */}
            <Card style={{ marginBottom: '16px' }}>
                <Space size="middle">
                    <Button 
                        type="primary" 
                        icon={<PlusOutlined />}
                        onClick={() => setShowDetector(true)}
                    >
                        添加导航点击步骤
                    </Button>
                    
                    <Button 
                        type="default"
                        icon={<PlayCircleOutlined />}
                        onClick={handleExecuteSteps}
                        disabled={steps.length === 0}
                    >
                        执行所有步骤 ({steps.length})
                    </Button>
                    
                    <div>
                        <strong>当前设备:</strong> {selectedDevice}
                    </div>
                </Space>
            </Card>

            {/* 导航栏检测器 */}
            {showDetector && (
                <Card 
                    title="创建导航点击步骤" 
                    style={{ marginBottom: '16px' }}
                    extra={
                        <Button onClick={() => setShowDetector(false)}>
                            取消
                        </Button>
                    }
                >
                    <NavigationBarDetector 
                        onStepCreate={handleStepCreate}
                        deviceId={selectedDevice}
                    />
                </Card>
            )}

            {/* 步骤列表 */}
            <Card title="已创建的导航点击步骤">
                {steps.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: '40px' }}>
                        <Paragraph type="secondary">
                            暂无导航点击步骤，点击上方按钮开始添加
                        </Paragraph>
                    </div>
                ) : (
                    <List
                        itemLayout="vertical"
                        dataSource={steps}
                        renderItem={(step, index) => (
                            <List.Item
                                key={index}
                                actions={[
                                    <Button 
                                        key="delete"
                                        type="text" 
                                        danger
                                        icon={<DeleteOutlined />}
                                        onClick={() => handleDeleteStep(index)}
                                    >
                                        删除
                                    </Button>
                                ]}
                            >
                                <NavigationStepDisplay 
                                    stepData={step}
                                    isActive={false}
                                />
                            </List.Item>
                        )}
                    />
                )}
            </Card>

            {/* 使用说明 */}
            <Card title="使用说明" style={{ marginTop: '16px' }}>
                <Space direction="vertical">
                    <div>
                        <strong>1. 添加步骤:</strong> 点击"添加导航点击步骤"按钮，配置目标应用和按钮
                    </div>
                    <div>
                        <strong>2. 检测导航栏:</strong> 在配置界面中点击"检测导航栏"来验证导航栏结构
                    </div>
                    <div>
                        <strong>3. 测试点击:</strong> 使用"点击按钮"功能测试按钮点击是否正常
                    </div>
                    <div>
                        <strong>4. 创建步骤:</strong> 点击"创建脚本步骤"将配置保存为可重复执行的步骤
                    </div>
                    <div>
                        <strong>5. 批量执行:</strong> 使用"执行所有步骤"按钮批量执行已创建的导航点击步骤
                    </div>
                </Space>
            </Card>
        </div>
    );
};

export default NavigationDetectorTestPage;