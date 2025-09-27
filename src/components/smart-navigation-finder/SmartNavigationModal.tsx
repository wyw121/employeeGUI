import React, { useState, useCallback, useRef } from 'react';
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
import { useOverlayTheme } from '../ui/overlay';

const { Title, Text } = Typography;
const { TabPane } = Tabs;

interface SmartNavigationModalProps {
  visible: boolean;
  onClose: (finalConfig?: {app_name?: string, navigation_type?: string}) => void; // 修改：允许传递最终配置
  deviceId?: string;
  onStepGenerated: (step: SmartScriptStep) => void;
  onConfigurationChange?: (config: {app_name?: string, navigation_type?: string}) => void;
}

export const SmartNavigationModal: React.FC<SmartNavigationModalProps> = ({
  visible,
  onClose,
  deviceId = '',
  onStepGenerated,
  onConfigurationChange
}) => {
  // 未来在内容中若添加下拉/弹层，这里可统一传递 popupProps
  const { classes, popupProps } = useOverlayTheme('inherit');
  const [activeTab, setActiveTab] = useState<string>('wizard');
  const [hasValidStep, setHasValidStep] = useState<boolean>(false);
  const [pendingStep, setPendingStep] = useState<SmartScriptStep | null>(null);
  
  // 用于收集当前配置状态的ref
  const wizardConfigRef = useRef<{
    app: string;
    navType: string;
  } | null>(null);
  const professionalConfigRef = useRef<{
    app: string;
    navType: string;
  } | null>(null);

  // 处理向导模式生成的步骤
  const handleWizardStepGenerated = useCallback((stepConfig: any) => {
    console.log('🔍 向导模式步骤配置:', stepConfig); // 调试信息
    
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
    
    // 通知配置变化 - 修复数据访问路径
    const configChange = {
      app_name: stepConfig.parameters?.app_name,
      navigation_type: stepConfig.parameters?.navigation_type
    };
    console.log('📤 发送配置变化:', configChange); // 调试信息
    onConfigurationChange?.(configChange);
    
    message.success('步骤配置完成，点击确定添加到脚本');
  }, [onConfigurationChange]);

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
    
    // 通知配置变化  
    onConfigurationChange?.({
      app_name: stepConfig.parameters?.app_name,
      navigation_type: stepConfig.parameters?.navigation_type
    });
    
    message.success('步骤配置完成，点击确定添加到脚本');
  }, [onConfigurationChange]);

  // 统一的关闭处理函数，直接从当前UI状态提取配置
  const applyLastConfigAndClose = useCallback(() => {
    console.log('🚀 统一关闭处理，活跃Tab:', activeTab); // 调试信息
    
    let finalConfig = null;
    
    // 根据当前活跃的Tab提取配置
    if (activeTab === 'wizard' && wizardConfigRef.current) {
      finalConfig = {
        app_name: wizardConfigRef.current.app,
        navigation_type: wizardConfigRef.current.navType
      };
    } else if (activeTab === 'professional' && professionalConfigRef.current) {
      finalConfig = {
        app_name: professionalConfigRef.current.app,
        navigation_type: professionalConfigRef.current.navType
      };
    }
    
    console.log('📤 提取到的最终配置:', finalConfig); // 调试信息
    
    // 重置状态
    setPendingStep(null);
    setHasValidStep(false);
    setActiveTab('wizard');
    
    // 调用关闭回调，传递最终配置
    onClose(finalConfig);
  }, [activeTab, onClose]);

  // 确定按钮处理
  const handleConfirm = useCallback(() => {
    if (pendingStep) {
      onStepGenerated(pendingStep);
      applyLastConfigAndClose();
      message.success(`已添加导航步骤: ${pendingStep.name}`);
    } else {
      message.warning('请先完成步骤配置');
    }
  }, [pendingStep, onStepGenerated, applyLastConfigAndClose]);

  // 取消按钮处理 - 也应用最后配置
  const handleCancel = useCallback(() => {
    applyLastConfigAndClose();
  }, [applyLastConfigAndClose]);

  // 重置状态当模态框关闭时 - 也应用最后配置
  const handleModalClose = useCallback(() => {
    applyLastConfigAndClose();
  }, [applyLastConfigAndClose]);

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
      className={classes.className}
      rootClassName={classes.rootClassName}
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
            onConfigChange={(config) => {
              console.log('📥 接收向导模式配置变化:', config); // 调试信息
              wizardConfigRef.current = config;
            }}
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
            onConfigChange={(config) => {
              console.log('📥 接收专业模式配置变化:', config); // 调试信息
              professionalConfigRef.current = config;
            }}
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