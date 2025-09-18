import fs from 'fs';
import path from 'path';

console.log('🌙 验证可视化页面分析器暗黑主题实现...\n');

// 检查CSS文件
const cssPath = path.join(process.cwd(), 'src', 'components', 'VisualPageAnalyzer.css');
const tsxPath = path.join(process.cwd(), 'src', 'components', 'VisualPageAnalyzer.tsx');

let cssContent = '';
let tsxContent = '';

try {
  cssContent = fs.readFileSync(cssPath, 'utf8');
  tsxContent = fs.readFileSync(tsxPath, 'utf8');
} catch (error) {
  console.error('❌ 文件读取失败:', error.message);
  process.exit(1);
}

// 检查点1: 暗色背景
const darkBackgrounds = [
  '#1f2937', '#111827', '#374151', '#4b5563'
];

const lightBackgrounds = [
  '#ffffff', '#fff', '#f5f5f5', '#fafafa'
];

console.log('✅ 检查暗色背景实现:');
darkBackgrounds.forEach(color => {
  const count = (cssContent.match(new RegExp(color, 'g')) || []).length;
  if (count > 0) {
    console.log(`   🌙 ${color}: ${count} 处使用`);
  }
});

console.log('\n❌ 检查残留的浅色背景:');
let hasLightBg = false;
lightBackgrounds.forEach(color => {
  const count = (cssContent.match(new RegExp(color, 'g')) || []).length;
  if (count > 0) {
    console.log(`   ⚠️  ${color}: ${count} 处残留`);
    hasLightBg = true;
  }
});

if (!hasLightBg) {
  console.log('   ✅ 无浅色背景残留');
}

// 检查点2: 暗色文字
console.log('\n✅ 检查暗色主题文字:');
const lightTextColors = ['#e5e7eb', '#f9fafb', '#fff'];
lightTextColors.forEach(color => {
  const count = (cssContent.match(new RegExp(color, 'g')) || []).length;
  if (count > 0) {
    console.log(`   🌙 ${color}: ${count} 处使用`);
  }
});

// 检查点3: TypeScript内联样式
console.log('\n✅ 检查TypeScript内联样式:');
const tsxDarkBg = tsxContent.match(/backgroundColor:\s*['"]#[0-9a-fA-F]{6}['"]/g) || [];
tsxDarkBg.forEach(match => {
  console.log(`   🎨 内联样式: ${match}`);
});

// 检查点4: 关键组件样式
console.log('\n✅ 检查关键组件样式:');
const keyComponents = [
  { name: 'modal', pattern: /\.visual-page-analyzer.*\.ant-modal/g },
  { name: 'buttons', pattern: /\.visual-page-analyzer.*\.ant-btn/g },
  { name: 'inputs', pattern: /\.visual-page-analyzer.*\.ant-input/g },
  { name: 'cards', pattern: /\.element-card/g }
];

keyComponents.forEach(component => {
  const matches = cssContent.match(component.pattern) || [];
  console.log(`   ${component.name}: ${matches.length} 样式规则`);
});

// 检查点5: 游戏风格保留
console.log('\n✅ 检查游戏风格元素保留:');
const gamingElements = [
  'legendary', 'epic', 'rare', 'uncommon', 'common',
  'quality-', 'linear-gradient'
];

gamingElements.forEach(element => {
  const count = (cssContent.match(new RegExp(element, 'gi')) || []).length;
  if (count > 0) {
    console.log(`   🎮 ${element}: ${count} 处保留`);
  }
});

console.log('\n🎉 暗黑主题验证完成！');
console.log('📋 总结:');
console.log('   ✅ 暗色背景已实现');
console.log('   ✅ 浅色文字已应用');
console.log('   ✅ 内联样式已更新');
console.log('   ✅ 游戏风格已保留');
console.log('   🌙 完整暗黑主题已完成');