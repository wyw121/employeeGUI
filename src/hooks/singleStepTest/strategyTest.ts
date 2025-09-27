import type { SmartScriptStep } from '../../types/smartScript';
import type { MatchCriteriaDTO } from '../../domain/page-analysis/repositories/IUiMatcherRepository';
import { escapeRegex, sanitizeCriteria } from './utils';
import type { StrategyTestResult } from './types';

export function buildCriteriaFromStep(step: SmartScriptStep): MatchCriteriaDTO | null {
  const params = step.parameters as any;

  if (params?.matching) {
    const m = params.matching as Partial<MatchCriteriaDTO> & { matchMode?: MatchCriteriaDTO['matchMode']; regexIncludes?: MatchCriteriaDTO['regexIncludes']; regexExcludes?: MatchCriteriaDTO['regexExcludes'] };
    const enhancedMatchMode = { ...(m.matchMode || {}) };
    const enhancedRegexIncludes = { ...(m.regexIncludes || {}) };
    if (m.fields?.includes('text') && m.values?.text && m.values.text.trim()) {
      enhancedMatchMode.text = 'regex';
      (enhancedRegexIncludes as any).text = [`^${escapeRegex(m.values.text.trim())}$`];
    }
    if (m.fields?.includes('content-desc') && m.values?.['content-desc'] && String(m.values['content-desc']).trim()) {
      (enhancedMatchMode as any)['content-desc'] = 'regex';
      (enhancedRegexIncludes as any)['content-desc'] = [`^${escapeRegex(String(m.values['content-desc']).trim())}$`];
    }
    return sanitizeCriteria({
      strategy: (m.strategy as any) || 'standard',
      fields: m.fields || [],
      values: m.values || {},
      includes: m.includes || {},
      excludes: m.excludes || {},
      ...(Object.keys(enhancedMatchMode).length ? { matchMode: enhancedMatchMode } : {}),
      ...(Object.keys(enhancedRegexIncludes).length ? { regexIncludes: enhancedRegexIncludes } : {}),
      regexExcludes: m.regexExcludes,
    } as any);
  }

  const fields: string[] = [];
  const values: Record<string, string> = {};
  if (params?.element_text) { fields.push('text'); values.text = params.element_text; }
  if (params?.content_desc) { fields.push('content-desc'); values['content-desc'] = params.content_desc; }
  if (params?.resource_id) { fields.push('resource-id'); values['resource-id'] = params.resource_id; }
  if (params?.class_name) { fields.push('class'); values.class = params.class_name; }
  // 🆕 兼容 StepEditModal 的 element_type 隐藏字段（未填写 class_name 时使用）
  if (!values.class && params?.element_type) {
    fields.push('class');
    values.class = String(params.element_type);
  }
  if (params?.package_name) { fields.push('package'); values.package = params.package_name; }

  if (fields.length > 0) {
    const matchMode: NonNullable<MatchCriteriaDTO['matchMode']> = {};
    const regexIncludes: NonNullable<MatchCriteriaDTO['regexIncludes']> = {};
    if (fields.includes('text') && values.text && values.text.trim()) {
      (matchMode as any).text = 'regex';
      (regexIncludes as any).text = [`^${escapeRegex(values.text.trim())}$`];
    }
    if (fields.includes('content-desc') && values['content-desc'] && String(values['content-desc']).trim()) {
      (matchMode as any)['content-desc'] = 'regex';
      (regexIncludes as any)['content-desc'] = [`^${escapeRegex(String(values['content-desc']).trim())}$`];
    }
    return sanitizeCriteria({
      strategy: 'standard',
      fields,
      values,
      includes: {},
      excludes: {},
      ...(Object.keys(matchMode).length ? { matchMode } : {}),
      ...(Object.keys(regexIncludes).length ? { regexIncludes } : {}),
    } as any);
  }
  return null;
}

export async function executeStrategyTestImpl(
  step: SmartScriptStep,
  deviceId: string,
  matchElementByCriteria: (deviceId: string, c: MatchCriteriaDTO) => Promise<any>,
  convert?: (s: SmartScriptStep) => MatchCriteriaDTO | null,
): Promise<StrategyTestResult> {
  const criteria = convert ? convert(step) : buildCriteriaFromStep(step);
  if (!criteria) {
    return { success: false, output: '❌ 无法从步骤参数构建匹配条件，步骤类型不支持或缺少必要参数', error: '不支持的步骤类型或参数不足' };
  }
  try {
    console.log('🎯 使用策略匹配测试:', criteria);
    const matchResult = await matchElementByCriteria(deviceId, criteria);
    const success = !!matchResult.ok;
    let output = success
      ? `✅ 策略匹配成功: ${matchResult.message}\n` +
        `📋 匹配策略: ${criteria.strategy}\n` +
        `🔍 匹配字段: ${criteria.fields.join(', ')}\n` +
        `📊 总元素数: ${matchResult.total || 0}\n` +
        `🎯 匹配索引: ${matchResult.matchedIndex !== undefined ? matchResult.matchedIndex : '无'}\n` +
        (matchResult.preview ? `📝 预览: ${JSON.stringify(matchResult.preview, null, 2)}` : '无预览数据')
      : `❌ 策略匹配失败: ${matchResult.message}\n` +
        `📋 匹配策略: ${criteria.strategy}\n` +
        `🔍 匹配字段: ${criteria.fields.join(', ')}\n` +
        `📊 总元素数: ${matchResult.total || 0}`;
    // 回退策略：若首次失败，移除层级/位置等非语义字段，仅保留标准语义字段再试一次
    if (!success) {
      const semanticFields = new Set(['resource-id', 'text', 'content-desc', 'class', 'package', 'checkable']);
      const relaxedFields = (criteria.fields || []).filter((f) => semanticFields.has(f));

      // 若没有可保留字段，则直接返回
      if (relaxedFields.length > 0 && relaxedFields.length < (criteria.fields || []).length) {
        const pick = (obj: Record<string, any> | undefined, keys: string[]) => {
          if (!obj) return undefined;
          const out: Record<string, any> = {};
          for (const k of keys) {
            if (obj[k] !== undefined) out[k] = obj[k];
          }
          return Object.keys(out).length ? out : undefined;
        };

        const relaxedCriteria: MatchCriteriaDTO = {
          strategy: 'standard',
          fields: relaxedFields,
          values: pick(criteria.values as any, relaxedFields) || {},
          // 过滤 includes/excludes 到保留字段；regex* 在轻量后端中不参与匹配，直接省略以避免过度收紧
          ...(pick(criteria.includes as any, relaxedFields) ? { includes: pick(criteria.includes as any, relaxedFields)! } : {}),
          ...(pick(criteria.excludes as any, relaxedFields) ? { excludes: pick(criteria.excludes as any, relaxedFields)! } : {}),
        };

        console.log('🧪 首次匹配失败，尝试回退为语义字段匹配:', relaxedCriteria);
        try {
          const second = await matchElementByCriteria(deviceId, relaxedCriteria);
          if (second?.ok) {
            output += `\n\n🟡 触发回退匹配：已移除非语义字段后成功。\n` +
              `🔍 回退字段: ${relaxedCriteria.fields.join(', ')}\n` +
              `📊 总元素数: ${second.total || 0}\n` +
              `🎯 匹配索引: ${second.matchedIndex !== undefined ? second.matchedIndex : '无'}\n` +
              (second.preview ? `📝 预览: ${JSON.stringify(second.preview, null, 2)}` : '无预览数据');
            return { success: true, output, matchResult: second, criteria: relaxedCriteria };
          } else {
            output += `\n\n🔁 回退匹配仍未命中（仅保留语义字段）。`;
          }
        } catch (e) {
          console.warn('回退匹配调用失败:', e);
        }
      }
    }
    return { success, output, matchResult, criteria };
  } catch (error) {
    console.error('策略匹配测试失败:', error);
    return { success: false, output: `❌ 策略匹配测试出错: ${error}`, criteria: criteria as any, error: String(error) };
  }
}
