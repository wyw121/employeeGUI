import React, { useState, useEffect } from 'react';
import { Card, Select, Button, Form, Input, message, Spin, Typography, Space, Divider, Tag, Alert } from 'antd';
import { invoke } from '@tauri-apps/api/core';
import { SearchOutlined, PlayCircleOutlined, SettingOutlined, BulbOutlined } from '@ant-design/icons';

const { Title, Text } = Typography;
const { Option } = Select;

// TypeScript 接口定义
interface NavigationBarPosition {
    bar_type: 'Bottom' | 'Top' | 'Side' | 'FloatingAction';
    position_ratio: {
        start: number;
        end: number;
    };
    size_ratio: number;
    min_size_threshold: number;
}

interface NavigationButtonConfig {
    text?: string;
    content_desc?: string;
    resource_id_pattern?: string;
    class_name?: string;
    must_clickable: boolean;
    position_in_bar?: number;
}

interface NavigationBarDetectionConfig {
    package_name: string;
    bar_position: NavigationBarPosition;
    target_buttons: Record<string, NavigationButtonConfig>;
    enable_smart_adaptation: boolean;
}

interface DetectedNavigationButton {
    name: string;
    bounds: [number, number, number, number];
    text?: string;
    content_desc?: string;
    clickable: boolean;
    position_index: number;
    confidence: number;
}

interface DetectedNavigationBar {
    bounds: [number, number, number, number];
    bar_type: string;
    buttons: DetectedNavigationButton[];
    confidence: number;
}

interface NavigationDetectionResult {
    success: boolean;
    message: string;
    detected_bars: DetectedNavigationBar[];
    target_button?: DetectedNavigationButton;
    screen_size: [number, number];
    detection_time_ms: number;
}

interface NavigationBarDetectorProps {
    onStepCreate?: (stepData: any) => void;
    deviceId?: string;
}

const NavigationBarDetector: React.FC<NavigationBarDetectorProps> = ({ 
    onStepCreate,
    deviceId = 'emulator-5554'
}) => {
    const [form] = Form.useForm();
    const [loading, setLoading] = useState(false);
    const [detectionResult, setDetectionResult] = useState<NavigationDetectionResult | null>(null);
    const [presetConfigs, setPresetConfigs] = useState<NavigationBarDetectionConfig[]>([]);
    const [selectedConfig, setSelectedConfig] = useState<NavigationBarDetectionConfig | null>(null);
    const [targetButtonText, setTargetButtonText] = useState<string>('我');
    
    // 组件挂载时加载预设配置
    useEffect(() => {
        loadPresetConfigs();
    }, []);

    // 加载预设配置
    const loadPresetConfigs = async () => {
        try {
            const configs = await invoke<NavigationBarDetectionConfig[]>('get_navigation_configs');
            setPresetConfigs(configs);
            
            // 默认选择小红书配置
            const xiaohongshuConfig = configs.find(c => c.package_name === 'com.xingin.xhs');
            if (xiaohongshuConfig) {
                setSelectedConfig(xiaohongshuConfig);
                form.setFieldsValue({
                    configType: 'xiaohongshu',
                    buttonText: '我',
                    packageName: xiaohongshuConfig.package_name
                });
            }
        } catch (error) {
            console.error('加载预设配置失败:', error);
            message.error('加载预设配置失败');
        }
    };

    // 配置类型改变处理
    const handleConfigChange = (configType: string) => {
        if (configType === 'xiaohongshu') {
            const config = presetConfigs.find(c => c.package_name === 'com.xingin.xhs');
            setSelectedConfig(config || null);
            setTargetButtonText('我');
            form.setFieldValue('buttonText', '我');
        } else if (configType === 'generic') {
            const config = presetConfigs.find(c => c.package_name === '');
            setSelectedConfig(config || null);
            setTargetButtonText('');
            form.setFieldValue('buttonText', '');
        } else if (configType === 'custom') {
            setSelectedConfig(null);
        }
    };

    // 执行导航栏检测
    const handleDetection = async () => {
        if (!selectedConfig) {
            message.error('请选择或配置导航栏检测参数');
            return;
        }

        setLoading(true);
        try {
            const result = await invoke<NavigationDetectionResult>('detect_navigation_bar', {
                config: selectedConfig,
                deviceId
            });
            
            setDetectionResult(result);
            
            if (result.success) {
                message.success(`检测成功！找到 ${result.detected_bars.length} 个导航栏`);
            } else {
                message.warning(result.message);
            }
            
        } catch (error) {
            console.error('导航栏检测失败:', error);
            message.error('导航栏检测失败: ' + String(error));
        } finally {
            setLoading(false);
        }
    };

    // 点击导航按钮
    const handleClickButton = async () => {
        if (!selectedConfig || !targetButtonText.trim()) {
            message.error('请配置目标按钮');
            return;
        }

        setLoading(true);
        try {
            const success = await invoke<boolean>('click_navigation_button', {
                deviceId,
                buttonText: targetButtonText,
                config: selectedConfig
            });
            
            if (success) {
                message.success(`成功点击按钮: ${targetButtonText}`);
            } else {
                message.warning(`未找到按钮: ${targetButtonText}`);
            }
            
        } catch (error) {
            console.error('点击按钮失败:', error);
            message.error('点击按钮失败: ' + String(error));
        } finally {
            setLoading(false);
        }
    };

    // 创建智能脚本步骤
    const handleCreateStep = () => {
        if (!selectedConfig || !targetButtonText.trim()) {
            message.error('请配置目标按钮');
            return;
        }

        const stepData = {
            type: 'navigation_click',
            name: `点击${targetButtonText}按钮`,
            description: `在导航栏中寻找并点击"${targetButtonText}"按钮`,
            config: {
                ...selectedConfig,
                targetButtonText,
                deviceId
            },
            parameters: {
                button_text: targetButtonText,
                detection_config: selectedConfig,
                wait_after_click: 500
            }
        };

        if (onStepCreate) {
            onStepCreate(stepData);
            message.success('智能脚本步骤已创建');
        } else {
            console.log('创建的步骤配置:', stepData);
            message.info('步骤配置已准备完成');
        }
    };

    return (
        <div style={{ padding: '16px' }}>
            <Title level={3} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <BulbOutlined />
                通用导航栏检测器
            </Title>
            
            <Alert 
                message="功能说明" 
                description="此组件可以智能识别应用的底部导航栏并找到特定按钮。支持小红书等主流应用的导航栏检测。"
                type="info" 
                style={{ marginBottom: '16px' }}
            />

            <Card title="检测配置" style={{ marginBottom: '16px' }}>
                <Form form={form} layout="vertical">
                    <Form.Item label="应用类型" name="configType">
                        <Select 
                            placeholder="选择应用类型"
                            onChange={handleConfigChange}
                            defaultValue="xiaohongshu"
                        >
                            <Option value="xiaohongshu">小红书</Option>
                            <Option value="generic">通用底部导航</Option>
                            <Option value="custom">自定义配置</Option>
                        </Select>
                    </Form.Item>

                    <Form.Item label="目标按钮" name="buttonText">
                        <Input 
                            placeholder="输入要寻找的按钮文字，如：我、首页、发现等"
                            value={targetButtonText}
                            onChange={(e) => setTargetButtonText(e.target.value)}
                        />
                    </Form.Item>

                    <Form.Item label="包名" name="packageName">
                        <Input 
                            placeholder="应用包名（留空表示通用检测）"
                            value={selectedConfig?.package_name || ''}
                            disabled
                        />
                    </Form.Item>
                </Form>

                <Space>
                    <Button 
                        type="primary" 
                        icon={<SearchOutlined />}
                        loading={loading}
                        onClick={handleDetection}
                    >
                        检测导航栏
                    </Button>
                    <Button 
                        type="default"
                        icon={<PlayCircleOutlined />}
                        loading={loading}
                        onClick={handleClickButton}
                        disabled={!detectionResult?.success}
                    >
                        点击按钮
                    </Button>
                    <Button 
                        type="dashed"
                        icon={<SettingOutlined />}
                        onClick={handleCreateStep}
                    >
                        创建脚本步骤
                    </Button>
                </Space>
            </Card>

            {/* 检测结果显示 */}
            {detectionResult && (
                <Card title="检测结果" style={{ marginBottom: '16px' }}>
                    <Space direction="vertical" style={{ width: '100%' }}>
                        <div>
                            <Text strong>状态: </Text>
                            <Tag color={detectionResult.success ? 'success' : 'error'}>
                                {detectionResult.success ? '成功' : '失败'}
                            </Tag>
                        </div>
                        
                        <div>
                            <Text strong>信息: </Text>
                            <Text>{detectionResult.message}</Text>
                        </div>
                        
                        <div>
                            <Text strong>屏幕尺寸: </Text>
                            <Text>{detectionResult.screen_size[0]} x {detectionResult.screen_size[1]}</Text>
                        </div>
                        
                        <div>
                            <Text strong>检测耗时: </Text>
                            <Text>{detectionResult.detection_time_ms}ms</Text>
                        </div>

                        {detectionResult.target_button && (
                            <>
                                <Divider />
                                <div>
                                    <Text strong>目标按钮: </Text>
                                    <Text>{detectionResult.target_button.name}</Text>
                                </div>
                                <div>
                                    <Text strong>按钮位置: </Text>
                                    <Text>
                                        [{detectionResult.target_button.bounds.join(', ')}]
                                    </Text>
                                </div>
                                <div>
                                    <Text strong>置信度: </Text>
                                    <Text>{(detectionResult.target_button.confidence * 100).toFixed(1)}%</Text>
                                </div>
                            </>
                        )}

                        {detectionResult.detected_bars.length > 0 && (
                            <>
                                <Divider />
                                <Text strong>检测到的导航栏:</Text>
                                {detectionResult.detected_bars.map((bar, index) => (
                                    <Card 
                                        key={index} 
                                        size="small" 
                                        title={`导航栏 ${index + 1} (${bar.bar_type})`}
                                        style={{ marginTop: '8px' }}
                                    >
                                        <div>
                                            <Text>位置: [{bar.bounds.join(', ')}]</Text><br />
                                            <Text>置信度: {(bar.confidence * 100).toFixed(1)}%</Text><br />
                                            <Text>按钮数量: {bar.buttons.length}</Text>
                                        </div>
                                        
                                        {bar.buttons.length > 0 && (
                                            <div style={{ marginTop: '8px' }}>
                                                <Text strong>按钮列表:</Text>
                                                <div style={{ marginTop: '4px' }}>
                                                    {bar.buttons.map((button, btnIndex) => (
                                                        <Tag 
                                                            key={btnIndex}
                                                            color={button.name === targetButtonText ? 'red' : 'blue'}
                                                            style={{ margin: '2px' }}
                                                        >
                                                            {button.name} ({(button.confidence * 100).toFixed(0)}%)
                                                        </Tag>
                                                    ))}
                                                </div>
                                            </div>
                                        )}
                                    </Card>
                                ))}
                            </>
                        )}
                    </Space>
                </Card>
            )}

            {loading && (
                <div style={{ textAlign: 'center', padding: '20px' }}>
                    <Spin size="large" />
                    <div style={{ marginTop: '8px' }}>
                        <Text>正在检测导航栏...</Text>
                    </div>
                </div>
            )}
        </div>
    );
};

export default NavigationBarDetector;