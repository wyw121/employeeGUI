import React from 'react';
import { Card, Space, Tag, Alert, Typography, Form, Input, Button, Tooltip } from 'antd';
import { EditOutlined, InfoCircleOutlined, SaveOutlined, ReloadOutlined, BulbOutlined } from '@ant-design/icons';
import { UIElement } from '../../../modules/ElementNameMapper';
import { colors, textStyles } from './uiTokens';

const { Text } = Typography;

interface BasicConfigTabProps {
  element: UIElement | null;
  form: any; // AntD FormInstance (避免循环依赖，这里用 any；可在未来通过类型提升)
  previewName: string;
  getCurrentDisplayName: () => string;
  existingMapping: any;
  onGenerateSuggestions?: () => void;
  suggestions?: string[];
  onApplySuggestion?: (name: string) => void;
  onSubmit?: () => void;
  isSubmitting?: boolean;
}

const BasicConfigTab: React.FC<BasicConfigTabProps> = ({
  element,
  form,
  previewName,
  getCurrentDisplayName,
  existingMapping,
  onGenerateSuggestions,
  suggestions = [],
  onApplySuggestion,
  onSubmit,
  isSubmitting
}) => {
  if (!element) {
    return <Alert message="未选择元素" type="info" showIcon />;
  }

  return (
    <div className="p-4 space-y-4">
      {/* 调试信息 (开发环境) */}
      {process.env.NODE_ENV === 'development' && (
        <Card
          size="small"
          title="🔧 调试信息"
          style={{ background: '#fff7e6', border: '1px solid #faad14' }}
        >
          <Text style={{ fontSize: 11, color: '#666' }}>
            表单值: {form.getFieldValue('displayName') || '(空)'} | 预览名称: {previewName} | 当前显示: {getCurrentDisplayName()}
          </Text>
        </Card>
      )}

      <Card
        size="small"
        title={
          <Space>
            <EditOutlined />
            显示名称配置
            <Tag color="blue">基础</Tag>
          </Space>
        }
        style={{ background: colors.surface, border: `1px solid ${colors.border}` }}
        headStyle={{ background: colors.surfaceAlt, borderBottom: `1px solid ${colors.border}`, color: '#fff' }}
        bodyStyle={{ background: colors.surface }}
      >
        <Alert
          message={<Text style={{ color: '#fff' }}><strong>🧩 元素基本信息</strong></Text>}
          description={
            <div style={{ color: textStyles.subtle.color, fontSize: 12 }}>
              <Text style={{ color: textStyles.subtle.color }}>
                为当前界面元素配置一个用户友好的显示名称。该名称不会影响后台匹配逻辑，仅用于脚本编排和可读性。
              </Text>
            </div>
          }
          type="info"
          showIcon
          style={{ marginBottom: 12, background: colors.accentInfoBg, border: `1px solid ${colors.accentBlue}` }}
        />

        <Form form={form} layout="vertical" onFinish={onSubmit}>
          <Form.Item
            label={<span style={{ color: '#fff' }}>显示名称 <Tooltip title="供用户识别元素用途，不影响匹配"><InfoCircleOutlined style={{ marginLeft: 4 }} /></Tooltip></span>}
            name="displayName"
            rules={[{ required: true, message: '请输入显示名称' }]}
          >
            <Input
              placeholder="例如：发布按钮 / 用户头像 / 评论输入框"
              style={{ background: colors.surfaceAlt, border: `1px solid ${colors.border}`, color: '#fff' }}
            />
          </Form.Item>

          <div style={{ marginBottom: 12 }}>
            <Text style={{ color: textStyles.subtle.color, fontSize: 12 }}>
              当前显示名称 (实时): <strong style={{ color: '#fff' }}>{getCurrentDisplayName()}</strong>
            </Text>
            {existingMapping && (
              <div>
                <Tag color="green" style={{ marginTop: 4 }}>已存在映射</Tag>
              </div>
            )}
          </div>

          <Space wrap>
            <Button type="primary" htmlType="submit" icon={<SaveOutlined />} loading={isSubmitting}>
              保存映射
            </Button>
            <Button icon={<ReloadOutlined />} onClick={() => form.resetFields()}>
              重置
            </Button>
            {onGenerateSuggestions && (
              <Button icon={<BulbOutlined />} onClick={onGenerateSuggestions}>
                生成智能建议
              </Button>
            )}
          </Space>
        </Form>
      </Card>

      {suggestions.length > 0 && (
        <Card
          size="small"
          title={<Space><BulbOutlined /> 智能命名建议 <Tag color="purple">AI</Tag></Space>}
          style={{ background: colors.surface, border: `1px solid ${colors.border}` }}
          headStyle={{ background: colors.surfaceAlt, borderBottom: `1px solid ${colors.border}`, color: '#fff' }}
          bodyStyle={{ background: colors.surface }}
        >
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            {suggestions.map(s => (
              <Tag key={s} color="geekblue" style={{ cursor: 'pointer' }} onClick={() => onApplySuggestion?.(s)}>
                {s}
              </Tag>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
};

export default BasicConfigTab;
