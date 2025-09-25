import { Col, Row, Space } from "antd";
import {
  PageHeader,
  ControlPanel,
  StepEditModal,
  QuickAppSelectionModal,
  QualityCheckModal,
} from "./SmartScriptBuilderPage/components";
import StepListPanel from "./SmartScriptBuilderPage/components/StepListPanel";
import ScriptControlPanel from "./SmartScriptBuilderPage/components/ScriptControlPanel";
import { SmartNavigationModal } from "../components";
import { UniversalPageFinderModal } from "../components/universal-ui/UniversalPageFinderModal";
import { ContactWorkflowSelector } from "../modules/contact-automation";
import { useSmartScriptBuilder } from "./SmartScriptBuilderPage/hooks/useSmartScriptBuilder";

const SmartScriptBuilderPage: React.FC = () => {
  const {
    headerProps,
    stepListProps,
    scriptControlPanelProps,
    controlPanelProps,
    stepEditModalProps,
    quickAppModalProps,
    navigationModalProps,
    contactWorkflowProps,
    qualityModalProps,
    pageFinderProps,
  } = useSmartScriptBuilder();

  return (
    <div className="p-6 space-y-6">
      <PageHeader {...headerProps} />

      <Row gutter={16}>
        <Col span={16}>
          <StepListPanel {...stepListProps} />
        </Col>
        <Col span={8}>
          <Space direction="vertical" size="large" style={{ width: "100%" }}>
            <ScriptControlPanel {...scriptControlPanelProps} />
            <ControlPanel {...controlPanelProps} />
          </Space>
        </Col>
      </Row>

      <StepEditModal {...stepEditModalProps} />
      <QuickAppSelectionModal {...quickAppModalProps} />
      <SmartNavigationModal {...navigationModalProps} />
      <UniversalPageFinderModal {...pageFinderProps} />
      <ContactWorkflowSelector {...contactWorkflowProps} />
      <QualityCheckModal {...qualityModalProps} />
    </div>
  );
};

export default SmartScriptBuilderPage;
