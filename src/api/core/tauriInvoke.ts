import { invoke } from '@tauri-apps/api/core';

/**
 * 递归将对象的 key 从 camelCase 转为 snake_case。
 * - 仅转换普通对象与数组的键；保留字符串/数字/布尔/空等原值。
 * - 不会转换对象的值内容（例如字符串中的命名）。
 */
export function toSnakeCaseDeep<T = any>(input: T): T {
  if (Array.isArray(input)) {
    return input.map((v) => toSnakeCaseDeep(v)) as any;
  }
  if (input && typeof input === 'object') {
    const out: any = {};
    for (const [k, v] of Object.entries(input as any)) {
      const snake = k
        .replace(/([a-z0-9])([A-Z])/g, '$1_$2')
        .replace(/[-\s]+/g, '_')
        .toLowerCase();
      out[snake] = toSnakeCaseDeep(v as any);
    }
    return out;
  }
  return input;
}

/**
 * 兼容性 invoke：
 * - 优先使用 snake_case 参数调用；
 * - 失败且错误信息提示缺少 camelCase key 时，回退 camelCase；
 * - 也支持强制策略（forceCamel / forceSnake）。
 */
export async function invokeCompat<T = unknown>(
  command: string,
  params?: Record<string, any>,
  opts?: { forceCamel?: boolean; forceSnake?: boolean }
): Promise<T> {
  const { forceCamel, forceSnake } = opts || {};
  const snakeParams = toSnakeCaseDeep(params || {});
  const camelParams = params || {};

  // 强制策略：
  if (forceSnake) {
    // 仅发送 snake_case 形参，避免未知参数导致的 invalid args
    return invoke<T>(command, snakeParams as any);
  }
  if (forceCamel) {
    // 仅发送 camelCase 形参，避免未知参数导致的 invalid args
    return invoke<T>(command, camelParams as any);
  }

  // 默认策略：先 snake，再 camel 回退
  try {
    return await invoke<T>(command, snakeParams as any);
  } catch (e1) {
    const msg = String(e1 ?? '');
    // 若错误提示缺少 camelCase key，尝试 camel 形参
    // 例如：missing required key deviceId / xmlContent
    const keys = Object.keys(camelParams);
    const missingCamel = keys.some((k) => msg.includes(`missing required key ${k}`) || msg.includes(`invalid args \`${k}\``));
    if (missingCamel) {
      console.warn(`[invokeCompat] snake_case 调用失败，尝试 camelCase…`, msg);
      return await invoke<T>(command, camelParams as any);
    }
    // 即便不匹配上述模式，也做一次回退尝试，增强鲁棒性
    console.warn(`[invokeCompat] snake_case 调用失败，保守回退 camelCase…`, msg);
    return await invoke<T>(command, camelParams as any);
  }
}

export default invokeCompat;
