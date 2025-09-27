#!/usr/bin/env node
/**
 * 检查是否存在对“通讯录管理（旧）”相关文件的引用。
 * 检测到即退出码 1，用于本地或 CI 拦截回归。
 */
const { globby } = require('globby');
const fs = require('fs');
const path = require('path');

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

(async () => {
  try {
    const files = await globby(['src/**/*.{ts,tsx}'], { cwd: workspace, absolute: true });
    const hits = [];
    for (const file of files) {
      const content = fs.readFileSync(file, 'utf8');
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
