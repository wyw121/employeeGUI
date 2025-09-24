import React from "react";
import {
  Modal,
  Form,
  Select,
  Input,
  InputNumber,
  Switch,
  Slider,
  Divider,
  Alert,
  Card,
  Space,
  Tag,
  Typography,
  Button,
} from "antd";
import { SettingOutlined, EyeOutlined } from "@ant-design/icons";
import { LaunchAppSmartComponent } from "../../../../components/smart/LaunchAppSmartComponent";
import { SMART_ACTION_CONFIGS } from "../../helpers/constants";
import { SmartActionType } from "../../../../types/smartComponents";
import type { LaunchAppComponentParams } from "../../../../types/smartComponents";
import type { SmartScriptStep } from "../../../../types/smartScript";

const { Option } = Select;
const { Text } = Typography;

export interface SmartStepEditorModalProps {
  visible: boolean;
  onOk: () => void;
  onCancel: () => void;
  form: any; // antd FormInstance<any>
  currentDeviceId?: string | null;
  editingStep: SmartScriptStep | null;
  onOpenSmartNavigation: () => void;
  onOpenPageAnalyzer: () => void;
}

// 渲染参数输入组件（内聚到本组件以减少页面体积）
const renderParameterInput = (
  param: any,
  value: any,
  onChange: (value: any) => void
) => {
  switch (param.type) {
    case "number":
      return (
        <InputNumber
          placeholder={`请输入${param.label}`}
          value={value}
          onChange={onChange}
          style={{ width: "100%" }}
        />
      );
    case "boolean":
      return (
        <Switch
          checked={value}
          onChange={onChange}
          checkedChildren="是"
          unCheckedChildren="否"
        />
      );
    case "select":
      return (
        <Select
          placeholder={`请选择${param.label}`}
          value={value}
          onChange={onChange}
          style={{ width: "100%" }}
        >
          {param.options?.map((option: string) => (
            <Option key={option} value={option}>
              {option}
            </Option>
          ))}
        </Select>
      );
    case "multiselect":
      return (
        <Select
          mode="multiple"
          placeholder={`请选择${param.label}`}
          value={value}
          onChange={onChange}
          style={{ width: "100%" }}
        >
          {param.options?.map((option: string) => (
            <Option key={option} value={option}>
              {option}
            </Option>
          ))}
        </Select>
      );
    case "slider":
      return (
        <Slider
          min={param.min}
          max={param.max}
          step={0.1}
          value={value}
          onChange={onChange}
          marks={{ [param.min]: param.min, [param.max]: param.max }}
        />
      );
    case "textarea":
      return (
        <Input.TextArea
          placeholder={`请输入${param.label}`}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          rows={3}
        />
      );
    default:
      return (
        <Input
          placeholder={`请输入${param.label}`}
          value={value}
          onChange={(e) => onChange(e.target.value)}
        />
      );
  }
};

export const SmartStepEditorModal: React.FC<SmartStepEditorModalProps> = ({
  visible,
  onOk,
  onCancel,
  form,
  currentDeviceId,
  editingStep,
  onOpenSmartNavigation,
  onOpenPageAnalyzer,
}) => {
  return (
    <Modal
      title={editingStep ? "编辑智能步骤" : "添加智能步骤"}
      open={visible}
      onOk={onOk}
      onCancel={onCancel}
      width={600}
      maskClosable={false}
      zIndex={1000}
    >
      <Form
        form={form}
        layout="vertical"
        initialValues={{
          step_type: SmartActionType.CONTACT_IMPORT_WORKFLOW,
          name: "通讯录导入",
          wait_after: 1000,
        }}
      >
        <Form.Item
          name="step_type"
          label="操作类型"
          rules={[{ required: true, message: "请选择操作类型" }]}
        >
          <Select placeholder="请选择智能操作类型">
            {Object.entries(SMART_ACTION_CONFIGS).map(([key, config]) => (
              <Option key={key} value={key}>
                <Space>
                  <span>{config.icon}</span>
                  <span>{config.name}</span>
                  <Tag color={config.color}>{config.category}</Tag>
                </Space>
              </Option>
            ))}
          </Select>
        </Form.Item>

        <Form.Item label="步骤名称 (可选)" name="name" help="默认为对应操作类型名称">
          <Input placeholder="步骤名称将自动设置为操作类型名称" />
        </Form.Item>
        <Form.Item label="步骤描述" name="description">
          <Input placeholder="请输入步骤描述" />
        </Form.Item>

        <Form.Item dependencies={["step_type"]} noStyle>
          {({ getFieldValue }) => {
            const stepType = getFieldValue("step_type");
            const config = (SMART_ACTION_CONFIGS as any)[stepType];
            if (!config) return null;

            if (stepType === SmartActionType.LAUNCH_APP) {
              return (
                <div>
                  <Divider orientation="left">智能应用启动配置</Divider>
                  <Alert
                    message="使用智能应用启动组件，提供完整的应用选择和启动功能"
                    type="info"
                    showIcon
                    style={{ marginBottom: 16 }}
                  />
                  <LaunchAppSmartComponent
                    deviceId={currentDeviceId || undefined}
                    value={
                      (editingStep?.parameters as LaunchAppComponentParams) ||
                      undefined
                    }
                    onChange={(params) => {
                      form.setFieldsValue(params);
                    }}
                    onExecute={async () => true}
                  />
                </div>
              );
            }

            if (stepType === SmartActionType.SMART_NAVIGATION) {
              return (
                <div>
                  <Divider orientation="left">智能导航配置</Divider>
                  <Alert
                    message="智能导航支持自动识别导航栏并点击指定按钮，适用于底部导航栏、顶部导航栏等场景"
                    type="info"
                    showIcon
                    style={{ marginBottom: 16 }}
                  />
                  <Card className="text-center" style={{ marginBottom: 16 }}>
                    <Button
                      type="primary"
                      size="large"
                      icon={<SettingOutlined />}
                      onClick={onOpenSmartNavigation}
                    >
                      打开智能导航配置器
                    </Button>
                    <br />
                    <Text type="secondary" style={{ marginTop: 8, display: "block" }}>
                      包含向导模式（推荐新手）和专业模式（支持自定义配置）
                    </Text>
                  </Card>
                </div>
              );
            }

            if (stepType === SmartActionType.SMART_FIND_ELEMENT) {
              return (
                <div>
                  <Divider orientation="left">智能元素查找配置</Divider>
                  <Alert
                    message="智能元素查找通过分析当前页面UI结构，自动识别可操作元素并支持智能去重和分类，提供精确的元素定位能力"
                    type="info"
                    showIcon
                    style={{ marginBottom: 16 }}
                  />
                  <Card className="text-center" style={{ marginBottom: 16 }}>
                    <Button
                      type="primary"
                      size="large"
                      icon={<EyeOutlined />}
                      onClick={onOpenPageAnalyzer}
                    >
                      打开智能页面分析器
                    </Button>
                    <br />
                    <Text type="secondary" style={{ marginTop: 8, display: "block" }}>
                      配置设备连接并分析页面，智能识别可操作元素
                    </Text>
                  </Card>
                </div>
              );
            }

            return (
              <div>
                <Divider orientation="left">参数配置</Divider>
                <Alert message={config.description} type="info" showIcon className="mb-4" />
                {config.parameters?.map((param: any) => (
                  <Form.Item
                    key={param.key}
                    name={param.key}
                    label={param.label}
                    rules={param.required ? [{ required: true, message: `请输入${param.label}` }] : []}
                    initialValue={param.default}
                  >
                    {renderParameterInput(param, undefined, () => {})}
                  </Form.Item>
                ))}
                {config.advanced && config.advanced.length > 0 && (
                  <Divider orientation="left">高级配置</Divider>
                )}
                {config.advanced?.map((param: any) => (
                  <Form.Item key={param.key} name={param.key} label={param.label} initialValue={param.default}>
                    {renderParameterInput(param, undefined, () => {})}
                  </Form.Item>
                ))}
              </div>
            );
          }}
        </Form.Item>

        {/* 隐藏字段（保持与原有一致，便于外部回填）*/}
        {[
          "text",
          "element_text",
          "element_type",
          "resource_id",
          "content_desc",
          "bounds",
          "smartDescription",
          "smartAnalysis",
          "class_name",
          "clickable",
          "parent",
          "siblings",
          "xpath",
          "xmlCacheId",
          "xmlContent",
          "xmlTimestamp",
          "deviceId",
          "deviceName",
          "elementSummary",
          "xmlSnapshot",
        ].map((name) => (
          <Form.Item name={name} hidden key={name}>
            <Input />
          </Form.Item>
        ))}
      </Form>
    </Modal>
  );
};

export default SmartStepEditorModal;
