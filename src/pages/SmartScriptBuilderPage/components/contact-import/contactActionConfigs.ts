import { SmartActionType } from "../../../../types/smartComponents";

export const CONTACT_ACTION_CONFIG = {
  [SmartActionType.CONTACT_IMPORT_WORKFLOW]: {
    name: "通讯录导入",
    description: "完整的通讯录导入工作流程",
    icon: "📱",
    color: "green",
    category: "contact",
    parameters: [],
    advanced: [
      {
        key: "confidence_threshold",
        label: "置信度阈值",
        type: "slider",
        min: 0.1,
        max: 1.0,
        default: 0.8,
      },
      { key: "retry_count", label: "重试次数", type: "number", default: 3 },
      {
        key: "timeout_ms",
        label: "超时时间(ms)",
        type: "number",
        default: 10000,
      },
    ],
  },
};
