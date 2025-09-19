// SmartScriptBuilderPage 的脚本管理集成示例

import React, { useState, useCallback } from 'react';
import { Card, Button, Space, Modal, Input, message } from 'antd';
import { SaveOutlined, FolderOpenOutlined, MenuOutlined } from '@ant-design/icons';

// 导入新的模块化脚本管理系统
import {
  useScriptEditor,
  useScriptManager,
  ScriptSerializer,
  SmartScript,
  ScriptManager
} from '../index';

interface ScriptBuilderIntegrationProps {
  // 原有的SmartScriptBuilderPage状态
  steps: any[];
  executorConfig: any;
  onLoadScript: (script: any) => void;
  onUpdateSteps: (steps: any[]) => void;
  onUpdateConfig: (config: any) => void;
}

/**
 * 脚本构建器的脚本管理集成组件
 */
export const ScriptBuilderIntegration: React.FC<ScriptBuilderIntegrationProps> = ({
  steps,
  executorConfig,
  onLoadScript,
  onUpdateSteps,
  onUpdateConfig
}) => {
  const { saveFromUIState, loadScript } = useScriptEditor();
  const [saveModalVisible, setSaveModalVisible] = useState(false);
  const [managerModalVisible, setManagerModalVisible] = useState(false);
  const [scriptName, setScriptName] = useState('');
  const [scriptDescription, setScriptDescription] = useState('');
  const [saving, setSaving] = useState(false);

  // 保存脚本到模块化系统
  const handleSaveScript = useCallback(async () => {
    if (!scriptName.trim()) {
      message.warning('请输入脚本名称');
      return;
    }

    setSaving(true);
    try {
      const savedScript = await saveFromUIState(
        scriptName,
        scriptDescription || `包含 ${steps.length} 个步骤的智能脚本`,
        steps,
        executorConfig,
        {
          category: '智能脚本',
          tags: ['自动化', '构建器创建']
        }
      );

      console.log('✅ 脚本保存成功:', savedScript);
      setSaveModalVisible(false);
      setScriptName('');
      setScriptDescription('');
    } catch (error) {
      console.error('❌ 保存脚本失败:', error);
    } finally {
      setSaving(false);
    }
  }, [scriptName, scriptDescription, steps, executorConfig, saveFromUIState]);

  // 从模块化系统加载脚本
  const handleLoadScript = useCallback(async (script: SmartScript) => {
    try {
      // 反序列化脚本到UI状态
      const { steps: deserializedSteps, config: deserializedConfig } = 
        ScriptSerializer.deserializeScript(script);

      // 更新UI状态
      onUpdateSteps(deserializedSteps);
      onUpdateConfig(deserializedConfig);
      onLoadScript(script);

      message.success(`脚本 "${script.name}" 加载成功`);
      setManagerModalVisible(false);
    } catch (error) {
      console.error('❌ 加载脚本失败:', error);
      message.error('加载脚本失败');
    }
  }, [onLoadScript, onUpdateSteps, onUpdateConfig]);

  return (
    <Space>
      {/* 保存脚本按钮 */}
      <Button
        icon={<SaveOutlined />}
        onClick={() => setSaveModalVisible(true)}
        disabled={steps.length === 0}
      >
        保存脚本
      </Button>

      {/* 脚本管理器按钮 */}
      <Button
        icon={<MenuOutlined />}
        onClick={() => setManagerModalVisible(true)}
      >
        脚本管理器
      </Button>

      {/* 保存脚本对话框 */}
      <Modal
        title="保存智能脚本"
        open={saveModalVisible}
        onOk={handleSaveScript}
        onCancel={() => setSaveModalVisible(false)}
        confirmLoading={saving}
        width={600}
      >
        <Space direction="vertical" style={{ width: '100%' }} size="middle">
          <div>
            <label>脚本名称 *</label>
            <Input
              placeholder="输入脚本名称"
              value={scriptName}
              onChange={(e) => setScriptName(e.target.value)}
              style={{ marginTop: 8 }}
            />
          </div>
          
          <div>
            <label>脚本描述</label>
            <Input.TextArea
              placeholder="输入脚本描述（可选）"
              value={scriptDescription}
              onChange={(e) => setScriptDescription(e.target.value)}
              rows={3}
              style={{ marginTop: 8 }}
            />
          </div>

          <Card size="small" title="脚本预览">
            <Space direction="vertical" size="small" style={{ width: '100%' }}>
              <div>步骤数量: <strong>{steps.length}</strong></div>
              <div>
                启用步骤: <strong>{steps.filter(s => s.enabled !== false).length}</strong>
              </div>
              {steps.length > 0 && (
                <div>
                  <div>包含步骤类型:</div>
                  <Space wrap>
                    {[...new Set(steps.map(s => s.step_type || s.type))].map(type => (
                      <span key={type} style={{ 
                        background: '#f0f0f0', 
                        padding: '2px 8px', 
                        borderRadius: '4px',
                        fontSize: '12px'
                      }}>
                        {type}
                      </span>
                    ))}
                  </Space>
                </div>
              )}
            </Space>
          </Card>
        </Space>
      </Modal>

      {/* 脚本管理器对话框 */}
      <Modal
        title="脚本管理器"
        open={managerModalVisible}
        onCancel={() => setManagerModalVisible(false)}
        footer={null}
        width={1200}
        style={{ top: 20 }}
      >
        <ScriptManager 
          onEditScript={handleLoadScript}
          selectedDeviceId="emulator-5554" // 可以从父组件传入
        />
      </Modal>
    </Space>
  );
};

export default ScriptBuilderIntegration;