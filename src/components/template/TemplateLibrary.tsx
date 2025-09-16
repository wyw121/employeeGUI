import React, { useState, useEffect } from 'react';
import {
  Card,
  Row,
  Col,
  Button,
  Space,
  Typography,
  Input,
  Select,
  message,
  Modal,
  Form,
  Upload,
  Tag,
  Rate,
  Avatar,
  Tooltip,
  Badge,
  Tabs,
  Empty,
} from 'antd';
import {
  PlusOutlined,
  SearchOutlined,
  DownloadOutlined,
  UploadOutlined,
  StarOutlined,
  HeartOutlined,
  MessageOutlined,
  UserOutlined,
  FolderOpenOutlined,
  FileTextOutlined,
  CloudDownloadOutlined,
  ThunderboltOutlined,
  AppstoreOutlined,
} from '@ant-design/icons';

const { Title, Text, Paragraph } = Typography;
const { TextArea } = Input;
const { Option } = Select;
const { TabPane } = Tabs;

// 模板分类
interface TemplateCategory {
  id: string;
  name: string;
  description: string;
  icon: React.ReactNode;
  color: string;
}

// 脚本模板
interface ScriptTemplate {
  id: string;
  name: string;
  description: string;
  category: string;
  author: string;
  version: string;
  rating: number;
  downloads: number;
  tags: string[];
  createdAt: string;
  updatedAt: string;
  isOfficial: boolean;
  isFavorite: boolean;
  thumbnail?: string;
  steps: any[];
  metadata: {
    targetApp: string;
    deviceType: string[];
    difficulty: 'beginner' | 'intermediate' | 'advanced';
    estimatedTime: string;
  };
}

// 预定义模板分类
const TEMPLATE_CATEGORIES: TemplateCategory[] = [
  {
    id: 'social',
    name: '社交应用',
    description: '微信、QQ、小红书等社交软件自动化',
    icon: <MessageOutlined />,
    color: '#52c41a'
  },
  {
    id: 'ecommerce',
    name: '电商购物',
    description: '淘宝、京东、拼多多等电商平台自动化',
    icon: <AppstoreOutlined />,
    color: '#1890ff'
  },
  {
    id: 'productivity',
    name: '办公效率',
    description: '钉钉、企业微信、邮箱等办公应用自动化',
    icon: <ThunderboltOutlined />,
    color: '#722ed1'
  },
  {
    id: 'entertainment',
    name: '娱乐应用',
    description: '抖音、快手、视频播放器等娱乐应用自动化',
    icon: <StarOutlined />,
    color: '#ff4d4f'
  },
  {
    id: 'system',
    name: '系统操作',
    description: '系统设置、文件管理、网络配置等系统级操作',
    icon: <FolderOpenOutlined />,
    color: '#faad14'
  },
  {
    id: 'custom',
    name: '自定义',
    description: '用户创建的自定义模板',
    icon: <UserOutlined />,
    color: '#13c2c2'
  }
];

// 预定义脚本模板
const PREDEFINED_TEMPLATES: ScriptTemplate[] = [
  {
    id: 'xiaohongshu-follow',
    name: '小红书批量关注',
    description: '自动打开小红书，导入通讯录，批量关注联系人',
    category: 'social',
    author: '官方',
    version: '1.0.0',
    rating: 4.8,
    downloads: 1234,
    tags: ['小红书', '关注', '通讯录', '社交'],
    createdAt: '2024-01-15',
    updatedAt: '2024-01-20',
    isOfficial: true,
    isFavorite: false,
    steps: [
      { type: 'open_app', name: '打开小红书', parameters: { package_name: 'com.xingin.xhs' } },
      { type: 'tap', name: '点击头像', parameters: { coordinate: '100,200' } },
      { type: 'wait_for_element', name: '等待侧边栏', parameters: { condition_type: 'text', selector: '发现好友' } },
      { type: 'tap', name: '点击发现好友', parameters: { coordinate: '200,300' } }
    ],
    metadata: {
      targetApp: '小红书',
      deviceType: ['Android', 'iOS'],
      difficulty: 'beginner',
      estimatedTime: '2-3分钟'
    }
  },
  {
    id: 'wechat-group-message',
    name: '微信群发消息',
    description: '批量向多个微信群发送相同消息',
    category: 'social',
    author: '社区',
    version: '1.2.0',
    rating: 4.6,
    downloads: 856,
    tags: ['微信', '群发', '消息', '批量'],
    createdAt: '2024-01-10',
    updatedAt: '2024-01-18',
    isOfficial: false,
    isFavorite: true,
    steps: [
      { type: 'open_app', name: '打开微信', parameters: { package_name: 'com.tencent.mm' } },
      { type: 'tap', name: '点击通讯录', parameters: { coordinate: '150,600' } },
      { type: 'input', name: '搜索群聊', parameters: { text: '工作群' } }
    ],
    metadata: {
      targetApp: '微信',
      deviceType: ['Android'],
      difficulty: 'intermediate',
      estimatedTime: '5-10分钟'
    }
  },
  {
    id: 'taobao-auto-buy',
    name: '淘宝自动下单',
    description: '自动搜索商品，加入购物车，完成支付流程',
    category: 'ecommerce',
    author: '官方',
    version: '2.0.1',
    rating: 4.9,
    downloads: 2105,
    tags: ['淘宝', '购物', '自动下单', '支付'],
    createdAt: '2023-12-20',
    updatedAt: '2024-01-25',
    isOfficial: true,
    isFavorite: false,
    steps: [
      { type: 'open_app', name: '打开淘宝', parameters: { package_name: 'com.taobao.taobao' } },
      { type: 'input', name: '搜索商品', parameters: { text: 'iPhone 15' } },
      { type: 'tap', name: '选择商品', parameters: { coordinate: '200,400' } }
    ],
    metadata: {
      targetApp: '淘宝',
      deviceType: ['Android', 'iOS'],
      difficulty: 'advanced',
      estimatedTime: '3-5分钟'
    }
  }
];

/**
 * 模板库系统组件
 */
const TemplateLibrary: React.FC = () => {
  const [templates, setTemplates] = useState<ScriptTemplate[]>(PREDEFINED_TEMPLATES);
  const [filteredTemplates, setFilteredTemplates] = useState<ScriptTemplate[]>(PREDEFINED_TEMPLATES);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [searchText, setSearchText] = useState<string>('');
  const [sortBy, setSortBy] = useState<string>('rating');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  const [activeTab, setActiveTab] = useState('browse');
  const [form] = Form.useForm();

  // 加载用户模板
  useEffect(() => {
    loadUserTemplates();
  }, []);

  // 过滤和排序模板
  useEffect(() => {
    let filtered = templates;

    // 分类过滤
    if (selectedCategory !== 'all') {
      filtered = filtered.filter(t => t.category === selectedCategory);
    }

    // 搜索过滤
    if (searchText) {
      filtered = filtered.filter(t => 
        t.name.toLowerCase().includes(searchText.toLowerCase()) ||
        t.description.toLowerCase().includes(searchText.toLowerCase()) ||
        t.tags.some(tag => tag.toLowerCase().includes(searchText.toLowerCase()))
      );
    }

    // 排序
    filtered.sort((a, b) => {
      switch (sortBy) {
        case 'rating':
          return b.rating - a.rating;
        case 'downloads':
          return b.downloads - a.downloads;
        case 'date':
          return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
        case 'name':
          return a.name.localeCompare(b.name);
        default:
          return 0;
      }
    });

    setFilteredTemplates(filtered);
  }, [templates, selectedCategory, searchText, sortBy]);

  // 加载用户模板
  const loadUserTemplates = () => {
    try {
      const userTemplates = JSON.parse(localStorage.getItem('userTemplates') || '[]');
      setTemplates([...PREDEFINED_TEMPLATES, ...userTemplates]);
    } catch (error) {
      console.error('加载用户模板失败:', error);
    }
  };

  // 保存用户模板
  const saveUserTemplate = (template: ScriptTemplate) => {
    try {
      const userTemplates = JSON.parse(localStorage.getItem('userTemplates') || '[]');
      userTemplates.push(template);
      localStorage.setItem('userTemplates', JSON.stringify(userTemplates));
      setTemplates([...PREDEFINED_TEMPLATES, ...userTemplates]);
      message.success('模板保存成功！');
    } catch (error) {
      console.error('保存模板失败:', error);
      message.error('保存模板失败');
    }
  };

  // 使用模板
  const handleUseTemplate = (template: ScriptTemplate) => {
    Modal.confirm({
      title: '使用模板',
      content: `确定要使用模板 "${template.name}" 吗？这将跳转到流程构建器。`,
      okText: '确定',
      cancelText: '取消',
      onOk: () => {
        // 将模板数据传递给流程构建器
        const templateData = {
          name: template.name,
          steps: template.steps,
          metadata: template.metadata
        };
        localStorage.setItem('selectedTemplate', JSON.stringify(templateData));
        message.success('模板已加载，请前往流程构建器');
        // 这里可以添加路由跳转逻辑
      }
    });
  };

  // 下载模板
  const handleDownloadTemplate = (template: ScriptTemplate) => {
    const dataStr = JSON.stringify(template, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${template.name}.template.json`;
    link.click();
    URL.revokeObjectURL(url);
    message.success('模板已下载');
  };

  // 收藏模板
  const handleFavoriteTemplate = (templateId: string) => {
    setTemplates(prev => prev.map(t => 
      t.id === templateId ? { ...t, isFavorite: !t.isFavorite } : t
    ));
    message.success('已更新收藏状态');
  };

  // 创建新模板
  const handleCreateTemplate = (values: any) => {
    const newTemplate: ScriptTemplate = {
      id: `custom_${Date.now()}`,
      name: values.name,
      description: values.description,
      category: values.category,
      author: '我',
      version: '1.0.0',
      rating: 0,
      downloads: 0,
      tags: values.tags ? values.tags.split(',').map((t: string) => t.trim()) : [],
      createdAt: new Date().toISOString().split('T')[0],
      updatedAt: new Date().toISOString().split('T')[0],
      isOfficial: false,
      isFavorite: false,
      steps: [],
      metadata: {
        targetApp: values.targetApp,
        deviceType: values.deviceType || ['Android'],
        difficulty: values.difficulty,
        estimatedTime: values.estimatedTime || '未知'
      }
    };

    saveUserTemplate(newTemplate);
    setShowCreateModal(false);
    form.resetFields();
  };

  // 导入模板
  const handleImportTemplate = (file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const templateData = JSON.parse(e.target?.result as string);
        const importedTemplate: ScriptTemplate = {
          ...templateData,
          id: `imported_${Date.now()}`,
          author: '导入',
          createdAt: new Date().toISOString().split('T')[0],
          updatedAt: new Date().toISOString().split('T')[0],
          isOfficial: false
        };
        saveUserTemplate(importedTemplate);
        setShowImportModal(false);
        message.success('模板导入成功！');
      } catch (error) {
        console.error('模板格式错误:', error);
        message.error('模板格式错误，导入失败');
      }
    };
    reader.readAsText(file);
    return false; // 阻止自动上传
  };

  // 渲染模板卡片
  const renderTemplateCard = (template: ScriptTemplate) => {
    const getDifficultyText = (difficulty: string) => {
      switch (difficulty) {
        case 'beginner': return '初级';
        case 'intermediate': return '中级';
        case 'advanced': return '高级';
        default: return difficulty;
      }
    };

    return (
      <Card
        key={template.id}
        hoverable
        style={{ marginBottom: 16 }}
        actions={[
          <Tooltip key="use" title="使用模板">
            <Button
              type="primary"
              icon={<ThunderboltOutlined />}
              onClick={() => handleUseTemplate(template)}
            >
              使用
            </Button>
          </Tooltip>,
          <Tooltip key="download" title="下载模板">
            <Button
              icon={<DownloadOutlined />}
              onClick={() => handleDownloadTemplate(template)}
            />
          </Tooltip>,
          <Tooltip key="favorite" title={template.isFavorite ? '取消收藏' : '收藏'}>
            <Button
              icon={<HeartOutlined />}
              style={{ color: template.isFavorite ? '#ff4d4f' : undefined }}
              onClick={() => handleFavoriteTemplate(template.id)}
            />
          </Tooltip>,
        ]}
      >
        <Card.Meta
          avatar={
            <Avatar
              style={{ 
                backgroundColor: TEMPLATE_CATEGORIES.find(c => c.id === template.category)?.color || '#1890ff' 
              }}
              icon={TEMPLATE_CATEGORIES.find(c => c.id === template.category)?.icon || <FileTextOutlined />}
            />
          }
          title={
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span>{template.name}</span>
              {template.isOfficial && <Tag color="blue">官方</Tag>}
              {template.isFavorite && <HeartOutlined style={{ color: '#ff4d4f' }} />}
            </div>
          }
          description={
            <div>
              <Paragraph ellipsis={{ rows: 2 }} style={{ marginBottom: 8 }}>
                {template.description}
              </Paragraph>
              <div style={{ marginBottom: 8 }}>
                {template.tags.map(tag => (
                  <Tag key={tag}>{tag}</Tag>
                ))}
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Space size="small">
                  <Rate disabled defaultValue={template.rating} allowHalf style={{ fontSize: 12 }} />
                  <Text type="secondary" style={{ fontSize: 12 }}>
                    {template.rating}
                  </Text>
                </Space>
                <Space size="small">
                  <Badge count={template.downloads} style={{ backgroundColor: '#52c41a' }} />
                  <Text type="secondary" style={{ fontSize: 12 }}>
                    下载
                  </Text>
                </Space>
              </div>
              <div style={{ marginTop: 8 }}>
                <Text type="secondary" style={{ fontSize: 11 }}>
                  目标应用: {template.metadata.targetApp} | 
                  难度: {getDifficultyText(template.metadata.difficulty)} | 
                  预计时间: {template.metadata.estimatedTime}
                </Text>
              </div>
            </div>
          }
        />
      </Card>
    );
  };

  return (
    <div style={{ padding: '24px', background: '#f0f2f5', minHeight: '100vh' }}>
      <div style={{ maxWidth: 1200, margin: '0 auto' }}>
        <div style={{ marginBottom: 24 }}>
          <Title level={2} style={{ margin: 0, color: '#1890ff' }}>
            📚 脚本模板库
          </Title>
          <Paragraph type="secondary">
            浏览、使用、创建和分享自动化脚本模板，提升您的工作效率
          </Paragraph>
        </div>

        <Tabs activeKey={activeTab} onChange={setActiveTab}>
          <TabPane tab="浏览模板" key="browse">
            {/* 搜索和过滤栏 */}
            <Card style={{ marginBottom: 16 }}>
              <Row gutter={16} align="middle">
                <Col span={8}>
                  <Input
                    placeholder="搜索模板名称、描述或标签..."
                    prefix={<SearchOutlined />}
                    value={searchText}
                    onChange={(e) => setSearchText(e.target.value)}
                    allowClear
                  />
                </Col>
                <Col span={4}>
                  <Select
                    placeholder="选择分类"
                    value={selectedCategory}
                    onChange={setSelectedCategory}
                    style={{ width: '100%' }}
                  >
                    <Option value="all">全部分类</Option>
                    {TEMPLATE_CATEGORIES.map(category => (
                      <Option key={category.id} value={category.id}>
                        {category.name}
                      </Option>
                    ))}
                  </Select>
                </Col>
                <Col span={4}>
                  <Select
                    placeholder="排序方式"
                    value={sortBy}
                    onChange={setSortBy}
                    style={{ width: '100%' }}
                  >
                    <Option value="rating">按评分</Option>
                    <Option value="downloads">按下载量</Option>
                    <Option value="date">按更新时间</Option>
                    <Option value="name">按名称</Option>
                  </Select>
                </Col>
                <Col span={8}>
                  <Space>
                    <Button
                      type="primary"
                      icon={<PlusOutlined />}
                      onClick={() => setShowCreateModal(true)}
                    >
                      创建模板
                    </Button>
                    <Button
                      icon={<UploadOutlined />}
                      onClick={() => setShowImportModal(true)}
                    >
                      导入模板
                    </Button>
                  </Space>
                </Col>
              </Row>
            </Card>

            {/* 分类卡片 */}
            <Card title="模板分类" style={{ marginBottom: 16 }}>
              <Row gutter={[16, 16]}>
                {TEMPLATE_CATEGORIES.map(category => {
                  const count = templates.filter(t => t.category === category.id).length;
                  return (
                    <Col span={4} key={category.id}>
                      <Card
                        size="small"
                        hoverable
                        style={{
                          textAlign: 'center',
                          border: selectedCategory === category.id ? `2px solid ${category.color}` : '1px solid #d9d9d9'
                        }}
                        onClick={() => setSelectedCategory(
                          selectedCategory === category.id ? 'all' : category.id
                        )}
                      >
                        <div style={{ fontSize: 24, color: category.color, marginBottom: 8 }}>
                          {category.icon}
                        </div>
                        <div style={{ fontWeight: 'bold', marginBottom: 4 }}>
                          {category.name}
                        </div>
                        <div style={{ fontSize: 12, color: '#666' }}>
                          {count} 个模板
                        </div>
                      </Card>
                    </Col>
                  );
                })}
              </Row>
            </Card>

            {/* 模板列表 */}
            <div>
              {filteredTemplates.length === 0 ? (
                <Empty
                  description="暂无符合条件的模板"
                  image={Empty.PRESENTED_IMAGE_SIMPLE}
                />
              ) : (
                <Row gutter={[16, 16]}>
                  {filteredTemplates.map(template => (
                    <Col span={8} key={template.id}>
                      {renderTemplateCard(template)}
                    </Col>
                  ))}
                </Row>
              )}
            </div>
          </TabPane>

          <TabPane tab="我的收藏" key="favorites">
            <Row gutter={[16, 16]}>
              {templates.filter(t => t.isFavorite).map(template => (
                <Col span={8} key={template.id}>
                  {renderTemplateCard(template)}
                </Col>
              ))}
            </Row>
          </TabPane>

          <TabPane tab="我的创建" key="created">
            <Row gutter={[16, 16]}>
              {templates.filter(t => t.author === '我').map(template => (
                <Col span={8} key={template.id}>
                  {renderTemplateCard(template)}
                </Col>
              ))}
            </Row>
          </TabPane>
        </Tabs>

        {/* 创建模板对话框 */}
        <Modal
          title="创建新模板"
          open={showCreateModal}
          onOk={() => form.submit()}
          onCancel={() => setShowCreateModal(false)}
          width={600}
          okText="创建"
          cancelText="取消"
        >
          <Form
            form={form}
            layout="vertical"
            onFinish={handleCreateTemplate}
          >
            <Form.Item
              name="name"
              label="模板名称"
              rules={[{ required: true, message: '请输入模板名称' }]}
            >
              <Input placeholder="请输入模板名称" />
            </Form.Item>
            <Form.Item
              name="description"
              label="模板描述"
              rules={[{ required: true, message: '请输入模板描述' }]}
            >
              <TextArea rows={3} placeholder="请输入模板描述" />
            </Form.Item>
            <Row gutter={16}>
              <Col span={12}>
                <Form.Item
                  name="category"
                  label="模板分类"
                  rules={[{ required: true, message: '请选择模板分类' }]}
                >
                  <Select placeholder="请选择模板分类">
                    {TEMPLATE_CATEGORIES.map(category => (
                      <Option key={category.id} value={category.id}>
                        {category.name}
                      </Option>
                    ))}
                  </Select>
                </Form.Item>
              </Col>
              <Col span={12}>
                <Form.Item
                  name="targetApp"
                  label="目标应用"
                  rules={[{ required: true, message: '请输入目标应用' }]}
                >
                  <Input placeholder="如：小红书、微信等" />
                </Form.Item>
              </Col>
            </Row>
            <Row gutter={16}>
              <Col span={12}>
                <Form.Item
                  name="difficulty"
                  label="难度等级"
                  rules={[{ required: true, message: '请选择难度等级' }]}
                >
                  <Select placeholder="请选择难度等级">
                    <Option value="beginner">初级</Option>
                    <Option value="intermediate">中级</Option>
                    <Option value="advanced">高级</Option>
                  </Select>
                </Form.Item>
              </Col>
              <Col span={12}>
                <Form.Item
                  name="estimatedTime"
                  label="预计执行时间"
                >
                  <Input placeholder="如：2-3分钟" />
                </Form.Item>
              </Col>
            </Row>
            <Form.Item
              name="tags"
              label="标签"
            >
              <Input placeholder="多个标签用逗号分隔" />
            </Form.Item>
          </Form>
        </Modal>

        {/* 导入模板对话框 */}
        <Modal
          title="导入模板"
          open={showImportModal}
          onCancel={() => setShowImportModal(false)}
          footer={null}
        >
          <Upload.Dragger
            accept=".json"
            beforeUpload={handleImportTemplate}
            showUploadList={false}
          >
            <p className="ant-upload-drag-icon">
              <CloudDownloadOutlined />
            </p>
            <p className="ant-upload-text">点击或拖拽模板文件到此区域</p>
            <p className="ant-upload-hint">
              支持 .json 格式的模板文件
            </p>
          </Upload.Dragger>
        </Modal>
      </div>
    </div>
  );
};

export default TemplateLibrary;