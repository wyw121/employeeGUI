/**
 * 分布式脚本质量检查面板
 * 在脚本构建器中集成质量检查功能
 */

import React, { useState, useCallback, useEffect } from 'react';
import { Card, Button, Alert, Progress, Tag, Collapse, Space, Tooltip, Modal, Typography } from 'antd';
import { CheckCircleOutlined, WarningOutlined, CloseCircleOutlined, InfoCircleOutlined, SyncOutlined, ToolOutlined } from '@ant-design/icons';
import { XmlDataValidator, ValidationResult, ScriptValidationResult } from './XmlDataValidator';
import { DistributedScriptRecoveryService, ScriptRecoveryReport } from './DistributedScriptRecoveryService';

const { Panel } = Collapse;
const { Text, Paragraph } = Typography;

interface QualityCheckPanelProps {
  script: any;
  onScriptUpdate?: (updatedScript: any) => void;
  onValidationChange?: (isValid: boolean) => void;
}

interface QualityCheckState {
  validation: ScriptValidationResult | null;
  recovery: ScriptRecoveryReport | null;
  isValidating: boolean;
  isRecovering: boolean;
  showDetails: boolean;
  selectedStepIndex: number | null;
}

export const DistributedScriptQualityPanel: React.FC<QualityCheckPanelProps> = ({
  script,
  onScriptUpdate,
  onValidationChange
}) => {
  const [state, setState] = useState<QualityCheckState>({
    validation: null,
    recovery: null,
    isValidating: false,
    isRecovering: false,
    showDetails: false,
    selectedStepIndex: null
  });

  // 执行质量检查
  const performQualityCheck = useCallback(async () => {
    if (!script) return;

    setState(prev => ({ ...prev, isValidating: true }));
    
    try {
      console.log('🔍 执行脚本质量检查...');
      const validation = XmlDataValidator.validateDistributedScript(script);
      
      setState(prev => ({ 
        ...prev, 
        validation, 
        isValidating: false 
      }));

      onValidationChange?.(validation.isValid);
      
      console.log('✅ 质量检查完成:', {
        isValid: validation.isValid,
        validSteps: `${validation.validSteps}/${validation.totalSteps}`,
        issues: validation.issues.length
      });
    } catch (error) {
      console.error('❌ 质量检查失败:', error);
      setState(prev => ({ ...prev, isValidating: false }));
    }
  }, [script, onValidationChange]);

  // 执行自动恢复
  const performAutoRecovery = useCallback(async () => {
    if (!script || !state.validation || state.validation.isValid) return;

    setState(prev => ({ ...prev, isRecovering: true }));
    
    try {
      console.log('🔧 执行自动恢复...');
      const recovery = await DistributedScriptRecoveryService.recoverDistributedScript(script);
      
      setState(prev => ({ 
        ...prev, 
        recovery, 
        isRecovering: false 
      }));

      // 如果恢复成功，更新脚本
      if (recovery.resolvedIssues > 0) {
        onScriptUpdate?.(recovery.recoveredScript);
        console.log('✅ 脚本已更新，重新验证...');
        
        // 重新验证恢复后的脚本
        setTimeout(() => {
          performQualityCheck();
        }, 100);
      }
      
    } catch (error) {
      console.error('❌ 自动恢复失败:', error);
      setState(prev => ({ ...prev, isRecovering: false }));
    }
  }, [script, state.validation, onScriptUpdate, performQualityCheck]);

  // 初始加载时执行检查
  useEffect(() => {
    if (script && script.steps?.length > 0) {
      performQualityCheck();
    }
  }, [script?.steps?.length]); // 只在步骤数量变化时重新检查

  // 渲染严重性图标
  const renderSeverityIcon = (severity: string) => {
    switch (severity) {
      case 'error':
        return <CloseCircleOutlined style={{ color: '#ff4d4f' }} />;
      case 'warning':
        return <WarningOutlined style={{ color: '#faad14' }} />;
      case 'info':
        return <InfoCircleOutlined style={{ color: '#1890ff' }} />;
      default:
        return <CheckCircleOutlined style={{ color: '#52c41a' }} />;
    }
  };

  // 渲染步骤质量状态
  const renderStepQualityStatus = (stepIndex: number) => {
    if (!script?.steps?.[stepIndex]) return null;
    
    const step = script.steps[stepIndex];
    const quickCheck = XmlDataValidator.quickCheck(step);
    
    if (quickCheck.hasXmlSnapshot && quickCheck.isValid) {
      return <Tag color="success" icon={<CheckCircleOutlined />}>完整</Tag>;
    } else if (quickCheck.hasXmlSnapshot) {
      return <Tag color="warning" icon={<WarningOutlined />}>待修复</Tag>;
    } else {
      return <Tag color="error" icon={<CloseCircleOutlined />}>缺少快照</Tag>;
    }
  };

  // 渲染质量总览
  const renderQualityOverview = () => {
    if (!state.validation) {
      return (
        <Card size="small" loading={state.isValidating}>
          <Text>准备检查脚本质量...</Text>
        </Card>
      );
    }

    const { validation } = state;
    const successRate = Math.round((validation.validSteps / validation.totalSteps) * 100);
    
    return (
      <Card 
        size="small" 
        title={
          <Space>
            <span>分布式脚本质量评估</span>
            <Button 
              size="small" 
              icon={<SyncOutlined />} 
              onClick={performQualityCheck}
              loading={state.isValidating}
            >
              重新检查
            </Button>
          </Space>
        }
      >
        <Space direction="vertical" style={{ width: '100%' }}>
          {/* 整体状态 */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            {validation.isValid ? (
              <Tag color="success" icon={<CheckCircleOutlined />}>脚本通过验证</Tag>
            ) : (
              <Tag color="error" icon={<CloseCircleOutlined />}>脚本需要修复</Tag>
            )}
            
            <Text type="secondary">
              有效步骤: {validation.validSteps}/{validation.totalSteps}
            </Text>
            
            <Text type="secondary">
              兼容性: {validation.compatibilityScore}%
            </Text>
          </div>

          {/* 进度条 */}
          <Progress 
            percent={successRate} 
            status={validation.isValid ? 'success' : 'exception'}
            size="small"
            format={(percent) => `${percent}% 完整`}
          />

          {/* 问题统计 */}
          {validation.issues.length > 0 && (
            <Alert
              type={validation.isValid ? 'warning' : 'error'}
              message={`发现 ${validation.issues.length} 个问题`}
              description={
                <div>
                  <Text>
                    错误: {validation.issues.filter(i => i.severity === 'error').length} • 
                    警告: {validation.issues.filter(i => i.severity === 'warning').length} • 
                    信息: {validation.issues.filter(i => i.severity === 'info').length}
                  </Text>
                  <div style={{ marginTop: 8 }}>
                    <Button 
                      size="small" 
                      type="primary" 
                      icon={<ToolOutlined />}
                      onClick={performAutoRecovery}
                      loading={state.isRecovering}
                      disabled={validation.isValid}
                    >
                      自动修复
                    </Button>
                    <Button 
                      size="small" 
                      style={{ marginLeft: 8 }}
                      onClick={() => setState(prev => ({ ...prev, showDetails: true }))}
                    >
                      查看详情
                    </Button>
                  </div>
                </div>
              }
            />
          )}

          {/* 恢复报告 */}
          {state.recovery && (
            <Alert
              type={state.recovery.resolvedIssues > 0 ? 'success' : 'warning'}
              message={`自动恢复完成`}
              description={
                <div>
                  <Text>
                    已解决: {state.recovery.resolvedIssues}/{state.recovery.originalIssues} • 
                    信心度: {state.recovery.confidenceScore}% • 
                    策略: {state.recovery.appliedStrategies.length}
                  </Text>
                  {state.recovery.remainingIssues.length > 0 && (
                    <div style={{ marginTop: 4 }}>
                      <Text type="secondary">
                        剩余问题需要手动处理
                      </Text>
                    </div>
                  )}
                </div>
              }
            />
          )}
        </Space>
      </Card>
    );
  };

  // 渲染步骤质量列表
  const renderStepQualityList = () => {
    if (!script?.steps || script.steps.length === 0) return null;

    return (
      <Card size="small" title="步骤质量状态" style={{ marginTop: 8 }}>
        <Space direction="vertical" style={{ width: '100%' }}>
          {script.steps.map((step: any, index: number) => {
            const quickCheck = XmlDataValidator.quickCheck(step);
            
            return (
              <div 
                key={index}
                style={{ 
                  display: 'flex', 
                  justifyContent: 'space-between', 
                  alignItems: 'center',
                  padding: '4px 0',
                  borderBottom: index < script.steps.length - 1 ? '1px solid #f0f0f0' : 'none'
                }}
              >
                <div style={{ flex: 1 }}>
                  <Text strong>步骤 {index + 1}: {step.name || step.id || '未命名'}</Text>
                  {quickCheck.issues.length > 0 && (
                    <div style={{ marginTop: 2 }}>
                      <Text type="secondary" style={{ fontSize: '12px' }}>
                        {quickCheck.issues.join(', ')}
                      </Text>
                    </div>
                  )}
                </div>
                
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  {renderStepQualityStatus(index)}
                  
                  <Tooltip title="查看此步骤详情">
                    <Button 
                      size="small" 
                      type="text"
                      onClick={() => setState(prev => ({ 
                        ...prev, 
                        selectedStepIndex: index,
                        showDetails: true 
                      }))}
                    >
                      详情
                    </Button>
                  </Tooltip>
                </div>
              </div>
            );
          })}
        </Space>
      </Card>
    );
  };

  return (
    <div style={{ width: '100%' }}>
      {renderQualityOverview()}
      {renderStepQualityList()}
      
      {/* 详情弹窗 */}
      <Modal
        title="脚本质量详情"
        open={state.showDetails}
        onCancel={() => setState(prev => ({ 
          ...prev, 
          showDetails: false, 
          selectedStepIndex: null 
        }))}
        footer={null}
        width={800}
      >
        {state.validation && (
          <Collapse defaultActiveKey={['overview']}>
            <Panel header="质量概览" key="overview">
              <Space direction="vertical" style={{ width: '100%' }}>
                <div>
                  <Text strong>整体状态: </Text>
                  {state.validation.isValid ? (
                    <Tag color="success">通过验证</Tag>
                  ) : (
                    <Tag color="error">需要修复</Tag>
                  )}
                </div>
                
                <div>
                  <Text strong>步骤统计: </Text>
                  <Text>{state.validation.validSteps}/{state.validation.totalSteps} 个步骤有效</Text>
                </div>
                
                <div>
                  <Text strong>兼容性评分: </Text>
                  <Text>{state.validation.compatibilityScore}/100</Text>
                </div>
                
                {state.validation.warnings.length > 0 && (
                  <div>
                    <Text strong>警告信息:</Text>
                    <ul>
                      {state.validation.warnings.map((warning, index) => (
                        <li key={index}>
                          <Text type="secondary">{warning}</Text>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
                
                {state.validation.recommendations.length > 0 && (
                  <div>
                    <Text strong>改进建议:</Text>
                    <ul>
                      {state.validation.recommendations.map((rec, index) => (
                        <li key={index}>
                          <Text>{rec}</Text>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </Space>
            </Panel>
            
            {state.validation.issues.length > 0 && (
              <Panel header={`问题列表 (${state.validation.issues.length})`} key="issues">
                <Space direction="vertical" style={{ width: '100%' }}>
                  {state.validation.issues.map((issue, index) => (
                    <Alert
                      key={index}
                      type={issue.severity === 'error' ? 'error' : issue.severity === 'warning' ? 'warning' : 'info'}
                      message={
                        <Space>
                          {renderSeverityIcon(issue.severity)}
                          <Text strong>{issue.code}</Text>
                        </Space>
                      }
                      description={
                        <div>
                          <Paragraph>{issue.message}</Paragraph>
                          {issue.suggestion && (
                            <Paragraph type="secondary">
                              <Text strong>建议: </Text>
                              {issue.suggestion}
                            </Paragraph>
                          )}
                        </div>
                      }
                    />
                  ))}
                </Space>
              </Panel>
            )}
            
            {state.recovery && (
              <Panel header="恢复报告" key="recovery">
                <Space direction="vertical" style={{ width: '100%' }}>
                  <div>
                    <Text strong>恢复结果: </Text>
                    <Text>解决了 {state.recovery.resolvedIssues}/{state.recovery.originalIssues} 个问题</Text>
                  </div>
                  
                  <div>
                    <Text strong>信心度: </Text>
                    <Text>{state.recovery.confidenceScore}%</Text>
                  </div>
                  
                  {state.recovery.appliedStrategies.length > 0 && (
                    <div>
                      <Text strong>应用的恢复策略:</Text>
                      <div style={{ marginTop: 4 }}>
                        {state.recovery.appliedStrategies.map((strategy, index) => (
                          <Tag key={index} style={{ margin: '2px' }}>
                            {strategy}
                          </Tag>
                        ))}
                      </div>
                    </div>
                  )}
                  
                  {state.recovery.remainingIssues.length > 0 && (
                    <div>
                      <Text strong>剩余问题:</Text>
                      <ul>
                        {state.recovery.remainingIssues.map((issue, index) => (
                          <li key={index}>
                            <Text type="secondary">{issue}</Text>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                  
                  {state.recovery.recommendations.length > 0 && (
                    <div>
                      <Text strong>后续建议:</Text>
                      <ul>
                        {state.recovery.recommendations.map((rec, index) => (
                          <li key={index}>
                            <Text>{rec}</Text>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </Space>
              </Panel>
            )}
          </Collapse>
        )}
      </Modal>
    </div>
  );
};