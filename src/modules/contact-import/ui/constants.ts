/**
 * 联系人导入 - UI 常量与工具
 * 仅包含表现层相关的常量/映射，避免与业务核心重复。
 */

import { ImportPhase } from "../types";

// 预览行数（上传步骤展示）
export const PREVIEW_ROWS_COUNT = 5;

// 支持的文件类型提示（UI 提示用）
export const SUPPORTED_FILE_TYPES_HINT = "仅支持 .vcf 联系人文件";

// 阶段说明映射
const PHASE_DESCRIPTIONS: Record<ImportPhase, string> = {
  [ImportPhase.INITIALIZING]: "正在初始化...",
  [ImportPhase.PARSING]: "正在解析联系人文件...",
  [ImportPhase.VALIDATING]: "正在验证联系人数据...",
  [ImportPhase.DISTRIBUTING]: "正在分配联系人到设备...",
  [ImportPhase.CONVERTING]: "正在转换文件格式...",
  [ImportPhase.IMPORTING]: "正在导入联系人...",
  [ImportPhase.VERIFYING]: "正在验证导入结果...",
  [ImportPhase.COMPLETED]: "导入完成",
};

export function getPhaseDescription(phase: ImportPhase): string {
  return PHASE_DESCRIPTIONS[phase] ?? "未知阶段";
}
