import React, { useState, useCallback } from 'react';
import { Modal, Tabs, Typography, Card, Alert, Button, Space, message } from 'antd';
import {
  PartitionOutlined,
  RobotOutlined,
  SettingOutlined,
  BulbOutlined,
  CheckOutlined,
  CloseOutlined
} from '@ant-design/icons';
import SmartNavigationStepBuilder from './SmartNavigationStepBuilder';
import SmartElementFinder from '../smart-element-finder/SmartElementFinder';
import type { SmartScriptStep } from '../../types/smartScript';

const { Title, Text } = Typography;
const { TabPane } = Tabs;

interface SmartNavigationModalProps {
  visible: boolean;
  onClose: () => void;
  deviceId?: string;
  onStepGenerated: (step: SmartScriptStep) => void;
}

export const SmartNavigationModal: React.FC<SmartNavigationModalProps> = ({
  visible,
  onClose,
  deviceId = '',
  onStepGenerated
}) => {
  const [activeTab, setActiveTab] = useState<string>('wizard');
  const [hasValidStep, setHasValidStep] = useState<boolean>(false);
  const [pendingStep, setPendingStep] = useState<SmartScriptStep | null>(null);

  // 处理向导模式生成的步骤
  const handleWizardStepGenerated = useCallback((stepConfig: any) => {
    const smartStep: SmartScriptStep = {
      id: Date.now().toString(),
      name: `智能导航 - ${stepConfig.description}`,
      description: stepConfig.description,
      step_type: 'smart_navigation' as any,
      enabled: true,
      order: 0,
      parameters: {
        navigation_type: stepConfig.config.navigation_type,
        app_name: stepConfig.config.app_name,
        button_name: stepConfig.config.button_name,
        click_action: stepConfig.config.click_action,
        position_ratio: stepConfig.execution_config?.position_ratio,
        button_patterns: stepConfig.execution_config?.button_patterns,
        wizard_mode: true,
        preset_config: stepConfig.config,
        execution_config: stepConfig.execution_config
      }
    };

    setPendingStep(smartStep);
    setHasValidStep(true);
    message.success('步骤配置完成，点击确定添加到脚本');
  }, []);

  // 处理专业模式生成的步骤
  const handleProfessionalStepGenerated = useCallback((stepConfig: any) => {
    const smartStep: SmartScriptStep = {
      id: Date.now().toString(),
      name: `智能导航 - ${stepConfig.name}`,
      description: stepConfig.description,
      step_type: 'smart_navigation' as any,
      enabled: true,
      order: 0,
      parameters: {
        navigation_type: stepConfig.config.position_type,
        target_button: stepConfig.config.target_button,
        click_action: stepConfig.config.click_action,
        position_ratio: stepConfig.config.position_ratio,
        button_patterns: stepConfig.config.button_patterns,
        wizard_mode: false,
        professional_config: stepConfig.config,
        target_element: stepConfig.target_element
      }
    };

    setPendingStep(smartStep);
    setHasValidStep(true);
    message.success('步骤配置完成，点击确定添加到脚本');
  }, []);

  // 确定按钮处理
  const handleConfirm = useCallback(() => {
    if (pendingStep) {
      onStepGenerated(pendingStep);
      onClose();
      message.success(`已添加导航步骤: ${pendingStep.name}`);
    } else {
      message.warning('请先完成步骤配置');
    }
  }, [pendingStep, onStepGenerated, onClose]);

  // 取消按钮处理
  const handleCancel = useCallback(() => {
    setPendingStep(null);
    setHasValidStep(false);
    onClose();
  }, [onClose]);

  // 重置状态当模态框关闭时
  const handleModalClose = useCallback(() => {
    setPendingStep(null);
    setHasValidStep(false);
    setActiveTab('wizard');
    onClose();
  }, [onClose]);

  return (
    <Modal
      title={
        <Space>
          <PartitionOutlined style={{ color: '#1890ff' }} />
          智能导航配置
        </Space>
      }
      open={visible}
      onCancel={handleModalClose}
      footer={
        <Space>
          <Button 
            key="cancel" 
            icon={<CloseOutlined />}
            onClick={handleCancel}
          >
            取消
          </Button>
          <Button 
            key="confirm" 
            type="primary" 
            icon={<CheckOutlined />}
            onClick={handleConfirm}
            disabled={!hasValidStep}
          >
            确定添加
          </Button>
        </Space>
      }
      width={1200}
      centered
    >
      <Alert
        message="智能导航配置工具"
        description="选择适合您的配置模式，完成配置后点击确定将步骤添加到脚本中。"
        type="info"
        showIcon
        style={{ marginBottom: 16 }}
      />

      <Tabs activeKey={activeTab} onChange={setActiveTab}>
        <TabPane
          tab={
            <span>
              <BulbOutlined style={{ color: '#52c41a' }} />
              向导模式
            </span>
          }
          key="wizard"
        >
          <Card 
            title="🧙‍♂️ 向导式配置" 
            size="small"
            style={{ marginBottom: 16 }}
          >
            <Text type="secondary">
              适合新手用户，通过步骤向导快速创建智能导航步骤。
              预设了主流应用的导航配置，操作简单快捷。
            </Text>
          </Card>
          
          <SmartNavigationStepBuilder 
            onStepGenerated={handleWizardStepGenerated}
            deviceId={deviceId}
          />
        </TabPane>

        <TabPane
          tab={
            <span>
              <SettingOutlined style={{ color: '#fa8c16' }} />
              专业模式
            </span>
          }
          key="professional"
        >
          <Card 
            title="⚙️ 专业配置" 
            size="small"
            style={{ marginBottom: 16 }}
          >
            <Text type="secondary">
              适合专业用户和调试场景，支持详细的参数配置和实时测试。
              可以精确控制导航区域范围和元素匹配规则。
            </Text>
          </Card>
          
          <SmartElementFinder
            deviceId={deviceId}
            onStepCreated={handleProfessionalStepGenerated}
          />
        </TabPane>
      </Tabs>

      <div style={{ 
        marginTop: 16, 
        padding: 12, 
        background: '#f6f6f6', 
        borderRadius: 6,
        fontSize: '12px',
        color: '#666'
      }}>
        <strong>使用提示：</strong>
        <ul style={{ margin: '4px 0', paddingLeft: '16px' }}>
          <li><strong>向导模式</strong>：推荐日常使用，预设配置覆盖主流应用</li>
          <li><strong>专业模式</strong>：适合调试和自定义配置，功能更加强大</li>
          <li>完成配置后，点击"确定添加"按钮将步骤添加到脚本中</li>
        </ul>
      </div>
    </Modal>
  );
};

export default SmartNavigationModal;