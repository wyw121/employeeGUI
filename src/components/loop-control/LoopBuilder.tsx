import React, { useState, useCallback } from 'react';
import {
  Card,
  Input,
  Select,
  InputNumber,
  Button,
  Space,
  Typography,
  Alert,
  Tag,
  Switch,
  Modal,
  Popconfirm,
  message,
} from 'antd';
import {
  PlusOutlined,
  DeleteOutlined,
  CopyOutlined,
  PlayCircleOutlined,
  BranchesOutlined,
  SettingOutlined,
} from '@ant-design/icons';

const { Title, Text, Paragraph } = Typography;
const { Option } = Select;

// 循环类型定义
interface LoopConfig {
  id: string;
  type: 'simple' | 'conditional' | 'nested' | 'dynamic';
  name: string;
  condition: {
    type: 'count' | 'time' | 'element';
    value: any;
  };
  maxIterations: number;
  breakCondition?: {
    enabled: boolean;
    type: 'element_found' | 'time_exceeded';
    value: any;
  };
}

// 预设循环模板
const LOOP_TEMPLATES: LoopConfig[] = [
  {
    id: 'simple_count',
    type: 'simple',
    name: '简单计数循环',
    condition: {
      type: 'count',
      value: 10
    },
    maxIterations: 50,
  },
  {
    id: 'wait_element',
    type: 'conditional',
    name: '等待元素出现',
    condition: {
      type: 'element',
      value: 'com.example:id/loading'
    },
    maxIterations: 30,
    breakCondition: {
      enabled: true,
      type: 'element_found',
      value: 'com.example:id/content'
    }
  },
  {
    id: 'time_limited',
    type: 'conditional',
    name: '时间限制循环',
    condition: {
      type: 'time',
      value: 60000
    },
    maxIterations: 100,
    breakCondition: {
      enabled: true,
      type: 'time_exceeded',
      value: 120000
    }
  }
];

const LoopBuilder: React.FC = () => {
  const [loops, setLoops] = useState<LoopConfig[]>([]);
  const [previewVisible, setPreviewVisible] = useState(false);
  const [currentLoop, setCurrentLoop] = useState<LoopConfig | null>(null);

  const handleAddLoop = useCallback((template?: LoopConfig) => {
    const newLoop: LoopConfig = template || {
      id: `loop_${Date.now()}`,
      type: 'simple',
      name: '新循环',
      condition: {
        type: 'count',
        value: 1
      },
      maxIterations: 10,
      breakCondition: {
        enabled: false,
        type: 'element_found',
        value: ''
      }
    };
    
    setLoops([...loops, { ...newLoop, id: `loop_${Date.now()}` }]);
  }, [loops]);

  const handleRemoveLoop = useCallback((id: string) => {
    setLoops(loops.filter(loop => loop.id !== id));
    message.success('循环删除成功');
  }, [loops]);

  const handleUpdateLoop = useCallback((id: string, updates: Partial<LoopConfig>) => {
    setLoops(loops.map(loop => 
      loop.id === id ? { ...loop, ...updates } : loop
    ));
  }, [loops]);

  const handleCloneLoop = useCallback((loop: LoopConfig) => {
    const clonedLoop = {
      ...loop,
      id: `loop_${Date.now()}`,
      name: `${loop.name} (复制)`
    };
    setLoops([...loops, clonedLoop]);
  }, [loops]);

  const handlePreviewLoop = (loop: LoopConfig) => {
    setCurrentLoop(loop);
    setPreviewVisible(true);
  };

  const getLoopTypeColor = (type: string) => {
    switch (type) {
      case 'simple': return 'blue';
      case 'conditional': return 'green';
      case 'nested': return 'orange';
      case 'dynamic': return 'purple';
      default: return 'default';
    }
  };

  const getLoopTypeName = (type: string) => {
    switch (type) {
      case 'simple': return '简单循环';
      case 'conditional': return '条件循环';
      case 'nested': return '嵌套循环';
      case 'dynamic': return '动态循环';
      default: return type;
    }
  };

  const getTemplateColor = (type: string) => {
    switch (type) {
      case 'simple': return 'blue';
      case 'conditional': return 'green';
      case 'nested': return 'orange';
      case 'dynamic': return 'purple';
      default: return 'blue';
    }
  };

  const getTemplateText = (type: string) => {
    switch (type) {
      case 'simple': return '简单';
      case 'conditional': return '条件';
      case 'nested': return '嵌套';
      case 'dynamic': return '动态';
      default: return '简单';
    }
  };

  const renderConditionInput = (loop: LoopConfig) => {
    const { condition } = loop;
    
    const getInitialValue = (type: string) => {
      switch (type) {
        case 'count': return 1;
        case 'time': return 1000;
        default: return '';
      }
    };

    const handleTypeChange = (type: string) => {
      const newCondition = {
        ...condition,
        type: type as any,
        value: getInitialValue(type)
      };
      handleUpdateLoop(loop.id, { condition: newCondition });
    };

    const renderValueInput = () => {
      switch (condition.type) {
        case 'count':
          return (
            <InputNumber
              min={1}
              max={1000}
              value={condition.value}
              onChange={(value) => handleUpdateLoop(loop.id, { 
                condition: { ...condition, value } 
              })}
              placeholder="循环次数"
              style={{ width: 120 }}
            />
          );
        case 'time':
          return (
            <Space>
              <InputNumber
                min={100}
                max={300000}
                value={condition.value}
                onChange={(value) => handleUpdateLoop(loop.id, { 
                  condition: { ...condition, value } 
                })}
                placeholder="毫秒"
                style={{ width: 120 }}
              />
              <Text type="secondary">毫秒</Text>
            </Space>
          );
        case 'element':
          return (
            <Input
              value={condition.value}
              onChange={(e) => handleUpdateLoop(loop.id, { 
                condition: { ...condition, value: e.target.value } 
              })}
              placeholder="元素ID或XPath"
              style={{ width: 200 }}
            />
          );
        default:
          return null;
      }
    };

    return (
      <Space direction="vertical" style={{ width: '100%' }}>
        <Space>
          <Text strong>循环条件:</Text>
          <Select
            value={condition.type}
            onChange={handleTypeChange}
            style={{ width: 120 }}
          >
            <Option value="count">计数循环</Option>
            <Option value="time">时间循环</Option>
            <Option value="element">元素条件</Option>
          </Select>
        </Space>
        {renderValueInput()}
      </Space>
    );
  };

  const renderLoopCard = (loop: LoopConfig) => {
    return (
      <Card
        key={loop.id}
        style={{ marginBottom: 16 }}
        title={
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Space>
              <BranchesOutlined />
              <span>{loop.name}</span>
              <Tag color={getLoopTypeColor(loop.type)}>
                {getLoopTypeName(loop.type)}
              </Tag>
            </Space>
            <Space>
              <Button
                type="text"
                icon={<PlayCircleOutlined />}
                onClick={() => handlePreviewLoop(loop)}
                title="预览循环"
              />
              <Button
                type="text"
                icon={<CopyOutlined />}
                onClick={() => handleCloneLoop(loop)}
                title="复制循环"
              />
              <Popconfirm
                title="确认删除循环"
                description="确定要删除这个循环配置吗？此操作不可撤销。"
                onConfirm={() => handleRemoveLoop(loop.id)}
                okText="删除"
                cancelText="取消"
                okType="danger"
                placement="topLeft"
              >
                <Button
                  type="text"
                  danger
                  icon={<DeleteOutlined />}
                  title="删除循环"
                />
              </Popconfirm>
            </Space>
          </div>
        }
      >
        <Space direction="vertical" style={{ width: '100%' }}>
          <div style={{ display: 'flex', gap: 16 }}>
            <div style={{ flex: 1 }}>
              <Input
                value={loop.name}
                onChange={(e) => handleUpdateLoop(loop.id, { name: e.target.value })}
                placeholder="循环名称"
              />
            </div>
            <div style={{ width: 120 }}>
              <Select
                value={loop.type}
                onChange={(type) => handleUpdateLoop(loop.id, { type })}
                style={{ width: '100%' }}
              >
                <Option value="simple">简单循环</Option>
                <Option value="conditional">条件循环</Option>
                <Option value="nested">嵌套循环</Option>
                <Option value="dynamic">动态循环</Option>
              </Select>
            </div>
          </div>

          {renderConditionInput(loop)}

          <div style={{ display: 'flex', gap: 16, alignItems: 'center' }}>
            <Text>最大迭代次数:</Text>
            <InputNumber
              min={1}
              max={1000}
              value={loop.maxIterations}
              onChange={(maxIterations) => handleUpdateLoop(loop.id, { maxIterations })}
              style={{ width: 120 }}
            />
          </div>

          {(loop.type === 'conditional' || loop.type === 'nested') && (
            <div>
              <Text strong>跳出条件:</Text>
              <div style={{ marginTop: 8 }}>
                <Switch
                  checked={loop.breakCondition?.enabled}
                  onChange={(enabled) => handleUpdateLoop(loop.id, {
                    breakCondition: { ...loop.breakCondition, enabled } as any
                  })}
                  checkedChildren="启用"
                  unCheckedChildren="禁用"
                />
              </div>
              {loop.breakCondition?.enabled && (
                <div style={{ marginTop: 12 }}>
                  <Space>
                    <Select
                      value={loop.breakCondition?.type}
                      onChange={(type) => handleUpdateLoop(loop.id, {
                        breakCondition: { ...loop.breakCondition, type } as any
                      })}
                      style={{ width: 150 }}
                    >
                      <Option value="element_found">元素出现</Option>
                      <Option value="time_exceeded">超时</Option>
                    </Select>
                    <Input
                      value={loop.breakCondition?.value}
                      onChange={(e) => handleUpdateLoop(loop.id, {
                        breakCondition: { ...loop.breakCondition, value: e.target.value } as any
                      })}
                      placeholder="条件值"
                      style={{ width: 200 }}
                    />
                  </Space>
                </div>
              )}
            </div>
          )}
        </Space>
      </Card>
    );
  };

  return (
    <div style={{ padding: 24, background: '#f0f2f5', minHeight: '100vh' }}>
      <div style={{ maxWidth: 1200, margin: '0 auto' }}>
        <div style={{ marginBottom: 24 }}>
          <Title level={2} style={{ margin: 0, color: '#1890ff' }}>
            🔄 高级循环控制器
          </Title>
          <Paragraph type="secondary">
            构建复杂的循环逻辑，支持嵌套循环、条件判断和动态参数调整
          </Paragraph>
        </div>

        <Alert
          message="循环控制增强功能"
          description="支持多种循环类型：简单计数循环、条件循环、嵌套循环。可以设置复杂的跳出条件。"
          type="info"
          style={{ marginBottom: 24 }}
          showIcon
        />

        <Card 
          title="快速开始" 
          style={{ marginBottom: 24 }}
          extra={
            <Button
              type="primary"
              icon={<PlusOutlined />}
              onClick={() => handleAddLoop()}
            >
              创建自定义循环
            </Button>
          }
        >
          <div style={{ marginBottom: 16 }}>
            <Text strong>选择循环模板:</Text>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 16 }}>
            {LOOP_TEMPLATES.map((template) => (
              <Card
                key={template.id}
                hoverable
                size="small"
                style={{ border: '1px solid #d9d9d9' }}
                bodyStyle={{ padding: 12 }}
                onClick={() => handleAddLoop(template)}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div style={{ flex: 1 }}>
                    <Text strong>{template.name}</Text>
                    <div style={{ marginTop: 4 }}>
                      <Tag color={getTemplateColor(template.type)}>
                        {getTemplateText(template.type)}
                      </Tag>
                    </div>
                  </div>
                  <PlusOutlined style={{ color: '#1890ff' }} />
                </div>
              </Card>
            ))}
          </div>
        </Card>

        <Card 
          title={
            <Space>
              <SettingOutlined />
              <span>循环配置</span>
              <Text type="secondary">({loops.length} 个循环)</Text>
            </Space>
          }
        >
          {loops.length === 0 ? (
            <div style={{ textAlign: 'center', padding: 40 }}>
              <BranchesOutlined style={{ fontSize: 48, color: '#d9d9d9', marginBottom: 16 }} />
              <div>
                <Text type="secondary">还没有配置任何循环</Text>
              </div>
              <div style={{ marginTop: 8 }}>
                <Text type="secondary">选择上方的模板或创建自定义循环开始</Text>
              </div>
            </div>
          ) : (
            <div>
              {loops.map((loop) => renderLoopCard(loop))}
            </div>
          )}
        </Card>

        <Modal
          title="循环预览"
          open={previewVisible}
          onCancel={() => setPreviewVisible(false)}
          footer={[
            <Button key="close" onClick={() => setPreviewVisible(false)}>
              关闭
            </Button>
          ]}
          width={800}
        >
          {currentLoop && (
            <div>
              <Card title="循环信息" size="small" style={{ marginBottom: 16 }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                  <div>
                    <Text strong>名称:</Text> {currentLoop.name}
                  </div>
                  <div>
                    <Text strong>类型:</Text> <Tag>{currentLoop.type}</Tag>
                  </div>
                  <div>
                    <Text strong>条件:</Text> {currentLoop.condition.type} = {currentLoop.condition.value}
                  </div>
                  <div>
                    <Text strong>最大次数:</Text> {currentLoop.maxIterations}
                  </div>
                </div>
              </Card>
              
              <Card title="执行预览" size="small">
                <Text type="secondary">
                  此循环将执行 {currentLoop.condition.value} 次，每次迭代最多等待 {currentLoop.maxIterations} 步。
                  {currentLoop.breakCondition?.enabled && ` 当 ${currentLoop.breakCondition.type} 时将跳出循环。`}
                </Text>
              </Card>
            </div>
          )}
        </Modal>
      </div>
    </div>
  );
};

export default LoopBuilder;

