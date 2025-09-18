import React, { useState } from 'react';
import { Modal, Button, Input, Card, Tooltip, Badge, Switch, Space, Typography, Alert } from 'antd';
import { 
  SearchOutlined, 
  EyeOutlined, 
  MobileOutlined, 
  AppstoreOutlined,
  HomeOutlined,
  MessageOutlined,
  ToolOutlined,
  FileTextOutlined,
  CameraOutlined,
  MenuOutlined
} from '@ant-design/icons';
import './VisualPageAnalyzer.css';

const { Title, Text } = Typography;

// XML节点接口定义
interface UINode {
  bounds: string;
  text: string;
  contentDesc: string;
  className: string;
  clickable: boolean;
  enabled: boolean;
  selected: boolean;
  children: UINode[];
  // 解析后的位置信息
  x: number;
  y: number;
  width: number;
  height: number;
}

// 元素分类定义
interface ElementCategory {
  name: string;
  icon: React.ReactNode;
  color: string;
  description: string;
  elements: UIElement[];
}

interface UIElement {
  id: string;
  text: string;
  description: string;
  type: string;
  category: string;
  position: { x: number; y: number; width: number; height: number };
  clickable: boolean;
  importance: 'high' | 'medium' | 'low';
  userFriendlyName: string;
}

interface VisualPageAnalyzerProps {
  visible: boolean;
  onClose: () => void;
  xmlContent: string;
}

const VisualPageAnalyzer: React.FC<VisualPageAnalyzerProps> = ({
  visible,
  onClose,
  xmlContent
}) => {
  const [searchText, setSearchText] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [showOnlyClickable, setShowOnlyClickable] = useState(false);
  const [elements, setElements] = useState<UIElement[]>([]);
  const [categories, setCategories] = useState<ElementCategory[]>([]);

  // 解析bounds字符串为坐标
  const parseBounds = (bounds: string): { x: number; y: number; width: number; height: number } => {
    const match = bounds.match(/\[(\d+),(\d+)\]\[(\d+),(\d+)\]/);
    if (!match) return { x: 0, y: 0, width: 0, height: 0 };
    
    const [, x1, y1, x2, y2] = match.map(Number);
    return {
      x: x1,
      y: y1,
      width: x2 - x1,
      height: y2 - y1
    };
  };

  // 获取元素的用户友好名称
  const getUserFriendlyName = (node: any): string => {
    // 优先使用content-desc
    if (node['content-desc'] && node['content-desc'].trim()) {
      return node['content-desc'];
    }
    
    // 其次使用text
    if (node.text && node.text.trim()) {
      return node.text;
    }
    
    // 根据className推测功能
    const className = node.class || '';
    if (className.includes('Button')) return '按钮';
    if (className.includes('TextView')) return '文本';
    if (className.includes('ImageView')) return '图片';
    if (className.includes('EditText')) return '输入框';
    if (className.includes('RecyclerView')) return '列表';
    if (className.includes('ViewPager')) return '滑动页面';
    if (className.includes('Tab')) return '标签页';
    
    return '未知元素';
  };

  // 判断元素类别
  const categorizeElement = (node: any): string => {
    const contentDesc = node['content-desc'] || '';
    const text = node.text || '';
    const className = node.class || '';
    
    // 导航相关
    if (contentDesc.includes('首页') || contentDesc.includes('消息') || contentDesc.includes('我') || 
        contentDesc.includes('市集') || contentDesc.includes('发布') || 
        text.includes('首页') || text.includes('消息') || text.includes('我')) {
      return 'navigation';
    }
    
    // 顶部标签栏
    if (contentDesc.includes('关注') || contentDesc.includes('发现') || contentDesc.includes('视频') || 
        text.includes('关注') || text.includes('发现') || text.includes('视频')) {
      return 'tabs';
    }
    
    // 搜索功能
    if (contentDesc.includes('搜索') || className.includes('search')) {
      return 'search';
    }
    
    // 内容卡片
    if (contentDesc.includes('笔记') || contentDesc.includes('视频') || 
        (node.clickable === 'true' && contentDesc.includes('来自'))) {
      return 'content';
    }
    
    // 按钮
    if (className.includes('Button') || node.clickable === 'true') {
      return 'buttons';
    }
    
    // 文本
    if (className.includes('TextView') && text.trim()) {
      return 'text';
    }
    
    // 图片
    if (className.includes('ImageView')) {
      return 'images';
    }
    
    return 'others';
  };

  // 获取元素重要性
  const getElementImportance = (node: any): 'high' | 'medium' | 'low' => {
    const contentDesc = node['content-desc'] || '';
    const text = node.text || '';
    
    // 高重要性：导航、主要按钮、内容卡片
    if (contentDesc.includes('首页') || contentDesc.includes('搜索') || 
        contentDesc.includes('笔记') || contentDesc.includes('视频') ||
        contentDesc.includes('发布')) {
      return 'high';
    }
    
    // 中等重要性：标签页、次要按钮
    if (contentDesc.includes('关注') || contentDesc.includes('发现') || 
        contentDesc.includes('消息') || node.clickable === 'true') {
      return 'medium';
    }
    
    return 'low';
  };

  // 解析XML并提取元素
  const parseXML = (xmlString: string) => {
    try {
      const parser = new DOMParser();
      const xmlDoc = parser.parseFromString(xmlString, 'text/xml');
      const allNodes = xmlDoc.querySelectorAll('node');
      
      const extractedElements: UIElement[] = [];
      const elementCategories: { [key: string]: ElementCategory } = {
        navigation: { name: '底部导航', icon: <HomeOutlined />, color: '#1890ff', description: '应用主要导航按钮', elements: [] },
        tabs: { name: '顶部标签', icon: <MenuOutlined />, color: '#722ed1', description: '页面切换标签', elements: [] },
        search: { name: '搜索功能', icon: <SearchOutlined />, color: '#13c2c2', description: '搜索相关功能', elements: [] },
        content: { name: '内容卡片', icon: <AppstoreOutlined />, color: '#52c41a', description: '主要内容区域', elements: [] },
        buttons: { name: '按钮控件', icon: <ToolOutlined />, color: '#fa8c16', description: '可点击的按钮', elements: [] },
        text: { name: '文本内容', icon: <FileTextOutlined />, color: '#eb2f96', description: '文本信息显示', elements: [] },
        images: { name: '图片内容', icon: <CameraOutlined />, color: '#f5222d', description: '图片和图标', elements: [] },
        others: { name: '其他元素', icon: <AppstoreOutlined />, color: '#8c8c8c', description: '其他UI元素', elements: [] }
      };
      
      allNodes.forEach((node, index) => {
        const bounds = node.getAttribute('bounds') || '';
        const text = node.getAttribute('text') || '';
        const contentDesc = node.getAttribute('content-desc') || '';
        const className = node.getAttribute('class') || '';
        const clickable = node.getAttribute('clickable') === 'true';
        const enabled = node.getAttribute('enabled') === 'true';
        
        // 过滤掉无意义的元素
        if (!bounds || bounds === '[0,0][0,0]') return;
        if (!text && !contentDesc && !clickable) return;
        
        const position = parseBounds(bounds);
        if (position.width <= 0 || position.height <= 0) return;
        
        const category = categorizeElement(node);
        const userFriendlyName = getUserFriendlyName(node);
        const importance = getElementImportance(node);
        
        const element: UIElement = {
          id: `element-${index}`,
          text: text,
          description: contentDesc || `${userFriendlyName}${clickable ? '（可点击）' : ''}`,
          type: className.split('.').pop() || 'Unknown',
          category,
          position,
          clickable,
          importance,
          userFriendlyName
        };
        
        extractedElements.push(element);
        elementCategories[category].elements.push(element);
      });
      
      setElements(extractedElements);
      setCategories(Object.values(elementCategories).filter(cat => cat.elements.length > 0));
    } catch (error) {
      console.error('XML解析失败:', error);
    }
  };

  // 当XML内容变化时重新解析
  React.useEffect(() => {
    if (xmlContent && visible) {
      parseXML(xmlContent);
    }
  }, [xmlContent, visible]);

  // 过滤元素
  const filteredElements = elements.filter(element => {
    const matchesSearch = searchText === '' || 
      element.userFriendlyName.toLowerCase().includes(searchText.toLowerCase()) ||
      element.description.toLowerCase().includes(searchText.toLowerCase());
    
    const matchesCategory = selectedCategory === 'all' || element.category === selectedCategory;
    const matchesClickable = !showOnlyClickable || element.clickable;
    
    return matchesSearch && matchesCategory && matchesClickable;
  });

  // 渲染可视化页面预览
  const renderPagePreview = () => {
    const maxX = Math.max(...elements.map(e => e.position.x + e.position.width));
    const maxY = Math.max(...elements.map(e => e.position.y + e.position.height));
    const scale = Math.min(400 / maxX, 600 / maxY, 1);
    
    return (
      <div className="page-preview" style={{ width: 400, height: 600, position: 'relative', border: '1px solid #4b5563', borderRadius: 8, overflow: 'hidden', backgroundColor: '#1f2937' }}>
        <Title level={5} style={{ textAlign: 'center', margin: '8px 0', color: '#e5e7eb', fontWeight: 'bold' }}>小红书页面布局预览</Title>
        {filteredElements.map(element => {
          const category = categories.find(cat => cat.name === element.category);
          return (
            <Tooltip key={element.id} title={`${element.userFriendlyName}: ${element.description}`}>
              <div
                className={`preview-element ${element.importance}`}
                style={{
                  position: 'absolute',
                  left: element.position.x * scale,
                  top: element.position.y * scale + 30,
                  width: Math.max(element.position.width * scale, 2),
                  height: Math.max(element.position.height * scale, 2),
                  backgroundColor: category?.color || '#ccc',
                  opacity: element.clickable ? 0.8 : 0.5,
                  border: element.clickable ? '2px solid #fff' : '1px solid rgba(255,255,255,0.5)',
                  borderRadius: 2,
                  cursor: element.clickable ? 'pointer' : 'default'
                }}
                onClick={() => {
                  if (element.clickable) {
                    Modal.info({
                      title: element.userFriendlyName,
                      content: (
                        <div>
                          <p><strong>描述:</strong> {element.description}</p>
                          <p><strong>类型:</strong> {element.type}</p>
                          <p><strong>位置:</strong> ({element.position.x}, {element.position.y})</p>
                          <p><strong>大小:</strong> {element.position.width} × {element.position.height}</p>
                          <p><strong>可点击:</strong> {element.clickable ? '是' : '否'}</p>
                        </div>
                      )
                    });
                  }
                }}
              />
            </Tooltip>
          );
        })}
      </div>
    );
  };

  return (
    <Modal
      title={
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <EyeOutlined />
          <span>智能页面分析器</span>
          <Badge count={elements.length} style={{ backgroundColor: '#10b981' }} />
        </div>
      }
      visible={visible}
      onCancel={onClose}
      width={1200}
      footer={null}
      className="visual-page-analyzer"
    >
      <div style={{ display: 'flex', gap: 16 }}>
        {/* 左侧控制面板 */}
        <div style={{ width: 300, borderRight: '1px solid #f0f0f0', paddingRight: 16 }}>
          <Space direction="vertical" style={{ width: '100%' }} size={16}>
            {/* 搜索框 */}
            <Input
              placeholder="搜索元素..."
              prefix={<SearchOutlined />}
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
            />
            
            {/* 过滤选项 */}
            <Space>
              <Switch 
                checked={showOnlyClickable} 
                onChange={setShowOnlyClickable}
                size="small"
              />
              <Text>只显示可点击元素</Text>
            </Space>
            
            {/* 分类选择 */}
            <div>
              <Title level={5}>按功能分类</Title>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                <Button 
                  type={selectedCategory === 'all' ? 'primary' : 'default'}
                  size="small"
                  onClick={() => setSelectedCategory('all')}
                  style={{ 
                    textAlign: 'left',
                    color: selectedCategory === 'all' ? '#fff' : '#e5e7eb',
                    backgroundColor: selectedCategory === 'all' ? '#3b82f6' : '#374151'
                  }}
                >
                  <AppstoreOutlined /> 全部 ({elements.length})
                </Button>
                {categories.map(category => (
                  <Button
                    key={category.name}
                    type={selectedCategory === category.name ? 'primary' : 'default'}
                    size="small"
                    onClick={() => setSelectedCategory(category.name)}
                    style={{ 
                      textAlign: 'left', 
                      color: selectedCategory === category.name ? '#fff' : '#e5e7eb',
                      borderColor: category.color,
                      backgroundColor: selectedCategory === category.name ? category.color : '#374151'
                    }}
                  >
                    {category.icon} {category.name} ({category.elements.length})
                  </Button>
                ))}
              </div>
            </div>
            
            {/* 统计信息 */}
            <Alert
              message="页面统计"
              description={
                <div>
                  <p>总元素: {elements.length} 个</p>
                  <p>可点击: {elements.filter(e => e.clickable).length} 个</p>
                  <p>高重要性: {elements.filter(e => e.importance === 'high').length} 个</p>
                </div>
              }
              type="info"
            />
          </Space>
        </div>
        
        {/* 中间页面预览 */}
        <div style={{ flex: 1, display: 'flex', justifyContent: 'center', alignItems: 'flex-start' }}>
          {renderPagePreview()}
        </div>
        
        {/* 右侧元素列表 */}
        <div style={{ width: 400, maxHeight: 600, overflowY: 'auto' }}>
          <Title level={5}>元素列表 ({filteredElements.length})</Title>
          <Space direction="vertical" style={{ width: '100%' }} size={8}>
            {filteredElements.map(element => {
              const category = categories.find(cat => cat.name === element.category);
              return (
                <Card
                  key={element.id}
                  size="small"
                  title={
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      {category?.icon}
                      <span style={{ color: category?.color }}>{element.userFriendlyName}</span>
                      {element.clickable && <Badge status="success" text="可点击" />}
                    </div>
                  }
                  extra={
                    <Badge 
                      color={element.importance === 'high' ? 'red' : element.importance === 'medium' ? 'orange' : 'default'}
                      text={element.importance === 'high' ? '重要' : element.importance === 'medium' ? '中等' : '一般'}
                    />
                  }
                  className={`element-card ${element.importance}`}
                >
                  <div style={{ fontSize: 12, color: '#e5e7eb' }}>
                    <p style={{ margin: 0, color: '#e5e7eb' }}><strong>功能:</strong> {element.description}</p>
                    <p style={{ margin: 0, color: '#e5e7eb' }}><strong>位置:</strong> ({element.position.x}, {element.position.y})</p>
                    <p style={{ margin: 0, color: '#e5e7eb' }}><strong>大小:</strong> {element.position.width} × {element.position.height}</p>
                    {element.text && <p style={{ margin: 0, color: '#e5e7eb' }}><strong>文本:</strong> {element.text}</p>}
                  </div>
                </Card>
              );
            })}
          </Space>
        </div>
      </div>
    </Modal>
  );
};

export default VisualPageAnalyzer;