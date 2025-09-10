import {
    CloudUploadOutlined,
    ContactsOutlined,
    DeleteOutlined,
    EyeOutlined,
    FileTextOutlined,
    MailOutlined,
    PhoneOutlined,
    UserOutlined
} from '@ant-design/icons';
import { invoke } from '@tauri-apps/api/core';
import type { UploadProps } from 'antd';
import {
    Alert,
    Badge,
    Button,
    Card,
    Col,
    Descriptions,
    Divider,
    message,
    Modal,
    Row,
    Space,
    Steps,
    Table,
    Tag,
    Tooltip,
    Typography,
    Upload
} from 'antd';
import React, { useCallback, useState } from 'react';

const { Title, Text, Paragraph } = Typography;
const { Step } = Steps;

export interface Contact {
    id: string;
    name: string;
    phone?: string;
    email?: string;
    notes?: string;
}

export interface ContactDocument {
    id: string;
    filename: string;
    filepath: string;
    upload_time: string;
    total_contacts: number;
    processed_contacts: number;
    status: string;
    format: string;
    contacts: Contact[];
}

export interface ParseResult {
    success: boolean;
    document?: ContactDocument;
    error?: string;
}

interface ContactReaderProps {
    onContactsParsed?: (document: ContactDocument) => void;
    onContactsSelected?: (contacts: Contact[]) => void;
}

export const ContactReader: React.FC<ContactReaderProps> = ({
    onContactsParsed,
    onContactsSelected
}) => {
    const [currentStep, setCurrentStep] = useState(0);
    const [loading, setLoading] = useState(false);
    const [parsedDocument, setParsedDocument] = useState<ContactDocument | null>(null);
    const [selectedContacts, setSelectedContacts] = useState<Contact[]>([]);
    const [previewModalVisible, setPreviewModalVisible] = useState(false);
    const [uploadedFile, setUploadedFile] = useState<File | null>(null);

    // 文件上传处理
    const handleFileUpload: UploadProps['beforeUpload'] = useCallback(async (file) => {
        if (file.type !== 'text/plain' && !file.name.endsWith('.txt')) {
            message.error('只支持上传TXT格式的通讯录文件');
            return false;
        }

        if (file.size > 10 * 1024 * 1024) { // 10MB限制
            message.error('文件大小不能超过10MB');
            return false;
        }

        setUploadedFile(file);
        setCurrentStep(1);
        message.success(`文件 "${file.name}" 上传成功，准备解析`);
        return false; // 阻止自动上传
    }, []);

    // 解析通讯录文件
    const parseContactFile = useCallback(async () => {
        if (!uploadedFile) {
            message.error('请先选择文件');
            return;
        }

        setLoading(true);
        try {
            // 读取文件内容
            const content = await uploadedFile.text();
            
            // 调用Tauri后端解析
            const result = await invoke<ParseResult>('parse_contact_file', {
                fileName: uploadedFile.name,
                content: content
            });

            if (result.success && result.document) {
                setParsedDocument(result.document);
                setCurrentStep(2);
                message.success(`成功解析 ${result.document.total_contacts} 个联系人`);
                onContactsParsed?.(result.document);
            } else {
                message.error(`解析失败: ${result.error || '未知错误'}`);
            }
        } catch (error) {
            console.error('Parse error:', error);
            message.error(`解析失败: ${error}`);
        } finally {
            setLoading(false);
        }
    }, [uploadedFile, onContactsParsed]);

    // 预览联系人详情
    const showContactPreview = useCallback(() => {
        if (!parsedDocument) return;
        setPreviewModalVisible(true);
    }, [parsedDocument]);

    // 选择所有联系人
    const selectAllContacts = useCallback(() => {
        if (!parsedDocument) return;
        setSelectedContacts(parsedDocument.contacts);
        setCurrentStep(3);
        message.success(`已选择所有 ${parsedDocument.contacts.length} 个联系人`);
        onContactsSelected?.(parsedDocument.contacts);
    }, [parsedDocument, onContactsSelected]);

    // 重置状态
    const resetReader = useCallback(() => {
        setCurrentStep(0);
        setParsedDocument(null);
        setSelectedContacts([]);
        setUploadedFile(null);
        setPreviewModalVisible(false);
    }, []);

    // 联系人表格列定义
    const contactColumns = [
        {
            title: '姓名',
            dataIndex: 'name',
            key: 'name',
            render: (name: string) => (
                <Space>
                    <UserOutlined style={{ color: '#1890ff' }} />
                    <Text strong>{name}</Text>
                </Space>
            ),
        },
        {
            title: '手机号',
            dataIndex: 'phone',
            key: 'phone',
            render: (phone?: string) => phone ? (
                <Space>
                    <PhoneOutlined style={{ color: '#52c41a' }} />
                    <Text code>{phone}</Text>
                </Space>
            ) : <Text type="secondary">-</Text>,
        },
        {
            title: '邮箱',
            dataIndex: 'email',
            key: 'email',
            render: (email?: string) => email ? (
                <Space>
                    <MailOutlined style={{ color: '#722ed1' }} />
                    <Text>{email}</Text>
                </Space>
            ) : <Text type="secondary">-</Text>,
        },
        {
            title: '备注',
            dataIndex: 'notes',
            key: 'notes',
            render: (notes?: string) => notes ? (
                <Tooltip title={notes}>
                    <Text ellipsis style={{ maxWidth: 150 }}>
                        {notes}
                    </Text>
                </Tooltip>
            ) : <Text type="secondary">-</Text>,
        },
    ];

    return (
        <Card
            title={
                <Space>
                    <ContactsOutlined style={{ color: 'var(--text-primary)' }} />
                    <span style={{ color: 'var(--text-primary)' }}>通讯录读取器</span>
                    {parsedDocument && (
                        <Badge 
                            count={parsedDocument.total_contacts} 
                            style={{ backgroundColor: '#52c41a' }}
                        />
                    )}
                </Space>
            }
            extra={
                currentStep > 0 && (
                    <Button icon={<DeleteOutlined />} onClick={resetReader}>
                        重新开始
                    </Button>
                )
            }
            style={{
                background: 'var(--card-bg)',
                border: '1px solid var(--border-color)'
            }}
        >
            {/* 操作步骤 */}
            <Steps current={currentStep} style={{ marginBottom: 24 }}>
                <Step 
                    title="选择文件" 
                    description="上传通讯录TXT文件"
                    icon={<CloudUploadOutlined />}
                />
                <Step 
                    title="解析内容" 
                    description="解析联系人信息"
                    icon={<FileTextOutlined />}
                />
                <Step 
                    title="确认数据" 
                    description="预览并确认联系人"
                    icon={<EyeOutlined />}
                />
            </Steps>

            {/* 步骤1: 文件上传 */}
            {currentStep === 0 && (
                <div style={{ textAlign: 'center', padding: '40px 20px' }}>
                    <Upload.Dragger
                        beforeUpload={handleFileUpload}
                        accept=".txt"
                        showUploadList={false}
                        style={{ 
                            background: 'rgba(255, 255, 255, 0.02)',
                            border: '2px dashed var(--border-color)'
                        }}
                    >
                        <div style={{ padding: '20px' }}>
                            <CloudUploadOutlined style={{ fontSize: '48px', color: '#1890ff' }} />
                            <Title level={4} style={{ marginTop: 16, color: 'var(--text-primary)' }}>
                                选择通讯录文件
                            </Title>
                            <Paragraph style={{ color: 'var(--text-secondary)' }}>
                                点击或拖拽TXT格式的通讯录文件到此区域上传
                            </Paragraph>
                            <Alert
                                message="支持的文件格式"
                                description={
                                    <div>
                                        <p><strong>TXT文本格式</strong> - 每行一个联系人</p>
                                        <p><strong>格式示例</strong>：</p>
                                        <Text code style={{ background: 'rgba(255, 255, 255, 0.1)' }}>张三,13800138000,zhang@email.com,朋友</Text><br/>
                                        <Text code style={{ background: 'rgba(255, 255, 255, 0.1)' }}>李四,13900139000</Text><br/>
                                        <Text code style={{ background: 'rgba(255, 255, 255, 0.1)' }}>王五,15000150000,wang@email.com</Text>
                                    </div>
                                }
                                type="info"
                                showIcon
                                style={{ marginTop: 16, textAlign: 'left' }}
                            />
                        </div>
                    </Upload.Dragger>
                </div>
            )}

            {/* 步骤2: 文件解析 */}
            {currentStep === 1 && uploadedFile && (
                <div style={{ textAlign: 'center', padding: '20px' }}>
                    <Title level={4} style={{ color: 'var(--text-primary)' }}>准备解析文件</Title>
                    <Descriptions column={1} bordered style={{ marginBottom: 20 }}>
                        <Descriptions.Item label="文件名">
                            {uploadedFile.name}
                        </Descriptions.Item>
                        <Descriptions.Item label="文件大小">
                            {(uploadedFile.size / 1024).toFixed(2)} KB
                        </Descriptions.Item>
                        <Descriptions.Item label="文件类型">
                            {uploadedFile.type || 'text/plain'}
                        </Descriptions.Item>
                        <Descriptions.Item label="最后修改">
                            {new Date(uploadedFile.lastModified).toLocaleString()}
                        </Descriptions.Item>
                    </Descriptions>
                    
                    <Space size="large">
                        <Button 
                            type="primary" 
                            size="large"
                            loading={loading}
                            onClick={parseContactFile}
                            icon={<FileTextOutlined />}
                        >
                            开始解析联系人
                        </Button>
                        <Button size="large" onClick={() => setCurrentStep(0)}>
                            重新选择文件
                        </Button>
                    </Space>
                </div>
            )}

            {/* 步骤3: 解析结果 */}
            {currentStep === 2 && parsedDocument && (
                <div>
                    <Row gutter={16} style={{ marginBottom: 20 }}>
                        <Col span={6}>
                            <Card style={{
                                background: 'var(--card-bg)',
                                border: '1px solid var(--border-color)'
                            }}>
                                <Descriptions column={1} size="small">
                                    <Descriptions.Item label="总联系人数">
                                        <Badge 
                                            count={parsedDocument.total_contacts} 
                                            style={{ backgroundColor: '#1890ff' }}
                                        />
                                    </Descriptions.Item>
                                    <Descriptions.Item label="处理状态">
                                        <Tag color="success">解析完成</Tag>
                                    </Descriptions.Item>
                                    <Descriptions.Item label="文件格式">
                                        <Tag>{parsedDocument.format}</Tag>
                                    </Descriptions.Item>
                                </Descriptions>
                            </Card>
                        </Col>
                        <Col span={18}>
                            <Card style={{
                                background: 'var(--card-bg)',
                                border: '1px solid var(--border-color)'
                            }}>
                                <Space size="middle">
                                    <Button 
                                        type="primary" 
                                        icon={<EyeOutlined />}
                                        onClick={showContactPreview}
                                    >
                                        预览联系人详情
                                    </Button>
                                    <Button 
                                        type="primary"
                                        icon={<ContactsOutlined />}
                                        onClick={selectAllContacts}
                                        style={{ background: '#52c41a', borderColor: '#52c41a' }}
                                    >
                                        选择所有联系人
                                    </Button>
                                    <Divider type="vertical" />
                                    <Text type="secondary">
                                        解析时间: {new Date(parsedDocument.upload_time).toLocaleString()}
                                    </Text>
                                </Space>
                            </Card>
                        </Col>
                    </Row>

                    {/* 联系人统计 */}
                    <Card title={
                        <span style={{ color: 'var(--text-primary)' }}>联系人数据统计</span>
                    } style={{ 
                        marginBottom: 20,
                        background: 'var(--card-bg)',
                        border: '1px solid var(--border-color)'
                    }}>
                        <Row gutter={16}>
                            <Col span={6}>
                                <div style={{ textAlign: 'center' }}>
                                    <Title level={2} style={{ color: '#1890ff', margin: 0 }}>
                                        {parsedDocument.total_contacts}
                                    </Title>
                                    <Text style={{ color: 'var(--text-secondary)' }}>总联系人数</Text>
                                </div>
                            </Col>
                            <Col span={6}>
                                <div style={{ textAlign: 'center' }}>
                                    <Title level={2} style={{ color: '#52c41a', margin: 0 }}>
                                        {parsedDocument.contacts.filter(c => c.phone).length}
                                    </Title>
                                    <Text style={{ color: 'var(--text-secondary)' }}>有手机号</Text>
                                </div>
                            </Col>
                            <Col span={6}>
                                <div style={{ textAlign: 'center' }}>
                                    <Title level={2} style={{ color: '#722ed1', margin: 0 }}>
                                        {parsedDocument.contacts.filter(c => c.email).length}
                                    </Title>
                                    <Text style={{ color: 'var(--text-secondary)' }}>有邮箱</Text>
                                </div>
                            </Col>
                            <Col span={6}>
                                <div style={{ textAlign: 'center' }}>
                                    <Title level={2} style={{ color: '#fa8c16', margin: 0 }}>
                                        {parsedDocument.contacts.filter(c => c.notes).length}
                                    </Title>
                                    <Text style={{ color: 'var(--text-secondary)' }}>有备注</Text>
                                </div>
                            </Col>
                        </Row>
                    </Card>
                </div>
            )}

            {/* 步骤4: 选择确认 */}
            {currentStep === 3 && selectedContacts.length > 0 && (
                <Alert
                    message={`已选择 ${selectedContacts.length} 个联系人`}
                    description="联系人已准备就绪，可以进行下一步操作（VCF导入或关注任务）"
                    type="success"
                    showIcon
                    action={
                        <Button size="small" onClick={() => setCurrentStep(2)}>
                            返回预览
                        </Button>
                    }
                />
            )}

            {/* 联系人预览模态框 */}
            <Modal
                title={
                    <Space>
                        <ContactsOutlined />
                        <span>联系人详情预览</span>
                        <Badge count={parsedDocument?.total_contacts || 0} />
                    </Space>
                }
                open={previewModalVisible}
                onCancel={() => setPreviewModalVisible(false)}
                width={1000}
                footer={[
                    <Button key="close" onClick={() => setPreviewModalVisible(false)}>
                        关闭
                    </Button>,
                    <Button 
                        key="select" 
                        type="primary" 
                        onClick={() => {
                            selectAllContacts();
                            setPreviewModalVisible(false);
                        }}
                    >
                        选择所有联系人
                    </Button>,
                ]}
            >
                {parsedDocument && (
                    <div>
                        {/* 文件信息 */}
                        <Descriptions 
                            column={2} 
                            size="small" 
                            bordered
                            style={{ marginBottom: 16 }}
                        >
                            <Descriptions.Item label="文件名">
                                {parsedDocument.filename}
                            </Descriptions.Item>
                            <Descriptions.Item label="联系人总数">
                                {parsedDocument.total_contacts}
                            </Descriptions.Item>
                            <Descriptions.Item label="解析时间">
                                {new Date(parsedDocument.upload_time).toLocaleString()}
                            </Descriptions.Item>
                            <Descriptions.Item label="文件格式">
                                {parsedDocument.format}
                            </Descriptions.Item>
                        </Descriptions>

                        {/* 联系人列表 */}
                        <Table
                            dataSource={parsedDocument.contacts}
                            columns={contactColumns}
                            rowKey="id"
                            pagination={{
                                pageSize: 10,
                                showSizeChanger: true,
                                showQuickJumper: true,
                                showTotal: (total, range) => 
                                    `${range[0]}-${range[1]} / 共 ${total} 个联系人`,
                            }}
                            size="middle"
                            scroll={{ y: 400 }}
                        />
                    </div>
                )}
            </Modal>
        </Card>
    );
};

export default ContactReader;
