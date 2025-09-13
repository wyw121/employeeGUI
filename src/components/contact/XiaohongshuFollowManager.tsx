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
    UserAddOutlined
} from '@ant-design/icons';
import { invoke } from '@tauri-apps/api/core';
import { Contact } from '../../types';

const { Title, Text, Paragraph } = Typography;
const { Option } = Select;

interface XiaohongshuFollowManagerProps {
    contacts: Contact[];
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

    // 获取连接的设备列表
    useEffect(() => {
        loadDevices();
    }, []);

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
            title: '确认开始关注',
            content: (
                <div>
                    <p>即将开始关注小红书通讯录好友：</p>
                    <ul>
                        <li>设备: {devices.find(d => d.id === selectedDevice)?.name || selectedDevice}</li>
                        <li>联系人数量: {contacts.length}</li>
                        <li>最大关注数: {maxFollows}</li>
                    </ul>
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
                </Space>
            }>
                <Row gutter={24}>
                    <Col span={16}>
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
                                    使用步骤：
                                </Title>
                                <ol style={{ paddingLeft: '16px', margin: 0 }}>
                                    <li>确保Android设备已连接</li>
                                    <li>打开小红书APP并登录</li>
                                    <li>选择设备和关注参数</li>
                                    <li>点击"开始关注"</li>
                                </ol>
                                
                                <Divider style={{ margin: '12px 0' }} />
                                
                                <Title level={5} style={{ fontSize: '14px', margin: '8px 0 4px' }}>
                                    注意事项：
                                </Title>
                                <ul style={{ paddingLeft: '16px', margin: 0, fontSize: '12px' }}>
                                    <li>建议每次关注5-10个好友</li>
                                    <li>避免频繁操作被系统限制</li>
                                    <li>确保网络连接稳定</li>
                                    <li>关注过程中请勿操作手机</li>
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