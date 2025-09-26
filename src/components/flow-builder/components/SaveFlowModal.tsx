import React from 'react';
import { Modal, Input, Typography } from 'antd';
import { UseFlowBuilderReturn } from '../hooks/useFlowBuilder';

const { Text } = Typography;

interface SaveFlowModalProps {
  flow: UseFlowBuilderReturn;
}

export const SaveFlowModal: React.FC<SaveFlowModalProps> = ({ flow }) => {
  const { showSaveModal, setShowSaveModal, confirmSave, flowName, setFlowName, currentFlow, selectedTemplate } = flow;
  return (
    <Modal
      title="保存流程"
      open={showSaveModal}
      onOk={confirmSave}
      onCancel={() => setShowSaveModal(false)}
      okText="保存"
      cancelText="取消"
    >
      <div style={{ marginBottom: 16 }}>
        <Text>流程名称：</Text>
        <Input
          value={flowName}
          onChange={(e) => setFlowName(e.target.value)}
          placeholder="请输入流程名称"
          style={{ marginTop: 8 }}
        />
      </div>
      <div>
        <Text type="secondary">
          当前流程包含 {currentFlow.length} 个步骤，使用 {selectedTemplate?.name} 模板
        </Text>
      </div>
    </Modal>
  );
};
