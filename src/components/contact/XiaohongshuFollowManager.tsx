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
        } catch (error) {
            console.error('获取设备列表失败:', error);
            message.error('获取设备列表失败');
        }
    };

    const startFollow = async () => {
        // 自动选择第一个在线设备
        const onlineDevices = devices.filter(d => d.status === 'online');
        if (onlineDevices.length === 0) {
            message.error('没有可用的在线设备，请确保设备已连接');
            return;
        }

        const deviceToUse = onlineDevices[0];
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
                            <li>使用设备: {deviceToUse.name}</li>
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
            onOk: () => executeFollow(deviceToUse.id),
        });
    };

    const executeFollow = async (deviceId: string) => {
        setIsFollowing(true);
        setIsPaused(false);
        setFollowProgress(0);
        setFollowDetails([]);
        setCurrentContact('');

        try {
            // 调用Tauri API执行小红书关注
            const request = {
                device: deviceId,
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
                            message={`已自动配置关注数量为 ${maxFollows} 个好友，基于成功导入的联系人数量`}
                            showIcon
                        />
                    </Card>
                )}

                <Row gutter={24}>
                    <Col span={16}>
                        {/* 整体操作控制 */}
                        <Card title="小红书关注控制" size="small" style={{ marginBottom: 16 }}>
                            <Row gutter={16} style={{ marginBottom: 16 }}>
                                <Col span={8}>
                                    <div style={{ textAlign: 'center' }}>
                                        <Statistic
                                            title="待关注联系人"
                                            value={maxFollows}
                                            prefix={<UserAddOutlined />}
                                            valueStyle={{ color: '#1890ff' }}
                                        />
                                    </div>
                                </Col>
                                <Col span={8}>
                                    <div style={{ textAlign: 'center' }}>
                                        <Statistic
                                            title="已关注成功"
                                            value={followDetails.filter(d => d.followStatus === 'success').length}
                                            prefix={<CheckCircleOutlined />}
                                            valueStyle={{ color: '#52c41a' }}
                                        />
                                    </div>
                                </Col>
                                <Col span={8}>
                                    <div style={{ textAlign: 'center' }}>
                                        <Statistic
                                            title="关注进度"
                                            value={Math.round((followDetails.filter(d => d.followStatus === 'success').length / maxFollows) * 100)}
                                            suffix="%"
                                            valueStyle={{ color: '#fa8c16' }}
                                        />
                                    </div>
                                </Col>
                            </Row>

                            <div style={{ textAlign: 'center', marginBottom: 16 }}>
                                <Space size="large">
                                    <Button
                                        type="primary"
                                        size="large"
                                        icon={<PlayCircleOutlined />}
                                        onClick={startFollow}
                                        disabled={isFollowing || contacts.length === 0}
                                        loading={isFollowing && !isPaused}
                                    >
                                        开始小红书关注
                                    </Button>
                                    <Button
                                        icon={isPaused ? <PlayCircleOutlined /> : <PauseCircleOutlined />}
                                        onClick={pauseFollow}
                                        disabled={!isFollowing}
                                        size="large"
                                    >
                                        {isPaused ? '恢复' : '暂停'}
                                    </Button>
                                    <Button
                                        danger
                                        icon={<StopOutlined />}
                                        onClick={stopFollow}
                                        disabled={!isFollowing}
                                        size="large"
                                    >
                                        停止
                                    </Button>
                                </Space>
                            </div>

                            {/* 关注进度 */}
                            {isFollowing && (
                                <div style={{ marginTop: 16 }}>
                                    <Progress 
                                        percent={followProgress} 
                                        status={isPaused ? 'exception' : 'active'}
                                        strokeColor={{
                                            '0%': '#108ee9',
                                            '100%': '#87d068',
                                        }}
                                    />
                                    {currentContact && (
                                        <Text type="secondary" style={{ marginTop: 8, display: 'block', textAlign: 'center' }}>
                                            正在关注: {currentContact}
                                        </Text>
                                    )}
                                </div>
                            )}
                        </Card>

                        {/* 按设备分组显示联系人列表 */}
                        <Card title="联系人列表（按设备分组）" size="small">
                            {importResults.map((result, deviceIndex) => {
                                if (!result.success) return null;
                                
                                const deviceContacts = contacts.slice(
                                    deviceIndex * Math.ceil(contacts.length / importResults.filter(r => r.success).length),
                                    (deviceIndex + 1) * Math.ceil(contacts.length / importResults.filter(r => r.success).length)
                                );

                                return (
                                    <div key={`device-${result.totalContacts}-${result.importedContacts}-${deviceIndex}`} style={{ marginBottom: 16 }}>
                                        <Card 
                                            size="small" 
                                            title={
                                                <Space>
                                                    <MobileOutlined />
                                                    <Text strong>设备 {deviceIndex + 1}</Text>
                                                    <Tag color="blue">{deviceContacts.length} 个联系人</Tag>
                                                    <Tag color="green">导入成功 {result.importedContacts}</Tag>
                                                </Space>
                                            }
                                        >
                                            <Table
                                                columns={[
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
                                                        title: '关注状态',
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
                                                ]}
                                                dataSource={deviceContacts}
                                                rowKey="phone"
                                                size="small"
                                                pagination={false}
                                                scroll={{ y: 200 }}
                                            />
                                        </Card>
                                    </div>
                                );
                            })}
                        </Card>
                    </Col>

                    <Col span={8}>
                        {/* 操作指南 */}
                        <Card title="操作指南" size="small" style={{ marginBottom: 16 }}>
                            <Paragraph style={{ fontSize: '13px' }}>
                                <Title level={5} style={{ fontSize: '14px', margin: '8px 0 4px' }}>
                                    关注流程：
                                </Title>
                                <div style={{ background: '#f5f5f5', padding: '12px', borderRadius: '6px', margin: '8px 0' }}>
                                    <Text strong>✅ 通讯录导入已完成</Text><br/>
                                    <Text type="secondary">• 成功设备: {importResults.filter(r => r.success).length} 个</Text><br/>
                                    <Text type="secondary">• 导入联系人: {importResults.filter(r => r.success).reduce((sum, r) => sum + r.importedContacts, 0)} 个</Text><br/>
                                    <Text type="secondary">• 关注数量: {maxFollows} 个好友</Text>
                                </div>
                                
                                <ol style={{ paddingLeft: '16px', margin: '8px 0', fontSize: '12px' }}>
                                    <li>确保小红书APP已打开并处于主页面</li>
                                    <li>点击"开始小红书关注"自动执行</li>
                                    <li>系统将按设备分组进行关注</li>
                                    <li>可随时暂停或停止关注过程</li>
                                </ol>
                                
                                <Alert 
                                    type="info" 
                                    message="智能配置" 
                                    description={`系统已根据导入结果自动配置关注参数，无需手动设置`}
                                    showIcon 
                                    style={{ fontSize: '12px', marginTop: 12 }}
                                />
                            </Paragraph>
                        </Card>

                        {/* 设备状态 */}
                        <Card title="设备状态" size="small" style={{ marginBottom: 16 }}>
                            <div style={{ maxHeight: '150px', overflow: 'auto' }}>
                                {devices.length > 0 ? (
                                    devices.map(device => (
                                        <div key={device.id} style={{ 
                                            padding: '8px', 
                                            margin: '4px 0', 
                                            border: '1px solid #d9d9d9', 
                                            borderRadius: '4px',
                                            background: device.status === 'online' ? '#f6ffed' : '#fff2f0'
                                        }}>
                                            <Space>
                                                <MobileOutlined />
                                                <Text strong style={{ fontSize: '12px' }}>{device.name}</Text>
                                                <Tag 
                                                    color={device.status === 'online' ? 'green' : 'red'}
                                                    style={{ fontSize: '10px' }}
                                                >
                                                    {device.status}
                                                </Tag>
                                            </Space>
                                        </div>
                                    ))
                                ) : (
                                    <Text type="secondary" style={{ fontSize: '12px' }}>
                                        正在检测设备...
                                    </Text>
                                )}
                            </div>
                            <Button 
                                type="link" 
                                size="small" 
                                onClick={loadDevices}
                                style={{ padding: 0, marginTop: 8 }}
                            >
                                刷新设备列表
                            </Button>
                        </Card>

                        {/* 关注详情 */}
                        {followDetails.length > 0 && (
                            <Card title="关注详情" size="small">
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