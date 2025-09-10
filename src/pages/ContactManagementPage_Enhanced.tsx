import { CheckCircleOutlined, ContactsOutlined, FileTextOutlined, MobileOutlined } from '@ant-design/icons';
import { Alert, Button, Card, Col, Divider, message, Row, Space, Tabs, Typography } from 'antd';
import React, { useState } from 'react';
import { ContactImportManager, ContactReader } from '../components/contact';
import type { Contact, VcfImportResult } from '../types';
// 使用相对导入来确保类型一致性
import type { ContactDocument as ReaderContactDocument } from '../components/contact/ContactReader';

const { Title, Paragraph, Text } = Typography;

export const ContactManagementPage: React.FC = () => {
    const [parsedDocument, setParsedDocument] = useState<ReaderContactDocument | null>(null);
    const [selectedContacts, setSelectedContacts] = useState<Contact[]>([]);
    const [importResults, setImportResults] = useState<VcfImportResult[]>([]);
    const [activeTab, setActiveTab] = useState<string>('upload');

    const handleContactsParsed = (document: ReaderContactDocument) => {
        setParsedDocument(document);
        console.log('解析的联系人文档:', document);
    };

    const handleContactsSelected = (contacts: Contact[]) => {
        setSelectedContacts(contacts);
        console.log('选择的联系人:', contacts);
        // 如果有选中的联系人，自动切换到导入标签
        if (contacts.length > 0) {
            setActiveTab('import');
            message.success(`已选择 ${contacts.length} 个联系人，可以开始导入操作`);
        }
    };

    const handleImportComplete = (results: VcfImportResult[]) => {
        setImportResults(results);
        setActiveTab('results');
        
        const totalImported = results.reduce((sum, result) => sum + result.importedContacts, 0);
        const successCount = results.filter(result => result.success).length;
        
        message.success(`导入完成！成功设备: ${successCount}/${results.length}，总导入联系人: ${totalImported}`);
    };

    const handleImportError = (error: string) => {
        message.error(error);
    };

    const handleRestart = () => {
        setSelectedContacts([]);
        setImportResults([]);
        setActiveTab('upload');
        message.info('已重置，可以重新开始');
    };

    return (
        <div style={{ 
            padding: '0',
            background: 'transparent',
            height: '100%',
            overflow: 'auto'
        }}>
            {/* 页面标题 */}
            <div style={{ 
                marginBottom: '24px',
                padding: '0 24px',
                paddingTop: '24px'
            }}>
                <Title level={2} style={{ color: 'var(--text-primary)', margin: 0 }}>
                    <Space>
                        <ContactsOutlined />
                        通讯录管理模块
                    </Space>
                </Title>
                <Paragraph style={{ color: 'var(--text-secondary)', marginTop: '8px' }}>
                    管理通讯录文件的导入、解析、生成和关注功能
                </Paragraph>
            </div>

            {/* 功能概览 */}
            <div style={{ padding: '0 24px', marginBottom: '24px' }}>
                <Card style={{ 
                    background: 'var(--card-bg)',
                    border: '1px solid var(--border-color)',
                    marginBottom: '0'
                }}>
                    <Title level={4} style={{ color: 'var(--text-primary)' }}>功能模块概览</Title>
                    <Row gutter={16}>
                        <Col span={8}>
                            <Card size="small" style={{ 
                                textAlign: 'center', 
                                background: 'rgba(82, 196, 26, 0.1)', 
                                border: '1px solid rgba(82, 196, 26, 0.3)' 
                            }}>
                                <FileTextOutlined style={{ fontSize: '24px', color: '#52c41a', marginBottom: '8px' }} />
                                <Text strong style={{ display: 'block', color: 'var(--text-primary)' }}>通讯录读取</Text>
                                <Text style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>解析TXT格式通讯录文件</Text>
                            </Card>
                        </Col>
                        <Col span={8}>
                            <Card size="small" style={{ 
                                textAlign: 'center', 
                                background: 'rgba(24, 144, 255, 0.1)', 
                                border: '1px solid rgba(24, 144, 255, 0.3)' 
                            }}>
                                <ContactsOutlined style={{ fontSize: '24px', color: '#1890ff', marginBottom: '8px' }} />
                                <Text strong style={{ display: 'block', color: 'var(--text-primary)' }}>通讯录导入</Text>
                                <Text style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>生成VCF文件导入设备</Text>
                            </Card>
                        </Col>
                        <Col span={8}>
                            <Card size="small" style={{ 
                                textAlign: 'center', 
                                background: 'rgba(250, 140, 22, 0.1)', 
                                border: '1px solid rgba(250, 140, 22, 0.3)' 
                            }}>
                                <CheckCircleOutlined style={{ fontSize: '24px', color: '#fa8c16', marginBottom: '8px' }} />
                                <Text strong style={{ display: 'block', color: 'var(--text-primary)' }}>自动关注</Text>
                                <Text style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>小红书好友关注功能</Text>
                            </Card>
                        </Col>
                    </Row>
                    
                    {/* 状态指示器 */}
                    <div style={{ marginTop: '16px', textAlign: 'center' }}>
                        <Space>
                            <Text type="secondary">当前状态: </Text>
                            {selectedContacts.length === 0 ? (
                                <Text>等待上传通讯录文件</Text>
                            ) : importResults.length === 0 ? (
                                <Text style={{ color: '#ff6b8a' }}>已选择 {selectedContacts.length} 个联系人，可开始导入</Text>
                            ) : (
                                <Text style={{ color: '#52c41a' }}>导入完成，共处理 {importResults.length} 台设备</Text>
                            )}
                        </Space>
                    </div>
                </Card>
            </div>

            {/* 主要内容 - 使用 Tabs 组织 */}
            <div style={{ padding: '0 24px', paddingBottom: '24px' }}>
                <Tabs 
                    activeKey={activeTab} 
                    onChange={setActiveTab}
                    type="card"
                    items={[
                        {
                            key: 'upload',
                            label: (
                                <Space>
                                    <FileTextOutlined />
                                    文件解析
                                </Space>
                            ),
                            children: (
                                <Row gutter={24}>
                                    <Col span={16}>
                                        <ContactReader
                                            onContactsParsed={handleContactsParsed}
                                            onContactsSelected={handleContactsSelected}
                                        />
                                    </Col>
                                    
                                    {/* 状态信息面板 */}
                                    <Col span={8}>
                                        <Space direction="vertical" size="middle" style={{ width: '100%' }}>
                                            {/* 解析状态 */}
                                            <Card title={
                                                <span style={{ color: 'var(--text-primary)' }}>解析状态</span>
                                            } size="small" style={{ 
                                                background: 'var(--card-bg)',
                                                border: '1px solid var(--border-color)'
                                            }}>
                                                {parsedDocument ? (
                                                    <Space direction="vertical" style={{ width: '100%' }}>
                                                        <Alert
                                                            message="文件解析成功"
                                                            description={
                                                                <div>
                                                                    <p><Text strong style={{ color: 'var(--text-primary)' }}>文件名：</Text>
                                                                    <Text style={{ color: 'var(--text-secondary)' }}>{parsedDocument.filename}</Text></p>
                                                                    <p><Text strong style={{ color: 'var(--text-primary)' }}>联系人数：</Text>
                                                                    <Text style={{ color: 'var(--text-secondary)' }}>{parsedDocument.total_contacts}</Text></p>
                                                                    <p><Text strong style={{ color: 'var(--text-primary)' }}>解析时间：</Text>
                                                                    <Text style={{ color: 'var(--text-secondary)' }}>{new Date(parsedDocument.upload_time).toLocaleString()}</Text></p>
                                                                </div>
                                                            }
                                                            type="success"
                                                            showIcon
                                                        />
                                                    </Space>
                                                ) : (
                                                    <Alert
                                                        message="等待文件上传"
                                                        description="请选择TXT格式的通讯录文件进行解析"
                                                        type="info"
                                                        showIcon
                                                    />
                                                )}
                                            </Card>

                                            {/* 选择状态 */}
                                            <Card title={
                                                <span style={{ color: 'var(--text-primary)' }}>选择状态</span>
                                            } size="small" style={{ 
                                                background: 'var(--card-bg)',
                                                border: '1px solid var(--border-color)'
                                            }}>
                                                {selectedContacts.length > 0 ? (
                                                    <Space direction="vertical" style={{ width: '100%' }}>
                                                        <Alert
                                                            message={`已选择 ${selectedContacts.length} 个联系人`}
                                                            description="联系人已准备就绪，可以进行VCF导入或关注操作"
                                                            type="success"
                                                            showIcon
                                                        />
                                                        <Button 
                                                            type="primary" 
                                                            block
                                                            icon={<MobileOutlined />}
                                                            onClick={() => setActiveTab('import')}
                                                        >
                                                            开始导入到设备
                                                        </Button>
                                                    </Space>
                                                ) : (
                                                    <Alert
                                                        message="未选择联系人"
                                                        description="解析完成后选择需要处理的联系人"
                                                        type="warning"
                                                        showIcon
                                                    />
                                                )}
                                            </Card>

                                            {/* 操作指南 */}
                                            <Card title={
                                                <span style={{ color: 'var(--text-primary)' }}>操作指南</span>
                                            } size="small" style={{ 
                                                background: 'var(--card-bg)',
                                                border: '1px solid var(--border-color)'
                                            }}>
                                                <Paragraph style={{ fontSize: '13px' }}>
                                                    <Title level={5} style={{ fontSize: '14px', margin: '8px 0 4px', color: 'var(--text-primary)' }}>
                                                        支持的文件格式：
                                                    </Title>
                                                    <Text code style={{ fontSize: '12px', background: 'rgba(255, 255, 255, 0.1)' }}>
                                                        张三,13800138000,朋友
                                                    </Text><br/>
                                                    <Text code style={{ fontSize: '12px', background: 'rgba(255, 255, 255, 0.1)' }}>
                                                        李四,13900139000
                                                    </Text><br/>
                                                    <Text code style={{ fontSize: '12px', background: 'rgba(255, 255, 255, 0.1)' }}>
                                                        王五,15000150000,wang@email.com
                                                    </Text>
                                                    
                                                    <Divider style={{ margin: '12px 0', borderColor: 'var(--border-color)' }} />
                                                    
                                                    <Title level={5} style={{ fontSize: '14px', margin: '8px 0 4px', color: 'var(--text-primary)' }}>
                                                        操作流程：
                                                    </Title>
                                                    <Text style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                                                        1. 上传TXT文件<br/>
                                                        2. 自动解析联系人<br/>
                                                        3. 预览并确认数据<br/>
                                                        4. 选择联系人进行处理
                                                    </Text>
                                                </Paragraph>
                                            </Card>
                                        </Space>
                                    </Col>
                                </Row>
                            )
                        },
                        {
                            key: 'import',
                            label: (
                                <Space>
                                    <MobileOutlined />
                                    设备导入
                                </Space>
                            ),
                            disabled: selectedContacts.length === 0,
                            children: selectedContacts.length > 0 ? (
                                <ContactImportManager
                                    contacts={selectedContacts}
                                    onImportComplete={handleImportComplete}
                                    onError={handleImportError}
                                />
                            ) : (
                                <Card>
                                    <Alert
                                        type="warning"
                                        message="请先选择联系人"
                                        description="请回到文件解析页面，上传并选择需要导入的联系人"
                                        showIcon
                                        action={
                                            <Button 
                                                type="primary"
                                                onClick={() => setActiveTab('upload')}
                                            >
                                                返回选择
                                            </Button>
                                        }
                                    />
                                </Card>
                            )
                        },
                        {
                            key: 'results',
                            label: (
                                <Space>
                                    <CheckCircleOutlined />
                                    导入结果
                                </Space>
                            ),
                            disabled: importResults.length === 0,
                            children: importResults.length > 0 ? (
                                <Card title="导入结果摘要">
                                    <Row gutter={16} className="mb-4">
                                        <Col span={6}>
                                            <Card size="small" className="text-center">
                                                <div className="text-2xl font-bold text-blue-600">{importResults.length}</div>
                                                <div className="text-sm text-gray-600">处理设备</div>
                                            </Card>
                                        </Col>
                                        <Col span={6}>
                                            <Card size="small" className="text-center">
                                                <div className="text-2xl font-bold text-green-600">
                                                    {importResults.filter(r => r.success).length}
                                                </div>
                                                <div className="text-sm text-gray-600">成功设备</div>
                                            </Card>
                                        </Col>
                                        <Col span={6}>
                                            <Card size="small" className="text-center">
                                                <div className="text-2xl font-bold text-purple-600">
                                                    {importResults.reduce((sum, r) => sum + r.importedContacts, 0)}
                                                </div>
                                                <div className="text-sm text-gray-600">总导入数</div>
                                            </Card>
                                        </Col>
                                        <Col span={6}>
                                            <Card size="small" className="text-center">
                                                <div className="text-2xl font-bold text-red-600">
                                                    {importResults.reduce((sum, r) => sum + r.failedContacts, 0)}
                                                </div>
                                                <div className="text-sm text-gray-600">失败数量</div>
                                            </Card>
                                        </Col>
                                    </Row>

                                    <div className="space-y-3">
                                        {importResults.map((result, index) => (
                                            <Card key={index} size="small">
                                                <Row align="middle" justify="space-between">
                                                    <Col>
                                                        <Space>
                                                            <MobileOutlined />
                                                            <Text strong>设备 {index + 1}</Text>
                                                        </Space>
                                                    </Col>
                                                    <Col>
                                                        {result.success ? (
                                                            <Alert
                                                                type="success"
                                                                message={`成功导入 ${result.importedContacts}/${result.totalContacts} 个联系人`}
                                                                banner
                                                            />
                                                        ) : (
                                                            <Alert
                                                                type="error"
                                                                message={result.message}
                                                                banner
                                                            />
                                                        )}
                                                    </Col>
                                                </Row>
                                            </Card>
                                        ))}
                                    </div>

                                    <div style={{ marginTop: '24px', textAlign: 'center' }}>
                                        <Space>
                                            <Button type="primary" onClick={handleRestart}>
                                                重新开始
                                            </Button>
                                            <Button onClick={() => setActiveTab('import')}>
                                                查看导入过程
                                            </Button>
                                        </Space>
                                    </div>
                                </Card>
                            ) : (
                                <Card>
                                    <Alert
                                        type="info"
                                        message="暂无导入结果"
                                        description="完成导入操作后，结果将在此处显示"
                                        showIcon
                                    />
                                </Card>
                            )
                        }
                    ]}
                />
            </div>
        </div>
    );
};

export default ContactManagementPage;
