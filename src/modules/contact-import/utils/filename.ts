export function formatTimestamp(d = new Date()): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}-${pad(d.getHours())}${pad(d.getMinutes())}${pad(d.getSeconds())}`;
}

export function buildCsvName(prefix: string, d = new Date()): string {
  return `${prefix}-${formatTimestamp(d)}.csv`;
}

// 通过模板构建 CSV 文件名，支持占位：
// {prefix} {view} {timestamp} {yyyyMMdd_HHmmss} {yyyyMMdd-HHmmss}
export function buildCsvNameFromTemplate(
  template: string | undefined,
  ctx: { prefix: string; view?: string; date?: Date }
): string {
  const d = ctx.date ?? new Date();
  const pad = (n: number) => String(n).padStart(2, '0');
  const yyyy = d.getFullYear();
  const MM = pad(d.getMonth() + 1);
  const dd = pad(d.getDate());
  const HH = pad(d.getHours());
  const mm = pad(d.getMinutes());
  const ss = pad(d.getSeconds());
  const tsHyphen = `${yyyy}${MM}${dd}-${HH}${mm}${ss}`;
  const tsUnderscore = `${yyyy}${MM}${dd}_${HH}${mm}${ss}`;

  if (!template || !template.trim()) {
    return `${ctx.prefix}-${tsHyphen}.csv`;
  }

  let name = template;
  const replacers: Record<string, string> = {
    '{prefix}': ctx.prefix,
    '{view}': ctx.view ?? 'all',
    '{timestamp}': tsHyphen,
    '{yyyyMMdd_HHmmss}': tsUnderscore,
    '{yyyyMMdd-HHmmss}': tsHyphen,
  };
  for (const [token, val] of Object.entries(replacers)) {
    name = name.split(token).join(val);
  }
  // 若用户未包含扩展名，补全 .csv
  if (!name.toLowerCase().endsWith('.csv')) name += '.csv';
  return name;
}
