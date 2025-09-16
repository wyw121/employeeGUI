import React, { useState } from 'react';
import {
  Card,
  Button,
  Typography,
  Space,
  List,
  Tag,
  Alert,
  Divider,
} from 'antd';
import {
  PlayCircleOutlined,
  ClockCircleOutlined,
  CheckCircleOutlined,
  ExclamationCircleOutlined,
} from '@ant-design/icons';
import SimpleExecutionMonitor from '../components/execution/SimpleExecutionMonitor';

const { Title, Text, Paragraph } = Typography;

// 示例脚本数据
const SAMPLE_SCRIPTS = [
  {
    id: 'script_1',
    name: '小红书自动关注脚本',
    description: '自动打开小红书，导入通讯录，批量关注联系人',
    steps: [
      { 
        id: 'step_1', 
        name: '打开小红书应用',
        type: 'open_app',
        parameters: { package_name: 'com.xingin.xhs' }
      },
      { 
        id: 'step_2', 
        name: '点击头像进入个人页面',
        type: 'tap',
        parameters: { coordinate: '100,200' }
      },
      { 
        id: 'step_3', 
        name: '等待侧边栏加载',
        type: 'wait_for_element',
        parameters: { condition_type: 'text', selector: '发现好友' }
      },
      { 
        id: 'step_4', 
        name: '点击发现好友',
        type: 'tap',
        parameters: { coordinate: '200,300' }
      },
      { 
        id: 'step_5', 
        name: '导入通讯录',
        type: 'tap',
        parameters: { coordinate: '300,400' }
      }
    ]
  },
  {
    id: 'script_2',
    name: '微信群发消息脚本',
    description: '批量向多个微信群发送相同消息',
    steps: [
      { 
        id: 'step_1', 
        name: '打开微信',
        type: 'open_app',
        parameters: { package_name: 'com.tencent.mm' }
      },
      { 
        id: 'step_2', 
        name: '进入通讯录',
        type: 'tap',
        parameters: { coordinate: '150,600' }
      },
      { 
        id: 'step_3', 
        name: '搜索群聊',
        type: 'input',
        parameters: { text: '工作群' }
      }
    ]
  },
  {
    id: 'script_3',
    name: '抖音自动点赞脚本',
    description: '自动浏览抖音视频并进行点赞操作',
    steps: [
      { 
        id: 'step_1', 
        name: '打开抖音',
        type: 'open_app',
        parameters: { package_name: 'com.ss.android.ugc.aweme' }
      },
      { 
        id: 'step_2', 
        name: '等待首页加载',
        type: 'wait',
        parameters: { duration: 3 }
      },
      { 
        id: 'step_3', 
        name: '双击点赞',
        type: 'tap',
        parameters: { coordinate: '400,600' }
      },
      { 
        id: 'step_4', 
        name: '滑动到下一个视频',
        type: 'swipe',
        parameters: { start_coordinate: '400,800', end_coordinate: '400,200' }
      }
    ]
  }
];

const ExecutionMonitorPage: React.FC = () => {
  const [selectedScript, setSelectedScript] = useState<any>(null);
  const [showMonitor, setShowMonitor] = useState(false);

  const handleSelectScript = (script: any) => {
    setSelectedScript(script);
    setShowMonitor(true);
  };

  const handleBackToList = () => {
    setShowMonitor(false);
    setSelectedScript(null);
  };

  const getStepTypeIcon = (type: string) => {
    switch (type) {
      case 'open_app':
        return <PlayCircleOutlined style={{ color: '#1890ff' }} />;
      case 'tap':
        return <CheckCircleOutlined style={{ color: '#52c41a' }} />;
      case 'wait':
      case 'wait_for_element':
        return <ClockCircleOutlined style={{ color: '#faad14' }} />;
      default:
        return <ExclamationCircleOutlined style={{ color: '#ff4d4f' }} />;
    }
  };

  const getStepTypeText = (type: string) => {
    const typeMap: { [key: string]: string } = {
      open_app: '打开应用',
      tap: '点击操作',
      input: '输入文本',
      wait: '等待',
      wait_for_element: '等待元素',
      swipe: '滑动操作',
      back: '返回'
    };
    return typeMap[type] || type;
  };

  if (showMonitor && selectedScript) {
    return (
      <SimpleExecutionMonitor
        script={selectedScript}
        onBack={handleBackToList}
      />
    );
  }

  return (
    <div style={{ padding: 24, background: '#f0f2f5', minHeight: '100vh' }}>
      <div style={{ maxWidth: 1200, margin: '0 auto' }}>
        <div style={{ marginBottom: 24 }}>
          <Title level={2} style={{ margin: 0, color: '#1890ff' }}>
            📊 脚本执行监控
          </Title>
          <Paragraph type="secondary">
            选择一个脚本开始执行监控，实时查看执行进度和状态
          </Paragraph>
        </div>

        <Alert
          message="执行监控功能"
          description="选择下方的示例脚本开始体验执行监控功能。监控系统将实时跟踪脚本执行状态、步骤进度、日志记录和性能数据。"
          type="info"
          style={{ marginBottom: 24 }}
          showIcon
        />

        <Card title="可用脚本列表" style={{ marginBottom: 24 }}>
          <List
            grid={{ gutter: 16, column: 1 }}
            dataSource={SAMPLE_SCRIPTS}
            renderItem={(script) => (
              <List.Item>
                <Card
                  hoverable
                  style={{ marginBottom: 16 }}
                  actions={[
                    <Button
                      key="execute"
                      type="primary"
                      icon={<PlayCircleOutlined />}
                      onClick={() => handleSelectScript(script)}
                    >
                      开始执行监控
                    </Button>
                  ]}
                >
                  <Card.Meta
                    title={
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span>{script.name}</span>
                        <Tag color="blue">{script.steps.length} 个步骤</Tag>
                      </div>
                    }
                    description={
                      <div>
                        <Paragraph ellipsis={{ rows: 2 }} style={{ marginBottom: 12 }}>
                          {script.description}
                        </Paragraph>
                        
                        <Divider style={{ margin: '12px 0' }} />
                        
                        <div>
                          <Text strong style={{ marginBottom: 8, display: 'block' }}>
                            脚本步骤:
                          </Text>
                          <Space direction="vertical" style={{ width: '100%' }}>
                            {script.steps.slice(0, 3).map((step: any, index: number) => (
                              <div key={step.id} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                <span style={{ 
                                  minWidth: 20, 
                                  height: 20, 
                                  borderRadius: '50%', 
                                  backgroundColor: '#1890ff', 
                                  color: 'white', 
                                  fontSize: 11, 
                                  display: 'flex', 
                                  alignItems: 'center', 
                                  justifyContent: 'center' 
                                }}>
                                  {index + 1}
                                </span>
                                {getStepTypeIcon(step.type)}
                                <Text style={{ fontSize: 13 }}>
                                  {step.name}
                                </Text>
                                <Tag color="geekblue">
                                  {getStepTypeText(step.type)}
                                </Tag>
                              </div>
                            ))}
                            {script.steps.length > 3 && (
                              <Text type="secondary" style={{ fontSize: 12, marginLeft: 28 }}>
                                ... 还有 {script.steps.length - 3} 个步骤
                              </Text>
                            )}
                          </Space>
                        </div>
                      </div>
                    }
                  />
                </Card>
              </List.Item>
            )}
          />
        </Card>

        <Card title="监控功能说明">
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: 16 }}>
            <div>
              <Title level={5}>📈 实时进度跟踪</Title>
              <Text type="secondary">
                实时显示脚本执行进度，包括当前步骤、完成状态和剩余时间预估
              </Text>
            </div>
            <div>
              <Title level={5}>📝 详细日志记录</Title>
              <Text type="secondary">
                记录每个步骤的执行日志，包括成功、警告和错误信息
              </Text>
            </div>
            <div>
              <Title level={5}>⏸️ 执行控制</Title>
              <Text type="secondary">
                支持暂停、继续、停止和重新执行脚本，灵活控制执行流程
              </Text>
            </div>
            <div>
              <Title level={5}>📊 性能统计</Title>
              <Text type="secondary">
                提供执行时间、成功率、错误统计等性能数据分析
              </Text>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
};

export default ExecutionMonitorPage;

