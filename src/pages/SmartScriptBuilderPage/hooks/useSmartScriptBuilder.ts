import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type Dispatch,
  type SetStateAction,
} from "react";
import { Form } from "antd";
import { useAdb } from "../../../application/hooks/useAdb";
import { DeviceStatus } from "../../../domain/adb/entities/Device";
import { createHandleExecuteScript, buildDistributedSteps } from "../helpers";
import { DistributedStepLookupService } from "../../../application/services/DistributedStepLookupService";
import { usePageFinder } from "./usePageFinder";
import { useScriptPersistence } from "./useScriptPersistence";
import { useWorkflowIntegrations } from "./useWorkflowIntegrations";
import { useStepForm } from "./useStepForm";
import type { ExtendedSmartScriptStep as LoopScriptStep, LoopConfig } from "../../../types/loopScript";
import type { ExecutorConfig, SmartExecutionResult } from "../../../types/execution";

const DEFAULT_EXECUTOR_CONFIG: ExecutorConfig = {
  default_timeout_ms: 10000,
  default_retry_count: 3,
  page_recognition_enabled: true,
  auto_verification_enabled: true,
  smart_recovery_enabled: true,
  detailed_logging: true,
};

export function useSmartScriptBuilder() {
  const { devices, refreshDevices } = useAdb();
  const [form] = Form.useForm();

  const [steps, setSteps] = useState<LoopScriptStep[]>([]);
  const [loopConfigs, setLoopConfigs] = useState<LoopConfig[]>([]);
  const [currentDeviceId, setCurrentDeviceId] = useState<string>("");

  const [executionResult, setExecutionResult] = useState<SmartExecutionResult | null>(null);
  const [isExecuting, setIsExecuting] = useState(false);
  const [executorConfig, setExecutorConfig] = useState<ExecutorConfig>(DEFAULT_EXECUTOR_CONFIG);

  const [showAppComponent, setShowAppComponent] = useState(false);
  const [showNavigationModal, setShowNavigationModal] = useState(false);
  const [showContactWorkflowSelector, setShowContactWorkflowSelector] = useState(false);
  const [showQualityPanel, setShowQualityPanel] = useState(false);
  const [isScriptValid, setIsScriptValid] = useState(true);

  const handleSaveStepRef = useRef<() => Promise<void>>(async () => {});
  const showAddModalRef = useRef<(options?: { resetFields?: boolean }) => void>(() => {});
  const setEditingStepRef = useRef<Dispatch<SetStateAction<LoopScriptStep | null>>>(() => {});

  const pageFinder = usePageFinder({
    steps,
    setSteps,
    form,
    currentDeviceId,
    devices,
    showAddModal: (options) => showAddModalRef.current(options),
    setEditingStep: (action) => setEditingStepRef.current(action),
    handleSaveStep: () => handleSaveStepRef.current(),
  });

  const {
    isModalVisible,
    showAddModal,
    showEditModal,
    hideModal,
    editingStep,
    setEditingStep,
    handleSaveStep,
  } = useStepForm({
    form,
    steps,
    setSteps,
    devices,
    currentDeviceId,
    currentXmlContent: pageFinder.currentXmlContent,
    currentDeviceInfo: pageFinder.currentDeviceInfo,
    currentPageInfo: pageFinder.currentPageInfo,
    setShowContactWorkflowSelector,
    setSnapshotFixMode: pageFinder.setSnapshotFixMode,
    setPendingAutoResave: pageFinder.setPendingAutoResave,
    setIsQuickAnalyzer: pageFinder.setIsQuickAnalyzer,
    setEditingStepForParams: pageFinder.setEditingStepForParams,
    setShowPageAnalyzer: pageFinder.setShowPageAnalyzer,
    allowSaveWithoutXmlOnce: pageFinder.allowSaveWithoutXmlOnce,
    setAllowSaveWithoutXmlOnce: pageFinder.setAllowSaveWithoutXmlOnce,
  });

  useEffect(() => {
    handleSaveStepRef.current = handleSaveStep;
    showAddModalRef.current = showAddModal;
    setEditingStepRef.current = setEditingStep;
  }, [handleSaveStep, showAddModal, setEditingStep]);

  const handleExecuteScript = useMemo(
    () =>
      createHandleExecuteScript({
        getSteps: () => steps,
        getDevices: () => devices,
        getCurrentDeviceId: () => currentDeviceId,
        getExecutorConfig: () => executorConfig,
        setExecutionResult,
        setIsExecuting,
      }),
    [steps, devices, currentDeviceId, executorConfig]
  );

  const {
    handleSaveScript,
    handleExportScript,
    handleLoadScript,
    handleLoadScriptFromFile,
  } = useScriptPersistence({
    steps,
    setSteps,
    executorConfig,
    setExecutorConfig,
  });

  const workflowIntegrations = useWorkflowIntegrations({
    form,
    steps,
    setSteps,
    setShowAppComponent,
    setShowNavigationModal,
    setShowContactWorkflowSelector,
    setExecutorConfig,
    setIsScriptValid,
  });

  const handleDeviceChange = useCallback((deviceId: string) => {
    setCurrentDeviceId(deviceId);
  }, []);

  const handleModalCancel = useCallback(() => {
    hideModal();
    form.resetFields();
  }, [form, hideModal]);

  useEffect(() => {
    if (!currentDeviceId && devices.length > 0) {
      const firstOnline = devices.find((device) => device.status === DeviceStatus.ONLINE);
      if (firstOnline) {
        setCurrentDeviceId(firstOnline.id);
      }
    }
  }, [devices, currentDeviceId]);

  useEffect(() => {
    DistributedStepLookupService.setGlobalScriptSteps(buildDistributedSteps(steps));
  }, [steps]);

  return {
    headerProps: {
      devices,
      currentDeviceId: currentDeviceId || null,
      onDeviceChange: handleDeviceChange,
      onRefreshDevices: refreshDevices,
      onQuickAddApp: () => setShowAppComponent(true),
    },
    stepListProps: {
      steps,
      setSteps,
      loopConfigs,
      setLoopConfigs,
      currentDeviceId,
      devices,
  handleEditStep: showEditModal,
      openQuickPageFinder: pageFinder.openQuickPageFinder,
      handleEditStepParams: pageFinder.openPageFinderForStep,
  handleAddStep: showAddModal,
    },
    scriptControlPanelProps: {
      steps,
      executorConfig,
      setExecutorConfig,
      executionResult,
      isExecuting,
      currentDeviceId,
      onExecuteScript: handleExecuteScript,
      onLoadScript: handleLoadScript,
      onUpdateSteps: setSteps,
      onUpdateConfig: setExecutorConfig,
    },
    controlPanelProps: {
      steps,
      isExecuting,
      isScriptValid,
      onExecuteScript: handleExecuteScript,
      onSaveScript: handleSaveScript,
      onLoadScript: handleLoadScriptFromFile,
      onExportScript: handleExportScript,
      onShowQualityPanel: () => setShowQualityPanel(true),
      onTestElementMapping: workflowIntegrations.handleTestElementMapping,
      onTestSmartStepGenerator: workflowIntegrations.handleTestSmartStepGenerator,
    },
    stepEditModalProps: {
  open: isModalVisible,
  editingStep,
      form,
      currentDeviceId,
  onOk: handleSaveStep,
      onCancel: handleModalCancel,
      onShowNavigationModal: () => setShowNavigationModal(true),
      onShowPageAnalyzer: pageFinder.openQuickPageFinder,
    },
    quickAppModalProps: {
      open: showAppComponent,
      currentDeviceId,
      steps,
      onCancel: () => setShowAppComponent(false),
      onStepAdded: workflowIntegrations.handleQuickAppStepAdded,
    },
    navigationModalProps: {
      visible: showNavigationModal,
      onClose: workflowIntegrations.handleNavigationModalClose,
      onConfigurationChange: workflowIntegrations.handleNavigationConfigChange,
      onStepGenerated: workflowIntegrations.handleNavigationStepGenerated,
      deviceId: currentDeviceId,
    },
    contactWorkflowProps: {
      visible: showContactWorkflowSelector,
      onCancel: () => setShowContactWorkflowSelector(false),
      onStepsGenerated: workflowIntegrations.handleContactWorkflowStepsGenerated,
      deviceId: currentDeviceId,
    },
    qualityModalProps: {
      open: showQualityPanel,
      steps,
      currentDeviceId,
      onCancel: () => setShowQualityPanel(false),
      onScriptUpdate: workflowIntegrations.handleQualityPanelScriptUpdate,
      onValidationChange: workflowIntegrations.handleQualityValidationChange,
    },
    pageFinderProps: pageFinder.pageFinderProps,
  };
}
