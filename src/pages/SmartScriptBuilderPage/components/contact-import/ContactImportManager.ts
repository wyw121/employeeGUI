import { message } from "antd";
import type { ExtendedSmartScriptStep } from "../../../../types/loopScript";
import { SmartActionType } from "../../../../types/smartComponents";
import { generateContactImportWorkflowSteps } from "../../../../modules/contact-automation";

/**
 * 通讯录导入管理器
 * - 生成通讯录导入工作流步骤并追加到现有步骤中
 */
export class ContactImportManager {
  /**
   * 创建通讯录导入步骤并返回更新后的步骤数组
   * @param currentDeviceId 当前设备ID
   * @param steps 当前步骤数组
   */
  static createContactImportSteps(
    currentDeviceId: string,
    steps: ExtendedSmartScriptStep[]
  ): ExtendedSmartScriptStep[] {
    const contactSteps = generateContactImportWorkflowSteps("", currentDeviceId);

    // 更新步骤顺序并返回
    const baseOrder = steps.length;
    const updatedSteps = contactSteps.map((step, index) => ({
      ...step,
      order: baseOrder + index + 1,
    }));

    return [...steps, ...updatedSteps];
  }

  /**
   * 处理工作流选择器生成的步骤
   */
  static handleWorkflowGenerated(
    generatedSteps: ExtendedSmartScriptStep[],
    steps: ExtendedSmartScriptStep[]
  ): ExtendedSmartScriptStep[] {
    const merged = [...steps, ...generatedSteps];
    message.success(`已生成 ${generatedSteps.length} 个通讯录导入步骤`);
    return merged;
  }
}
