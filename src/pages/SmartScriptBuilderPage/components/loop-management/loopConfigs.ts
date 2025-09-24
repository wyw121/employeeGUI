import { SmartActionType } from "../../../../types/smartComponents";

/**
 * 循环相关的动作配置定义
 * 从主文件提取的循环开始和结束动作类型配置
 */
export const LOOP_ACTION_CONFIGS = {
  // 循环控制操作
  [SmartActionType.LOOP_START]: {
    name: "循环开始",
    description: "标记循环体的开始",
    color: "#1890ff",
    icon: "PlayCircleOutlined",
    category: "loop",
    parameters: [
      {
        key: "loop_name",
        label: "循环名称",
        type: "text",
        required: true,
        default: "新循环",
      },
      {
        key: "loop_count",
        label: "循环次数",
        type: "number",
        required: true,
        default: 3,
        min: 1,
        max: 100,
        help: "设置循环执行的次数",
      },
      {
        key: "is_infinite_loop",
        label: "无限循环",
        type: "boolean",
        required: false,
        default: false,
        help: "启用无限循环模式（谨慎使用）",
      },
      {
        key: "break_condition",
        label: "中断条件",
        type: "text",
        required: false,
        help: "满足该条件时退出循环",
      },
      {
        key: "delay_between_loops",
        label: "循环间延迟(ms)",
        type: "number",
        required: false,
        default: 1000,
        min: 0,
        max: 60000,
        help: "每次循环之间的等待时间",
      },
      {
        key: "max_duration_ms",
        label: "最大执行时间(ms)",
        type: "number",
        required: false,
        default: 300000,
        min: 1000,
        help: "循环最大执行时间，超时自动终止",
      },
    ],
  },

  [SmartActionType.LOOP_END]: {
    name: "循环结束",
    description: "标记循环体的结束",
    color: "#ff4d4f",
    icon: "StopOutlined",
    category: "loop",
    parameters: [
      { key: "loop_id", label: "对应循环ID", type: "text", required: true },
    ],
  },
};