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

const { Text } = Typography;
const { Step } = Steps;
const { Option } = Select;

interface Contact {
  id: string;
  name: string;
  phone: string;
  email?: string;
}

interface VcfImportResult {
  name: string;
  phone: string;
  isValid: boolean;
  errorMessage?: string;
}

interface ContactImportManagerProps {
  contacts: Contact[];
  onImportComplete?: (results: VcfImportResult[]) => void;
  onDeviceSelected?: (devices: Device[]) => void;
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
    selectedDevice, 
    selectDevice, 
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

  // 创建VCF文件内容
  const createVcfContent = useCallback((contacts: Contact[]): string => {
    return contacts.map(contact => {
      return [
        'BEGIN:VCARD',
        'VERSION:3.0',
        `FN:${contact.name}`,
        `N:${contact.name};;;;`,
        contact.phone ? `TEL:${contact.phone}` : '',
        contact.email ? `EMAIL:${contact.email}` : '',
        'END:VCARD'
      ].filter(line => line).join('\n');
    }).join('\n\n');
  }, []);

  // 导入联系人到单个设备
  const importToDevice = useCallback(async (group: DeviceContactGroup): Promise<VcfImportResult> => {
    try {
      console.log(`开始导入到设备: ${group.deviceName} (${group.deviceId})`);
      
      const vcfContent = createVcfContent(group.contacts);
      
      // 调用Tauri命令导入联系人
      const result = await invoke<string>('import_vcf_to_device', {
        deviceId: group.deviceId,
        vcfContent: vcfContent,
        contactCount: group.contacts.length
      });

      console.log(`设备 ${group.deviceName} 导入结果:`, result);

      return {
        name: group.deviceName,
        phone: group.deviceId,
        isValid: true
      };
    } catch (error) {
      console.error(`设备 ${group.deviceName} 导入失败:`, error);
      return {
        name: group.deviceName,
        phone: group.deviceId,
        isValid: false,
        errorMessage: `导入失败: ${error}`
      };
    }
  }, [createVcfContent]);

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
      const results: VcfImportResult[] = [];
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
          const failedResult: VcfImportResult = {
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
                <Tag color={
                  record.status === 'completed' ? 'green' :
                  record.status === 'failed' ? 'red' :
                  record.status === 'importing' ? 'blue' : 'default'
                }>
                  {record.status === 'pending' ? '待导入' :
                   record.status === 'importing' ? '导入中' :
                   record.status === 'completed' ? '已完成' : '失败'}
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

  // 渲染导入进度
  const renderImportProgress = () => (
    <Card title="导入进度" style={{ marginBottom: 16 }}>
      <Progress
        percent={importProgress}
        status={isImporting ? "active" : "normal"}
        style={{ marginBottom: 16 }}
      />
      
      <Row gutter={16}>
        <Col span={8}>
          <Statistic
            title="总设备数"
            value={deviceGroups.length}
            prefix={<MobileOutlined />}
          />
        </Col>
        <Col span={8}>
          <Statistic
            title="已完成"
            value={deviceGroups.filter(g => g.status === 'completed').length}
            valueStyle={{ color: '#3f8600' }}
            prefix={<CheckCircleOutlined />}
          />
        </Col>
        <Col span={8}>
          <Statistic
            title="失败"
            value={deviceGroups.filter(g => g.status === 'failed').length}
            valueStyle={{ color: '#cf1322' }}
            prefix={<InfoCircleOutlined />}
          />
        </Col>
      </Row>
    </Card>
  );

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

