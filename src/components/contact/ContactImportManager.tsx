import {
    CheckCircleOutlined,
    ContactsOutlined,
    InfoCircleOutlined,
    MobileOutlined,
    PlayCircleOutlined,
    SettingOutlined,
    UserOutlined
} from '@ant-design/icons';
import { invoke } from '@tauri-apps/api/core';
import {
    Alert,
    Button,
    Card,
    Checkbox,
    Col,
    message,
    Progress,
    Row,
    Select,
    Space,
    Spin,
    Statistic,
    Steps,
    Table,
    Tag,
    Typography
} from 'antd';
import React, { useCallback, useEffect, useState } from 'react';
import { Contact, Device, VcfImportResult } from '../../types';

const { Text } = Typography;
const { Step } = Steps;

interface ContactImportManagerProps {
  contacts: Contact[];
  onImportComplete?: (results: VcfImportResult[]) => void;
  onError?: (error: string) => void;
}

interface DeviceContactGroup {
  deviceId: string;
  deviceName: string;
  contacts: Contact[];
  status: 'pending' | 'importing' | 'completed' | 'failed';
  result?: VcfImportResult;
}

export const ContactImportManager: React.FC<ContactImportManagerProps> = ({
  contacts,
  onImportComplete,
  onError
}) => {
  const [currentStep, setCurrentStep] = useState(0);
  const [selectedContacts, setSelectedContacts] = useState<Contact[]>([]);
  const [availableDevices, setAvailableDevices] = useState<Device[]>([]);
  const [selectedDevices, setSelectedDevices] = useState<string[]>([]);
  const [deviceGroups, setDeviceGroups] = useState<DeviceContactGroup[]>([]);
  const [isImporting, setIsImporting] = useState(false);
  const [importProgress, setImportProgress] = useState(0);
  const [loading, setLoading] = useState(false);
  const [adbPath, setAdbPath] = useState<string>('');

  // 初始化ADB路径
  const initializeAdb = useCallback(async () => {
    try {
      // 检测雷电模拟器ADB路径
      const detectedPath = await invoke<string | null>('detect_ldplayer_adb');
      if (detectedPath) {
        setAdbPath(detectedPath);
        console.log('已检测到雷电模拟器ADB路径:', detectedPath);
      } else {
        setAdbPath('adb'); // 使用系统默认ADB
        console.log('未检测到雷电模拟器，使用系统默认ADB');
      }
    } catch (error) {
      console.error('初始化ADB失败:', error);
      setAdbPath('adb');
    }
  }, []);

  // 初始化时获取ADB路径和设备列表
  useEffect(() => {
    initializeAdb();
  }, [initializeAdb]);

  // 当ADB路径初始化完成后，自动获取设备列表
  useEffect(() => {
    if (adbPath) {
      loadDevices();
    }
  }, [adbPath]); // 移除 loadDevices 依赖，避免循环引用

  // 解析ADB设备输出 - 与RealDeviceManager保持一致
  const parseDevicesOutput = useCallback((output: string): Device[] => {
    const lines = output.split('\n').filter(line => 
      line.trim() && !line.includes('List of devices')
    );

    const devices: Device[] = [];

    lines.forEach((line, index) => {
      const parts = line.trim().split(/\s+/);
      const deviceId = parts[0];
      const status = parts[1];

      // 只处理已连接的设备
      if (status !== 'device') {
        return;
      }

      // 检测是否为雷电模拟器
      const isEmulator = deviceId.includes('127.0.0.1') || deviceId.includes('emulator');

      // 解析设备信息
      let model = '';
      let product = '';
      
      for (let i = 2; i < parts.length; i++) {
        const part = parts[i];
        if (part.startsWith('model:')) {
          model = part.split(':')[1];
        } else if (part.startsWith('product:')) {
          product = part.split(':')[1];
        }
      }

      // 生成友好的设备名称
      let deviceName = '';
      if (isEmulator) {
        if (deviceId.includes('127.0.0.1')) {
          deviceName = `雷电模拟器 (${deviceId})`;
        } else {
          deviceName = `模拟器 (${deviceId})`;
        }
      } else {
        deviceName = model || product || `设备 ${index + 1}`;
      }

      devices.push({
        id: devices.length + 1, // 使用当前设备数量+1作为ID
        name: deviceName,
        phone_name: deviceId,
        status: 'connected'
      });
    });

    return devices;
  }, []);

  // 获取可用设备 - 与RealDeviceManager保持一致
  const loadDevices = useCallback(async () => {
    if (!adbPath) {
      console.log('ADB路径未初始化，跳过设备检测');
      return;
    }

    setLoading(true);
    try {
      // 使用与RealDeviceManager相同的方法获取设备
      const output = await invoke<string>('get_adb_devices', { adbPath });
      const devices = parseDevicesOutput(output);
      
      setAvailableDevices(devices);
      
      // 默认选中所有已连接的设备
      const connectedDeviceIds = devices.map(device => device.id.toString());
      setSelectedDevices(connectedDeviceIds);
      
      if (devices.length === 0) {
        message.info('未检测到连接的设备，请确保：\n1. 设备已通过USB连接\n2. 启用了USB调试\n3. ADB驱动已正确安装');
      } else {
        message.success(`检测到 ${devices.length} 台设备`);
        console.log('检测到的设备:', devices);
      }
      
    } catch (error) {
      console.error('获取设备列表失败:', error);
      const errorMsg = `获取设备列表失败: ${error instanceof Error ? error.message : String(error)}`;
      onError?.(errorMsg);
      message.error(errorMsg);
      
      // 设置空设备列表，但不阻塞用户操作
      setAvailableDevices([]);
      setSelectedDevices([]);
    } finally {
      setLoading(false);
    }
  }, [adbPath, parseDevicesOutput, onError]);

  // 选择联系人
  const handleContactSelection = useCallback((selectedKeys: React.Key[]) => {
    const selected = contacts.filter(contact => selectedKeys.includes(contact.id));
    setSelectedContacts(selected);
  }, [contacts]);

  // 全选/取消全选联系人
  const handleSelectAllContacts = useCallback((checked: boolean) => {
    setSelectedContacts(checked ? [...contacts] : []);
  }, [contacts]);

  // 平均分配联系人到设备
  const distributeContactsToDevices = useCallback(() => {
    if (selectedContacts.length === 0 || selectedDevices.length === 0) {
      return [];
    }

    const deviceCount = selectedDevices.length;
    const contactsPerDevice = Math.ceil(selectedContacts.length / deviceCount);
    const groups: DeviceContactGroup[] = [];

    selectedDevices.forEach((deviceId, index) => {
      const startIndex = index * contactsPerDevice;
      const endIndex = Math.min(startIndex + contactsPerDevice, selectedContacts.length);
      const deviceContacts = selectedContacts.slice(startIndex, endIndex);
      
      const device = availableDevices.find(d => d.id.toString() === deviceId);
      
      if (deviceContacts.length > 0 && device) {
        groups.push({
          deviceId: device.phone_name, // 使用真实的ADB设备ID而不是数字ID
          deviceName: device?.name || `设备 ${deviceId}`,
          contacts: deviceContacts,
          status: 'pending'
        });
      }
    });

    return groups;
  }, [selectedContacts, selectedDevices, availableDevices]);

  // 准备分配
  const handlePrepareDistribution = useCallback(() => {
    const groups = distributeContactsToDevices();
    if (groups.length === 0) {
      onError?.('请选择联系人和设备');
      return;
    }
    setDeviceGroups(groups);
    setCurrentStep(1);
  }, [distributeContactsToDevices, onError]);

  // 开始导入
  const handleStartImport = useCallback(async () => {
    if (deviceGroups.length === 0) {
      onError?.('没有准备好的导入任务');
      return;
    }

    setIsImporting(true);
    setImportProgress(0);
    setCurrentStep(2);

    const results: VcfImportResult[] = [];
    const totalGroups = deviceGroups.length;

    try {
      // 逐个设备执行导入
      for (let i = 0; i < deviceGroups.length; i++) {
        const group = deviceGroups[i];
        
        // 更新当前设备状态
        setDeviceGroups(prev => prev.map(g => 
          g.deviceId === group.deviceId 
            ? { ...g, status: 'importing' }
            : g
        ));

        try {
          console.log(`开始处理设备: ${group.deviceName} (${group.deviceId})`);
          
          // 生成临时联系人文本文件（CSV格式，与PermissionTestPage相同）
          // 格式：姓名,电话,地址,职业,邮箱
          const contactsContent = group.contacts.map(contact => 
            `${contact.name},${contact.phone || ''},${contact.notes || ''},,${contact.email || ''}`
          ).join('\n');
          
          // 使用固定的临时文件路径，避免复杂的路径生成
          const tempPath = `temp_contacts_${Date.now()}_${group.deviceId.replace(/[^a-zA-Z0-9]/g, '_')}.txt`;
          
          console.log(`生成联系人文件: ${tempPath}, 联系人数量: ${group.contacts.length}`);
          console.log(`联系人内容预览:`, contactsContent.slice(0, 200) + '...');
          
          // 直接写入文件，不通过VcfImportService
          await invoke("write_file", {
            path: tempPath,
            content: contactsContent,
          });
          
          // 使用与PermissionTestPage完全相同的方式直接调用API
          console.log(`🚀 开始使用vcf-import-test成功方法处理设备: ${group.deviceId}`);
          console.log(`📁 使用联系人文件: ${tempPath}`);
          
          // 方法1: 先尝试使用generate_vcf_file + 简单推送的方式（类似vcf-import-test）
          try {
            console.log(`📋 尝试方法1: 使用generate_vcf_file方式`);
            
            // 生成VCF文件
            const vcfFilePath = await invoke<string>("generate_vcf_file", {
              contacts: group.contacts.map(contact => ({
                id: contact.id?.toString() || '',
                name: contact.name,
                phone: contact.phone || '',
                email: contact.email || '',
                address: contact.notes || '',
                occupation: ''
              })),
              fileName: `contacts_${Date.now()}_${group.deviceId.replace(/[^a-zA-Z0-9]/g, '_')}.vcf`
            });
            
            console.log(`✅ VCF文件生成成功: ${vcfFilePath}`);
            
            // 使用异步安全版本导入
            const importResult = await invoke<VcfImportResult>("import_vcf_contacts_async_safe", {
              deviceId: group.deviceId,
              vcfFilePath: vcfFilePath
            });
            
            console.log(`✅ 方法1成功 - 设备 ${group.deviceName} 导入结果:`, importResult);
            results.push(importResult);
            
            // 更新设备导入结果
            setDeviceGroups(prev => prev.map(g => 
              g.deviceId === group.deviceId 
                ? { ...g, status: importResult.success ? 'completed' : 'failed', result: importResult }
                : g
            ));
            
            if (importResult.success) {
              message.success(`设备 ${group.deviceName} 导入成功 (${importResult.importedContacts}/${importResult.totalContacts})`);
            } else {
              message.error(`设备 ${group.deviceName} 导入失败: ${importResult.message}`);
            }
            
          } catch (method1Error) {
            console.warn(`⚠️ 方法1失败，尝试方法2:`, method1Error);
            
            // 方法2: 回退到权限测试方法
            try {
              console.log(`📋 尝试方法2: 使用权限测试方法`);
              
              const permissionTestResult = await invoke<string>("test_vcf_import_with_permission", {
                deviceId: group.deviceId,
                contactsFile: tempPath,
              });
              
              console.log(`✅ 设备 ${group.deviceName} 方法2原始返回结果:`, permissionTestResult);
              
              // 简化结果解析，更加鲁棒
              const regex = /成功=(\w+), 总数=(\d+), 导入=(\d+), 失败=(\d+), 消息='([^']*)'/;
              const parts = regex.exec(permissionTestResult);
              
              let result: VcfImportResult;
              
              if (parts && parts.length >= 6) {
                // 成功解析的情况
                result = {
                  success: parts[1] === 'true',
                  totalContacts: parseInt(parts[2]) || 0,
                  importedContacts: parseInt(parts[3]) || 0,
                  failedContacts: parseInt(parts[4]) || 0,
                  message: parts[5] || '导入完成',
                  details: permissionTestResult
                };
              } else {
                // 解析失败，但可能导入成功了，根据返回内容判断
                const isSuccess = permissionTestResult.includes('成功') || 
                                 permissionTestResult.includes('导入结果: 成功=true') ||
                                 !permissionTestResult.includes('失败');
                
                result = {
                  success: isSuccess,
                  totalContacts: group.contacts.length,
                  importedContacts: isSuccess ? group.contacts.length : 0,
                  failedContacts: isSuccess ? 0 : group.contacts.length,
                  message: isSuccess ? '导入成功' : '导入失败',
                  details: permissionTestResult
                };
              }
              
              results.push(result);
              
              console.log(`📊 设备 ${group.deviceName} (${group.deviceId}) 方法2最终解析结果:`, result);

              // 更新设备导入结果
              setDeviceGroups(prev => prev.map(g => 
                g.deviceId === group.deviceId 
                  ? { ...g, status: result.success ? 'completed' : 'failed', result }
                  : g
              ));

              if (result.success) {
                message.success(`设备 ${group.deviceName} 导入成功 (方法2) (${result.importedContacts}/${result.totalContacts})`);
              } else {
                message.error(`设备 ${group.deviceName} 导入失败 (方法2): ${result.message}`);
              }
              
            } catch (method2Error) {
              console.error(`❌ 方法2也失败:`, method2Error);
              throw method2Error; // 抛出错误以触发通用错误处理
            }
          }

          // 清理临时文件
          try {
            await invoke("delete_file", { path: tempPath });
            console.log(`🗑️ 已清理临时文件: ${tempPath}`);
          } catch (cleanupError) {
            console.warn('清理临时文件失败:', cleanupError);
          }

        } catch (error) {
          console.error(`❌ 设备 ${group.deviceName} 导入失败:`, error);
          
          const failedResult: VcfImportResult = {
            success: false,
            totalContacts: group.contacts.length,
            importedContacts: 0,
            failedContacts: group.contacts.length,
            message: `导入失败: ${error instanceof Error ? error.message : String(error)}`,
            details: error instanceof Error ? error.stack : String(error)
          };

          results.push(failedResult);
          
          // 更新设备状态为失败
          setDeviceGroups(prev => prev.map(g => 
            g.deviceId === group.deviceId 
              ? { ...g, status: 'failed', result: failedResult }
              : g
          ));

          message.error(`设备 ${group.deviceName} 导入失败: ${failedResult.message}`);
        }

        // 更新进度
        setImportProgress(Math.round(((i + 1) / totalGroups) * 100));
      }

      const successCount = results.filter(r => r.success).length;
      const failedCount = results.filter(r => !r.success).length;
      
      if (successCount > 0 && failedCount === 0) {
        message.success(`🎉 所有 ${successCount} 个设备导入成功！`);
      } else if (successCount > 0 && failedCount > 0) {
        message.warning(`⚠️ 部分完成：${successCount} 个成功，${failedCount} 个失败`);
      } else {
        message.error(`❌ 所有设备导入失败`);
      }
      
      onImportComplete?.(results);

    } catch (error) {
      console.error('批量导入失败:', error);
      onError?.(`批量导入失败: ${error instanceof Error ? error.message : String(error)}`);
    } finally {
      setIsImporting(false);
    }
  }, [deviceGroups, onImportComplete, onError]);

  // 重置到第一步
  const handleReset = useCallback(() => {
    setCurrentStep(0);
    setSelectedContacts([]);
    setDeviceGroups([]);
    setImportProgress(0);
    setIsImporting(false);
  }, []);

  // 渲染联系人选择步骤
  const renderContactSelection = () => {
    const columns = [
      {
        title: '姓名',
        dataIndex: 'name',
        key: 'name',
        render: (text: string) => <Text strong>{text}</Text>
      },
      {
        title: '电话',
        dataIndex: 'phone',
        key: 'phone'
      },
      {
        title: '邮箱',
        dataIndex: 'email',
        key: 'email'
      }
    ];

    return (
      <div>
        <div className="mb-4">
          <Row gutter={16}>
            <Col span={12}>
              <Card size="small">
                <Statistic title="总联系人" value={contacts.length} prefix={<UserOutlined />} />
              </Card>
            </Col>
            <Col span={12}>
              <Card size="small">
                <Statistic 
                  title="已选择" 
                  value={selectedContacts.length} 
                  prefix={<CheckCircleOutlined />}
                  valueStyle={{ color: selectedContacts.length > 0 ? '#3f8600' : '#cf1322' }}
                />
              </Card>
            </Col>
          </Row>
        </div>

        <div className="mb-4">
          <Checkbox
            indeterminate={selectedContacts.length > 0 && selectedContacts.length < contacts.length}
            onChange={(e) => handleSelectAllContacts(e.target.checked)}
            checked={selectedContacts.length === contacts.length}
          >
            全选联系人 ({contacts.length})
          </Checkbox>
        </div>

        <Table
          size="small"
          columns={columns}
          dataSource={contacts}
          rowKey="id"
          rowSelection={{
            selectedRowKeys: selectedContacts.map(c => c.id),
            onChange: handleContactSelection
          }}
          pagination={{
            pageSize: 10,
            showSizeChanger: true,
            showQuickJumper: true,
            showTotal: (total, range) => `${range[0]}-${range[1]} 共 ${total} 条`
          }}
        />

        <div className="mt-4">
          <Row justify="space-between" align="middle">
            <Col>
              <Space>
                <Text>设备选择:</Text>
                <Select
                  mode="multiple"
                  style={{ width: 300 }}
                  placeholder={availableDevices.length === 0 ? "未检测到设备" : "选择目标设备"}
                  value={selectedDevices}
                  onChange={setSelectedDevices}
                  disabled={availableDevices.length === 0}
                  options={availableDevices
                    .filter(device => device.status === 'connected')
                    .map(device => ({
                      label: `${device.name} (${device.phone_name})`,
                      value: device.id.toString()
                    }))}
                />
              </Space>
            </Col>
            <Col>
              <Button 
                type="default"
                icon={<MobileOutlined />}
                onClick={loadDevices}
                loading={loading}
                size="small"
              >
                刷新设备
              </Button>
            </Col>
          </Row>
          
          {availableDevices.length === 0 && (
            <Alert
              type="warning"
              message="未检测到设备"
              description={
                <div>
                  <p>请确保：</p>
                  <ul style={{ paddingLeft: '20px', margin: '8px 0' }}>
                    <li>设备已通过USB连接到电脑</li>
                    <li>设备已启用"USB调试"选项</li>
                    <li>ADB驱动已正确安装</li>
                    <li>设备已授权此电脑进行调试</li>
                  </ul>
                  <Button type="link" onClick={loadDevices} loading={loading}>
                    重新检测设备
                  </Button>
                </div>
              }
              showIcon
              style={{ marginTop: '8px' }}
            />
          )}
        </div>

        <div className="mt-6">
          <Button
            type="primary"
            size="large"
            disabled={selectedContacts.length === 0 || selectedDevices.length === 0}
            onClick={handlePrepareDistribution}
            icon={<SettingOutlined />}
          >
            准备分配 ({selectedContacts.length} 个联系人 → {selectedDevices.length} 台设备)
          </Button>
        </div>
      </div>
    );
  };

  // 渲染分配预览步骤
  const renderDistributionPreview = () => {
    return (
      <div>
        <Alert
          type="info"
          message="分配预览"
          description={`将 ${selectedContacts.length} 个联系人平均分配到 ${selectedDevices.length} 台设备中。`}
          showIcon
          className="mb-4"
        />

        <Row gutter={16}>
          {deviceGroups.map(group => (
            <Col span={24} key={group.deviceId} className="mb-4">
              <Card
                title={
                  <Space>
                    <MobileOutlined />
                    {group.deviceName}
                    <Tag color="blue">{group.deviceId}</Tag>
                  </Space>
                }
                extra={
                  <Tag color="green">{group.contacts.length} 个联系人</Tag>
                }
                size="small"
              >
                <div className="max-h-32 overflow-y-auto">
                  {group.contacts.map(contact => (
                    <Tag key={contact.id} className="mb-1">
                      {contact.name} ({contact.phone})
                    </Tag>
                  ))}
                </div>
              </Card>
            </Col>
          ))}
        </Row>

        <div className="mt-4">
          <Space>
            <Button onClick={() => setCurrentStep(0)}>
              返回修改
            </Button>
            <Button
              type="primary"
              size="large"
              onClick={handleStartImport}
              disabled={deviceGroups.length === 0}
              icon={<PlayCircleOutlined />}
            >
              开始导入
            </Button>
          </Space>
        </div>
      </div>
    );
  };

  // 渲染导入进度步骤
  const renderImportProgress = () => {
    const completedCount = deviceGroups.filter(g => g.status === 'completed').length;
    const failedCount = deviceGroups.filter(g => g.status === 'failed').length;
    const totalImported = deviceGroups.reduce((sum, g) => sum + (g.result?.importedContacts || 0), 0);

    return (
      <div>
        <div className="mb-6">
          <Progress
            percent={importProgress}
            status={isImporting ? 'active' : 'success'}
            strokeColor={{
              '0%': '#108ee9',
              '100%': '#87d068',
            }}
          />
        </div>

        <Row gutter={16} className="mb-4">
          <Col span={6}>
            <Card size="small">
              <Statistic title="总设备" value={deviceGroups.length} />
            </Card>
          </Col>
          <Col span={6}>
            <Card size="small">
              <Statistic title="完成" value={completedCount} valueStyle={{ color: '#3f8600' }} />
            </Card>
          </Col>
          <Col span={6}>
            <Card size="small">
              <Statistic title="失败" value={failedCount} valueStyle={{ color: '#cf1322' }} />
            </Card>
          </Col>
          <Col span={6}>
            <Card size="small">
              <Statistic title="总导入" value={totalImported} />
            </Card>
          </Col>
        </Row>

        <div className="space-y-3">
          {deviceGroups.map(group => (
            <Card key={group.deviceId} size="small">
              <Row align="middle" justify="space-between">
                <Col>
                  <Space>
                    <MobileOutlined />
                    <Text strong>{group.deviceName}</Text>
                    <Tag>{group.contacts.length} 联系人</Tag>
                  </Space>
                </Col>
                <Col>
                  {group.status === 'pending' && <Tag color="default">等待中</Tag>}
                  {group.status === 'importing' && <Tag color="processing">导入中</Tag>}
                  {group.status === 'completed' && <Tag color="success">完成</Tag>}
                  {group.status === 'failed' && <Tag color="error">失败</Tag>}
                </Col>
              </Row>
              
              {group.result && (
                <div className="mt-2 text-sm">
                  <Text type={group.result.success ? 'success' : 'danger'}>
                    {group.result.message}
                  </Text>
                  {group.result.success && (
                    <Text type="secondary" className="ml-2">
                      (成功: {group.result.importedContacts}/{group.result.totalContacts})
                    </Text>
                  )}
                </div>
              )}
            </Card>
          ))}
        </div>

        <div className="mt-6">
          <Space>
            <Button onClick={handleReset} disabled={isImporting}>
              重新开始
            </Button>
            {!isImporting && (
              <Button type="primary" onClick={() => setCurrentStep(0)}>
                完成
              </Button>
            )}
          </Space>
        </div>
      </div>
    );
  };

  return (
    <div className="contact-import-manager">
      <Card
        title={
          <Space>
            <ContactsOutlined />
            通讯录导入管理
          </Space>
        }
        extra={
          <Space>
            <InfoCircleOutlined />
            <Text type="secondary">多设备平均分配导入</Text>
          </Space>
        }
      >
        <Spin spinning={loading}>
          <Steps current={currentStep} className="mb-6">
            <Step
              title="选择联系人和设备"
              description="选择要导入的联系人和目标设备"
              icon={<UserOutlined />}
            />
            <Step
              title="分配预览"
              description="查看联系人分配方案"
              icon={<SettingOutlined />}
            />
            <Step
              title="执行导入"
              description="批量导入到各设备"
              icon={<MobileOutlined />}
            />
          </Steps>

          {currentStep === 0 && renderContactSelection()}
          {currentStep === 1 && renderDistributionPreview()}
          {currentStep === 2 && renderImportProgress()}
        </Spin>
      </Card>
    </div>
  );
};
