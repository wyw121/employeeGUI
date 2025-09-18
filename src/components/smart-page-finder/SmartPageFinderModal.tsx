/**
 * 智能页面查找模态框 - 主组件
 * Universal UI 智能元素查找器的主界面
 */

import React, { useEffect, useMemo } from 'react';
import {
  Modal,
  Row,
  Col,
  Card,
  Button,
  Space,
  Typography,
  Spin,
  Alert,
  Divider,
  Badge,
  Tooltip,
  message,
} from 'antd';
import {
  SearchOutlined,
  ReloadOutlined,
  SettingOutlined,
  RobotOutlined,
  BugOutlined,
  ThunderboltOutlined,
  EyeOutlined,
  CloseOutlined,
} from '@ant-design/icons';

import { usePageAnalysis } from '../../application/page-analysis';
import { PageInfoDisplay } from './PageInfoDisplay';
import { ElementHierarchyTree } from './ElementHierarchyTree';
import { ElementSearchFilter } from './ElementSearchFilter';
import { SelectedElementsList } from './SelectedElementsList';
import { ActionExecutor } from './ActionExecutor';
import { AnalysisStatistics } from './AnalysisStatistics';

const { Title, Text } = Typography;

export interface SmartPageFinderModalProps {
  visible: boolean;
  onClose: () => void;
  deviceId: string;
  onElementSelected?: (elementId: string, action: string) => void;
  title?: string;
}

export const SmartPageFinderModal: React.FC<SmartPageFinderModalProps> = ({
  visible,
  onClose,
  deviceId,
  onElementSelected,
  title = "Universal UI 智能页面查找",
}) => {
  const {
    isAnalyzing,
    currentAnalysis,
    error,
    selectedElements,
    isReady,
    analyzeCurrentPage,
    refreshAnalysis,
    clearError,
    reset,
    openModal,
    closeModal,
  } = usePageAnalysis();

  // 当模态框打开时初始化
  useEffect(() => {
    if (visible && deviceId) {
      openModal(deviceId);
      // 如果没有当前分析结果，自动开始分析
      if (!currentAnalysis) {
        handleAnalyzePage();
      }
    }
  }, [visible, deviceId, currentAnalysis, openModal]);

  // 当模态框关闭时清理状态
  const handleModalClose = () => {
    closeModal();
    onClose();
  };

  const handleAnalyzePage = async () => {
    try {
      await analyzeCurrentPage(deviceId);
      message.success('页面分析完成！');
    } catch (error) {
      console.error('页面分析失败:', error);
      message.error('页面分析失败，请检查设备连接');
    }
  };

  const handleRefreshAnalysis = async () => {
    try {
      await refreshAnalysis();
      message.success('页面刷新完成！');
    } catch (error) {
      console.error('页面刷新失败:', error);
      message.error('页面刷新失败');
    }
  };

  const handleElementSelect = (elementId: string, action: string) => {
    onElementSelected?.(elementId, action);
  };

  // 统计信息
  const stats = useMemo(() => {
    if (!currentAnalysis) return null;
    return currentAnalysis.statistics;
  }, [currentAnalysis]);

  // 页面信息
  const pageInfo = useMemo(() => {
    if (!currentAnalysis) return null;
    return currentAnalysis.pageInfo;
  }, [currentAnalysis]);

  return (
    <Modal
      title={
        <Space>
          <RobotOutlined style={{ color: '#1890ff' }} />
          <span>{title}</span>
          {isAnalyzing && <Spin size="small" />}
        </Space>
      }
      open={visible}
      onCancel={handleModalClose}
      width="90vw"
      style={{ top: 20 }}
      footer={null}
      destroyOnClose
      maskClosable={false}
    >
      <div style={{ height: '85vh', display: 'flex', flexDirection: 'column' }}>
        {/* 顶部操作栏 */}
        <Row gutter={16} style={{ marginBottom: 16 }}>
          <Col flex="auto">
            <Space>
              <Button
                type="primary"
                icon={<SearchOutlined />}
                onClick={handleAnalyzePage}
                loading={isAnalyzing}
                disabled={!deviceId}
              >
                {isAnalyzing ? '分析中...' : '分析页面'}
              </Button>
              
              <Button
                icon={<ReloadOutlined />}
                onClick={handleRefreshAnalysis}
                loading={isAnalyzing}
                disabled={!deviceId || !currentAnalysis}
              >
                刷新
              </Button>

              <Divider type="vertical" />

              {/* 状态指示器 */}
              {stats && (
                <Space>
                  <Badge count={stats.totalElements} showZero>
                    <Tooltip title="总元素数">
                      <Button size="small" type="text" icon={<EyeOutlined />}>
                        元素
                      </Button>
                    </Tooltip>
                  </Badge>
                  
                  <Badge count={stats.actionableElements} showZero>
                    <Tooltip title="可操作元素数">
                      <Button size="small" type="text" icon={<ThunderboltOutlined />}>
                        可操作
                      </Button>
                    </Tooltip>
                  </Badge>
                  
                  <Badge count={selectedElements.length} showZero>
                    <Tooltip title="已选择元素">
                      <Button size="small" type="text" icon={<SettingOutlined />}>
                        已选择
                      </Button>
                    </Tooltip>
                  </Badge>
                </Space>
              )}
            </Space>
          </Col>

          <Col>
            <Button
              type="text"
              icon={<CloseOutlined />}
              onClick={handleModalClose}
            />
          </Col>
        </Row>

        {/* 错误提示 */}
        {error && (
          <Alert
            message="分析出错"
            description={error}
            type="error"
            showIcon
            closable
            onClose={clearError}
            style={{ marginBottom: 16 }}
            action={
              <Button size="small" onClick={handleAnalyzePage}>
                重试
              </Button>
            }
          />
        )}

        {/* 主内容区域 */}
        <div style={{ flex: 1, display: 'flex', gap: 16, minHeight: 0 }}>
          {/* 左侧面板 - 页面信息和搜索 */}
          <div style={{ width: '300px', display: 'flex', flexDirection: 'column' }}>
            {/* 当前页面信息 */}
            <Card 
              title="当前页面信息" 
              size="small" 
              style={{ marginBottom: 16 }}
            >
              {pageInfo ? (
                <PageInfoDisplay pageInfo={pageInfo} />
              ) : (
                <Text type="secondary">暂无页面信息</Text>
              )}
            </Card>

            {/* 搜索和过滤 */}
            <Card 
              title="搜索和过滤" 
              size="small" 
              style={{ marginBottom: 16 }}
            >
              <ElementSearchFilter />
            </Card>

            {/* 统计信息 */}
            {stats && (
              <Card title="分析统计" size="small">
                <AnalysisStatistics 
                  analysis={currentAnalysis} 
                  isAnalyzing={isAnalyzing}
                  totalAnalysisTime={0}
                />
              </Card>
            )}
          </div>

          {/* 中间面板 - 元素层次结构 */}
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>
            <Card
              title={
                <Space>
                  <BugOutlined />
                  <span>页面元素层次结构</span>
                  {isAnalyzing && <Spin size="small" />}
                </Space>
              }
              size="small"
              style={{ flex: 1, display: 'flex', flexDirection: 'column' }}
              bodyStyle={{ flex: 1, padding: '12px', overflow: 'hidden' }}
            >
              {isReady() ? (
                <ElementHierarchyTree
                  analysis={currentAnalysis}
                  onElementSelect={(element) => {
                    // 这里可以处理元素选择逻辑
                    console.log('Element selected:', element);
                  }}
                />
              ) : isAnalyzing ? (
                <div style={{ 
                  display: 'flex', 
                  justifyContent: 'center', 
                  alignItems: 'center', 
                  height: '200px' 
                }}>
                  <Spin size="large" tip="正在分析页面结构..." />
                </div>
              ) : (
                <div style={{
                  display: 'flex',
                  justifyContent: 'center',
                  alignItems: 'center',
                  height: '200px',
                  flexDirection: 'column',
                  color: '#999'
                }}>
                  <RobotOutlined style={{ fontSize: '48px', marginBottom: 16 }} />
                  <Text type="secondary">点击"分析页面"开始智能分析</Text>
                </div>
              )}
            </Card>
          </div>

          {/* 右侧面板 - 选中元素和动作 */}
          <div style={{ width: '300px', display: 'flex', flexDirection: 'column' }}>
            {/* 选中的元素列表 */}
            <Card 
              title="选中的元素" 
              size="small"
              style={{ marginBottom: 16, flex: 1 }}
              bodyStyle={{ padding: '12px', maxHeight: '300px', overflow: 'auto' }}
            >
              <SelectedElementsList
                selectedElements={selectedElements}
                onElementAction={handleElementSelect}
              />
            </Card>

            {/* 动作执行器 */}
            {selectedElements.length > 0 && (
              <Card title="执行动作" size="small">
                <ActionExecutor
                  deviceId={deviceId}
                  selectedElements={selectedElements}
                  onActionComplete={(success, resultMessage) => {
                    if (success) {
                      message.success(resultMessage);
                    } else {
                      message.error(resultMessage);
                    }
                  }}
                />
              </Card>
            )}
          </div>
        </div>
      </div>
    </Modal>
  );
};