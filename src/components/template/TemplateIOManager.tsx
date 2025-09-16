import React, { useState } from 'react';
import {
  Card,
  Button,
  Space,
  Typography,
  Input,
  message,
  Modal,
  Form,
  Upload,
  List,
  Tag,
  Rate,
  Avatar,
  Tooltip,
  QRCode,
  Alert,
  Row,
  Col,
  Divider,
  Progress,
} from 'antd';
import {
  ShareAltOutlined,
  DownloadOutlined,
  UploadOutlined,
  LinkOutlined,
  FileTextOutlined,
  CheckCircleOutlined,
} from '@ant-design/icons';

const { Title, Text, Paragraph } = Typography;
const { TextArea } = Input;

// 分享配置
interface ShareConfig {
  includeMetadata: boolean;
  includeSteps: boolean;
  includeDescription: boolean;
  format: 'json' | 'text' | 'url';
  compression: boolean;
}

// 导入导出管理器
interface TemplateIOManagerProps {
  templates: any[];
  onImportTemplate: (template: any) => void;
  onExportTemplate: (template: any) => void;
}

const TemplateIOManager: React.FC<TemplateIOManagerProps> = ({ 
  templates, 
  onImportTemplate, 
  onExportTemplate 
}) => {
  const [showShareModal, setShowShareModal] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  const [showBatchExportModal, setShowBatchExportModal] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<any>(null);
  const [shareConfig, setShareConfig] = useState<ShareConfig>({
    includeMetadata: true,
    includeSteps: true,
    includeDescription: true,
    format: 'json',
    compression: false
  });
  const [shareUrl, setShareUrl] = useState<string>('');
  const [importProgress, setImportProgress] = useState<number>(0);
  const [importedTemplates, setImportedTemplates] = useState<any[]>([]);

  // 生成分享链接
  const generateShareUrl = (template: any, config: ShareConfig) => {
    const shareData = {
      name: template.name,
      ...(config.includeDescription && { description: template.description }),
      ...(config.includeMetadata && { 
        metadata: template.metadata,
        category: template.category,
        tags: template.tags
      }),
      ...(config.includeSteps && { steps: template.steps }),
      sharedAt: new Date().toISOString()
    };

    // 这里可以集成实际的分享服务，如 GitHub Gist, Pastebin 等
    const encodedData = encodeURIComponent(JSON.stringify(shareData));
    const mockShareUrl = `https://scriptshare.example.com/template/${btoa(template.id)}?data=${encodedData}`;
    
    return mockShareUrl;
  };

  // 处理分享
  const handleShare = async () => {
    if (!selectedTemplate) return;

    try {
      const url = generateShareUrl(selectedTemplate, shareConfig);
      setShareUrl(url);
      
      // 复制到剪贴板
      await navigator.clipboard.writeText(url);
      message.success('分享链接已复制到剪贴板！');
    } catch (error) {
      console.error('分享失败:', error);
      message.error('分享失败，请重试');
    }
  };

  // 处理单个模板导出
  const handleExportSingle = (template: any) => {
    const exportData = {
      ...template,
      exportedAt: new Date().toISOString(),
      version: '1.0.0'
    };

    const dataStr = JSON.stringify(exportData, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${template.name.replace(/[^a-zA-Z0-9]/g, '_')}.template.json`;
    link.click();
    URL.revokeObjectURL(url);
    
    message.success('模板已导出');
    onExportTemplate(template);
  };

  // 处理批量导出
  const handleBatchExport = (selectedTemplateIds: string[]) => {
    const selectedTemplates = templates.filter(t => selectedTemplateIds.includes(t.id));
    const exportData = {
      templates: selectedTemplates,
      exportedAt: new Date().toISOString(),
      count: selectedTemplates.length,
      version: '1.0.0'
    };

    const dataStr = JSON.stringify(exportData, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `script_templates_batch_${new Date().toISOString().split('T')[0]}.json`;
    link.click();
    URL.revokeObjectURL(url);
    
    message.success(`已导出 ${selectedTemplates.length} 个模板`);
    setShowBatchExportModal(false);
  };

  // 处理文件导入
  const handleFileImport = (file: File) => {
    const reader = new FileReader();
    setImportProgress(10);
    
    reader.onload = (e) => {
      try {
        setImportProgress(50);
        const fileContent = e.target?.result as string;
        const importData = JSON.parse(fileContent);
        
        let templatesData: any[] = [];
        
        // 判断是单个模板还是批量模板
        if (importData.templates && Array.isArray(importData.templates)) {
          // 批量导入
          templatesData = importData.templates;
        } else if (importData.name && importData.steps) {
          // 单个模板
          templatesData = [importData];
        } else {
          throw new Error('无效的模板文件格式');
        }
        
        setImportProgress(80);
        
        // 验证模板数据
        const validTemplates = templatesData.filter(template => {
          return template.name && 
                 template.steps && 
                 Array.isArray(template.steps) &&
                 template.metadata;
        });
        
        if (validTemplates.length === 0) {
          throw new Error('文件中没有有效的模板数据');
        }
        
        setImportProgress(100);
        setImportedTemplates(validTemplates);
        
        message.success(`成功解析 ${validTemplates.length} 个模板`);
        
      } catch (error) {
        console.error('导入失败:', error);
        message.error('文件格式错误或数据无效');
        setImportProgress(0);
      }
    };
    
    reader.onerror = () => {
      message.error('文件读取失败');
      setImportProgress(0);
    };
    
    reader.readAsText(file);
    return false; // 阻止自动上传
  };

  // 确认导入模板
  const handleConfirmImport = (templates: any[]) => {
    templates.forEach(template => {
      const importedTemplate = {
        ...template,
        id: `imported_${Date.now()}_${Math.random()}`,
        author: '导入',
        importedAt: new Date().toISOString().split('T')[0],
        isOfficial: false
      };
      onImportTemplate(importedTemplate);
    });
    
    setImportedTemplates([]);
    setImportProgress(0);
    setShowImportModal(false);
    message.success(`成功导入 ${templates.length} 个模板！`);
  };

  // 从URL导入
  const handleUrlImport = async (url: string) => {
    try {
      setImportProgress(20);
      
      // 这里应该从实际的分享服务获取数据
      // 目前使用模拟实现
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error('无法获取分享的模板数据');
      }
      
      setImportProgress(60);
      const templateData = await response.json();
      
      setImportProgress(100);
      setImportedTemplates([templateData]);
      
      message.success('从分享链接获取模板成功');
      
    } catch (error) {
      console.error('URL导入失败:', error);
      message.error('分享链接无效或网络错误');
      setImportProgress(0);
    }
  };

  return (
    <div>
      {/* 导入导出工具栏 */}
      <Card style={{ marginBottom: 16 }}>
        <Row gutter={16} align="middle">
          <Col span={12}>
            <Space>
              <Button 
                type="primary" 
                icon={<UploadOutlined />}
                onClick={() => setShowImportModal(true)}
              >
                导入模板
              </Button>
              <Button 
                icon={<DownloadOutlined />}
                onClick={() => setShowBatchExportModal(true)}
              >
                批量导出
              </Button>
            </Space>
          </Col>
          <Col span={12} style={{ textAlign: 'right' }}>
            <Text type="secondary">
              共 {templates.length} 个模板 | 支持 JSON 格式导入导出
            </Text>
          </Col>
        </Row>
      </Card>

      {/* 模板列表，增加分享和导出功能 */}
      <List
        grid={{ gutter: 16, column: 3 }}
        dataSource={templates}
        renderItem={(template) => (
          <List.Item>
            <Card
              size="small"
              title={template.name}
              extra={
                <Space>
                  <Tooltip title="分享模板">
                    <Button
                      size="small"
                      icon={<ShareAltOutlined />}
                      onClick={() => {
                        setSelectedTemplate(template);
                        setShowShareModal(true);
                      }}
                    />
                  </Tooltip>
                  <Tooltip title="导出模板">
                    <Button
                      size="small"
                      icon={<DownloadOutlined />}
                      onClick={() => handleExportSingle(template)}
                    />
                  </Tooltip>
                </Space>
              }
            >
              <Paragraph ellipsis={{ rows: 2 }} style={{ marginBottom: 8 }}>
                {template.description}
              </Paragraph>
              <div style={{ marginBottom: 8 }}>
                {template.tags?.slice(0, 3).map((tag: string) => (
                  <Tag key={tag}>{tag}</Tag>
                ))}
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Rate disabled defaultValue={template.rating || 0} allowHalf style={{ fontSize: 12 }} />
                <Text type="secondary" style={{ fontSize: 11 }}>
                  {template.steps?.length || 0} 个步骤
                </Text>
              </div>
            </Card>
          </List.Item>
        )}
      />

      {/* 分享模板对话框 */}
      <Modal
        title="分享模板"
        open={showShareModal}
        onCancel={() => setShowShareModal(false)}
        width={600}
        footer={[
          <Button key="cancel" onClick={() => setShowShareModal(false)}>
            取消
          </Button>,
          <Button key="share" type="primary" onClick={handleShare}>
            生成分享链接
          </Button>
        ]}
      >
        {selectedTemplate && (
          <div>
            <Alert
              message={`分享模板: ${selectedTemplate.name}`}
              description="选择要包含在分享中的内容"
              type="info"
              style={{ marginBottom: 16 }}
            />
            
            <Form layout="vertical">
              <Form.Item label="分享内容">
                <Space direction="vertical">
                  <label>
                    <input
                      type="checkbox"
                      checked={shareConfig.includeMetadata}
                      onChange={(e) => setShareConfig(prev => ({ ...prev, includeMetadata: e.target.checked }))}
                    />
                    {' '}包含元数据（分类、标签、作者等）
                  </label>
                  <label>
                    <input
                      type="checkbox"
                      checked={shareConfig.includeSteps}
                      onChange={(e) => setShareConfig(prev => ({ ...prev, includeSteps: e.target.checked }))}
                    />
                    {' '}包含脚本步骤
                  </label>
                  <label>
                    <input
                      type="checkbox"
                      checked={shareConfig.includeDescription}
                      onChange={(e) => setShareConfig(prev => ({ ...prev, includeDescription: e.target.checked }))}
                    />
                    {' '}包含描述信息
                  </label>
                </Space>
              </Form.Item>
            </Form>
            
            {shareUrl && (
              <div style={{ marginTop: 16 }}>
                <Divider />
                <Title level={5}>分享链接</Title>
                <Input.Group compact>
                  <Input
                    style={{ width: 'calc(100% - 100px)' }}
                    value={shareUrl}
                    readOnly
                  />
                  <Button
                    icon={<LinkOutlined />}
                    onClick={() => {
                      navigator.clipboard.writeText(shareUrl);
                      message.success('链接已复制');
                    }}
                  >
                    复制
                  </Button>
                </Input.Group>
                
                <div style={{ marginTop: 16, textAlign: 'center' }}>
                  <QRCode value={shareUrl} size={150} />
                  <div style={{ marginTop: 8 }}>
                    <Text type="secondary">扫描二维码分享</Text>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </Modal>

      {/* 导入模板对话框 */}
      <Modal
        title="导入模板"
        open={showImportModal}
        onCancel={() => {
          setShowImportModal(false);
          setImportedTemplates([]);
          setImportProgress(0);
        }}
        width={700}
        footer={null}
      >
        <div>
          {importProgress > 0 && (
            <div style={{ marginBottom: 16 }}>
              <Progress percent={importProgress} status={importProgress === 100 ? 'success' : 'active'} />
            </div>
          )}
          
          {importedTemplates.length === 0 ? (
            <div>
              <Alert
                message="导入方式"
                description="支持从文件或分享链接导入模板"
                type="info"
                style={{ marginBottom: 16 }}
              />
              
              <Row gutter={16}>
                <Col span={12}>
                  <Card title="从文件导入" size="small">
                    <Upload.Dragger
                      accept=".json"
                      beforeUpload={handleFileImport}
                      showUploadList={false}
                    >
                      <p className="ant-upload-drag-icon">
                        <FileTextOutlined />
                      </p>
                      <p className="ant-upload-text">点击或拖拽文件到此区域</p>
                      <p className="ant-upload-hint">支持 .json 格式</p>
                    </Upload.Dragger>
                  </Card>
                </Col>
                
                <Col span={12}>
                  <Card title="从链接导入" size="small">
                    <Form onFinish={(values) => handleUrlImport(values.url)}>
                      <Form.Item
                        name="url"
                        rules={[
                          { required: true, message: '请输入分享链接' },
                          { type: 'url', message: '请输入有效的URL' }
                        ]}
                      >
                        <Input placeholder="粘贴分享链接" />
                      </Form.Item>
                      <Form.Item>
                        <Button type="primary" htmlType="submit" block>
                          从链接导入
                        </Button>
                      </Form.Item>
                    </Form>
                  </Card>
                </Col>
              </Row>
            </div>
          ) : (
            <div>
              <Alert
                message={`解析成功！找到 ${importedTemplates.length} 个模板`}
                type="success"
                style={{ marginBottom: 16 }}
              />
              
              <List
                dataSource={importedTemplates}
                renderItem={(template, index) => (
                  <List.Item>
                    <List.Item.Meta
                      avatar={<Avatar icon={<CheckCircleOutlined />} style={{ backgroundColor: '#52c41a' }} />}
                      title={template.name}
                      description={
                        <div>
                          <Paragraph ellipsis={{ rows: 1 }}>{template.description}</Paragraph>
                          <Space>
                            <Tag>{template.category}</Tag>
                            <Text type="secondary">{template.steps?.length || 0} 个步骤</Text>
                            <Text type="secondary">难度: {template.metadata?.difficulty || '未知'}</Text>
                          </Space>
                        </div>
                      }
                    />
                  </List.Item>
                )}
              />
              
              <div style={{ textAlign: 'right', marginTop: 16 }}>
                <Space>
                  <Button onClick={() => {
                    setImportedTemplates([]);
                    setImportProgress(0);
                  }}>
                    重新选择
                  </Button>
                  <Button 
                    type="primary" 
                    onClick={() => handleConfirmImport(importedTemplates)}
                  >
                    确认导入
                  </Button>
                </Space>
              </div>
            </div>
          )}
        </div>
      </Modal>

      {/* 批量导出对话框 */}
      <Modal
        title="批量导出模板"
        open={showBatchExportModal}
        onCancel={() => setShowBatchExportModal(false)}
        width={600}
        footer={null}
      >
        <Form
          onFinish={(values) => handleBatchExport(values.templates)}
          initialValues={{ templates: [] }}
        >
          <Form.Item
            name="templates"
            label="选择要导出的模板"
            rules={[{ required: true, message: '请至少选择一个模板' }]}
          >
            <List
              dataSource={templates}
              renderItem={(template) => (
                <List.Item>
                  <List.Item.Meta
                    avatar={<input type="checkbox" value={template.id} />}
                    title={template.name}
                    description={`${template.steps?.length || 0} 个步骤 | ${template.category}`}
                  />
                </List.Item>
              )}
            />
          </Form.Item>
          
          <Form.Item>
            <div style={{ textAlign: 'right' }}>
              <Space>
                <Button onClick={() => setShowBatchExportModal(false)}>
                  取消
                </Button>
                <Button type="primary" htmlType="submit">
                  导出选中模板
                </Button>
              </Space>
            </div>
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default TemplateIOManager;

