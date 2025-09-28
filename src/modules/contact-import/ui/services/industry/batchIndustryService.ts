import { listNumbersByVcfBatch } from "../../services/contactNumberService";

// 简单的内存缓存，避免重复拉取
const cache = new Map<string, string>();

export type BatchIndustryLabel = string; // 如 “电商” | “医疗” | “未分类” | “多类”

/**
 * 依据批次内号码的行业字段，推断一个展示用的“分类标签”。
 * 规则：
 * - 全为空或仅空白 → “未分类”
 * - 样本内仅一种非空行业 → 该行业名
 * - 否则 → “多类”
 * 注意：为控制成本，仅抽样前 200 条号码进行判断。
 */
export async function getBatchIndustryLabel(batchId: string): Promise<BatchIndustryLabel> {
  if (!batchId) return "未分类";
  const hit = cache.get(batchId);
  if (hit) return hit;

  try {
    const sampleLimit = 200;
    const res = await listNumbersByVcfBatch(batchId, /*onlyUsed*/ undefined, { limit: sampleLimit, offset: 0 });
    const items = res?.items || [];
    if (items.length === 0) {
      cache.set(batchId, "未分类");
      return "未分类";
    }

    const set = new Set<string>();
    let hasEmpty = false;
    for (const it of items) {
      const raw = (it.industry ?? "").trim();
      if (!raw) {
        hasEmpty = true;
      } else {
        set.add(raw);
      }
      if (set.size > 1) break; // 早停：已可判断为多类
    }

    let label: BatchIndustryLabel;
    if (set.size === 0) {
      label = "未分类";
    } else if (set.size === 1 && !hasEmpty) {
      label = Array.from(set)[0];
    } else {
      label = "多类";
    }
    cache.set(batchId, label);
    return label;
  } catch (e) {
    // 出错时不阻塞主流程，回退到“未分类”
    cache.set(batchId, "未分类");
    return "未分类";
  }
}

export function primeBatchIndustryLabel(batchId: string, label: BatchIndustryLabel) {
  cache.set(batchId, label);
}

export function clearBatchIndustryCache() {
  cache.clear();
}
