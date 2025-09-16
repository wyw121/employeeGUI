import React, { useState } from 'react';
import { Card, Button, Space, Typography, Alert, Table, message, Row, Col, Input, Tag } from 'antd';
import { 
  MobileOutlined, 
  SearchOutlined, 
  PlayCircleOutlined, 
  EyeOutlined,
  AimOutlined
} from '@ant-design/icons';
import { useAdb } from '../application/hooks/useAdb';
import { invoke } from '@tauri-apps/api/core';

const { Title, Text, Paragraph } = Typography;
const { TextArea } = Input;

interface UIElement {
  text: string;
  bounds: string;
  clickable: boolean;
  className: string;
  resourceId: string;
  x: number;
  y: number;
  width: number;
  height: number;
}

interface AnalysisResult {
  totalElements: number;
  contactsElements: UIElement[];
  allClickableElements: UIElement[];
  rawXml: string;
}

const XiaohongshuUIAnalyzerPage: React.FC = () => {
  const { selectedDevice } = useAdb();
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisResult, setAnalysisResult] = useState<AnalysisResult | null>(null);
  const [searchKeyword, setSearchKeyword] = useState('通讯录');

  // 解析UI XML并提取元素信息
  const parseUIElements = (xmlContent: string, keyword: string): AnalysisResult => {
    const parser = new DOMParser();
    const doc = parser.parseFromString(xmlContent, 'application/xml');
    
    const allElements: UIElement[] = [];
    const contactsElements: UIElement[] = [];
    
    // 递归遍历所有节点
    const traverse = (node: Element) => {
      if (node.nodeType === Node.ELEMENT_NODE) {
        const text = node.getAttribute('text') || '';
        const bounds = node.getAttribute('bounds') || '';
        const clickable = node.getAttribute('clickable') === 'true';
        const className = node.getAttribute('class') || '';
        const resourceId = node.getAttribute('resource-id') || '';
        
        // 解析bounds坐标 [x1,y1][x2,y2]
        const boundsMatch = bounds.match(/\[(\d+),(\d+)\]\[(\d+),(\d+)\]/);
        if (boundsMatch) {
          const x1 = parseInt(boundsMatch[1]);
          const y1 = parseInt(boundsMatch[2]);
          const x2 = parseInt(boundsMatch[3]);
          const y2 = parseInt(boundsMatch[4]);
          
          const element: UIElement = {
            text,
            bounds,
            clickable,
            className,
            resourceId,
            x: Math.round((x1 + x2) / 2), // 中心点X
            y: Math.round((y1 + y2) / 2), // 中心点Y
            width: x2 - x1,
            height: y2 - y1
          };
          
          allElements.push(element);
          
          // 检查是否包含关键词
          if (text.includes(keyword) || className.includes('contacts') || resourceId.includes('contact')) {
            contactsElements.push(element);
          }
        }
        
        // 递归遍历子节点
        for (let i = 0; i < node.children.length; i++) {
          traverse(node.children[i] as Element);
        }
      }
    };
    
    const rootElement = doc.documentElement;
    if (rootElement) {
      traverse(rootElement);
    }
    
    // 过滤出可点击的元素
    const allClickableElements = allElements.filter(el => el.clickable && (el.text || el.resourceId));
    
    return {
      totalElements: allElements.length,
      contactsElements,
      allClickableElements,
      rawXml: xmlContent
    };
  };

  // 获取UI dump并分析
  const analyzeCurrentPage = async () => {
    if (!selectedDevice) {
      message.error('请先选择设备');
      return;
    }

    setIsAnalyzing(true);
    
    try {
      // 获取UI dump
      const uiDump = await invoke<string>('get_ui_dump', { deviceId: selectedDevice.id });
      
      if (!uiDump) {
        message.error('获取UI信息失败');
        return;
      }

      // 分析UI元素
      const result = parseUIElements(uiDump, searchKeyword);
      setAnalysisResult(result);
      
      message.success(`分析完成！找到 ${result.contactsElements.length} 个相关元素`);

    } catch (error) {
      message.error(`分析失败: ${error}`);
      console.error('UI分析错误:', error);
    } finally {
      setIsAnalyzing(false);
    }
  };

  // 点击指定坐标
  const clickCoordinate = async (x: number, y: number, description: string) => {
    if (!selectedDevice) {
      message.error('请先选择设备');
      return;
    }

    try {
      await invoke('adb_tap', { 
        deviceId: selectedDevice.id, 
        x, 
        y 
      });
      message.success(`成功点击 ${description} 坐标: (${x}, ${y})`);
    } catch (error) {
      message.error(`点击失败: ${error}`);
    }
  };

  // 表格列定义
  const contactsColumns = [
    {
      title: '文本内容',
      dataIndex: 'text',
      key: 'text',
      width: 120,
      render: (text: string) => (
        <Text strong style={{ color: text.includes('通讯录') ? '#1890ff' : 'inherit' }}>
          {text || '(无文本)'}
        </Text>
      ),
    },
    {
      title: '中心坐标',
      key: 'coordinates',
      width: 100,
      render: (record: UIElement) => (
        <Tag color="blue">{record.x}, {record.y}</Tag>
      ),
    },
    {
      title: '尺寸',
      key: 'size',
      width: 80,
      render: (record: UIElement) => (
        <Text code>{record.width}×{record.height}</Text>
      ),
    },
    {
      title: '边界',
      dataIndex: 'bounds',
      key: 'bounds',
      width: 150,
      render: (bounds: string) => <Text code style={{ fontSize: '12px' }}>{bounds}</Text>,
    },
    {
      title: '可点击',
      dataIndex: 'clickable',
      key: 'clickable',
      width: 80,
      render: (clickable: boolean) => (
        <Tag color={clickable ? 'green' : 'red'}>
          {clickable ? '是' : '否'}
        </Tag>
      ),
    },
    {
      title: '操作',
      key: 'action',
      width: 100,
      render: (record: UIElement) => (
        <Button
          type="primary"
          size="small"
          icon={<AimOutlined />}
          onClick={() => clickCoordinate(record.x, record.y, record.text || '未知元素')}
          disabled={!record.clickable}
        >
          点击
        </Button>
      ),
    },
  ];

  const clickableColumns = [
    {
      title: '文本/ID',
      key: 'textOrId',
      width: 150,
      render: (record: UIElement) => (
        <div>
          {record.text && <Text strong>{record.text}</Text>}
          {record.resourceId && (
            <div><Text type="secondary" style={{ fontSize: '11px' }}>{record.resourceId}</Text></div>
          )}
        </div>
      ),
    },
    {
      title: '坐标',
      key: 'coordinates',
      width: 80,
      render: (record: UIElement) => (
        <Tag color="green">{record.x}, {record.y}</Tag>
      ),
    },
    {
      title: '类名',
      dataIndex: 'className',
      key: 'className',
      width: 120,
      ellipsis: true,
      render: (className: string) => (
        <Text style={{ fontSize: '11px' }}>{className}</Text>
      ),
    },
    {
      title: '操作',
      key: 'action',
      width: 80,
      render: (record: UIElement) => (
        <Button
          type="default"
          size="small"
          icon={<AimOutlined />}
          onClick={() => clickCoordinate(record.x, record.y, record.text || record.resourceId)}
        >
          点击
        </Button>
      ),
    },
  ];

  return (
    <div style={{ padding: '24px', maxWidth: '1400px', margin: '0 auto' }}>
      <Title level={2}>
        <EyeOutlined /> 小红书UI实时分析器
      </Title>
      
      <Alert
        message="实时UI分析工具"
        description="这个工具会实时获取当前手机屏幕的UI信息，解析所有元素的坐标位置，帮助您精确定位通讯录按钮并进行点击测试。"
        type="info"
        style={{ marginBottom: 24 }}
      />

      <Row gutter={[16, 16]}>
        <Col xs={24} lg={8}>
          <Card title="分析控制" extra={<SearchOutlined />}>
            <Space direction="vertical" style={{ width: '100%' }}>
              <div>
                <Text strong>当前设备:</Text>
                {selectedDevice ? (
                  <div>
                    <Tag color="green">{selectedDevice.id}</Tag>
                    <div><Text type="secondary">{selectedDevice.name}</Text></div>
                  </div>
                ) : (
                  <Alert message="请先选择设备" type="warning" />
                )}
              </div>
              
              <div>
                <Text strong>搜索关键词:</Text>
                <Input
                  value={searchKeyword}
                  onChange={(e) => setSearchKeyword(e.target.value)}
                  placeholder="输入要查找的文本"
                  style={{ marginTop: 4 }}
                />
              </div>
              
              <Button
                type="primary"
                onClick={analyzeCurrentPage}
                loading={isAnalyzing}
                disabled={!selectedDevice}
                block
                icon={<PlayCircleOutlined />}
              >
                分析当前页面UI
              </Button>
            </Space>
          </Card>
        </Col>

        <Col xs={24} lg={16}>
          <Card title="分析结果统计">
            {analysisResult ? (
              <Row gutter={16}>
                <Col span={6}>
                  <div style={{ textAlign: 'center' }}>
                    <Title level={3} style={{ margin: 0, color: '#1890ff' }}>
                      {analysisResult.totalElements}
                    </Title>
                    <Text>总元素数</Text>
                  </div>
                </Col>
                <Col span={6}>
                  <div style={{ textAlign: 'center' }}>
                    <Title level={3} style={{ margin: 0, color: '#52c41a' }}>
                      {analysisResult.contactsElements.length}
                    </Title>
                    <Text>匹配元素</Text>
                  </div>
                </Col>
                <Col span={6}>
                  <div style={{ textAlign: 'center' }}>
                    <Title level={3} style={{ margin: 0, color: '#fa8c16' }}>
                      {analysisResult.allClickableElements.length}
                    </Title>
                    <Text>可点击元素</Text>
                  </div>
                </Col>
                <Col span={6}>
                  <div style={{ textAlign: 'center' }}>
                    <Title level={3} style={{ margin: 0, color: '#eb2f96' }}>
                      {analysisResult.contactsElements.filter(el => el.clickable).length}
                    </Title>
                    <Text>可点击匹配</Text>
                  </div>
                </Col>
              </Row>
            ) : (
              <Alert message="暂无分析结果，请先运行页面分析" type="info" />
            )}
          </Card>
        </Col>
      </Row>

      {analysisResult && analysisResult.contactsElements.length > 0 && (
        <Card 
          title={`🎯 "${searchKeyword}" 相关元素`} 
          style={{ marginTop: 16 }}
          extra={<Tag color="blue">{analysisResult.contactsElements.length} 个元素</Tag>}
        >
          <Table
            columns={contactsColumns}
            dataSource={analysisResult.contactsElements.map((item, index) => ({ ...item, key: index }))}
            size="small"
            pagination={false}
            scroll={{ x: 800 }}
          />
        </Card>
      )}

      {analysisResult && analysisResult.allClickableElements.length > 0 && (
        <Card 
          title="🖱️ 所有可点击元素" 
          style={{ marginTop: 16 }}
          extra={<Tag color="green">{analysisResult.allClickableElements.length} 个元素</Tag>}
        >
          <Table
            columns={clickableColumns}
            dataSource={analysisResult.allClickableElements
              .filter(el => el.text || el.resourceId) // 只显示有文本或ID的元素
              .slice(0, 20) // 限制显示前20个，避免太多
              .map((item, index) => ({ ...item, key: index }))
            }
            size="small"
            pagination={{ pageSize: 10, showQuickJumper: true }}
            scroll={{ x: 600 }}
          />
        </Card>
      )}

      {analysisResult && (
        <Card title="📄 原始XML数据" style={{ marginTop: 16 }}>
          <TextArea
            value={analysisResult.rawXml}
            rows={10}
            readOnly
            style={{ fontFamily: 'monospace', fontSize: '12px' }}
          />
        </Card>
      )}

      <Card title="使用说明" style={{ marginTop: 16 }}>
        <Paragraph>
          <Title level={4}>操作步骤：</Title>
          <ol>
            <li><strong>确保设备连接</strong>：选择已连接的Android设备</li>
            <li><strong>打开目标页面</strong>：在手机上打开小红书发现好友页面</li>
            <li><strong>运行分析</strong>：点击"分析当前页面UI"按钮</li>
            <li><strong>查看结果</strong>：在结果表格中找到"通讯录"元素</li>
            <li><strong>测试点击</strong>：点击对应元素的"点击"按钮进行测试</li>
          </ol>
        </Paragraph>
        
        <Paragraph>
          <Title level={4}>分析结果说明：</Title>
          <ul>
            <li><strong>匹配元素</strong>：包含搜索关键词的UI元素</li>
            <li><strong>中心坐标</strong>：元素的点击中心点坐标 (x, y)</li>
            <li><strong>边界</strong>：元素的完整边界坐标范围</li>
            <li><strong>可点击</strong>：该元素是否支持点击操作</li>
          </ul>
        </Paragraph>
      </Card>
    </div>
  );
};

export default XiaohongshuUIAnalyzerPage;