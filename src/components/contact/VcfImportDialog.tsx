import {
    CheckCircleOutlined,
    CloudUploadOutlined,
    ExclamationCircleOutlined,
    LoadingOutlined,
    MobileOutlined,
    UserOutlined
} from '@ant-design/icons';
import {
    Alert,
    Button,
    Card,
    Col,
    Descriptions,
    message,
    Modal,
    Progress,
    Row,
    Select,
    Space,
    Steps,
    Typography
} from 'antd';
import React, { useCallback, useEffect, useState } from 'react';
import { VcfImportService } from '../../services/VcfImportService';
import { Contact, VcfImportResult } from '../../types';

const { Text } = Typography;
const { Step } = Steps;

interface VcfImportDialogProps {
  visible: boolean;
  contacts: Contact[];
  onClose: () => void;
  onImportComplete?: (result: VcfImportResult) => void;
}

export const VcfImportDialog: React.FC<VcfImportDialogProps> = ({
  visible,
  contacts,
  onClose,
  onImportComplete
}) => {
  const [currentStep, setCurrentStep] = useState(0);
  const [loading, setLoading] = useState(false);
  const [devices, setDevices] = useState<string[]>([]);
  const [selectedDevice, setSelectedDevice] = useState<string>('');
  const [toolAvailable, setToolAvailable] = useState<boolean | null>(null);
  const [importResult, setImportResult] = useState<VcfImportResult | null>(null);
  const [vcfFilePath, setVcfFilePath] = useState<string>('');

  // 初始化检查
  useEffect(() => {
    if (visible) {
      initializeDialog();
    }
  }, [visible]);

  const initializeDialog = useCallback(async () => {
    setLoading(true);
    try {
      // 检查工具是否可用
      const available = await VcfImportService.checkToolAvailable();
      setToolAvailable(available);

      if (available) {
        // 获取设备列表
        const deviceList = await VcfImportService.getAdbDevices();
        setDevices(deviceList);
        if (deviceList.length > 0) {
          setSelectedDevice(deviceList[0]);
        }
      }
    } catch (error) {
      console.error('初始化失败:', error);
      message.error('初始化失败，请检查工具配置');
    } finally {
      setLoading(false);
    }
  }, []);

  // 准备VCF文件
  const prepareVcfFile = useCallback(async () => {
    if (contacts.length === 0) {
      message.error('没有可导入的联系人数据');
      return;
    }

    setLoading(true);
    try {
      // 生成临时VCF文件路径
      const tempPath = VcfImportService.generateTempVcfPath();
      
      // 转换联系人数据为VCF格式
      const vcfContent = VcfImportService.convertContactsToVcfContent(contacts);
      
      // 写入文件
      await VcfImportService.writeVcfFile(tempPath, vcfContent);
      
      setVcfFilePath(tempPath);
      setCurrentStep(1);
      message.success(`VCF文件准备完成，包含 ${contacts.length} 个联系人`);
      
    } catch (error) {
      console.error('VCF文件准备失败:', error);
      message.error(`VCF文件准备失败: ${error instanceof Error ? error.message : String(error)}`);
    } finally {
      setLoading(false);
    }
  }, [contacts]);

  // 执行导入
  const executeImport = useCallback(async () => {
    if (!selectedDevice) {
      message.error('请选择目标设备');
      return;
    }

    if (!vcfFilePath) {
      message.error('VCF文件尚未准备，请先准备文件');
      return;
    }

    setLoading(true);
    try {
      const result = await VcfImportService.importVcfFile(vcfFilePath, selectedDevice);
      
      setImportResult(result);
      setCurrentStep(2);
      
      if (result.success) {
        message.success('VCF导入成功完成！');
      } else {
        message.error(`VCF导入失败: ${result.message}`);
      }
      
      onImportComplete?.(result);
      
    } catch (error) {
      console.error('导入执行失败:', error);
      message.error(`导入执行失败: ${error instanceof Error ? error.message : String(error)}`);
    } finally {
      setLoading(false);
    }
  }, [selectedDevice, vcfFilePath, onImportComplete]);

  // 清理临时文件并关闭
  const handleClose = useCallback(async () => {
    if (vcfFilePath) {
      try {
        await VcfImportService.deleteTempFile(vcfFilePath);
      } catch (error) {
        console.warn('清理临时文件失败:', error);
      }
    }
    
    // 重置状态
    setCurrentStep(0);
    setImportResult(null);
    setVcfFilePath('');
    onClose();
  }, [vcfFilePath, onClose]);

  // 获取步骤内容
  const getStepContent = () => {
    switch (currentStep) {
      case 0:
        return (
          <div>
            <Card className="mb-4">
              <Descriptions column={1} bordered size="small">
                <Descriptions.Item label="联系人数量">
                  <Text strong>{contacts.length}</Text> 个
                </Descriptions.Item>
                <Descriptions.Item label="目标设备">
                  <Select
                    style={{ width: 200 }}
                    placeholder="选择设备"
                    value={selectedDevice}
                    onChange={setSelectedDevice}
                    options={devices.map(device => ({
                      label: device,
                      value: device
                    }))}
                  />
                </Descriptions.Item>
                <Descriptions.Item label="工具状态">
                  {(() => {
                    if (toolAvailable === null) {
                      return (
                        <Space>
                          <LoadingOutlined />
                          <Text>检查中...</Text>
                        </Space>
                      );
                    }
                    if (toolAvailable) {
                      return (
                        <Space>
                          <CheckCircleOutlined style={{ color: '#52c41a' }} />
                          <Text type="success">可用</Text>
                        </Space>
                      );
                    }
                    return (
                      <Space>
                        <ExclamationCircleOutlined style={{ color: '#ff4d4f' }} />
                        <Text type="danger">不可用</Text>
                      </Space>
                    );
                  })()}
                </Descriptions.Item>
              </Descriptions>
            </Card>

            {!toolAvailable && toolAvailable !== null && (
              <Alert
                type="error"
                message="VCF导入工具不可用"
                description="请确保 Flow_Farm 项目中的 adb_xml_reader.exe 已正确编译并位于指定路径。"
                showIcon
                className="mb-4"
              />
            )}

            <Button
              type="primary"
              size="large"
              block
              disabled={!toolAvailable || !selectedDevice || contacts.length === 0}
              loading={loading}
              onClick={prepareVcfFile}
            >
              准备VCF文件
            </Button>
          </div>
        );

      case 1:
        return (
          <div>
            <Card className="mb-4">
              <Descriptions column={1} bordered size="small">
                <Descriptions.Item label="VCF文件">
                  <Text code>{vcfFilePath}</Text>
                </Descriptions.Item>
                <Descriptions.Item label="联系人数量">
                  <Text strong>{contacts.length}</Text> 个
                </Descriptions.Item>
                <Descriptions.Item label="目标设备">
                  <Text>{selectedDevice}</Text>
                </Descriptions.Item>
              </Descriptions>
            </Card>

            <Alert
              type="info"
              message="准备执行导入"
              description="VCF文件已准备完成，点击下面按钮开始导入到设备通讯录。"
              showIcon
              className="mb-4"
            />

            <Button
              type="primary"
              size="large"
              block
              loading={loading}
              onClick={executeImport}
            >
              开始导入
            </Button>
          </div>
        );

      case 2:
        return (
          <div>
            {importResult && (
              <Card className="mb-4">
                <Row gutter={16}>
                  <Col span={12}>
                    <Descriptions column={1} bordered size="small">
                      <Descriptions.Item label="导入状态">
                        {importResult.success ? (
                          <Space>
                            <CheckCircleOutlined style={{ color: '#52c41a' }} />
                            <Text type="success">成功</Text>
                          </Space>
                        ) : (
                          <Space>
                            <ExclamationCircleOutlined style={{ color: '#ff4d4f' }} />
                            <Text type="danger">失败</Text>
                          </Space>
                        )}
                      </Descriptions.Item>
                      <Descriptions.Item label="总联系人">
                        {importResult.totalContacts}
                      </Descriptions.Item>
                      <Descriptions.Item label="成功导入">
                        {importResult.importedContacts}
                      </Descriptions.Item>
                      <Descriptions.Item label="失败数量">
                        {importResult.failedContacts}
                      </Descriptions.Item>
                    </Descriptions>
                  </Col>
                  <Col span={12}>
                    <div className="text-center">
                      <Progress
                        type="circle"
                        percent={importResult.totalContacts > 0 ? 
                          Math.round((importResult.importedContacts / importResult.totalContacts) * 100) : 0}
                        status={importResult.success ? 'success' : 'exception'}
                        size={120}
                      />
                      <div className="mt-2">
                        <Text>成功率</Text>
                      </div>
                    </div>
                  </Col>
                </Row>

                {importResult.message && (
                  <Alert
                    type={importResult.success ? 'success' : 'error'}
                    message={importResult.message}
                    description={importResult.details}
                    showIcon
                    className="mt-4"
                  />
                )}
              </Card>
            )}

            <Button
              type="primary"
              size="large"
              block
              onClick={handleClose}
            >
              完成
            </Button>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <Modal
      title={
        <Space>
          <MobileOutlined />
          VCF通讯录导入
        </Space>
      }
      open={visible}
      onCancel={handleClose}
      footer={null}
      width={800}
      destroyOnClose
    >
      <div className="p-4">
        <Steps current={currentStep} className="mb-6">
          <Step
            title="准备导入"
            description="检查工具和设备"
            icon={<CloudUploadOutlined />}
          />
          <Step
            title="生成文件"
            description="创建VCF文件"
            icon={<UserOutlined />}
          />
          <Step
            title="执行导入"
            description="导入到设备"
            icon={<MobileOutlined />}
          />
        </Steps>

        {getStepContent()}
      </div>
    </Modal>
  );
};

