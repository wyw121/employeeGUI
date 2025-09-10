import {
    CheckCircleOutlined,
    ContactsOutlined,
    InfoCircleOutlined,
    MobileOutlined,
    PlayCircleOutlined,
    SettingOutlined,
    UserOutlined
} from '@ant-design/icons';
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
import { VcfImportService } from '../../services/VcfImportService';
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

  // 初始化时获取设备列表
  useEffect(() => {
    loadDevices();
  }, []);

  // 获取可用设备
  const loadDevices = useCallback(async () => {
    setLoading(true);
    try {
      // 模拟设备数据，实际使用时替换为真实API调用
      const mockDevices: Device[] = [
        { id: 1, name: '设备1', phone_name: 'Device1', status: 'connected' },
        { id: 2, name: '设备2', phone_name: 'Device2', status: 'connected' },
        { id: 3, name: '设备3', phone_name: 'Device3', status: 'connected' }
      ];
      
      setAvailableDevices(mockDevices);
      
      // 默认选中所有已连接的设备，使用设备ID
      const connectedDeviceIds = mockDevices
        .filter(device => device.status === 'connected')
        .map(device => device.id.toString());
      setSelectedDevices(connectedDeviceIds);
      
    } catch (error) {
      console.error('获取设备列表失败:', error);
      onError?.('获取设备列表失败');
    } finally {
      setLoading(false);
    }
  }, [onError]);

  // 选择联系人
  const handleContactSelection = useCallback((selectedKeys: React.Key[]) => {
    const selected = contacts.filter(contact => selectedKeys.includes(contact.id));
    setSelectedContacts(selected);
  }, [contacts]);

  // 全选/取消全选联系人
  const handleSelectAllContacts = useCallback((checked: boolean) => {
    if (checked) {
      setSelectedContacts([...contacts]);
    } else {
      setSelectedContacts([]);
    }
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
      
      if (deviceContacts.length > 0) {
        groups.push({
          deviceId: deviceId,
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
          // 生成临时VCF文件
          const vcfContent = VcfImportService.convertContactsToVcfContent(group.contacts);
          const tempPath = VcfImportService.generateTempVcfPath();
          
          await VcfImportService.writeVcfFile(tempPath, vcfContent);
          
          // 执行导入
          const result = await VcfImportService.importVcfFile(tempPath, group.deviceId);
          results.push(result);

          // 更新设备导入结果
          setDeviceGroups(prev => prev.map(g => 
            g.deviceId === group.deviceId 
              ? { ...g, status: result.success ? 'completed' : 'failed', result }
              : g
          ));

          // 清理临时文件
          await VcfImportService.deleteTempFile(tempPath);

          message.success(`设备 ${group.deviceName} 导入完成`);

        } catch (error) {
          console.error(`设备 ${group.deviceName} 导入失败:`, error);
          
          const failedResult: VcfImportResult = {
            success: false,
            totalContacts: group.contacts.length,
            importedContacts: 0,
            failedContacts: group.contacts.length,
            message: `导入失败: ${error instanceof Error ? error.message : String(error)}`
          };

          results.push(failedResult);
          
          // 更新设备状态为失败
          setDeviceGroups(prev => prev.map(g => 
            g.deviceId === group.deviceId 
              ? { ...g, status: 'failed', result: failedResult }
              : g
          ));

          message.error(`设备 ${group.deviceName} 导入失败`);
        }

        // 更新进度
        setImportProgress(Math.round(((i + 1) / totalGroups) * 100));
      }

      message.success('所有设备导入任务完成！');
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
          <Space>
            <Text>设备选择:</Text>
            <Select
              mode="multiple"
              style={{ width: 300 }}
              placeholder="选择目标设备"
              value={selectedDevices}
              onChange={setSelectedDevices}
              options={availableDevices
                .filter(device => device.status === 'connected')
                .map(device => ({
                  label: `${device.name} (${device.phone_name})`,
                  value: device.id.toString()
                }))}
            />
          </Space>
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
