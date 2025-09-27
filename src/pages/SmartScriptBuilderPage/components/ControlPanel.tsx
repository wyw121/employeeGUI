import React from "react";
import {
  Card,
  Button,
  Space,
  Collapse,
  message,
  Select,
  Divider,
} from "antd";
import {
  ThunderboltOutlined,
  BulbOutlined,
  RobotOutlined,
  CheckCircleOutlined,
  WarningOutlined,
  SaveOutlined,
  UploadOutlined,
  DownloadOutlined,
  EyeOutlined,
} from "@ant-design/icons";
import type { ExtendedSmartScriptStep } from "../../../types/loopScript";

// rc-collapse/antd 警告：children Panel 将在下个大版本移除，改为使用 items API

interface ControlPanelProps {
  steps: ExtendedSmartScriptStep[];
  isExecuting: boolean;
  isScriptValid: boolean;
  onExecuteScript: () => void;
  onSaveScript: () => void;
  onLoadScript: () => void;
  onExportScript: () => void;
  onShowQualityPanel: () => void;
  onTestElementMapping?: () => void;
  onTestSmartStepGenerator?: () => void;
  // 皮肤设置
  loopTheme?: string | null;
  nonLoopTheme?: string | null;
  onApplyLoopTheme?: (theme: string | null) => void;
  onApplyNonLoopTheme?: (theme: string | null) => void;
}

const ControlPanel: React.FC<ControlPanelProps> = ({
  steps,
  isExecuting,
  isScriptValid,
  onExecuteScript,
  onSaveScript,
  onLoadScript,
  onExportScript,
  onShowQualityPanel,
  onTestElementMapping,
  onTestSmartStepGenerator,
  loopTheme,
  nonLoopTheme,
  onApplyLoopTheme,
  onApplyNonLoopTheme,
}) => {
  return (
    <Space direction="vertical" size="middle" className="w-full">
      {/* 脚本控制 */}
      <Card title="🎮 智能脚本控制">
        <Space direction="vertical" className="w-full">
          <Button
            type="primary"
            block
            size="large"
            icon={<ThunderboltOutlined />}
            loading={isExecuting}
            disabled={steps.length === 0}
            onClick={onExecuteScript}
          >
            {isExecuting ? "智能执行中..." : "执行智能脚本"}
          </Button>
          
          <div className="grid grid-cols-2 gap-2">
            <Button
              size="small"
              icon={<SaveOutlined />}
              onClick={onSaveScript}
            >
              保存脚本
            </Button>
            <Button
              size="small"
              icon={<UploadOutlined />}
              onClick={onLoadScript}
            >
              加载脚本
            </Button>
          </div>
          
          <Button
            type="dashed"
            block
            size="small"
            icon={<DownloadOutlined />}
            onClick={onExportScript}
            disabled={steps.length === 0}
          >
            导出脚本
          </Button>
        </Space>
      </Card>

      {/* 功能特性 */}
      <Card
        title={
          <span>
            <EyeOutlined className="mr-1" />
            功能特性
          </span>
        }
        size="small"
      >
        <div className="space-y-2 text-xs">
          <div className="flex items-center space-x-2">
            <CheckCircleOutlined className="text-green-500" />
            <span>智能页面识别</span>
          </div>
          <div className="flex items-center space-x-2">
            <CheckCircleOutlined className="text-green-500" />
            <span>自适应元素定位</span>
          </div>
          <div className="flex items-center space-x-2">
            <CheckCircleOutlined className="text-green-500" />
            <span>操作结果验证</span>
          </div>
          <div className="flex items-center space-x-2">
            <CheckCircleOutlined className="text-green-500" />
            <span>智能重试和恢复</span>
          </div>
          <div className="flex items-center space-x-2">
            <CheckCircleOutlined className="text-green-500" />
            <span>复杂工作流程支持</span>
          </div>
        </div>
      </Card>

      {/* 外观换肤 */}
      <Card title="🎨 外观换肤" size="small">
        <Space direction="vertical" className="w-full">
          <div className="text-xs text-gray-500">循环体皮肤</div>
          <Select
            size="small"
            value={loopTheme ?? ''}
            placeholder="默认皮肤"
            onChange={(v) => onApplyLoopTheme?.(v || null)}
            options={[
              { label: '默认', value: '' },
              { label: '玫瑰（rose）', value: 'rose' },
              { label: '晴空（sky）', value: 'sky' },
            ]}
          />
          <Divider style={{ margin: '8px 0' }} />
          <div className="text-xs text-gray-500">非循环步骤皮肤</div>
          <Select
            size="small"
            value={nonLoopTheme ?? ''}
            placeholder="默认皮肤"
            onChange={(v) => onApplyNonLoopTheme?.(v || null)}
            options={[
              { label: '默认', value: '' },
              { label: '玫瑰（rose）', value: 'rose' },
              { label: '晴空（sky）', value: 'sky' },
            ]}
          />
        </Space>
      </Card>

      {/* 操作类型说明 */}
      <Card title="🏷️ 操作类型分类">
        <Collapse
          size="small"
          items={[
            {
              key: 'basic',
              label: '基础操作',
              children: (
                <div className="text-xs space-y-1">
                  <div>• 基础点击 - 固定坐标点击</div>
                  <div>• 滑动操作 - 屏幕滑动</div>
                  <div>• 文本输入 - 键盘输入</div>
                  <div>• 等待操作 - 时间延迟</div>
                </div>
              ),
            },
            {
              key: 'smart',
              label: '智能操作',
              children: (
                <div className="text-xs space-y-1">
                  <div>• 智能点击 - AI识别元素</div>
                  <div>• 智能查找 - 动态元素定位</div>
                  <div>• 页面识别 - 状态智能判断</div>
                  <div>• 智能导航 - 复杂路径规划</div>
                </div>
              ),
            },
            {
              key: 'verification',
              label: '验证操作',
              children: (
                <div className="text-xs space-y-1">
                  <div>• 操作验证 - 结果确认</div>
                  <div>• 状态等待 - 页面切换等待</div>
                  <div>• 数据提取 - 信息采集</div>
                </div>
              ),
            },
          ]}
        />
      </Card>

      {/* 调试和测试区域 */}
      <Card title="🧪 调试测试">
        <Space direction="vertical" className="w-full">
          <Button
            size="small"
            type="default"
            block
            icon={<BulbOutlined />}
            onClick={() => {
              console.log("🧪 运行元素名称映射测试...");
              onTestElementMapping?.();
              message.info("元素名称映射测试功能暂时禁用");
            }}
          >
            测试元素名称映射
          </Button>
          <Button
            size="small"
            type="default"
            block
            icon={<RobotOutlined />}
            onClick={() => {
              console.log("🧪 运行智能步骤生成器测试...");
              onTestSmartStepGenerator?.();
            }}
          >
            测试智能步骤生成
          </Button>

          {/* 分布式脚本质量检查按钮 */}
          <Button
            size="small"
            type={isScriptValid ? "default" : "primary"}
            danger={!isScriptValid}
            block
            icon={
              isScriptValid ? (
                <CheckCircleOutlined />
              ) : (
                <WarningOutlined />
              )
            }
            onClick={onShowQualityPanel}
            disabled={steps.length === 0}
          >
            {isScriptValid ? "质量检查通过" : "需要质量修复"} (
            {steps.length} 步骤)
          </Button>
        </Space>
      </Card>
    </Space>
  );
};

export default ControlPanel;