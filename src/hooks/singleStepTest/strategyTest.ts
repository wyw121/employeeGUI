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
    const output = success
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
    return { success, output, matchResult, criteria };
  } catch (error) {
    console.error('策略匹配测试失败:', error);
    return { success: false, output: `❌ 策略匹配测试出错: ${error}`, criteria: criteria as any, error: String(error) };
  }
}
