#!/usr/bin/env node
/**
 * 检查是否存在对“通讯录管理（旧）”相关文件的引用。
 * 检测到即退出码 1，用于本地或 CI 拦截回归。
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const workspace = path.resolve(__dirname, '..');
const srcDir = path.join(workspace, 'src');

// 需要拦截的旧模块/页面路径片段或导入表达式
const forbiddenPatterns = [
  // 旧页面
  'pages/ContactManagementPage',
  'pages/ContactManagementPage_Enhanced',
  'pages/contact-management/ContactManagementPage',
  // 旧组件
  'components/contact/ContactImportManager',
  'components/contact/ContactImportManagerTabbed',
  'components/contact/ContactDocumentUploader',
  'components/contact/ContactList',
  'components/contact/ContactStatistics',
  'components/contact/ContactFollowTask',
  'components/contact/ContactTaskForm',
];

async function walk(dir) {
  let entries;
  try {
    entries = await fs.promises.readdir(dir, { withFileTypes: true });
  } catch (err) {
    // 忽略无法访问的目录（如 EPERM），避免中断整个扫描
    if (err && (err.code === 'EPERM' || err.code === 'EACCES' || err.code === 'ENOENT')) {
      return [];
    }
    throw err;
  }
  const files = await Promise.all(entries.map(async (entry) => {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      return walk(fullPath);
    }
    return fullPath;
  }));
  return files.flat();
}

(async () => {
  try {
    const all = await walk(srcDir);
    const files = all.filter(f => /\.(ts|tsx)$/i.test(f));
    const hits = [];
    for (const file of files) {
      const content = await fs.promises.readFile(file, 'utf8');
      for (const pat of forbiddenPatterns) {
        if (content.includes(pat)) {
          hits.push({ file: path.relative(workspace, file), pattern: pat });
        }
      }
    }
    if (hits.length > 0) {
      console.error('\n❌ 检测到对“通讯录管理（旧）”代码的引用：');
      for (const h of hits) {
        console.error(` - ${h.file} 引用了 ${h.pattern}`);
      }
      console.error('\n请改用：src/modules/contact-import 下的新架构与页面 src/pages/contact-import/ContactImportPage.tsx');
      process.exit(1);
    } else {
      console.log('✅ 未发现旧“通讯录管理”引用。');
    }
  } catch (e) {
    console.error('检查脚本执行失败：', e);
    process.exit(2);
  }
})();
