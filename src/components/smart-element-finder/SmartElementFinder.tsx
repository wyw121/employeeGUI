import React, { useState, useEffect } from 'react';
import { Card, Select, Button, Form, Input, message, Spin, Typography, Space, Divider, Tag, Alert, Radio, InputNumber } from 'antd';
import { invoke } from '@tauri-apps/api/core';
import { SearchOutlined, PlayCircleOutlined, SettingOutlined, BulbOutlined, AimOutlined } from '@ant-design/icons';

const { Title, Text } = Typography;
const { Option } = Select;

// TypeScript 接口定义
export interface NavigationBarConfig {
    position_type: 'bottom' | 'top' | 'side' | 'floating';
    position_ratio?: {
        x_start: number;
        x_end: number;
        y_start: number;
        y_end: number;
    };
    button_count?: number;
    button_patterns: string[];
    target_button: string;
    click_action: 'single_tap' | 'double_tap' | 'long_press';
}

export interface DetectedElement {
    text: string;
    bounds: string;
    content_desc: string;
    clickable: boolean;
    position: [number, number];
}

export interface ElementFinderResult {
    success: boolean;
    message: string;
    found_elements?: DetectedElement[];
    target_element?: DetectedElement;
}

interface SmartElementFinderProps {
    deviceId: string;
    onStepCreated?: (step: any) => void;
}

// 预设配置
const NAVIGATION_PRESETS = {
    '小红书_底部导航': {
        position_type: 'bottom' as const,
        position_ratio: { x_start: 0.0, x_end: 1.0, y_start: 0.93, y_end: 1.0 },
        button_count: 5,
        button_patterns: ['首页', '市集', '发布', '消息', '我'],
        target_button: '我',
        click_action: 'single_tap' as const
    },
    '微信_底部导航': {
        position_type: 'bottom' as const,
        position_ratio: { x_start: 0.0, x_end: 1.0, y_start: 0.9, y_end: 1.0 },
        button_count: 4,
        button_patterns: ['微信', '通讯录', '发现', '我'],
        target_button: '我',
        click_action: 'single_tap' as const
    },
    '抖音_底部导航': {
        position_type: 'bottom' as const,
        position_ratio: { x_start: 0.0, x_end: 1.0, y_start: 0.9, y_end: 1.0 },
        button_count: 5,
        button_patterns: ['首页', '朋友', '拍摄', '消息', '我'],
        target_button: '我',
        click_action: 'single_tap' as const
    },
    '自定义配置': {
        position_type: 'bottom' as const,
        position_ratio: { x_start: 0.0, x_end: 1.0, y_start: 0.9, y_end: 1.0 },
        button_count: 4,
        button_patterns: [],
        target_button: '',
        click_action: 'single_tap' as const
    }
};

const SmartElementFinder: React.FC<SmartElementFinderProps> = ({ deviceId, onStepCreated }) => {
    const [form] = Form.useForm();
    const [loading, setLoading] = useState(false);
    const [detectionResult, setDetectionResult] = useState<ElementFinderResult | null>(null);
    const [selectedPreset, setSelectedPreset] = useState<string>('小红书_底部导航');
    const [config, setConfig] = useState<NavigationBarConfig>(NAVIGATION_PRESETS['小红书_底部导航']);
    const [customPatterns, setCustomPatterns] = useState<string>('');

    // 当预设配置改变时更新表单
    useEffect(() => {
        const preset = NAVIGATION_PRESETS[selectedPreset as keyof typeof NAVIGATION_PRESETS];
        if (preset) {
            setConfig(preset);
            form.setFieldsValue({
                position_type: preset.position_type,
                target_button: preset.target_button,
                click_action: preset.click_action,
                button_count: preset.button_count,
                x_start: preset.position_ratio?.x_start || 0.0,
                x_end: preset.position_ratio?.x_end || 1.0,
                y_start: preset.position_ratio?.y_start || 0.9,
                y_end: preset.position_ratio?.y_end || 1.0,
            });
            setCustomPatterns(preset.button_patterns.join(', '));
        }
    }, [selectedPreset, form]);

    // 实时检测导航栏
    const handleDetection = async () => {
        if (!deviceId) {
            message.error('请先连接设备');
            return;
        }

        setLoading(true);
        try {
            const formValues = await form.validateFields();
            
            // 构建配置
            const detectionConfig: NavigationBarConfig = {
                position_type: formValues.position_type,
                position_ratio: {
                    x_start: formValues.x_start,
                    x_end: formValues.x_end,
                    y_start: formValues.y_start,
                    y_end: formValues.y_end,
                },
                button_count: formValues.button_count,
                button_patterns: customPatterns.split(',').map(p => p.trim()).filter(p => p),
                target_button: formValues.target_button,
                click_action: formValues.click_action,
            };

            console.log('检测配置:', detectionConfig);

            const result = await invoke<ElementFinderResult>('smart_element_finder', {
                deviceId,
                config: detectionConfig,
            });

            setDetectionResult(result);

            if (result.success) {
                message.success('智能元素检测成功！');
            } else {
                message.warning(`检测完成，但有问题: ${result.message}`);
            }

        } catch (error) {
            console.error('检测失败:', error);
            message.error(`检测失败: ${error}`);
            setDetectionResult({ success: false, message: `检测失败: ${error}` });
        } finally {
            setLoading(false);
        }
    };

    // 点击目标元素
    const handleClickElement = async () => {
        if (!detectionResult?.target_element) {
            message.error('没有找到目标元素，请先进行检测');
            return;
        }

        setLoading(true);
        try {
            const result = await invoke<{ success: boolean; message: string }>('click_detected_element', {
                deviceId,
                element: detectionResult.target_element,
                clickType: config.click_action,
            });

            if (result.success) {
                message.success('元素点击成功！');
            } else {
                message.error(`点击失败: ${result.message}`);
            }
        } catch (error) {
            console.error('点击失败:', error);
            message.error(`点击失败: ${error}`);
        } finally {
            setLoading(false);
        }
    };

    // 创建步骤
    const handleCreateStep = () => {
        if (!detectionResult?.target_element) {
            message.error('请先检测到目标元素');
            return;
        }

        const stepData = {
            type: 'smart_element_finder',
            name: `智能查找-${config.target_button}`,
            description: `在${config.position_type}导航栏中查找并点击"${config.target_button}"`,
            config: config,
            target_element: detectionResult.target_element,
        };

        onStepCreated?.(stepData);
        message.success('步骤创建成功！');
    };

    return (
        <Card 
            title={
                <Space>
                    <AimOutlined />
                    <Title level={4} style={{ margin: 0 }}>智能元素查找器</Title>
                </Space>
            }
        >
            <Form form={form} layout="vertical" initialValues={config}>
                {/* 预设配置选择 */}
                <Form.Item label="预设配置">
                    <Select
                        value={selectedPreset}
                        onChange={setSelectedPreset}
                        style={{ width: '100%' }}
                    >
                        {Object.keys(NAVIGATION_PRESETS).map(key => (
                            <Option key={key} value={key}>{key}</Option>
                        ))}
                    </Select>
                </Form.Item>

                <Divider />

                {/* 导航栏类型 */}
                <Form.Item 
                    name="position_type" 
                    label="导航栏位置" 
                    rules={[{ required: true }]}
                >
                    <Radio.Group>
                        <Radio value="bottom">底部导航</Radio>
                        <Radio value="top">顶部导航</Radio>
                        <Radio value="side">侧边导航</Radio>
                        <Radio value="floating">悬浮导航</Radio>
                    </Radio.Group>
                </Form.Item>

                {/* 位置比例配置 */}
                <Form.Item label="位置范围配置">
                    <Space direction="vertical" style={{ width: '100%' }}>
                        <Space>
                            <Form.Item name="x_start" label="X起始" style={{ marginBottom: 0 }}>
                                <InputNumber min={0} max={1} step={0.1} style={{ width: 80 }} />
                            </Form.Item>
                            <Form.Item name="x_end" label="X结束" style={{ marginBottom: 0 }}>
                                <InputNumber min={0} max={1} step={0.1} style={{ width: 80 }} />
                            </Form.Item>
                        </Space>
                        <Space>
                            <Form.Item name="y_start" label="Y起始" style={{ marginBottom: 0 }}>
                                <InputNumber min={0} max={1} step={0.1} style={{ width: 80 }} />
                            </Form.Item>
                            <Form.Item name="y_end" label="Y结束" style={{ marginBottom: 0 }}>
                                <InputNumber min={0} max={1} step={0.1} style={{ width: 80 }} />
                            </Form.Item>
                        </Space>
                        <Text type="secondary">
                            位置比例：0.0-1.0，例如底部导航通常为 Y: 0.9-1.0
                        </Text>
                    </Space>
                </Form.Item>

                {/* 按钮数量 */}
                <Form.Item 
                    name="button_count" 
                    label="预期按钮数量" 
                >
                    <InputNumber min={1} max={10} />
                </Form.Item>

                {/* 按钮模式 */}
                <Form.Item label="按钮模式">
                    <Input.TextArea
                        value={customPatterns}
                        onChange={(e) => setCustomPatterns(e.target.value)}
                        placeholder="输入预期的按钮文字，用逗号分隔，例如：首页, 市集, 发布, 消息, 我"
                        rows={2}
                    />
                </Form.Item>

                {/* 目标按钮 */}
                <Form.Item 
                    name="target_button" 
                    label="目标按钮" 
                    rules={[{ required: true, message: '请输入要查找的按钮文字' }]}
                >
                    <Input placeholder="例如：我" />
                </Form.Item>

                {/* 点击动作 */}
                <Form.Item 
                    name="click_action" 
                    label="点击方式" 
                    rules={[{ required: true }]}
                >
                    <Radio.Group>
                        <Radio value="single_tap">单击</Radio>
                        <Radio value="double_tap">双击</Radio>
                        <Radio value="long_press">长按</Radio>
                    </Radio.Group>
                </Form.Item>

                {/* 操作按钮 */}
                <Form.Item>
                    <Space>
                        <Button 
                            type="primary" 
                            icon={<SearchOutlined />} 
                            loading={loading}
                            onClick={handleDetection}
                        >
                            智能检测
                        </Button>
                        <Button 
                            type="default"
                            icon={<PlayCircleOutlined />}
                            loading={loading}
                            onClick={handleClickElement}
                            disabled={!detectionResult?.success}
                        >
                            点击元素
                        </Button>
                        <Button 
                            type="dashed"
                            icon={<SettingOutlined />}
                            onClick={handleCreateStep}
                            disabled={!detectionResult?.success}
                        >
                            创建步骤
                        </Button>
                    </Space>
                </Form.Item>
            </Form>

            {/* 检测结果 */}
            {detectionResult && (
                <Card size="small" title="检测结果" style={{ marginTop: 16 }}>
                    <Alert
                        type={detectionResult.success ? "success" : "warning"}
                        message={detectionResult.message}
                        style={{ marginBottom: 16 }}
                    />

                    {detectionResult.found_elements && detectionResult.found_elements.length > 0 && (
                        <div>
                            <Text strong>发现的元素：</Text>
                            <div style={{ marginTop: 8 }}>
                                {detectionResult.found_elements.map((element, index) => (
                                    <Tag 
                                        key={index}
                                        color={element.text === config.target_button ? 'green' : 'blue'}
                                        style={{ marginBottom: 4 }}
                                    >
                                        {element.text || element.content_desc}
                                        <Text type="secondary" style={{ fontSize: '12px', marginLeft: 4 }}>
                                            {element.bounds}
                                        </Text>
                                    </Tag>
                                ))}
                            </div>
                        </div>
                    )}

                    {detectionResult.target_element && (
                        <div style={{ marginTop: 16 }}>
                            <Text strong>目标元素：</Text>
                            <Tag color="success" style={{ marginLeft: 8 }}>
                                {detectionResult.target_element.text}
                                <Text type="secondary" style={{ fontSize: '12px', marginLeft: 4 }}>
                                    位置: ({detectionResult.target_element.position[0]}, {detectionResult.target_element.position[1]})
                                </Text>
                            </Tag>
                        </div>
                    )}
                </Card>
            )}

            <Card size="small" title="使用说明" style={{ marginTop: 16 }}>
                <Space direction="vertical" size="small">
                    <Text><BulbOutlined /> <strong>预设配置：</strong> 选择常用应用的导航栏配置模板</Text>
                    <Text><BulbOutlined /> <strong>位置范围：</strong> 指定导航栏在屏幕中的相对位置(0.0-1.0)</Text>
                    <Text><BulbOutlined /> <strong>按钮模式：</strong> 列出预期的按钮文字，帮助提高识别准确度</Text>
                    <Text><BulbOutlined /> <strong>智能检测：</strong> 分析当前屏幕内容，找到符合条件的导航栏和按钮</Text>
                    <Text><BulbOutlined /> <strong>创建步骤：</strong> 将检测结果保存为脚本步骤，用于自动化执行</Text>
                </Space>
            </Card>
        </Card>
    );
};

export default SmartElementFinder;