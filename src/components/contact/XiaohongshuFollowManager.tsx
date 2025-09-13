import React, { useState, useEffect } from 'react';
import { 
    Card, 
    Button, 
    Table, 
    Space, 
    Alert, 
    Typography, 
    Select, 
    InputNumber, 
    Row, 
    Col,
    Progress,
    Tag,
    Divider,
    message,
    Modal,
    List,
    Statistic
} from 'antd';
import { 
    HeartOutlined, 
    PlayCircleOutlined, 
    PauseCircleOutlined,
    StopOutlined,
    SettingOutlined,
    MobileOutlined,
    CheckCircleOutlined,
    ExclamationCircleOutlined,
    UserAddOutlined
} from '@ant-design/icons';
import { invoke } from '@tauri-apps/api/core';
import { Contact, VcfImportResult } from '../../types';

const { Title, Text, Paragraph } = Typography;
const { Option } = Select;

interface XiaohongshuFollowManagerProps {
    contacts: Contact[];
    importResults: VcfImportResult[];
    onFollowComplete: (result: FollowResult) => void;
    onError: (error: string) => void;
}

type FollowStatus = 'pending' | 'success' | 'failed' | 'skipped';

interface FollowResult {
    success: boolean;
    followed_count: number;
    total_contacts: number;
    message: string;
    details: BackendFollowDetail[];
}

interface BackendFollowDetail {
    contact_name: string;
    contact_phone: string;
    follow_status: FollowStatus;
    message: string;
    timestamp: string;
}

interface FollowDetail {
    contactName: string;
    contactPhone: string;
    followStatus: FollowStatus;
    message: string;
    timestamp: string;
}

interface DeviceInfo {
    id: string;
    name: string;
    status: 'online' | 'offline';
}

const XiaohongshuFollowManager: React.FC<XiaohongshuFollowManagerProps> = ({
    contacts,
    importResults,
    onFollowComplete,
    onError
}) => {
    const [devices, setDevices] = useState<DeviceInfo[]>([]);
    const [selectedDevice, setSelectedDevice] = useState<string>('');
    const [maxFollows, setMaxFollows] = useState<number>(5);
    const [isFollowing, setIsFollowing] = useState(false);
    const [isPaused, setIsPaused] = useState(false);
    const [followProgress, setFollowProgress] = useState(0);
    const [followDetails, setFollowDetails] = useState<FollowDetail[]>([]);
    const [currentContact, setCurrentContact] = useState<string>('');
    const [autoConfigured, setAutoConfigured] = useState(false);

    // 辅助函数
    const getStatusColor = (status: string) => {
        switch (status) {
            case 'success': return 'green';
            case 'failed': return 'red';
            case 'pending': return 'blue';
            default: return 'orange';
        }
    };

    const getStatusText = (status: string) => {
        switch (status) {
            case 'success': return '成功';
            case 'failed': return '失败';
            case 'pending': return '进行中';
            default: return '跳过';
        }
    };

    // 自动配置基于导入结果
    const autoConfigureFromImportResults = () => {
        if (!importResults || importResults.length === 0 || autoConfigured) {
            return;
        }

        // 找到成功的导入结果
        const successfulImports = importResults.filter(result => result.success);
        if (successfulImports.length > 0) {
            // 计算总的成功导入联系人数量
            const totalImported = successfulImports.reduce((sum, result) => sum + result.importedContacts, 0);
            
            // 设置建议的关注数量（不超过导入数量，最多10个）
            const suggestedFollows = Math.min(totalImported, 10);
            setMaxFollows(suggestedFollows);
            setAutoConfigured(true);
            
            message.info(`已根据导入结果自动配置：建议关注 ${suggestedFollows} 个好友（基于 ${totalImported} 个成功导入的联系人）`);
        }
    };

    // 获取连接的设备列表
    useEffect(() => {
        loadDevices();
    }, []);

    // 监听导入结果变化，自动配置关注参数
    useEffect(() => {
        autoConfigureFromImportResults();
    }, [importResults, autoConfigured]);

    const loadDevices = async () => {
        try {
            // 调用Tauri API获取设备列表
            const devices = await invoke('get_xiaohongshu_devices') as DeviceInfo[];
            
            setDevices(devices);
            if (devices.length > 0) {
                setSelectedDevice(devices[0].id);
            }
        } catch (error) {
            console.error('获取设备列表失败:', error);
            message.error('获取设备列表失败');
        }
    };

    const startFollow = async () => {
        if (!selectedDevice) {
            message.error('请先选择设备');
            return;
        }

        if (contacts.length === 0) {
            message.error('没有可关注的联系人');
            return;
        }

        Modal.confirm({
            title: '确认开始小红书关注',
            content: (
                <div>
                    <p>即将基于导入结果开始关注小红书通讯录好友：</p>
                    <div style={{ background: '#f5f5f5', padding: '12px', borderRadius: '6px', margin: '12px 0' }}>
                        <Text strong>导入摘要:</Text>
                        <ul style={{ margin: '8px 0', paddingLeft: '20px' }}>
                            <li>成功导入: {importResults.filter(r => r.success).reduce((sum, r) => sum + r.importedContacts, 0)} 个联系人</li>
                            <li>成功设备: {importResults.filter(r => r.success).length} 个</li>
                            <li>选择设备: {devices.find(d => d.id === selectedDevice)?.name || selectedDevice}</li>
                            <li>关注数量: {maxFollows} 个好友</li>
                        </ul>
                    </div>
                    <Alert 
                        type="warning" 
                        message="请确保小红书APP已打开并处于主页面" 
                        style={{ marginTop: 16 }}
                    />
                </div>
            ),
            onOk: executeFollow,
        });
    };

    const executeFollow = async () => {
        setIsFollowing(true);
        setIsPaused(false);
        setFollowProgress(0);
        setFollowDetails([]);
        setCurrentContact('');

        try {
            // 调用Tauri API执行小红书关注
            const request = {
                device: selectedDevice,
                max_follows: maxFollows,
                contacts: contacts.slice(0, maxFollows).map(contact => ({
                    name: contact.name,
                    phone: contact.phone
                }))
            };

            const result = await invoke('xiaohongshu_follow_contacts', { request }) as FollowResult;
            
            setFollowProgress(100);
            setFollowDetails(result.details.map(detail => ({
                contactName: detail.contact_name,
                contactPhone: detail.contact_phone,
                followStatus: detail.follow_status,
                message: detail.message,
                timestamp: detail.timestamp
            })));
            
            if (result.success) {
                message.success(`关注完成！成功关注 ${result.followed_count} 个好友`);
                onFollowComplete(result);
            } else {
                message.error('关注失败: ' + result.message);
                onError(result.message);
            }
        } catch (error) {
            console.error('关注过程中出错:', error);
            message.error('关注过程中出现错误');
            onError('关注过程中出现错误');
        } finally {
            setIsFollowing(false);
            setCurrentContact('');
        }
    };

    const stopFollow = async () => {
        setIsFollowing(false);
        setIsPaused(false);
        message.info('已停止关注操作');
    };

    const pauseFollow = async () => {
        setIsPaused(!isPaused);
        message.info(isPaused ? '已恢复关注' : '已暂停关注');
    };

    const contactColumns = [
        {
            title: '姓名',
            dataIndex: 'name',
            key: 'name',
            render: (text: string) => <Text strong>{text}</Text>
        },
        {
            title: '电话',
            dataIndex: 'phone',
            key: 'phone',
            render: (text: string) => <Text code>{text}</Text>
        },
        {
            title: '状态',
            key: 'status',
            render: (_text: any, record: Contact) => {
                const detail = followDetails.find(d => d.contactPhone === record.phone);
                if (!detail) {
                    return <Tag color="default">待关注</Tag>;
                }
                
                const statusConfig = {
                    pending: { color: 'processing', text: '关注中' },
                    success: { color: 'success', text: '已关注' },
                    failed: { color: 'error', text: '失败' },
                    skipped: { color: 'warning', text: '跳过' }
                };
                
                const config = statusConfig[detail.followStatus];
                return <Tag color={config.color}>{config.text}</Tag>;
            }
        }
    ];

    return (
        <div>
            <Card title={
                <Space>
                    <HeartOutlined style={{ color: '#ff4d4f' }} />
                    <span>小红书好友关注</span>
                    {importResults.length > 0 && (
                        <Tag color="green">
                            基于 {importResults.filter(r => r.success).reduce((sum, r) => sum + r.importedContacts, 0)} 个导入联系人
                        </Tag>
                    )}
                </Space>
            }>
                <Row gutter={24}>
                    <Col span={16}>
                        {/* 导入结果摘要 */}
                        {importResults && importResults.length > 0 && (
                            <Card title="导入结果摘要" size="small" style={{ marginBottom: 16 }}>
                                <Row gutter={16}>
                                    {importResults.map((result, index) => (
                                        <Col span={8} key={`import-result-${index}-${result.totalContacts}`}>
                                            <Card size="small" style={{ 
                                                border: result.success ? '1px solid #52c41a' : '1px solid #ff4d4f',
                                                backgroundColor: result.success ? '#f6ffed' : '#fff2f0'
                                            }}>
                                                <Statistic
                                                    title={`设备 ${index + 1}`}
                                                    value={result.importedContacts}
                                                    suffix={`/ ${result.totalContacts}`}
                                                    prefix={result.success ? <CheckCircleOutlined style={{ color: '#52c41a' }} /> : <ExclamationCircleOutlined style={{ color: '#ff4d4f' }} />}
                                                    valueStyle={{ 
                                                        color: result.success ? '#52c41a' : '#ff4d4f',
                                                        fontSize: '16px'
                                                    }}
                                                />
                                                <Text type="secondary" style={{ fontSize: '12px' }}>
                                                    {result.success ? '导入成功' : '导入失败'}
                                                </Text>
                                            </Card>
                                        </Col>
                                    ))}
                                </Row>
                                <Alert
                                    style={{ marginTop: 12 }}
                                    type="info"
                                    message={`建议关注数量已自动设置为 ${maxFollows} 个，基于成功导入的联系人数量`}
                                    showIcon
                                />
                            </Card>
                        )}

                        {/* 设备和参数配置 */}
                        <Card title="设备配置" size="small" style={{ marginBottom: 16 }}>
                            <Row gutter={16}>
                                <Col span={12}>
                                    <div style={{ marginBottom: 8 }}>
                                        <Text strong>选择设备:</Text>
                                    </div>
                                    <Select
                                        value={selectedDevice}
                                        onChange={setSelectedDevice}
                                        style={{ width: '100%' }}
                                        placeholder="请选择Android设备"
                                        loading={devices.length === 0}
                                    >
                                        {devices.map(device => (
                                            <Option key={device.id} value={device.id}>
                                                <Space>
                                                    <MobileOutlined />
                                                    {device.name}
                                                    <Tag color={device.status === 'online' ? 'green' : 'red'}>
                                                        {device.status}
                                                    </Tag>
                                                </Space>
                                            </Option>
                                        ))}
                                    </Select>
                                </Col>
                                <Col span={12}>
                                    <div style={{ marginBottom: 8 }}>
                                        <Text strong>最大关注数:</Text>
                                    </div>
                                    <InputNumber
                                        value={maxFollows}
                                        onChange={(value) => setMaxFollows(value || 5)}
                                        min={1}
                                        max={50}
                                        style={{ width: '100%' }}
                                        placeholder="建议5-10个"
                                    />
                                </Col>
                            </Row>
                        </Card>

                        {/* 操作控制 */}
                        <Card title="操作控制" size="small" style={{ marginBottom: 16 }}>
                            <Space>
                                <Button
                                    type="primary"
                                    icon={<PlayCircleOutlined />}
                                    onClick={startFollow}
                                    disabled={isFollowing || !selectedDevice || contacts.length === 0}
                                    loading={isFollowing && !isPaused}
                                >
                                    开始关注
                                </Button>
                                <Button
                                    icon={isPaused ? <PlayCircleOutlined /> : <PauseCircleOutlined />}
                                    onClick={pauseFollow}
                                    disabled={!isFollowing}
                                >
                                    {isPaused ? '恢复' : '暂停'}
                                </Button>
                                <Button
                                    danger
                                    icon={<StopOutlined />}
                                    onClick={stopFollow}
                                    disabled={!isFollowing}
                                >
                                    停止
                                </Button>
                                <Button
                                    icon={<SettingOutlined />}
                                    onClick={loadDevices}
                                >
                                    刷新设备
                                </Button>
                            </Space>
                        </Card>

                        {/* 关注进度 */}
                        {isFollowing && (
                            <Card title="关注进度" size="small" style={{ marginBottom: 16 }}>
                                <Progress 
                                    percent={followProgress} 
                                    status={isPaused ? 'exception' : 'active'}
                                    strokeColor={{
                                        '0%': '#108ee9',
                                        '100%': '#87d068',
                                    }}
                                />
                                {currentContact && (
                                    <Text type="secondary" style={{ marginTop: 8, display: 'block' }}>
                                        正在关注: {currentContact}
                                    </Text>
                                )}
                            </Card>
                        )}

                        {/* 联系人列表 */}
                        <Card title={`联系人列表 (${contacts.length})`} size="small">
                            <Table
                                columns={contactColumns}
                                dataSource={contacts.slice(0, maxFollows)}
                                rowKey="phone"
                                size="small"
                                pagination={{ pageSize: 10 }}
                                scroll={{ y: 300 }}
                            />
                        </Card>
                    </Col>

                    <Col span={8}>
                        {/* 关注统计 */}
                        <Card title="关注统计" size="small" style={{ marginBottom: 16 }}>
                            <Row gutter={16}>
                                <Col span={12}>
                                    <Statistic
                                        title="待关注"
                                        value={contacts.length}
                                        prefix={<UserAddOutlined />}
                                        valueStyle={{ color: '#1890ff' }}
                                    />
                                </Col>
                                <Col span={12}>
                                    <Statistic
                                        title="已关注"
                                        value={followDetails.filter(d => d.followStatus === 'success').length}
                                        prefix={<CheckCircleOutlined />}
                                        valueStyle={{ color: '#52c41a' }}
                                    />
                                </Col>
                            </Row>
                        </Card>

                        {/* 操作指南 */}
                        <Card title="操作指南" size="small">
                            <Paragraph style={{ fontSize: '13px' }}>
                                <Title level={5} style={{ fontSize: '14px', margin: '8px 0 4px' }}>
                                    关注流程：
                                </Title>
                                <ol style={{ paddingLeft: '16px', margin: 0 }}>
                                    <li>✅ 通讯录导入已完成 ({importResults.filter(r => r.success).length} 个设备成功)</li>
                                    <li>🎯 已自动配置关注数量为 {maxFollows} 个好友</li>
                                    <li>📱 确保Android设备已连接并打开小红书APP</li>
                                    <li>🚀 点击"开始关注"执行自动关注</li>
                                </ol>
                                
                                <Divider style={{ margin: '12px 0' }} />
                                
                                <Title level={5} style={{ fontSize: '14px', margin: '8px 0 4px' }}>
                                    导入统计：
                                </Title>
                                <div style={{ fontSize: '12px' }}>
                                    <Text>• 总计导入: {importResults.reduce((sum, r) => sum + r.importedContacts, 0)} 个联系人</Text><br/>
                                    <Text>• 成功设备: {importResults.filter(r => r.success).length} / {importResults.length}</Text><br/>
                                    <Text type="secondary">• 系统已根据导入结果自动优化关注数量</Text>
                                </div>
                                
                                <Divider style={{ margin: '12px 0' }} />
                                
                                <Title level={5} style={{ fontSize: '14px', margin: '8px 0 4px' }}>
                                    注意事项：
                                </Title>
                                <ul style={{ paddingLeft: '16px', margin: 0, fontSize: '12px' }}>
                                    <li>关注数量已根据导入结果智能设置</li>
                                    <li>确保小红书APP处于主页面状态</li>
                                    <li>关注过程中请勿操作手机</li>
                                    <li>系统会自动处理重复和异常情况</li>
                                </ul>
                            </Paragraph>
                        </Card>

                        {/* 关注详情 */}
                        {followDetails.length > 0 && (
                            <Card title="关注详情" size="small" style={{ marginTop: 16 }}>
                                <List
                                    size="small"
                                    dataSource={followDetails}
                                    renderItem={(item, index) => (
                                        <List.Item key={index}>
                                            <List.Item.Meta
                                                title={
                                                    <Space>
                                                        <Text strong style={{ fontSize: '12px' }}>
                                                            {item.contactName}
                                                        </Text>
                                                        <Tag 
                                                            color={getStatusColor(item.followStatus)}
                                                            style={{ fontSize: '10px' }}
                                                        >
                                                            {getStatusText(item.followStatus)}
                                                        </Tag>
                                                    </Space>
                                                }
                                                description={
                                                    <Text type="secondary" style={{ fontSize: '11px' }}>
                                                        {item.message}
                                                    </Text>
                                                }
                                            />
                                        </List.Item>
                                    )}
                                    style={{ maxHeight: '200px', overflow: 'auto' }}
                                />
                            </Card>
                        )}
                    </Col>
                </Row>
            </Card>
        </div>
    );
};

export default XiaohongshuFollowManager;