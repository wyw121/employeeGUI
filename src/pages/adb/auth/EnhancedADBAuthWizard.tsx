import React from 'react';
import { Card, Steps, Space, Typography, Row, Col } from 'antd';
import { SafetyOutlined, SettingOutlined } from '@ant-design/icons';
import { AuthStep, AuthStatus } from './types';
import { useAdb } from '../../../application/hooks/useAdb';
import { StatusIndicator, ErrorList } from './components/StatusComponents';
import { SettingsForm } from './components/FormComponents';
import { ActionLogPanel } from './ActionLogPanel';

// 简化版的状态管理（临时解决方案）
import { useState, useCallback, useMemo, useReducer, useEffect } from 'react';

const { Paragraph } = Typography;

// 临时的简化状态和reducer
interface SimpleAuthState {
  step: AuthStep;
  busy: boolean;
  logs: string[];
  userConfirmedUsbAllow: boolean;
  rememberSettings: boolean;
  autoSkipCompleted: boolean;
  errors: Array<{ code: string; message: string; timestamp: number }>;
}

type SimpleAuthAction =
  | { type: 'NEXT' }
  | { type: 'PREV' }
  | { type: 'GOTO'; step: AuthStep }
  | { type: 'SET_BUSY'; busy: boolean }
  | { type: 'LOG'; msg: string }
  | { type: 'CLEAR_LOGS' }
  | { type: 'SET_USB_CONFIRMED'; value: boolean }
  | { type: 'SET_SETTINGS'; rememberSettings: boolean; autoSkipCompleted: boolean }
  | { type: 'ADD_ERROR'; error: { code: string; message: string } };

const initialState: SimpleAuthState = {
  step: AuthStep.PREREQUISITES,
  busy: false,
  logs: [],
  userConfirmedUsbAllow: false,
  rememberSettings: true,
  autoSkipCompleted: false,
  errors: [],
};

const steps = [AuthStep.PREREQUISITES, AuthStep.USB_TRUST, AuthStep.WIRELESS, AuthStep.VERIFY, AuthStep.DONE];

function simpleReducer(state: SimpleAuthState, action: SimpleAuthAction): SimpleAuthState {
  switch (action.type) {
    case 'NEXT': {
      const currentIndex = steps.indexOf(state.step);
      const nextIndex = Math.min(currentIndex + 1, steps.length - 1);
      return { ...state, step: steps[nextIndex] };
    }
    case 'PREV': {
      const currentIndex = steps.indexOf(state.step);
      const prevIndex = Math.max(currentIndex - 1, 0);
      return { ...state, step: steps[prevIndex] };
    }
    case 'GOTO':
      return { ...state, step: action.step };
    case 'SET_BUSY':
      return { ...state, busy: action.busy };
    case 'LOG':
      return { ...state, logs: [...state.logs, action.msg].slice(-50) };
    case 'CLEAR_LOGS':
      return { ...state, logs: [] };
    case 'SET_USB_CONFIRMED':
      return { ...state, userConfirmedUsbAllow: action.value };
    case 'SET_SETTINGS':
      return { 
        ...state, 
        rememberSettings: action.rememberSettings,
        autoSkipCompleted: action.autoSkipCompleted 
      };
    case 'ADD_ERROR':
      return { 
        ...state, 
        errors: [...state.errors, { ...action.error, timestamp: Date.now() }].slice(-5) 
      };
    default:
      return state;
  }
}

const EnhancedADBAuthWizard: React.FC = () => {
  const adb = useAdb();
  const [state, dispatch] = useReducer(simpleReducer, initialState);

  const log = useCallback((msg: string) => {
    dispatch({ type: 'LOG', msg });
  }, []);

  const addError = useCallback((code: string, message: string) => {
    dispatch({ type: 'ADD_ERROR', error: { code, message } });
  }, []);

  // 一键修复功能
  const oneClickRecover = useCallback(async () => {
    dispatch({ type: 'SET_BUSY', busy: true });
    try {
      log('🧹 清理本机 ADB 密钥...');
      await adb.clearAdbKeys();
      log('🔁 重启 ADB 服务...');
      await adb.restartAdbServer();
      log('🔄 刷新设备列表...');
      await adb.refreshDevices();
      log('✅ 一键修复完成');
    } catch (error) {
      const errorMsg = `修复失败: ${error}`;
      log(`❌ ${errorMsg}`);
      addError('RECOVERY_FAILED', errorMsg);
    } finally {
      dispatch({ type: 'SET_BUSY', busy: false });
    }
  }, [adb, log, addError]);

  // 渲染当前步骤内容
  const renderStepContent = () => {
    const commonProps = { 
      state, 
      dispatch, 
      adb, 
      log, 
      addError, 
      oneClickRecover,
      busy: state.busy
    };

    switch (state.step) {
      case AuthStep.PREREQUISITES:
        return (
          <Space direction="vertical" style={{ width: '100%' }}>
            <StatusIndicator
              status={state.busy ? AuthStatus.IN_PROGRESS : AuthStatus.IDLE}
              title="准备工作"
              description={
                <Space direction="vertical">
                  <div>1) 手机端开启开发者选项与 USB 调试</div>
                  <div>2) 连接数据线，确认弹窗的"允许 USB 调试"</div>
                  <div>3) 如果授权异常可尝试一键修复</div>
                </Space>
              }
            />
            <Space>
              <button 
                className="ant-btn ant-btn-primary"
                disabled={state.busy}
                onClick={oneClickRecover}
              >
                {state.busy ? '修复中...' : '🔧 一键修复'}
              </button>
              <button 
                className="ant-btn ant-btn-primary"
                onClick={() => dispatch({ type: 'NEXT' })}
              >
                下一步
              </button>
            </Space>
          </Space>
        );

      case AuthStep.USB_TRUST:
        return (
          <Space direction="vertical" style={{ width: '100%' }}>
            <StatusIndicator
              status={state.userConfirmedUsbAllow ? AuthStatus.SUCCESS : AuthStatus.IDLE}
              title="USB 授权确认"
              description="请在手机上确认'允许 USB 调试'对话框"
            />
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <input 
                type="checkbox"
                checked={state.userConfirmedUsbAllow}
                onChange={(e) => dispatch({ 
                  type: 'SET_USB_CONFIRMED', 
                  value: e.target.checked 
                })}
              />
              <span>我已在手机上点击了"允许"</span>
            </div>
            <Space>
              <button 
                className="ant-btn"
                onClick={() => dispatch({ type: 'PREV' })}
              >
                上一步
              </button>
              <button 
                className="ant-btn ant-btn-primary"
                disabled={!state.userConfirmedUsbAllow}
                onClick={() => dispatch({ type: 'NEXT' })}
              >
                下一步
              </button>
            </Space>
          </Space>
        );

      case AuthStep.WIRELESS:
        return (
          <Space direction="vertical" style={{ width: '100%' }}>
            <StatusIndicator
              status={AuthStatus.IDLE}
              title="无线调试设置（可选）"
              description="设置无线调试可以让你在没有数据线的情况下连接设备"
            />
            <Paragraph>此步骤为可选步骤，你可以跳过继续验证有线连接。</Paragraph>
            <Space>
              <button 
                className="ant-btn"
                onClick={() => dispatch({ type: 'PREV' })}
              >
                上一步
              </button>
              <button 
                className="ant-btn"
                onClick={() => dispatch({ type: 'NEXT' })}
              >
                跳过无线设置
              </button>
              <button 
                className="ant-btn ant-btn-primary"
                onClick={() => dispatch({ type: 'NEXT' })}
              >
                下一步
              </button>
            </Space>
          </Space>
        );

      case AuthStep.VERIFY:
        return (
          <Space direction="vertical" style={{ width: '100%' }}>
            <StatusIndicator
              status={adb.devices.length > 0 ? AuthStatus.SUCCESS : AuthStatus.ERROR}
              title="连接验证"
              description={`当前检测到 ${adb.devices.length} 个设备`}
            />
            {adb.devices.length > 0 ? (
              <div>
                <strong>已连接设备：</strong>
                {adb.devices.map(device => (
                  <div key={device.id}>• {device.name} ({device.status})</div>
                ))}
              </div>
            ) : (
              <div>未检测到设备，请检查连接和授权状态。</div>
            )}
            <Space>
              <button 
                className="ant-btn"
                onClick={() => dispatch({ type: 'PREV' })}
              >
                上一步
              </button>
              <button 
                className="ant-btn"
                onClick={() => adb.refreshDevices()}
              >
                重新检测
              </button>
              <button 
                className="ant-btn ant-btn-primary"
                onClick={() => dispatch({ type: 'NEXT' })}
              >
                完成设置
              </button>
            </Space>
          </Space>
        );

      case AuthStep.DONE:
        return (
          <Space direction="vertical" style={{ width: '100%' }}>
            <StatusIndicator
              status={AuthStatus.SUCCESS}
              title="授权完成"
              description="恭喜！ADB 授权设置已完成，你现在可以正常使用 ADB 功能了。"
            />
            <button 
              className="ant-btn"
              onClick={() => dispatch({ type: 'GOTO', step: AuthStep.PREREQUISITES })}
            >
              重新开始
            </button>
          </Space>
        );

      default:
        return null;
    }
  };

  return (
    <Row gutter={[16, 16]}>
      <Col span={18}>
        <Card 
          title={
            <Space>
              <SafetyOutlined />
              <span>ADB 授权向导（增强版）</span>
            </Space>
          }
        >
          <Space direction="vertical" style={{ width: '100%' }}>
            <Paragraph>
              按步骤完成 USB 授权与（可选的）无线调试，全部操作通过统一的 useAdb() 接口。
            </Paragraph>
            
            <Steps
              current={steps.indexOf(state.step)}
              onChange={(index) => {
                if (!state.busy && index <= steps.indexOf(state.step)) {
                  dispatch({ type: 'GOTO', step: steps[index] });
                }
              }}
              items={[
                { title: '准备' },
                { title: 'USB 授权' },
                { title: '无线调试' },
                { title: '验证' },
                { title: '完成' },
              ]}
            />
            
            <div style={{ marginTop: 24 }}>
              {renderStepContent()}
            </div>
            
            {state.errors.length > 0 && (
              <ErrorList 
                errors={state.errors} 
                onClear={() => dispatch({ type: 'CLEAR_LOGS' })}
              />
            )}
          </Space>
        </Card>
      </Col>
      
      <Col span={6}>
        <Space direction="vertical" style={{ width: '100%' }}>
          <SettingsForm
            rememberSettings={state.rememberSettings}
            autoSkipCompleted={state.autoSkipCompleted}
            onSettingsChange={(settings) => 
              dispatch({ 
                type: 'SET_SETTINGS', 
                rememberSettings: settings.rememberSettings,
                autoSkipCompleted: settings.autoSkipCompleted
              })
            }
          />
          
          <ActionLogPanel 
            logs={state.logs} 
            onClear={() => dispatch({ type: 'CLEAR_LOGS' })} 
          />
        </Space>
      </Col>
    </Row>
  );
};

export default EnhancedADBAuthWizard;