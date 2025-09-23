// 用于格式化和复制测试结果的工具函数
import type { SingleStepTestResult } from '../../types/smartScript';

/**
 * 将测试结果格式化为易读的文本格式，用于复制
 */
export function formatTestResultForCopy(result: SingleStepTestResult, stepName: string): string {
  const lines: string[] = [];
  
  // 标题与状态
  lines.push(`测试结果: ${stepName}`);
  lines.push(result.success ? '测试成功' : '测试失败');
  lines.push(`${result.duration_ms}ms`);
  
  // 执行消息
  if (result.message) {
    lines.push('');
    lines.push('执行消息:');
    lines.push(result.message);
  }
  
  // 页面状态
  if (result.page_state) {
    lines.push('');
    lines.push('页面状态:');
    lines.push(result.page_state);
  }
  
  // 执行日志
  if (result.logs && result.logs.length > 0) {
    lines.push('');
    lines.push('执行日志:');
    lines.push(result.logs.join('\n'));
  }
  
  // 错误详情
  if (!result.success && result.error_details) {
    lines.push('');
    lines.push('错误详情');
    lines.push(result.error_details);
  }
  
  // 提取数据
  if (result.extracted_data && Object.keys(result.extracted_data).length > 0) {
    lines.push('');
    lines.push('提取数据:');
    lines.push(JSON.stringify(result.extracted_data, null, 2));
  }
  
  return lines.join('\n');
}

/**
 * 复制文本到剪贴板
 */
export async function copyToClipboard(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch (error) {
    console.error('复制到剪贴板失败:', error);
    return false;
  }
}