import { message } from 'antd';
import { FormInstance } from 'antd/es/form';
import { SmartActionType } from '../../../types/smartComponents';
import type { ExtendedSmartScriptStep } from '../../../types/loopScript';

interface StepSaveHandlerProps {
  form: FormInstance;
  editingStep: ExtendedSmartScriptStep | null;
  currentXmlContent: string;
  currentDeviceInfo: any;
  currentPageInfo: any;
  currentDeviceId: string | null;
  allowSaveWithoutXmlOnce: boolean;
  onShowContactWorkflowSelector: () => void;
  onModalVisibleChange: (visible: boolean) => void;
  onStepSaved: (step: ExtendedSmartScriptStep) => void;
  onAllowSaveWithoutXmlOnceChange: (allow: boolean) => void;
  onSnapshotFixMode: (mode: { enabled: boolean; forStepId?: string }) => void;
  onPendingAutoResave: (pending: boolean) => void;
  onShowPageAnalyzer: () => void;
}

export class StepSaveHandler {
  static async handleSaveStep(props: StepSaveHandlerProps): Promise<void> {
    const {
      form,
      editingStep,
      currentXmlContent,
      currentDeviceInfo,
      currentPageInfo,
      currentDeviceId,
      allowSaveWithoutXmlOnce,
      onShowContactWorkflowSelector,
      onModalVisibleChange,
      onStepSaved,
      onAllowSaveWithoutXmlOnceChange,
      onSnapshotFixMode,
      onPendingAutoResave,
      onShowPageAnalyzer,
    } = props;

    try {
      const values = await form.validateFields();
      console.log("🔍 表单验证后的所有值:", values);
      const { step_type, name, description, ...parameters } = values;
      console.log("🔍 解构后的 parameters:", parameters);

      // 特殊处理通讯录导入工作流
      if (step_type === SmartActionType.CONTACT_IMPORT_WORKFLOW) {
        onShowContactWorkflowSelector();
        onModalVisibleChange(false);
        return;
      }

      const stepId = editingStep?.id || `step_${Date.now()}`;

      // 简化的XML检查逻辑
      if (parameters) {
        const existing: any = (parameters as any).xmlSnapshot;
        let effectiveXmlContent: string =
          existing?.xmlContent ||
          (parameters as any).xmlContent ||
          currentXmlContent ||
          "";

        // 基础XML快照检查
        if (effectiveXmlContent && effectiveXmlContent.trim()) {
          // 简单检查XML是否有基本结构
          if (!effectiveXmlContent.includes('<hierarchy') && 
              !effectiveXmlContent.includes('<node')) {
            console.warn("⚠️ XML快照可能不完整，建议重新采集");
            
            if (!allowSaveWithoutXmlOnce) {
              message.warning({
                content: (
                  <div>
                    <div style={{ fontWeight: "bold", marginBottom: 4 }}>
                      📋 检测到页面快照需要更新
                    </div>
                    <div style={{ fontSize: 12, color: "#666" }}>
                      建议使用页面分析器重新采集页面数据...
                    </div>
                  </div>
                ),
                duration: 2.5,
              });

              // 进入修复模式
              onSnapshotFixMode({ enabled: true, forStepId: stepId });
              onPendingAutoResave(true);

              setTimeout(() => {
                onShowPageAnalyzer();
              }, 500);
              return;
            }
          }
        } else if (!allowSaveWithoutXmlOnce) {
          message.warning({
            content: (
              <div>
                <div style={{ fontWeight: "bold", marginBottom: 4 }}>
                  📋 缺少页面快照数据
                </div>
                <div style={{ fontSize: 12, color: "#666" }}>
                  建议使用页面分析器采集页面快照以提高执行成功率
                </div>
              </div>
            ),
            duration: 3,
          });
        }
      }

      // 构建步骤对象
      const stepData: ExtendedSmartScriptStep = editingStep
        ? {
            ...editingStep,
            name: name || editingStep.name,
            description: description || editingStep.description,
            parameters: parameters || editingStep.parameters,
          }
        : {
            id: stepId,
            step_type: step_type as SmartActionType,
            name: name || "新建步骤",
            description: description || "自动生成的步骤描述",
            parameters: parameters || {},
            enabled: true,
            order: 0,
          };

      // 成功保存
      onStepSaved(stepData);

      // 成功保存后，清理一次性放行标记
      if (allowSaveWithoutXmlOnce) onAllowSaveWithoutXmlOnceChange(false);

      onModalVisibleChange(false);
      form.resetFields();
    } catch (error) {
      console.error("保存步骤失败:", error);
      message.error("保存步骤失败: " + (error as Error).message);
    }
  }
}

export default StepSaveHandler;