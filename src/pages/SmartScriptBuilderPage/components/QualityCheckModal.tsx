import React from "react";
import { Modal } from "antd";
import { DistributedScriptQualityPanel } from "../../../modules/distributed-script-quality/DistributedScriptQualityPanel";
import type { ExtendedSmartScriptStep } from "../../../types/loopScript";

interface QualityCheckModalProps {
  open: boolean;
  steps: ExtendedSmartScriptStep[];
  currentDeviceId?: string;
  onCancel: () => void;
  onScriptUpdate: (updatedScript: any) => void;
  onValidationChange: (isValid: boolean) => void;
}

const QualityCheckModal: React.FC<QualityCheckModalProps> = ({
  open,
  steps,
  currentDeviceId,
  onCancel,
  onScriptUpdate,
  onValidationChange,
}) => {
  return (
    <Modal
      title="分布式脚本质量检查"
      open={open}
      onCancel={onCancel}
      footer={null}
      width={900}
      destroyOnClose
    >
      <DistributedScriptQualityPanel
        script={{
          name: "智能脚本",
          version: "1.0.0",
          steps: steps,
          metadata: {
            platform: "Android",
            createdAt: Date.now(),
            deviceId: currentDeviceId,
          },
        }}
        onScriptUpdate={onScriptUpdate}
        onValidationChange={onValidationChange}
      />
    </Modal>
  );
};

export default QualityCheckModal;