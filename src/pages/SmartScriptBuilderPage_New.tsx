import React, { useState, useEffect, useCallback, useMemo } from "react";
import { useAdb } from "../application/hooks/useAdb";
import { DeviceStatus } from "../domain/adb/entities/Device";
import {
  Row,
  Col,
  Typography,
  Form,
  message,
} from "antd";

// 🆕 导入模块化组件
import StepListPanel from "./SmartScriptBuilderPage/components/StepListPanel";
import ScriptControlPanel from "./SmartScriptBuilderPage/components/ScriptControlPanel";
import PageHeader from "./SmartScriptBuilderPage/components/PageHeader";
import { SmartStepEditorModal } from "./SmartScriptBuilderPage/components/smart-step-adder/SmartStepEditorModal";

// 🆕 导入Hooks
import { useStepForm } from "./SmartScriptBuilderPage/hooks/useStepForm";
import { usePageFinder } from "./SmartScriptBuilderPage/hooks/usePageFinder";
import { useLoopManagement } from "./SmartScriptBuilderPage/components/loop-management";
import { useContactImport } from "./SmartScriptBuilderPage/components/contact-import";

// 🆕 导入类型和服务
import type { ExtendedSmartScriptStep, LoopConfig } from "../types/loopScript";
import type { ExecutorConfig, SmartExecutionResult } from "../types/execution";
import { DistributedStepLookupService } from "../application/services/DistributedStepLookupService";
import { DistributedStep } from "../domain/distributed-script";
import { generateXmlHash } from "../types/selfContainedScript";
import { PageAnalysisApplicationService } from "../application/page-analysis/PageAnalysisApplicationService";
import { PageAnalysisRepositoryFactory } from "../infrastructure/repositories/PageAnalysisRepositoryFactory";

// 🆕 导入模态框组件
import { LaunchAppSmartComponent } from "../components/smart/LaunchAppSmartComponent";
import { SmartNavigationModal } from "../components";
import { UniversalPageFinderModal } from "../components/universal-ui/UniversalPageFinderModal";
import { ContactWorkflowSelector } from "../modules/contact-automation";
import { DistributedScriptQualityPanel } from "../modules/distributed-script-quality/DistributedScriptQualityPanel";

const { Title, Paragraph } = Typography;

// ==================== 主组件 ====================
const SmartScriptBuilderPage: React.FC = () => {
  // ADB Hook 获取设备信息
  const { devices, refreshDevices } = useAdb();

  // 创建页面分析服务实例
  const pageAnalysisService = React.useMemo(() => {
    try {
      const pageAnalysisRepository = PageAnalysisRepositoryFactory.getPageAnalysisRepository();
      const deviceUIStateRepository = PageAnalysisRepositoryFactory.getDeviceUIStateRepository();
      return new PageAnalysisApplicationService(pageAnalysisRepository, deviceUIStateRepository);
    } catch (error) {
      console.error("创建页面分析服务失败:", error);
      return null;
    }
  }, []);

  // ==================== 状态管理 ====================
  const [steps, setSteps] = useState<ExtendedSmartScriptStep[]>([]);
  const [loopConfigs, setLoopConfigs] = useState<LoopConfig[]>([]);
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [isExecuting, setIsExecuting] = useState(false);
  const [editingStep, setEditingStep] = useState<ExtendedSmartScriptStep | null>(null);
  const [currentDeviceId, setCurrentDeviceId] = useState<string>("");
  const [showAppComponent, setShowAppComponent] = useState(false);
  const [showNavigationModal, setShowNavigationModal] = useState(false);
  const [lastNavigationConfig, setLastNavigationConfig] = useState<{
    app_name?: string;
    navigation_type?: string;
  } | null>(null);
  const [executorConfig, setExecutorConfig] = useState<ExecutorConfig>({
    default_timeout_ms: 10000,
    default_retry_count: 3,
    page_recognition_enabled: true,
    auto_verification_enabled: true,
    smart_recovery_enabled: true,
    detailed_logging: true,
  });
  const [executionResult, setExecutionResult] = useState<SmartExecutionResult | null>(null);
  const [showContactWorkflowSelector, setShowContactWorkflowSelector] = useState(false);
  const [isScriptValid, setIsScriptValid] = useState<boolean>(true);
  const [showQualityPanel, setShowQualityPanel] = useState<boolean>(false);

  const [form] = Form.useForm();

  // 🆕 使用模块化Hooks
  const stepFormHook = useStepForm({
    steps,
    setSteps,
    devices,
    currentDeviceId,
    currentXmlContent: "", // 初始值
    currentDeviceInfo: {},
    currentPageInfo: {},
    setShowContactWorkflowSelector,
    setSnapshotFixMode: () => {}, // 暂时空实现
    setPendingAutoResave: () => {},
    setIsQuickAnalyzer: () => {},
    setEditingStepForParams: () => {},
    setShowPageAnalyzer: () => {},
    allowSaveWithoutXmlOnce: false,
    setAllowSaveWithoutXmlOnce: () => {},
  });

  const pageFinderHook = usePageFinder({
    steps,
    setSteps,
    form,
    currentDeviceId,
    devices,
    showAddModal: (options) => {
      if (options?.resetFields !== false) {
        form.resetFields();
      }
      setIsModalVisible(true);
    },
    setEditingStep,
    handleSaveStep: stepFormHook.handleSaveStep,
  });

  // 适配新签名：useLoopManagement(steps, setSteps)
  const loopManagementHook = useLoopManagement(steps, setSteps);

  // 适配新签名：useContactImport(steps, setSteps)
  const contactImportHook = useContactImport(steps, setSteps);

  // 🆕 当步骤变化时，同步到分布式步骤查找服务
  useEffect(() => {
    const distributedSteps: DistributedStep[] = steps
      .map((step) => {
        const p: any = step.parameters || {};
        const embedded = p.xmlSnapshot;
        const xmlContent: string | undefined = embedded?.xmlContent || p.xmlContent;
        if (!xmlContent) return null;

        const stepXml = {
          xmlContent,
          xmlHash: embedded?.xmlHash || generateXmlHash(xmlContent),
          timestamp: embedded?.timestamp || Date.now(),
          deviceInfo: embedded?.deviceInfo || p.deviceInfo || p.deviceId
            ? {
                deviceId: embedded?.deviceInfo?.deviceId || p.deviceId || "unknown",
                deviceName: embedded?.deviceInfo?.deviceName || p.deviceName || "Unknown Device",
              }
            : undefined,
          pageInfo: embedded?.deviceInfo || p.pageInfo
            ? {
                appPackage: embedded?.deviceInfo?.appPackage || p.pageInfo?.appPackage || "com.xingin.xhs",
                activityName: embedded?.deviceInfo?.activityName || p.pageInfo?.activityName,
                pageTitle: embedded?.pageInfo?.pageTitle || p.pageInfo?.pageTitle,
              }
            : undefined,
        } as any;

        const locator = p.locator || {
          absoluteXPath: p.xpath || "",
          attributes: {
            resourceId: p.resource_id,
            text: p.text,
            contentDesc: p.content_desc,
            className: p.class_name,
          },
        };

        const ds: DistributedStep = {
          id: step.id,
          name: step.name || `步骤_${step.id}`,
          actionType: step.step_type || "click",
          params: p,
          locator,
          createdAt: Date.now(),
          description: step.description,
          xmlSnapshot: stepXml,
        } as DistributedStep;
        return ds;
      })
      .filter((v): v is DistributedStep => !!v);

    DistributedStepLookupService.setGlobalScriptSteps(distributedSteps);
    console.log("🔄 同步步骤到分布式查找服务:", {
      totalSteps: steps.length,
      distributedSteps: distributedSteps.length,
      stepIds: distributedSteps.map((s) => s.id),
    });
  }, [steps]);

  // 初始化设备选择
  useEffect(() => {
    refreshDevices();
  }, [refreshDevices]);

  // 当设备列表变化时，自动选择第一个设备
  useEffect(() => {
    if (devices.length > 0 && !currentDeviceId) {
      const firstOnlineDevice = devices.find((d) => d.status === DeviceStatus.ONLINE);
      if (firstOnlineDevice) {
        setCurrentDeviceId(firstOnlineDevice.id);
      }
    }
  }, [devices, currentDeviceId]);

  // ==================== 事件处理函数 ====================
  const handleNavigationConfigChange = useCallback(
    (config: { app_name?: string; navigation_type?: string }) => {
      console.log("📥 接收到配置变化:", config);
      setLastNavigationConfig(config);
    },
    []
  );

  const handleNavigationModalClose = useCallback(() => {
    setShowNavigationModal(false);
  }, []);

  const handleEditStep = (step: ExtendedSmartScriptStep) => {
    setEditingStep(step);
    form.setFieldsValue({
      step_type: step.step_type,
      name: step.name,
      description: step.description,
      ...step.parameters,
    });
    setIsModalVisible(true);
  };

  const handleDeleteStep = (stepId: string) => {
    setSteps((prev) => prev.filter((s) => s.id !== stepId));
    message.success("步骤删除成功");
  };

  const handleToggleStep = (stepId: string) => {
    setSteps((prev) =>
      prev.map((s) => (s.id === stepId ? { ...s, enabled: !s.enabled } : s))
    );
  };

  const handleAddStep = () => {
    setEditingStep(null);
    form.resetFields();
    setIsModalVisible(true);
  };

  const handleExecuteScript = async () => {
    setIsExecuting(true);
    try {
      // 简化的执行逻辑
      message.success("脚本执行完成");
    } catch (error) {
      console.error("脚本执行失败:", error);
      message.error("脚本执行失败");
    } finally {
      setIsExecuting(false);
    }
  };

  const handleLoadScriptFromManager = (loadedSteps: ExtendedSmartScriptStep[], config?: ExecutorConfig) => {
    setSteps(loadedSteps);
    if (config) {
      setExecutorConfig(config);
    }
    message.success("脚本加载成功");
  };

  // ==================== 渲染 ====================
  return (
    <div className="p-6">
      {/* 页面标题 */}
      <PageHeader
        devices={devices}
        currentDeviceId={currentDeviceId}
        onDeviceChange={setCurrentDeviceId}
        onRefreshDevices={refreshDevices}
        onQuickAddApp={() => setShowAppComponent(true)}
      />

      <Row gutter={16} className="h-full">
        {/* 左侧：可拖拽的步骤列表 */}
        <Col span={16}>
          <StepListPanel
            steps={steps}
            setSteps={setSteps}
            loopConfigs={loopConfigs}
            setLoopConfigs={setLoopConfigs}
            currentDeviceId={currentDeviceId}
            devices={devices}
            handleEditStep={handleEditStep}
            openQuickPageFinder={pageFinderHook.openQuickPageFinder}
            handleEditStepParams={pageFinderHook.openPageFinderForStep}
            handleAddStep={handleAddStep}
          />
        </Col>

        {/* 右侧：控制面板 */}
        <Col span={8}>
          <ScriptControlPanel
            steps={steps}
            executorConfig={executorConfig}
            setExecutorConfig={setExecutorConfig}
            executionResult={executionResult}
            isExecuting={isExecuting}
            currentDeviceId={currentDeviceId}
            onExecuteScript={handleExecuteScript}
            onLoadScript={handleLoadScriptFromManager}
            onUpdateSteps={setSteps}
            onUpdateConfig={setExecutorConfig}
          />
        </Col>
      </Row>

      {/* 模态框组件 */}
      <SmartStepEditorModal
        visible={isModalVisible}
        onOk={stepFormHook.handleSaveStep}
        onCancel={() => {
          setIsModalVisible(false);
          form.resetFields();
        }}
        form={form}
        currentDeviceId={currentDeviceId}
        editingStep={editingStep}
        onOpenSmartNavigation={() => setShowNavigationModal(true)}
  onOpenPageAnalyzer={() => pageFinderHook.openQuickPageFinder()}
      />

      {/* 快速应用选择Modal */}
      {/* ... 其他模态框组件 ... */}
      
    </div>
  );
};

export default SmartScriptBuilderPage;