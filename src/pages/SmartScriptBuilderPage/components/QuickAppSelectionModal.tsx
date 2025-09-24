import React from "react";
import { Modal, Alert, message } from "antd";
import { LaunchAppSmartComponent } from "../../../components/smart/LaunchAppSmartComponent";
import type { SmartScriptStep } from "../../../types/smartScript";
import { SmartActionType } from "../../../types/smartComponents";

interface QuickAppSelectionModalProps {
  open: boolean;
  currentDeviceId?: string;
  steps: any[];
  onCancel: () => void;
  onStepAdded: (step: SmartScriptStep) => void;
}

const QuickAppSelectionModal: React.FC<QuickAppSelectionModalProps> = ({
  open,
  currentDeviceId,
  steps,
  onCancel,
  onStepAdded,
}) => {
  return (
    <Modal
      title="快速添加应用启动步骤"
      open={open}
      onCancel={onCancel}
      footer={null}
      width={900}
    >
      <Alert
        message="快速创建应用启动步骤"
        description="选择一个应用并配置启动参数，将自动创建一个智能应用启动步骤"
        type="info"
        showIcon
        style={{ marginBottom: 16 }}
      />

      <LaunchAppSmartComponent
        deviceId={currentDeviceId}
        onChange={(params) => {
          // 临时存储参数，等待用户确认添加
        }}
        onExecute={async (params) => {
          // 创建新的智能步骤
          if (params.selected_app) {
            const newStep: SmartScriptStep = {
              id: `step_${Date.now()}`,
              step_type: SmartActionType.LAUNCH_APP,
              name: `启动${params.selected_app.app_name}`,
              description: `智能启动应用: ${params.selected_app.app_name}`,
              parameters: params,
              enabled: true,
              order: steps.length,
            };

            onStepAdded(newStep);
            onCancel();
            message.success(
              `已添加应用启动步骤: ${params.selected_app.app_name}`
            );
            return true;
          }
          return false;
        }}
      />
    </Modal>
  );
};

export default QuickAppSelectionModal;