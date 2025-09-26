import React, { useState } from 'react';
import { Button, Card, Descriptions, Space, Typography, Alert, Divider, message } from 'antd';
import { FileTextOutlined, FolderOpenOutlined, DatabaseOutlined } from '@ant-design/icons';
import { selectTxtFile, selectFolder } from '../utils/dialog';
import { importNumbersFromFolder, importNumbersFromTxtFile, ImportNumbersResult } from '../services/contactNumberService';

const { Text, Paragraph } = Typography;

interface StepSourceSelectProps {
  onCompleted?: (result: ImportNumbersResult) => void;
}

export const StepSourceSelect: React.FC<StepSourceSelectProps> = ({ onCompleted }) => {
  const [selectedPath, setSelectedPath] = useState<string | null>(null);
  const [isFolder, setIsFolder] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(false);
  const [lastResult, setLastResult] = useState<ImportNumbersResult | null>(null);

  const handleChooseFile = async () => {
    const file = await selectTxtFile();
    if (file) {
      setSelectedPath(file);
      setIsFolder(false);
    }
  };

  const handleChooseFolder = async () => {
    const folder = await selectFolder();
    if (folder) {
      setSelectedPath(folder);
      setIsFolder(true);
    }
  };

  const handleImport = async () => {
    if (!selectedPath) {
      message.warning('请先选择TXT文件或文件夹');
      return;
    }
    setLoading(true);
    try {
      const result = isFolder
        ? await importNumbersFromFolder(selectedPath)
        : await importNumbersFromTxtFile(selectedPath);
      setLastResult(result);
      if (result.success) {
        message.success(`已写入 ${result.inserted} 条号码，重复 ${result.duplicates} 条`);
      } else {
        message.error('导入过程中出现错误');
      }
      onCompleted?.(result);
    } catch (e) {
      console.error(e);
      message.error(`导入失败: ${e}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card title="步骤0：选择数据源（TXT 文件或文件夹）">
      <Space direction="vertical" style={{ width: '100%' }} size="large">
        <Alert
          type="info"
          message="说明"
          description={
            <div>
              <Paragraph style={{ marginBottom: 0 }}>
                请选择一个 TXT 文件或一个包含多个 TXT 的文件夹，系统会提取其中的手机号码并写入本地数据库（data/contacts.db）。
              </Paragraph>
            </div>
          }
          showIcon
        />

        <Space wrap>
          <Button icon={<FileTextOutlined />} onClick={handleChooseFile}>
            选择TXT文件
          </Button>
          <Button icon={<FolderOpenOutlined />} onClick={handleChooseFolder}>
            选择文件夹
          </Button>
          <Button type="primary" icon={<DatabaseOutlined />} loading={loading} onClick={handleImport}>
            提取号码并写入数据库
          </Button>
        </Space>

        {selectedPath && (
          <Descriptions bordered size="small" column={1} style={{ marginTop: 8 }}>
            <Descriptions.Item label={isFolder ? '已选文件夹' : '已选文件'}>
              <Text code>{selectedPath}</Text>
            </Descriptions.Item>
          </Descriptions>
        )}

        {lastResult && (
          <>
            <Divider />
            <Card size="small" title="导入结果">
              <Descriptions column={2} size="small">
                <Descriptions.Item label="文件数">{lastResult.total_files}</Descriptions.Item>
                <Descriptions.Item label="提取号码">{lastResult.total_numbers}</Descriptions.Item>
                <Descriptions.Item label="成功写入">{lastResult.inserted}</Descriptions.Item>
                <Descriptions.Item label="重复跳过">{lastResult.duplicates}</Descriptions.Item>
              </Descriptions>
              {lastResult.errors && lastResult.errors.length > 0 && (
                <Alert type="warning" showIcon message={`发生 ${lastResult.errors.length} 个错误`} />
              )}
            </Card>
          </>
        )}
      </Space>
    </Card>
  );
};

export default StepSourceSelect;
