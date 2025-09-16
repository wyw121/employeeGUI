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
import { useAdb } from '../../application/hooks/useAdb';
import { Device } from '../../domain/adb/entities/Device';
import { Contact } from '../../types/Contact';

// 本地VCF导入结果接口（用于组件内部）
interface LocalVcfImportResult {
  name: string;
  phone: string;
  isValid: boolean;
  errorMessage?: string;
}

const { Text } = Typography;
const { Step } = Steps;
const { Option } = Select;



// 旧版本导入结果接口（用于兼容性）
interface LegacyVcfImportResult {
  success: boolean;
  totalContacts: number;
  importedContacts: number;
  failedContacts: number;
  message: string;
  details?: string;
}

interface ContactImportManagerProps {
  contacts: Contact[];
  onImportComplete?: (results: LocalVcfImportResult[]) => void;
  onDeviceSelected?: (devices: Device[]) => void;
  onError?: (error: string) => void;
}

interface DeviceContactGroup {
  deviceId: string;
  deviceName: string;
  contacts: Contact[];
  status: 'pending' | 'importing' | 'completed' | 'failed';
  result?: LocalVcfImportResult;
}

export const ContactImportManager: React.FC<ContactImportManagerProps> = ({
  contacts,
  onImportComplete,
  onDeviceSelected,
  onError
}) => {
  const [currentStep, setCurrentStep] = useState(0);
  const [selectedContacts, setSelectedContacts] = useState<Contact[]>([]);
  const [selectedDevices, setSelectedDevices] = useState<string[]>([]);
  const [deviceGroups, setDeviceGroups] = useState<DeviceContactGroup[]>([]);
  const [isImporting, setIsImporting] = useState(false);
  const [importProgress, setImportProgress] = useState(0);

  // 使用统一的ADB接口 - 遵循DDD架构约束
  const { 
    devices, 
    isLoading,
    refreshDevices,
    initialize,
    onlineDevices
  } = useAdb();

  // 初始化ADB环境
  useEffect(() => {
    const initializeAdb = async () => {
      try {
        await initialize();
        await refreshDevices();
      } catch (error) {
        console.error('ADB初始化失败:', error);
        onError?.(`ADB初始化失败: ${error}`);
      }
    };

    initializeAdb();
  }, [initialize, refreshDevices, onError]);

  // 初始化选择的联系人
  useEffect(() => {
    if (contacts.length > 0 && selectedContacts.length === 0) {
      setSelectedContacts(contacts);
    }
  }, [contacts, selectedContacts.length]);

  // 处理设备选择
  const handleDeviceSelection = useCallback((deviceIds: string[]) => {
    setSelectedDevices(deviceIds);
    
    if (onDeviceSelected && deviceIds.length > 0) {
      const selectedDeviceObjects = devices.filter(device =>
        deviceIds.includes(device.id)
      );
      onDeviceSelected(selectedDeviceObjects);
    }
  }, [devices, onDeviceSelected]);

  // 分配联系人到设备
  const assignContactsToDevices = useCallback(() => {
    if (selectedContacts.length === 0 || selectedDevices.length === 0) {
      message.warning('请选择联系人和设备');
      return;
    }

    const contactsPerDevice = Math.ceil(selectedContacts.length / selectedDevices.length);
    const groups: DeviceContactGroup[] = [];

    selectedDevices.forEach((deviceId, index) => {
      const device = devices.find(d => d.id === deviceId);
      if (!device) return;

      const startIndex = index * contactsPerDevice;
      const endIndex = Math.min(startIndex + contactsPerDevice, selectedContacts.length);
      const deviceContacts = selectedContacts.slice(startIndex, endIndex);

      groups.push({
        deviceId: device.id,
        deviceName: device.getDisplayName(),
        contacts: deviceContacts,
        status: 'pending'
      });
    });

    setDeviceGroups(groups);
    setCurrentStep(2);
    message.success(`已将 ${selectedContacts.length} 个联系人分配给 ${selectedDevices.length} 个设备`);
  }, [selectedContacts, selectedDevices, devices]);



  // 导入联系人到单个设备 - 使用已验证工作的旧版本方式
  const importToDevice = useCallback(async (group: DeviceContactGroup): Promise<LocalVcfImportResult> => {
    try {
      console.log(`开始导入到设备: ${group.deviceName} (${group.deviceId})`);
      
      // 方法1: 使用generate_vcf_file + import_vcf_contacts_async_safe（旧版本已验证方式）
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
          output_path: `contacts_${Date.now()}_${group.deviceId.replace(/[^a-zA-Z0-9]/g, '_')}.vcf`
        });

        console.log(`✅ VCF文件生成成功: ${vcfFilePath}`);

        // 使用异步安全版本导入
        const importResult = await invoke<LegacyVcfImportResult>("import_vcf_contacts_async_safe", {
          deviceId: group.deviceId,
          vcfFilePath: vcfFilePath
        });

        console.log(`✅ 方法1成功 - 设备 ${group.deviceName} 导入结果:`, importResult);
        
        return {
          name: group.deviceName,
          phone: group.deviceId,
          isValid: importResult.success,
          errorMessage: importResult.success ? undefined : importResult.message
        };

      } catch (method1Error) {
        console.warn(`⚠️ 方法1失败，尝试方法2:`, method1Error);
        
        // 方法2: 回退到权限测试方法
        try {
          console.log(`📋 尝试方法2: 使用权限测试方法`);
          
          // 生成临时联系人文件
          const contactsContent = group.contacts.map(contact =>
            `${contact.name},${contact.phone || ''},${contact.notes || ''},,${contact.email || ''}`
          ).join('\n');

          const tempPath = `temp_contacts_${Date.now()}_${group.deviceId.replace(/[^a-zA-Z0-9]/g, '_')}.txt`;
          
          await invoke("write_file", {
            path: tempPath,
            content: contactsContent,
          });

          const permissionTestResult = await invoke<string>("test_vcf_import_with_permission", {
            deviceId: group.deviceId,
            contactsFile: tempPath,
          });

          console.log(`✅ 设备 ${group.deviceName} 方法2原始返回结果:`, permissionTestResult);

          // 解析结果
          const regex = /成功=(\w+), 总数=(\d+), 导入=(\d+), 失败=(\d+), 消息='([^']*)'/;
          const parts = regex.exec(permissionTestResult);

          let success = false;
          if (parts && parts.length >= 6) {
            success = parts[1] === 'true';
          } else {
            // 解析失败，根据返回内容判断
            success = permissionTestResult.includes('成功') ||
                     permissionTestResult.includes('导入结果: 成功=true') ||
                     !permissionTestResult.includes('失败');
          }

          // 清理临时文件
          try {
            await invoke("delete_file", { path: tempPath });
            console.log(`🗑️ 已清理临时文件: ${tempPath}`);
          } catch (cleanupError) {
            console.warn('清理临时文件失败:', cleanupError);
          }

          return {
            name: group.deviceName,
            phone: group.deviceId,
            isValid: success,
            errorMessage: success ? undefined : '导入失败'
          };

        } catch (method2Error) {
          console.error(`❌ 方法2也失败:`, method2Error);
          throw method2Error;
        }
      }
    } catch (error) {
      console.error(`设备 ${group.deviceName} 导入失败:`, error);
      return {
        name: group.deviceName,
        phone: group.deviceId,
        isValid: false,
        errorMessage: `导入异常: ${error instanceof Error ? error.message : String(error)}`
      };
    }
  }, []);

  // 开始导入流程
  const startImport = useCallback(async () => {
    if (deviceGroups.length === 0) {
      message.error('没有设备分组可导入');
      return;
    }

    setIsImporting(true);
    setImportProgress(0);
    setCurrentStep(3);

    try {
      const results: LocalVcfImportResult[] = [];
      const totalGroups = deviceGroups.length;

      for (let i = 0; i < totalGroups; i++) {
        const group = deviceGroups[i];
        
        // 更新状态：正在导入
        setDeviceGroups(prev => prev.map(g => 
          g.deviceId === group.deviceId ? { ...g, status: 'importing' } : g
        ));

        try {
          const result = await importToDevice(group);
          results.push(result);

          // 更新状态：导入完成
          setDeviceGroups(prev => prev.map(g => 
            g.deviceId === group.deviceId 
              ? { ...g, status: result.isValid ? 'completed' : 'failed', result }
              : g
          ));

          if (result.isValid) {
            message.success(`设备 ${group.deviceName} 导入成功`);
          } else {
            message.error(`设备 ${group.deviceName} 导入失败: ${result.errorMessage}`);
          }
        } catch (error) {
          const failedResult: LocalVcfImportResult = {
            name: group.deviceName,
            phone: group.deviceId,
            isValid: false,
            errorMessage: `导入异常: ${error}`
          };
          results.push(failedResult);

          setDeviceGroups(prev => prev.map(g => 
            g.deviceId === group.deviceId ? { ...g, status: 'failed', result: failedResult } : g
          ));

          message.error(`设备 ${group.deviceName} 导入失败: ${error}`);
        }

        // 更新进度
        setImportProgress((i + 1) / totalGroups * 100);
      }

      // 导入完成
      const successCount = results.filter(r => r.isValid).length;
      message.success(`导入完成！成功: ${successCount}/${totalGroups} 个设备`);
      
      onImportComplete?.(results);
    } catch (error) {
      console.error('批量导入失败:', error);
      message.error(`批量导入失败: ${error}`);
      onError?.(`批量导入失败: ${error}`);
    } finally {
      setIsImporting(false);
      setImportProgress(100);
    }
  }, [deviceGroups, importToDevice, onImportComplete, onError]);

  // 渲染步骤导航
  const renderSteps = () => (
    <Steps current={currentStep} style={{ marginBottom: 24 }}>
      <Step title="选择联系人" icon={<ContactsOutlined />} />
      <Step title="选择设备" icon={<MobileOutlined />} />
      <Step title="分配任务" icon={<SettingOutlined />} />
      <Step title="导入进行中" icon={<PlayCircleOutlined />} />
      <Step title="完成" icon={<CheckCircleOutlined />} />
    </Steps>
  );

  // 渲染联系人选择界面
  const renderContactSelection = () => (
    <Card title="选择要导入的联系人" style={{ marginBottom: 16 }}>
      <div style={{ marginBottom: 16 }}>
        <Checkbox
          checked={selectedContacts.length === contacts.length}
          indeterminate={selectedContacts.length > 0 && selectedContacts.length < contacts.length}
          onChange={(e) => {
            if (e.target.checked) {
              setSelectedContacts(contacts);
            } else {
              setSelectedContacts([]);
            }
          }}
        >
          全选 ({contacts.length} 个联系人)
        </Checkbox>
      </div>
      
      <Checkbox.Group
        value={selectedContacts.map(c => c.id)}
        onChange={(checkedValues) => {
          const selected = contacts.filter(c => checkedValues.includes(c.id));
          setSelectedContacts(selected);
        }}
        style={{ width: '100%' }}
      >
        <Row gutter={[8, 8]}>
          {contacts.map(contact => (
            <Col span={8} key={contact.id}>
              <Checkbox value={contact.id}>
                <Space>
                  <UserOutlined />
                  <div>
                    <div>{contact.name}</div>
                    <Text type="secondary" style={{ fontSize: '12px' }}>
                      {contact.phone}
                    </Text>
                  </div>
                </Space>
              </Checkbox>
            </Col>
          ))}
        </Row>
      </Checkbox.Group>

      {selectedContacts.length > 0 && (
        <div style={{ marginTop: 16 }}>
          <Button type="primary" onClick={() => setCurrentStep(1)}>
            下一步：选择设备 ({selectedContacts.length} 个联系人)
          </Button>
        </div>
      )}
    </Card>
  );

  // 渲染设备选择界面
  const renderDeviceSelection = () => (
    <Card title="选择目标设备" style={{ marginBottom: 16 }}>
      <Space direction="vertical" style={{ width: '100%' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <Select
            mode="multiple"
            style={{ flex: 1 }}
            placeholder="选择要导入的设备"
            value={selectedDevices}
            onChange={handleDeviceSelection}
            loading={isLoading}
          >
            {onlineDevices.map(device => (
              <Option key={device.id} value={device.id}>
                <Space>
                  <MobileOutlined />
                  <span>{device.getDisplayName()}</span>
                  <Tag color="green">在线</Tag>
                </Space>
              </Option>
            ))}
          </Select>
          <Button icon={<SettingOutlined />} onClick={refreshDevices} loading={isLoading}>
            刷新设备
          </Button>
        </div>

        {devices.length === 0 && (
          <Alert
            message="未检测到设备"
            description="请确保设备已连接并启用USB调试"
            type="warning"
            showIcon
          />
        )}

        {selectedDevices.length > 0 && (
          <Alert
            message={`已选择 ${selectedDevices.length} 个设备`}
            description={`将把 ${selectedContacts.length} 个联系人分配给这些设备`}
            type="info"
            showIcon
          />
        )}

        {selectedDevices.length > 0 && (
          <Button type="primary" onClick={assignContactsToDevices}>
            下一步：分配任务
          </Button>
        )}
      </Space>
    </Card>
  );

  // 渲染分配预览
  const renderAssignmentPreview = () => (
    <Card title="导入任务分配" style={{ marginBottom: 16 }}>
      <Table
        dataSource={deviceGroups}
        rowKey="deviceId"
        pagination={false}
        columns={[
          {
            title: '设备',
            dataIndex: 'deviceName',
            key: 'deviceName',
            render: (name, record) => (
              <Space>
                <MobileOutlined />
                <span>{name}</span>
                <Tag color={(() => {
                  if (record.status === 'completed') return 'green';
                  if (record.status === 'failed') return 'red';
                  if (record.status === 'importing') return 'blue';
                  return 'default';
                })()}>
                  {(() => {
                    if (record.status === 'pending') return '待导入';
                    if (record.status === 'importing') return '导入中';
                    if (record.status === 'completed') return '已完成';
                    return '失败';
                  })()}
                </Tag>
              </Space>
            )
          },
          {
            title: '联系人数量',
            dataIndex: 'contacts',
            key: 'contactCount',
            render: (contacts: Contact[]) => contacts.length
          },
          {
            title: '联系人列表',
            dataIndex: 'contacts',
            key: 'contacts',
            render: (contacts: Contact[]) => (
              <div>
                {contacts.slice(0, 3).map(c => c.name).join(', ')}
                {contacts.length > 3 && ` 等${contacts.length}个联系人`}
              </div>
            )
          }
        ]}
      />

      <div style={{ marginTop: 16 }}>
        <Space>
          <Button type="primary" onClick={startImport} disabled={isImporting}>
            开始导入
          </Button>
          <Button onClick={() => setCurrentStep(1)}>
            返回设备选择
          </Button>
        </Space>
      </div>
    </Card>
  );

  // 重置功能
  const resetImport = useCallback(() => {
    setCurrentStep(0);
    setSelectedContacts([]);
    setSelectedDevices([]);
    setDeviceGroups([]);
    setIsImporting(false);
    setImportProgress(0);
    message.success('已重置，可以重新开始导入');
  }, []);

  // 渲染导入进度
  const renderImportProgress = () => {
    const completedCount = deviceGroups.filter(g => g.status === 'completed').length;
    const failedCount = deviceGroups.filter(g => g.status === 'failed').length;
    const pendingCount = deviceGroups.filter(g => g.status === 'pending').length;
    
    return (
      <div>
        <Card title="导入进度" style={{ marginBottom: 16 }}>
          <Progress
            percent={importProgress}
            status={(() => {
              if (isImporting) return "active";
              if (failedCount > 0) return "exception";
              return "normal";
            })()}
            style={{ marginBottom: 16 }}
          />
          
          <Row gutter={16} style={{ marginBottom: 16 }}>
            <Col span={6}>
              <Statistic
                title="总设备数"
                value={deviceGroups.length}
                prefix={<MobileOutlined />}
              />
            </Col>
            <Col span={6}>
              <Statistic
                title="等待中"
                value={pendingCount}
                valueStyle={{ color: '#666' }}
              />
            </Col>
            <Col span={6}>
              <Statistic
                title="已完成"
                value={completedCount}
                valueStyle={{ color: '#3f8600' }}
                prefix={<CheckCircleOutlined />}
              />
            </Col>
            <Col span={6}>
              <Statistic
                title="失败"
                value={failedCount}
                valueStyle={{ color: '#cf1322' }}
                prefix={<InfoCircleOutlined />}
              />
            </Col>
          </Row>

          {/* 操作按钮 */}
          <Row justify="space-between" style={{ marginTop: 16 }}>
            <Col>
              <Space>
                <Button 
                  type="primary" 
                  danger 
                  onClick={resetImport}
                  disabled={isImporting}
                >
                  重新开始
                </Button>
                <Button 
                  onClick={() => setCurrentStep(2)}
                  disabled={isImporting}
                >
                  返回分配
                </Button>
              </Space>
            </Col>
            <Col>
              {!isImporting && (completedCount > 0 || failedCount > 0) && (
                <Tag color={failedCount > 0 ? 'red' : 'green'} style={{ fontSize: '14px', padding: '4px 8px' }}>
                  {failedCount > 0 ? 
                    `部分失败: ${completedCount}成功/${failedCount}失败` : 
                    `全部成功: ${completedCount}/${deviceGroups.length}`
                  }
                </Tag>
              )}
            </Col>
          </Row>
        </Card>

        {/* 详细的设备导入状态和错误日志 */}
        <Card title="设备导入详情" style={{ marginBottom: 16 }}>
          {deviceGroups.map(group => (
            <Card 
              key={group.deviceId} 
              size="small" 
              style={{ marginBottom: 12 }}
              type={group.status === 'failed' ? 'inner' : undefined}
            >
              <Row align="middle" justify="space-between">
                <Col>
                  <Space>
                    <MobileOutlined />
                    <Text strong>{group.deviceName}</Text>
                    <Tag color="blue">{group.contacts.length} 个联系人</Tag>
                    <Tag color={(() => {
                      if (group.status === 'completed') return 'green';
                      if (group.status === 'failed') return 'red';
                      if (group.status === 'importing') return 'blue';
                      return 'default';
                    })()}>
                      {(() => {
                        if (group.status === 'pending') return '等待导入';
                        if (group.status === 'importing') return '导入中...';
                        if (group.status === 'completed') return '导入成功';
                        return '导入失败';
                      })()}
                    </Tag>
                  </Space>
                </Col>
                <Col>
                  <Text type="secondary" style={{ fontSize: '12px' }}>
                    设备ID: {group.deviceId}
                  </Text>
                </Col>
              </Row>
              
              {/* 显示联系人列表 */}
              <div style={{ marginTop: 8, fontSize: '12px', color: '#666' }}>
                联系人: {group.contacts.slice(0, 5).map(c => c.name).join(', ')}
                {group.contacts.length > 5 && ` 等${group.contacts.length}个`}
              </div>

              {/* 显示错误信息 */}
              {group.status === 'failed' && group.result?.errorMessage && (
                <Alert
                  message="导入失败详情"
                  description={
                    <div>
                      <Text code style={{ fontSize: '12px', wordBreak: 'break-all' }}>
                        {group.result.errorMessage}
                      </Text>
                      <div style={{ marginTop: 8, fontSize: '11px', color: '#999' }}>
                        建议检查：设备连接状态、ADB权限、存储空间、联系人权限
                      </div>
                    </div>
                  }
                  type="error"
                  showIcon
                  style={{ marginTop: 8, fontSize: '12px' }}
                />
              )}

              {/* 显示成功信息 */}
              {group.status === 'completed' && (
                <Alert
                  message={`成功导入 ${group.contacts.length} 个联系人到 ${group.deviceName}`}
                  type="success"
                  showIcon
                  style={{ marginTop: 8, fontSize: '12px' }}
                />
              )}
            </Card>
          ))}
        </Card>
      </div>
    );
  };

  return (
    <div style={{ padding: 16 }}>
      {renderSteps()}
      
      {currentStep === 0 && renderContactSelection()}
      {currentStep === 1 && renderDeviceSelection()}
      {currentStep === 2 && renderAssignmentPreview()}
      {currentStep >= 3 && renderImportProgress()}
      
      <Spin spinning={isImporting}>
        <div style={{ minHeight: 100 }}>
          {/* 内容区域 */}
        </div>
      </Spin>
    </div>
  );
};

export default ContactImportManager;

