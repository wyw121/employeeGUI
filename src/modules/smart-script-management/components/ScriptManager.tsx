// 智能脚本管理模块 - 脚本管理器组件

import React, { useState } from 'react';
import {
  Card,
  Button,
  Space,
  Table,
  Modal,
  Form,
  Input,
  Select,
  Tag,
  Tooltip,
  Popconfirm,
  message,
  Row,
  Col,
  Typography,
  Divider
} from 'antd';
import {
  PlusOutlined,
  EditOutlined,
  CopyOutlined,
  DeleteOutlined,
  PlayCircleOutlined,
  ExportOutlined,
  ImportOutlined,
  FileTextOutlined,
  ClockCircleOutlined,
  CheckCircleOutlined
} from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import { useScriptManager, useScriptEditor, useScriptExecutor } from '../hooks/useScriptManager';
import { ScriptListItem, SmartScript } from '../types';

const { Title, Text } = Typography;
const { Option } = Select;

interface ScriptManagerProps {
  onEditScript?: (script: SmartScript) => void;
  onExecuteScript?: (scriptId: string) => void;
  selectedDeviceId?: string;
}

/**
 * 脚本管理器组件
 */
export const ScriptManager: React.FC<ScriptManagerProps> = ({
  onEditScript,
  onExecuteScript,
  selectedDeviceId
}) => {
  const { scripts, loading, loadScriptList, deleteScript, duplicateScript } = useScriptManager();
  const { loadScript } = useScriptEditor();
  const { executeScript, executing } = useScriptExecutor();

  const [selectedRowKeys, setSelectedRowKeys] = useState<string[]>([]);
  const [filterCategory, setFilterCategory] = useState<string>('all');
  const [searchText, setSearchText] = useState('');
  const [renameModalVisible, setRenameModalVisible] = useState(false);
  const [renamingScript, setRenamingScript] = useState<ScriptListItem | null>(null);
  
  const [renameForm] = Form.useForm();

  // 过滤脚本列表
  const filteredScripts = scripts.filter(script => {
    const matchesCategory = filterCategory === 'all' || script.category === filterCategory;
    const matchesSearch = !searchText || 
      script.name.toLowerCase().includes(searchText.toLowerCase()) ||
      script.description.toLowerCase().includes(searchText.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  // 获取所有分类
  const categories = Array.from(new Set(scripts.map(s => s.category)));

  // 处理编辑脚本
  const handleEdit = async (script: ScriptListItem) => {
    try {
      const fullScript = await loadScript(script.id);
      if (onEditScript) {
        onEditScript(fullScript);
      }
    } catch (error) {
      // 错误已在Hook中处理
    }
  };

  // 处理执行脚本
  const handleExecute = async (scriptId: string) => {
    if (!selectedDeviceId) {
      message.warning('请先选择执行设备');
      return;
    }

    if (onExecuteScript) {
      onExecuteScript(scriptId);
    } else {
      try {
        await executeScript(scriptId, selectedDeviceId);
      } catch (error) {
        // 错误已在Hook中处理
      }
    }
  };

  // 处理复制脚本
  const handleDuplicate = async (script: ScriptListItem) => {
    try {
      await duplicateScript(script.id, `${script.name} (副本)`);
    } catch (error) {
      // 错误已在Hook中处理
    }
  };

  // 处理删除脚本
  const handleDelete = async (scriptId: string) => {
    try {
      await deleteScript(scriptId);
    } catch (error) {
      // 错误已在Hook中处理
    }
  };

  // 处理重命名
  const handleRename = (script: ScriptListItem) => {
    setRenamingScript(script);
    renameForm.setFieldsValue({
      name: script.name,
      description: script.description,
      category: script.category,
      tags: script.tags
    });
    setRenameModalVisible(true);
  };

  // 提交重命名
  const handleRenameSubmit = async () => {
    if (!renamingScript) return;

    try {
      const values = await renameForm.validateFields();
      // TODO: 实现更新脚本元数据的API调用
      message.success('脚本信息更新成功');
      setRenameModalVisible(false);
      await loadScriptList();
    } catch (error) {
      console.error('更新脚本信息失败:', error);
    }
  };

  // 批量删除
  const handleBatchDelete = async () => {
    try {
      await Promise.all(selectedRowKeys.map(id => deleteScript(id)));
      setSelectedRowKeys([]);
      message.success('批量删除成功');
    } catch (error) {
      message.error('批量删除失败');
    }
  };

  // 表格列定义
  const columns: ColumnsType<ScriptListItem> = [
    {
      title: '脚本名称',
      dataIndex: 'name',
      key: 'name',
      ellipsis: true,
      render: (text, record) => (
        <Space direction="vertical" size={0}>
          <Text strong>{text}</Text>
          <Text type="secondary" style={{ fontSize: '12px' }}>
            {record.description}
          </Text>
        </Space>
      )
    },
    {
      title: '分类',
      dataIndex: 'category',
      key: 'category',
      width: 100,
      render: (category) => (
        <Tag color="blue">{category}</Tag>
      )
    },
    {
      title: '标签',
      dataIndex: 'tags',
      key: 'tags',
      width: 120,
      render: (tags: string[]) => (
        <Space wrap>
          {tags.slice(0, 2).map(tag => (
            <Tag key={tag}>{tag}</Tag>
          ))}
          {tags.length > 2 && <Text type="secondary">+{tags.length - 2}</Text>}
        </Space>
      )
    },
    {
      title: '步骤数',
      dataIndex: 'step_count',
      key: 'step_count',
      width: 80,
      align: 'center'
    },
    {
      title: '成功率',
      dataIndex: 'success_rate',
      key: 'success_rate',
      width: 100,
      render: (rate) => (
        <Space>
          <Text>{(rate * 100).toFixed(1)}%</Text>
          {rate > 0.8 ? (
            <CheckCircleOutlined style={{ color: '#52c41a' }} />
          ) : (
            <ClockCircleOutlined style={{ color: '#faad14' }} />
          )}
        </Space>
      )
    },
    {
      title: '最后更新',
      dataIndex: 'updated_at',
      key: 'updated_at',
      width: 120,
      render: (date) => new Date(date).toLocaleDateString()
    },
    {
      title: '操作',
      key: 'action',
      width: 200,
      render: (_, record) => (
        <Space size="small">
          <Tooltip title="执行脚本">
            <Button
              type="primary"
              icon={<PlayCircleOutlined />}
              size="small"
              loading={executing}
              onClick={() => handleExecute(record.id)}
            />
          </Tooltip>
          <Tooltip title="编辑脚本">
            <Button
              icon={<EditOutlined />}
              size="small"
              onClick={() => handleEdit(record)}
            />
          </Tooltip>
          <Tooltip title="复制脚本">
            <Button
              icon={<CopyOutlined />}
              size="small"
              onClick={() => handleDuplicate(record)}
            />
          </Tooltip>
          <Tooltip title="重命名">
            <Button
              icon={<FileTextOutlined />}
              size="small"
              onClick={() => handleRename(record)}
            />
          </Tooltip>
          <Popconfirm
            title="确认删除"
            description="删除后无法恢复，确认删除这个脚本吗？"
            onConfirm={() => handleDelete(record.id)}
            okText="删除"
            cancelText="取消"
            okType="danger"
          >
            <Button
              danger
              icon={<DeleteOutlined />}
              size="small"
            />
          </Popconfirm>
        </Space>
      )
    }
  ];

  return (
    <Card>
      <Row gutter={[16, 16]}>
        {/* 标题和工具栏 */}
        <Col span={24}>
          <Space split={<Divider type="vertical" />} style={{ width: '100%', justifyContent: 'space-between' }}>
            <Space>
              <Title level={4} style={{ margin: 0 }}>脚本管理器</Title>
              <Text type="secondary">共 {scripts.length} 个脚本</Text>
            </Space>
            <Space>
              <Button icon={<ImportOutlined />}>导入</Button>
              <Button icon={<ExportOutlined />} disabled={selectedRowKeys.length === 0}>
                导出 ({selectedRowKeys.length})
              </Button>
              <Button 
                danger 
                disabled={selectedRowKeys.length === 0}
                onClick={handleBatchDelete}
              >
                批量删除 ({selectedRowKeys.length})
              </Button>
            </Space>
          </Space>
        </Col>

        {/* 搜索和筛选 */}
        <Col span={24}>
          <Space style={{ width: '100%' }}>
            <Input.Search
              placeholder="搜索脚本名称或描述..."
              style={{ width: 300 }}
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
              allowClear
            />
            <Select
              style={{ width: 150 }}
              value={filterCategory}
              onChange={setFilterCategory}
              placeholder="选择分类"
            >
              <Option value="all">所有分类</Option>
              {categories.map(category => (
                <Option key={category} value={category}>{category}</Option>
              ))}
            </Select>
            <Button onClick={loadScriptList}>刷新</Button>
          </Space>
        </Col>

        {/* 脚本列表 */}
        <Col span={24}>
          <Table
            columns={columns}
            dataSource={filteredScripts}
            rowKey="id"
            loading={loading}
            pagination={{
              total: filteredScripts.length,
              pageSize: 10,
              showSizeChanger: true,
              showQuickJumper: true,
              showTotal: (total, range) => `第 ${range[0]}-${range[1]} 条，共 ${total} 条`
            }}
            rowSelection={{
              selectedRowKeys,
              onChange: (keys) => setSelectedRowKeys(keys as string[])
            }}
            scroll={{ x: 1000 }}
          />
        </Col>
      </Row>

      {/* 重命名对话框 */}
      <Modal
        title="编辑脚本信息"
        open={renameModalVisible}
        onOk={handleRenameSubmit}
        onCancel={() => setRenameModalVisible(false)}
        width={600}
      >
        <Form
          form={renameForm}
          layout="vertical"
          preserve={false}
        >
          <Form.Item
            name="name"
            label="脚本名称"
            rules={[{ required: true, message: '请输入脚本名称' }]}
          >
            <Input placeholder="输入脚本名称" />
          </Form.Item>
          <Form.Item
            name="description"
            label="脚本描述"
          >
            <Input.TextArea placeholder="输入脚本描述" rows={3} />
          </Form.Item>
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                name="category"
                label="分类"
              >
                <Select placeholder="选择分类">
                  {categories.map(category => (
                    <Option key={category} value={category}>{category}</Option>
                  ))}
                </Select>
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                name="tags"
                label="标签"
              >
                <Select
                  mode="tags"
                  placeholder="添加标签"
                  tokenSeparators={[',', ' ']}
                />
              </Form.Item>
            </Col>
          </Row>
        </Form>
      </Modal>
    </Card>
  );
};

export default ScriptManager;