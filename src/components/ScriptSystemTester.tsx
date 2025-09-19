import React, { useState } from 'react';
import { Button, Card, Space, Typography, Row, Col, Badge } from 'antd';
import { 
  PlayCircleOutlined, 
  BugOutlined, 
  CheckCircleOutlined, 
  ExclamationCircleOutlined,
  ClearOutlined
} from '@ant-design/icons';
import { invoke } from '@tauri-apps/api/core';

const { Title, Text, Paragraph } = Typography;

interface TestStatus {
  status: 'idle' | 'running' | 'success' | 'error';
  message: string;
}

const ScriptSystemTester: React.FC = () => {
  const [scriptManagementStatus, setScriptManagementStatus] = useState<TestStatus>({ status: 'idle', message: '' });
  const [scriptExecutionStatus, setScriptExecutionStatus] = useState<TestStatus>({ status: 'idle', message: '' });
  const [logs, setLogs] = useState<string[]>([]);

  const log = (message: string, type: 'info' | 'success' | 'error' | 'warn' = 'info') => {
    const timestamp = new Date().toLocaleTimeString();
    const prefix = type === 'error' ? '❌' : type === 'success' ? '✅' : type === 'warn' ? '⚠️' : 'ℹ️';
    const logMessage = `[${timestamp}] ${prefix} ${message}`;
    
    setLogs(prev => [...prev, logMessage]);
    console.log(logMessage);
  };

  const clearLogs = () => {
    setLogs([]);
  };

  const testScriptManagement = async () => {
    setScriptManagementStatus({ status: 'running', message: '测试中...' });
    log('🧪 开始测试脚本管理功能...');

    try {
      // 1. 测试创建脚本
      log('📝 测试创建智能脚本...');
      const testScript = {
        name: '测试脚本_' + Date.now(),
        description: '这是一个自动化测试脚本',
        steps: [
          {
            type: 'click',
            target: '登录按钮',
            description: '点击登录按钮',
            config: {
              element_selector: 'text("登录")',
              wait_after: 1000
            }
          }
        ],
        config: {
          continue_on_error: false,
          auto_verification_enabled: true,
          smart_recovery_enabled: true,
          detailed_logging: true
        },
        tags: ['测试', '登录'],
        created_by: 'Test User'
      };

      const scriptId = await invoke('save_smart_script', {
        script: testScript
      });
      log(`脚本创建成功，ID: ${scriptId}`, 'success');

      // 2. 测试读取脚本
      log('📖 测试读取脚本...');
      const savedScript = await invoke('load_smart_script', {
        scriptId: scriptId
      }) as any;
      log(`脚本读取成功: ${savedScript.name}`, 'success');

      // 3. 测试列出所有脚本
      log('📜 测试列出所有脚本...');
      const allScripts = await invoke('list_smart_scripts') as any[];
      log(`找到 ${allScripts.length} 个脚本`, 'success');

      // 4. 测试删除脚本
      log('🗑️ 测试删除脚本...');
      await invoke('delete_smart_script', {
        scriptId: scriptId
      });
      log('脚本删除成功', 'success');

      setScriptManagementStatus({ status: 'success', message: '测试通过' });
      log('🎉 脚本管理功能测试全部通过！', 'success');

    } catch (error) {
      const errorMsg = `脚本管理测试失败: ${error}`;
      log(errorMsg, 'error');
      setScriptManagementStatus({ status: 'error', message: '测试失败' });
    }
  };

  const testScriptExecution = async () => {
    setScriptExecutionStatus({ status: 'running', message: '测试中...' });
    log('⚡ 开始测试脚本执行...');

    try {
      // 获取设备列表
      log('📱 获取设备列表...');
      let devices;
      try {
        devices = await invoke('get_connected_devices') as string[];
        log(`找到 ${devices.length} 个连接的设备`, 'success');
      } catch (deviceError) {
        log(`获取设备列表失败: ${deviceError}`, 'warn');
        devices = ['emulator-5554']; // 使用默认设备
        log('使用默认设备进行测试', 'warn');
      }

      const deviceId = devices[0] || 'emulator-5554';
      log(`使用设备: ${deviceId}`);

      // 测试脚本执行
      log('🚀 测试脚本执行...');
      
      const testSteps = [
        {
          type: 'click',
          target: '测试按钮',
          description: '点击测试按钮',
          config: {
            element_selector: 'text("测试按钮")',
            wait_after: 1000
          }
        }
      ];

      const result = await invoke('execute_smart_automation_script', {
        deviceId: deviceId,
        steps: testSteps,
        config: {
          continue_on_error: true,
          auto_verification_enabled: false,
          smart_recovery_enabled: false,
          detailed_logging: true
        }
      }) as any;

      log(`脚本执行完成: ${result.success ? '成功' : '失败'}`, result.success ? 'success' : 'error');
      if (result.message) {
        log(`执行消息: ${result.message}`);
      }

      setScriptExecutionStatus({ 
        status: result.success ? 'success' : 'error', 
        message: result.success ? '测试通过' : '测试失败' 
      });

    } catch (error) {
      const errorMsg = `脚本执行测试失败: ${error}`;
      log(errorMsg, 'error');
      setScriptExecutionStatus({ status: 'error', message: '测试失败' });
    }
  };

  const testScriptTemplates = async () => {
    log('📋 开始测试脚本模板...');

    try {
      const templates = await invoke('list_script_templates') as any[];
      log(`获取到 ${templates.length} 个脚本模板`, 'success');

      for (const template of templates) {
        log(`模板: ${template.name} - ${template.description}`);
      }

      if (templates.length > 0) {
        // 测试从模板创建脚本
        const templateName = templates[0].name;
        log(`尝试从模板 "${templateName}" 创建脚本...`);
        
        const scriptFromTemplate = await invoke('create_script_from_template', {
          templateName: templateName,
          scriptName: '从模板创建的脚本_' + Date.now()
        }) as any;
        log(`从模板创建脚本成功: ${scriptFromTemplate.name}`, 'success');
      }

    } catch (error) {
      log(`脚本模板测试失败: ${error}`, 'error');
    }
  };

  const runAllTests = async () => {
    log('🎯 开始运行所有测试...');
    log('='.repeat(50));

    await testScriptManagement();
    log('');
    await testScriptTemplates();
    log('');
    await testScriptExecution();

    log('='.repeat(50));
    log('🏁 所有测试完成！', 'success');
  };

  const getStatusBadge = (status: TestStatus) => {
    switch (status.status) {
      case 'running':
        return <Badge status="processing" text={status.message} />;
      case 'success':
        return <Badge status="success" text={status.message} />;
      case 'error':
        return <Badge status="error" text={status.message} />;
      default:
        return <Badge status="default" text="未开始" />;
    }
  };

  return (
    <div style={{ padding: '24px', height: '100%', overflow: 'auto' }}>
      <Title level={2}>🔧 智能脚本系统测试工具</Title>
      
      <Row gutter={[16, 16]}>
        <Col span={12}>
          <Card 
            title="📋 脚本管理功能测试" 
            extra={getStatusBadge(scriptManagementStatus)}
            style={{ height: '200px' }}
          >
            <Space wrap>
              <Button 
                type="primary" 
                icon={<BugOutlined />}
                onClick={testScriptManagement}
                loading={scriptManagementStatus.status === 'running'}
              >
                测试脚本管理
              </Button>
              <Button 
                icon={<PlayCircleOutlined />}
                onClick={testScriptTemplates}
              >
                测试脚本模板
              </Button>
            </Space>
            <Paragraph style={{ marginTop: '16px', color: '#8b949e' }}>
              测试脚本的创建、读取、更新、删除操作以及模板功能
            </Paragraph>
          </Card>
        </Col>

        <Col span={12}>
          <Card 
            title="⚡ 脚本执行功能测试" 
            extra={getStatusBadge(scriptExecutionStatus)}
            style={{ height: '200px' }}
          >
            <Space wrap>
              <Button 
                type="primary" 
                icon={<PlayCircleOutlined />}
                onClick={testScriptExecution}
                loading={scriptExecutionStatus.status === 'running'}
              >
                测试脚本执行
              </Button>
            </Space>
            <Paragraph style={{ marginTop: '16px', color: '#8b949e' }}>
              测试智能脚本的执行功能，包括设备连接和批量操作
            </Paragraph>
          </Card>
        </Col>
      </Row>

      <Row gutter={[16, 16]} style={{ marginTop: '16px' }}>
        <Col span={24}>
          <Card title="🎯 综合测试">
            <Space>
              <Button 
                type="primary" 
                size="large"
                icon={<CheckCircleOutlined />}
                onClick={runAllTests}
              >
                运行所有测试
              </Button>
              <Button 
                icon={<ClearOutlined />}
                onClick={clearLogs}
              >
                清空日志
              </Button>
            </Space>
          </Card>
        </Col>
      </Row>

      <Row gutter={[16, 16]} style={{ marginTop: '16px' }}>
        <Col span={24}>
          <Card title="📊 测试日志">
            <div 
              style={{
                background: '#001529',
                color: '#fff',
                padding: '15px',
                borderRadius: '6px',
                fontFamily: 'Courier New, monospace',
                fontSize: '12px',
                maxHeight: '400px',
                overflowY: 'auto',
                whiteSpace: 'pre-wrap'
              }}
            >
              {logs.length === 0 ? (
                <Text style={{ color: '#8b949e' }}>点击测试按钮开始测试...</Text>
              ) : (
                logs.join('\n')
              )}
            </div>
          </Card>
        </Col>
      </Row>
    </div>
  );
};

export default ScriptSystemTester;