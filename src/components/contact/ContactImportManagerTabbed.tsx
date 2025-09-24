/**
 * Tab式联系人导入管理器 - 改进版
 * 支持随时在各个步骤间切换，避免线性流程的局限性
 */

import React, { useState, useCallback, useEffect, useMemo } from 'react';
import {
  Tabs,
  Card,
  Space,
  Button,
  Table,
  Alert,
  Checkbox,
  Progress,
  Tag,
  message,
  Typography,
  Statistic,
  Divider,
  Empty
} from 'antd';
import {
  ContactsOutlined,
  MobileOutlined,
  SettingOutlined,
  PlayCircleOutlined,
  CheckCircleOutlined,
  ArrowRightOutlined,
  ReloadOutlined,
  PauseCircleOutlined,
  StopOutlined,
  InfoCircleOutlined
} from '@ant-design/icons';
import { invoke } from '@tauri-apps/api/core';
import { useAdb } from '../../application/hooks/useAdb';
import type { Contact, VcfImportResult } from '../../types/Contact';

const { TabPane } = Tabs;
const { Title, Text, Paragraph } = Typography;

// 设备分组类型
interface DeviceContactGroup {
  deviceId: string;
  deviceName: string;
  contacts: Contact[];
  status: 'pending' | 'importing' | 'completed' | 'failed' | 'paused';
  result?: VcfImportResult;
  progress?: number;
}


interface ContactImportManagerTabbedProps {
  /** 预选的联系人列表 */
  contacts: Contact[];
  /** 导入完成回调 */
  onImportComplete?: (results: VcfImportResult[]) => void;
  /** 错误处理回调 */
  onError?: (error: string) => void;
  /** 设备选择回调 */
  onDeviceSelected?: (devices: any[]) => void;
}

const ContactImportManagerTabbed: React.FC<ContactImportManagerTabbedProps> = ({
  contacts,
  onImportComplete,
  onError,
  onDeviceSelected
}) => {
  // ADB设备管理
  const { devices, isLoading: adbLoading, refreshDevices, initialize } = useAdb();

  // 主要状态
  const [activeTab, setActiveTab] = useState<string>('contacts');
  const [selectedContacts, setSelectedContacts] = useState<Contact[]>([]);
  const [selectedDevices, setSelectedDevices] = useState<string[]>([]);
  const [deviceGroups, setDeviceGroups] = useState<DeviceContactGroup[]>([]);
  const [isImporting, setIsImporting] = useState(false);
  const [importProgress, setImportProgress] = useState(0);
  const [importResults, setImportResults] = useState<VcfImportResult[]>([]);

  // 初始化ADB连接
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
        status: 'pending',
        progress: 0
      });
    });

    setDeviceGroups(groups);
    message.success(`已将 ${selectedContacts.length} 个联系人分配给 ${selectedDevices.length} 个设备`);
    
    // 自动跳转到执行Tab
    setActiveTab('execution');
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
        success: true,
        importedContacts: group.contacts.length,
        totalContacts: group.contacts.length,
        failedContacts: 0,
        message: `设备 ${group.deviceName} 导入成功`
      };
    } catch (error) {
      console.error(`设备 ${group.deviceName} 导入失败:`, error);
      return {
        success: false,
        message: `导入失败: ${error}`,
        importedContacts: 0,
        totalContacts: group.contacts.length,
        failedContacts: group.contacts.length
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

    try {
      const results: VcfImportResult[] = [];
      const totalGroups = deviceGroups.length;

      for (let i = 0; i < totalGroups; i++) {
        const group = deviceGroups[i];
        
        // 更新状态：正在导入
        setDeviceGroups(prev => prev.map(g => 
          g.deviceId === group.deviceId ? { ...g, status: 'importing', progress: 0 } : g
        ));

        try {
          const result = await importToDevice(group);
          results.push(result);

          // 更新状态：导入完成
          setDeviceGroups(prev => prev.map(g => 
            g.deviceId === group.deviceId 
              ? { ...g, status: result.success ? 'completed' : 'failed', result, progress: 100 }
              : g
          ));

          if (result.success) {
            message.success(`设备 ${group.deviceName} 导入成功`);
          } else {
            message.error(`设备 ${group.deviceName} 导入失败: ${result.message}`);
          }
        } catch (error) {
          const failedResult: VcfImportResult = {
            success: false,
            message: `导入异常: ${error}`,
            importedContacts: 0,
            totalContacts: group.contacts.length,
            failedContacts: group.contacts.length
          };
          results.push(failedResult);

          setDeviceGroups(prev => prev.map(g => 
            g.deviceId === group.deviceId 
              ? { ...g, status: 'failed', result: failedResult, progress: 0 }
              : g
          ));
        }

        // 更新总体进度
        setImportProgress(Math.round(((i + 1) / totalGroups) * 100));
      }

      setImportResults(results);
      setIsImporting(false);
      onImportComplete?.(results);

      // 统计结果
  const successCount = results.filter(r => r.success).length;
      const totalImported = results.reduce((sum, r) => sum + (r.importedContacts || 0), 0);

      if (successCount === results.length) {
        message.success(`全部导入完成！共导入 ${totalImported} 个联系人到 ${successCount} 台设备`);
      } else {
        message.warning(`部分导入成功：${successCount}/${results.length} 台设备，共导入 ${totalImported} 个联系人`);
      }

    } catch (error) {
      console.error('批量导入失败:', error);
      setIsImporting(false);
      onError?.(`批量导入失败: ${error}`);
    }
  }, [deviceGroups, importToDevice, onImportComplete, onError]);

  // 暂停导入
  const pauseImport = useCallback(() => {
    // TODO: 实现暂停功能
    message.info('暂停功能正在开发中');
  }, []);

  // 停止导入
  const stopImport = useCallback(() => {
    setIsImporting(false);
    setDeviceGroups(prev => prev.map(g => 
      g.status === 'importing' ? { ...g, status: 'pending', progress: 0 } : g
    ));
    message.info('已停止导入');
  }, []);

  // 重新分配
  const reassignContacts = useCallback(() => {
    setDeviceGroups([]);
    setActiveTab('assignment');
  }, []);

  // 重置所有状态
  const resetAll = useCallback(() => {
    setSelectedContacts(contacts);
    setSelectedDevices([]);
    setDeviceGroups([]);
    setIsImporting(false);
    setImportProgress(0);
    setImportResults([]);
    setActiveTab('contacts');
    message.info('已重置所有配置');
  }, [contacts]);

  // 计算统计信息
  const statistics = useMemo(() => ({
    totalContacts: selectedContacts.length,
    selectedDevices: selectedDevices.length,
    assignedGroups: deviceGroups.length,
    pendingGroups: deviceGroups.filter(g => g.status === 'pending').length,
    importingGroups: deviceGroups.filter(g => g.status === 'importing').length,
    completedGroups: deviceGroups.filter(g => g.status === 'completed').length,
    failedGroups: deviceGroups.filter(g => g.status === 'failed').length,
    totalImported: importResults.reduce((sum, r) => sum + (r.importedContacts || 0), 0)
  }), [selectedContacts, selectedDevices, deviceGroups, importResults]);

  // Tab禁用逻辑
  const tabDisabled = useMemo(() => ({
    devices: selectedContacts.length === 0,
    assignment: selectedContacts.length === 0 || selectedDevices.length === 0,
    execution: deviceGroups.length === 0
  }), [selectedContacts.length, selectedDevices.length, deviceGroups.length]);

  return (
    <div className="h-full flex flex-col">
      {/* 顶部统计信息 */}
      <Card size="small" className="mb-4">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Statistic 
            title="选中联系人" 
            value={statistics.totalContacts} 
            prefix={<ContactsOutlined />} 
            valueStyle={{ color: '#1890ff' }}
          />
          <Statistic 
            title="选中设备" 
            value={statistics.selectedDevices} 
            prefix={<MobileOutlined />} 
            valueStyle={{ color: '#52c41a' }}
          />
          <Statistic 
            title="分配组数" 
            value={statistics.assignedGroups} 
            prefix={<SettingOutlined />} 
            valueStyle={{ color: '#fa541c' }}
          />
          <Statistic 
            title="已导入" 
            value={statistics.totalImported} 
            prefix={<CheckCircleOutlined />} 
            valueStyle={{ color: '#722ed1' }}
          />
        </div>
      </Card>

      {/* Tab页面 */}
      <Card className="flex-1" styles={{ body: { padding: 0, height: '100%' } }}>
        <Tabs
          activeKey={activeTab}
          onChange={setActiveTab}
          className="h-full"
          tabBarExtraContent={
            <Space>
              <Button 
                icon={<ReloadOutlined />} 
                onClick={resetAll}
                size="small"
                type="text"
              >
                重置
              </Button>
            </Space>
          }
        >
          {/* 联系人选择Tab */}
          <TabPane
            tab={
              <Space>
                <ContactsOutlined />
                选择联系人
                <Tag color="blue">{selectedContacts.length}</Tag>
              </Space>
            }
            key="contacts"
          >
            <div className="p-4">
              <Space direction="vertical" className="w-full">
                <div className="flex items-center justify-between">
                  <Title level={4}>选择要导入的联系人</Title>
                  <Space>
                    <Text type="secondary">
                      已选择 {selectedContacts.length} / {contacts.length}
                    </Text>
                    <Button
                      type="primary"
                      icon={<ArrowRightOutlined />}
                      disabled={selectedContacts.length === 0}
                      onClick={() => setActiveTab('devices')}
                    >
                      下一步：选择设备
                    </Button>
                  </Space>
                </div>

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
                  全选/全不选
                </Checkbox>

                <Table
                  dataSource={contacts}
                  rowKey="id"
                  size="small"
                  scroll={{ y: 400 }}
                  pagination={{ pageSize: 20 }}
                  rowSelection={{
                    selectedRowKeys: selectedContacts.map(c => c.id),
                    onChange: (selectedRowKeys) => {
                      const selected = contacts.filter(c => selectedRowKeys.includes(c.id));
                      setSelectedContacts(selected);
                    }
                  }}
                  columns={[
                    {
                      title: '姓名',
                      dataIndex: 'name',
                      key: 'name',
                      width: 120,
                    },
                    {
                      title: '电话',
                      dataIndex: 'phone',
                      key: 'phone',
                      width: 140,
                    },
                    {
                      title: '邮箱',
                      dataIndex: 'email',
                      key: 'email',
                      ellipsis: true,
                    }
                  ]}
                />
              </Space>
            </div>
          </TabPane>

          {/* 设备选择Tab */}
          <TabPane
            tab={
              <Space>
                <MobileOutlined />
                选择设备
                <Tag color="green">{selectedDevices.length}</Tag>
              </Space>
            }
            key="devices"
            disabled={tabDisabled.devices}
          >
            <div className="p-4">
              <Space direction="vertical" className="w-full">
                <div className="flex items-center justify-between">
                  <Title level={4}>选择目标设备</Title>
                  <Space>
                    <Button
                      icon={<ReloadOutlined />}
                      onClick={refreshDevices}
                      loading={adbLoading}
                    >
                      刷新设备
                    </Button>
                    <Button
                      type="primary"
                      icon={<ArrowRightOutlined />}
                      disabled={selectedDevices.length === 0}
                      onClick={() => setActiveTab('assignment')}
                    >
                      下一步：分配任务
                    </Button>
                  </Space>
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

                <Table
                  dataSource={devices}
                  rowKey="id"
                  size="small"
                  pagination={false}
                  rowSelection={{
                    selectedRowKeys: selectedDevices,
                    onChange: handleDeviceSelection
                  }}
                  columns={[
                    {
                      title: '设备名称',
                      dataIndex: 'name',
                      key: 'name',
                      render: (name, record: any) => record.getDisplayName()
                    },
                    {
                      title: '设备ID',
                      dataIndex: 'id',
                      key: 'id',
                    },
                    {
                      title: '状态',
                      dataIndex: 'status',
                      key: 'status',
                      render: (status: string) => (
                        <Tag color={status === 'device' ? 'green' : 'orange'}>
                          {status === 'device' ? '已连接' : '未知'}
                        </Tag>
                      )
                    }
                  ]}
                />
              </Space>
            </div>
          </TabPane>

          {/* 任务分配Tab */}
          <TabPane
            tab={
              <Space>
                <SettingOutlined />
                分配任务
                <Tag color="orange">{deviceGroups.length}</Tag>
              </Space>
            }
            key="assignment"
            disabled={tabDisabled.assignment}
          >
            <div className="p-4">
              <Space direction="vertical" className="w-full">
                <div className="flex items-center justify-between">
                  <Title level={4}>联系人分配方案</Title>
                  <Space>
                    {deviceGroups.length === 0 ? (
                      <Button
                        type="primary"
                        icon={<SettingOutlined />}
                        onClick={assignContactsToDevices}
                        disabled={selectedContacts.length === 0 || selectedDevices.length === 0}
                      >
                        自动分配联系人
                      </Button>
                    ) : (
                      <Space>
                        <Button
                          icon={<ReloadOutlined />}
                          onClick={reassignContacts}
                        >
                          重新分配
                        </Button>
                        <Button
                          type="primary"
                          icon={<ArrowRightOutlined />}
                          onClick={() => setActiveTab('execution')}
                        >
                          开始执行
                        </Button>
                      </Space>
                    )}
                  </Space>
                </div>

                {deviceGroups.length === 0 ? (
                  <Empty
                    description="暂未分配联系人到设备"
                    image={Empty.PRESENTED_IMAGE_SIMPLE}
                  />
                ) : (
                  <Table
                    dataSource={deviceGroups}
                    rowKey="deviceId"
                    pagination={false}
                    columns={[
                      {
                        title: '设备',
                        dataIndex: 'deviceName',
                        key: 'deviceName',
                        render: (name) => (
                          <Space>
                            <MobileOutlined />
                            <span>{name}</span>
                          </Space>
                        )
                      },
                      {
                        title: '联系人数量',
                        dataIndex: 'contacts',
                        key: 'contactCount',
                        render: (contacts: Contact[]) => (
                          <Tag color="blue">{contacts.length}</Tag>
                        )
                      },
                      {
                        title: '状态',
                        key: 'status',
                        render: (_, record: DeviceContactGroup) => (
                          <Tag color={
                            record.status === 'completed' ? 'green' :
                            record.status === 'failed' ? 'red' :
                            record.status === 'importing' ? 'blue' : 'default'
                          }>
                            {record.status === 'pending' ? '待导入' :
                             record.status === 'importing' ? '导入中' :
                             record.status === 'completed' ? '已完成' : 
                             record.status === 'failed' ? '失败' : '暂停'}
                          </Tag>
                        )
                      }
                    ]}
                  />
                )}

                {deviceGroups.length > 0 && (
                  <Alert
                    message="分配完成"
                    description={
                      <div>
                        <p>已将 {selectedContacts.length} 个联系人分配给 {deviceGroups.length} 台设备</p>
                        <p>平均每台设备分配 {Math.ceil(selectedContacts.length / deviceGroups.length)} 个联系人</p>
                      </div>
                    }
                    type="success"
                    showIcon
                  />
                )}
              </Space>
            </div>
          </TabPane>

          {/* 导入执行Tab */}
          <TabPane
            tab={
              <Space>
                <PlayCircleOutlined />
                导入执行
                {isImporting && <Tag color="processing">进行中</Tag>}
              </Space>
            }
            key="execution"
            disabled={tabDisabled.execution}
          >
            <div className="p-4">
              <Space direction="vertical" className="w-full">
                <div className="flex items-center justify-between">
                  <Title level={4}>批量导入进度</Title>
                  <Space>
                    {!isImporting ? (
                      <Button
                        type="primary"
                        size="large"
                        icon={<PlayCircleOutlined />}
                        onClick={startImport}
                        disabled={deviceGroups.length === 0}
                      >
                        开始导入
                      </Button>
                    ) : (
                      <Space>
                        <Button
                          icon={<PauseCircleOutlined />}
                          onClick={pauseImport}
                        >
                          暂停
                        </Button>
                        <Button
                          danger
                          icon={<StopOutlined />}
                          onClick={stopImport}
                        >
                          停止
                        </Button>
                      </Space>
                    )}
                  </Space>
                </div>

                {isImporting && (
                  <Card>
                    <Progress
                      percent={importProgress}
                      status={importProgress === 100 ? 'success' : 'active'}
                      strokeColor={{
                        from: '#108ee9',
                        to: '#87d068',
                      }}
                    />
                  </Card>
                )}

                <Table
                  dataSource={deviceGroups}
                  rowKey="deviceId"
                  pagination={false}
                  columns={[
                    {
                      title: '设备',
                      dataIndex: 'deviceName',
                      key: 'deviceName',
                      render: (name, record: DeviceContactGroup) => (
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
                             record.status === 'completed' ? '已完成' : 
                             record.status === 'failed' ? '失败' : '暂停'}
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
                      title: '进度',
                      key: 'progress',
                      render: (_, record: DeviceContactGroup) => (
                        record.status === 'importing' ? (
                          <Progress percent={record.progress || 0} size="small" />
                        ) : record.status === 'completed' ? (
                          <Progress percent={100} size="small" status="success" />
                        ) : record.status === 'failed' ? (
                          <Progress percent={0} size="small" status="exception" />
                        ) : (
                          <Progress percent={0} size="small" />
                        )
                      )
                    },
                    {
                      title: '结果',
                      key: 'result',
                      render: (_, record: DeviceContactGroup) => {
                        if (record.result) {
                          return record.result.success ? (
                            <Text type="success">
                              成功导入 {record.result.importedContacts} 个
                            </Text>
                          ) : (
                            <Text type="danger" title={record.result.message}>
                              导入失败
                            </Text>
                          );
                        }
                        return '-';
                      }
                    }
                  ]}
                />

                {deviceGroups.length > 0 && (
                  <Card title="导入说明" size="small">
                    <Paragraph>
                      <InfoCircleOutlined className="mr-2" />
                      导入过程将依次向每台设备发送VCF文件，请保持设备连接稳定。
                      如果某台设备导入失败，可以单独重试该设备。
                    </Paragraph>
                  </Card>
                )}
              </Space>
            </div>
          </TabPane>
        </Tabs>
      </Card>
    </div>
  );
};

export default ContactImportManagerTabbed;