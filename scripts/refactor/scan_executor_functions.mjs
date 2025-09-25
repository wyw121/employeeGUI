#!/usr/bin/env node
/**
 * scan_executor_functions.mjs
 * 自动扫描后端执行器相关巨石/模块化文件，输出函数签名/分类建议的 JSON + Markdown 表
 * 设计目标：
 * 1. 快速列出 smart_script_executor 及其 impl / actions / control_flow 下的函数
 * 2. 识别重复函数名（潜在合并点）
 * 3. 基于启发式规则进行初步分类（动作/控制流/匹配/日志/重试/上下文/工具/未分类）
 * 4. 生成机器可读 JSON 以及人类可读 Markdown（后续生成迁移路线表的原始数据）
 *
 * 使用：npm run scan:executor
 */
import { promises as fs } from 'fs';
import path from 'path';

const ROOT = path.resolve(process.cwd(), 'src-tauri', 'src', 'services');

// 需要扫描的文件（按优先/体积顺序，可后续扩展）
const TARGET_PATTERNS = [
  'smart_script_executor.rs',
  'smart_script_executor_impl.rs',
  'smart_script_executor_actions.rs',
  'script_executor.rs',
  path.join('script_execution', 'control_flow', 'executor.rs'),
  path.join('script_execution', 'control_flow', 'context.rs'),
  path.join('script_execution', 'control_flow', 'parser.rs'),
  path.join('script_execution', 'control_flow', 'preprocessor.rs'),
  path.join('script_execution', 'control_flow', 'handlers', 'loop_handler.rs'),
  path.join('script_execution', 'control_flow', 'handlers', 'base.rs'),
  // 可按需继续添加
];

// 简单 Rust 函数匹配（忽略泛型/生命周期的复杂情况）
const FN_REGEX = /(?<![A-Za-z0-9_])pub\s+async\s+fn\s+([A-Za-z0-9_]+)|(?<![A-Za-z0-9_])pub\s+fn\s+([A-Za-z0-9_]+)|(?<![A-Za-z0-9_])async\s+fn\s+([A-Za-z0-9_]+)|(?<![A-Za-z0-9_])fn\s+([A-Za-z0-9_]+)\s*\(/g;

// 分类启发式关键词
const CATEGORY_RULES = [
  { cat: 'action', kw: ['click', 'swipe', 'input', 'tap', 'back', 'scroll', 'wait', 'sleep'] },
  { cat: 'control_flow', kw: ['loop', 'while', 'for_', 'if', 'condition', 'branch', 'evaluate'] },
  { cat: 'match', kw: ['match', 'locator', 'find', 'detect', 'recognize'] },
  { cat: 'retry', kw: ['retry', 'retryable', 'attempt'] },
  { cat: 'log', kw: ['log', 'event', 'trace', 'debug', 'error'] },
  { cat: 'context', kw: ['context', 'ctx', 'state', 'env'] },
  { cat: 'util', kw: ['build', 'compose', 'format', 'parse', 'serialize', 'deserialize'] },
];

function categorize(name){
  const lower = name.toLowerCase();
  for (const rule of CATEGORY_RULES){
    if (rule.kw.some(k => lower.includes(k))) return rule.cat;
  }
  return 'uncategorized';
}

async function scanFile(rel){
  const abs = path.join(ROOT, rel);
  try {
    const content = await fs.readFile(abs, 'utf8');
    const lines = content.split(/\r?\n/);
    const fns = [];
    let m;
    while ((m = FN_REGEX.exec(content)) !== null){
      const name = m[1] || m[2] || m[3] || m[4];
      if (!name) continue;
      // 计算所在行
      const upto = content.slice(0, m.index).split(/\r?\n/).length;
      fns.push({ name, line: upto });
    }
    return { file: rel.replace(/\\/g,'/'), functions: fns, total: lines.length };
  } catch (e){
    return { file: rel.replace(/\\/g,'/'), error: e.message, functions: [], total: 0 };
  }
}

async function main(){
  const results = [];
  for (const p of TARGET_PATTERNS){
    results.push(await scanFile(p));
  }
  // 汇总所有函数
  const all = [];
  for (const r of results){
    for (const fn of r.functions){
      all.push({ file: r.file, name: fn.name, line: fn.line, category: categorize(fn.name) });
    }
  }
  // 识别重复
  const dupMap = new Map();
  for (const item of all){
    const arr = dupMap.get(item.name) || [];
    arr.push(item);
    dupMap.set(item.name, arr);
  }
  const duplicates = [...dupMap.entries()].filter(([, arr]) => arr.length > 1).map(([name, arr]) => ({ name, occurrences: arr }));

  // 统计分类
  const categoryStats = all.reduce((acc, cur) => { acc[cur.category] = (acc[cur.category]||0)+1; return acc; }, {});

  // 生成迁移建议（启发式）
  const migrationHints = all.map(item => ({
    name: item.name,
    file: item.file,
    category: item.category,
    suggested_module: suggestModule(item.category),
    action: suggestAction(item)
  }));

  const out = { scanned_at: new Date().toISOString(), files: results, total_functions: all.length, duplicates, category_stats: categoryStats, migration: migrationHints };

  const outDir = path.resolve(process.cwd(), 'debug', 'refactor-scan');
  await fs.mkdir(outDir, { recursive: true });
  await fs.writeFile(path.join(outDir, 'executor_functions.json'), JSON.stringify(out, null, 2), 'utf8');
  await fs.writeFile(path.join(outDir, 'executor_functions.md'), renderMarkdown(out), 'utf8');
  console.log(`[scan-executor] 完成: 共 ${all.length} 个函数, 重复 ${duplicates.length} 组, 输出 -> debug/refactor-scan/`);
}

function suggestModule(cat){
  switch(cat){
    case 'action': return 'interaction';
    case 'control_flow': return 'control_flow';
    case 'match': return 'ui_matching';
    case 'retry': return 'resilience';
    case 'log': return 'logging';
    case 'context': return 'execution_context';
    case 'util': return 'utils';
    default: return 'to_classify';
  }
}

function suggestAction(item){
  if (item.category === 'action') return 'Extract to InteractionAdapter';
  if (item.category === 'control_flow') return 'Move to ControlFlowEngine';
  if (item.category === 'match') return 'Unify into UiMatcherService';
  if (item.category === 'retry') return 'Fold into RetryPolicy';
  if (item.category === 'log') return 'Route through StructuredLogger';
  if (item.category === 'context') return 'Move to ExecutionContext struct/impl';
  return 'Review manually';
}

function renderMarkdown(out){
  let md = `# 执行器函数扫描报告\n\n`;
  md += `扫描时间: ${out.scanned_at}\n\n`;
  md += `## 分类统计\n\n`;
  for (const [k,v] of Object.entries(out.category_stats)){
    md += `- ${k}: ${v}\n`;
  }
  md += `\n## 重复函数 (${out.duplicates.length} 组)\n\n`;
  if (!out.duplicates.length) md += `无重复函数名\n`;
  for (const dup of out.duplicates){
    md += `### ${dup.name}\n`;
    for (const occ of dup.occurrences){
      md += `- ${occ.file}:${occ.line} (${occ.category})\n`;
    }
    md += `\n`;
  }
  md += `\n## 迁移建议（节选）\n\n`;
  md += `| 函数 | 文件 | 分类 | 建议模块 | 动作 |\n|------|------|------|---------|------|\n`;
  for (const row of out.migration.slice(0, 60)){ // 首 60 行示例
    md += `| ${row.name} | ${row.file} | ${row.category} | ${row.suggested_module} | ${row.action} |\n`;
  }
  md += `\n> 完整 JSON: debug/refactor-scan/executor_functions.json\n`;
  return md;
}

main().catch(e => {
  console.error('[scan-executor] 失败', e);
  process.exit(1);
});
