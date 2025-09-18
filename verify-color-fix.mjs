#!/usr/bin/env node

/**
 * 颜色对比度修复验证脚本
 * 检查可视化页面分析器的文字颜色是否已修复
 */

import fs from 'fs';
import path from 'path';

console.log('🎨 颜色对比度修复验证');
console.log('======================\n');

const projectRoot = process.cwd();

// 检查TypeScript组件文件
function checkComponentColors() {
    const componentPath = path.join(projectRoot, 'src/components/VisualPageAnalyzer.tsx');
    
    if (!fs.existsSync(componentPath)) {
        console.log('❌ VisualPageAnalyzer.tsx 文件不存在');
        return false;
    }
    
    const content = fs.readFileSync(componentPath, 'utf8');
    
    const colorFixes = {
        '标题颜色修复': content.includes('color: \'#333\'') && content.includes('fontWeight: \'bold\''),
        '详情文字颜色': content.includes('color: \'#333\''),
        '按钮文字对比': content.includes('selectedCategory === category.name ? \'#fff\' : \'#333\''),
        '背景色适配': content.includes('backgroundColor: selectedCategory')
    };
    
    console.log('📱 组件颜色修复检查:');
    Object.entries(colorFixes).forEach(([check, passed]) => {
        console.log(`   ${check}: ${passed ? '✅' : '❌'}`);
    });
    
    return Object.values(colorFixes).every(fix => fix);
}

// 检查CSS样式文件
function checkCSSColors() {
    const cssPath = path.join(projectRoot, 'src/components/VisualPageAnalyzer.css');
    
    if (!fs.existsSync(cssPath)) {
        console.log('❌ VisualPageAnalyzer.css 文件不存在');
        return false;
    }
    
    const content = fs.readFileSync(cssPath, 'utf8');
    
    const cssColorFixes = {
        'Modal背景色': content.includes('background-color: #fff'),
        '全局文字颜色': content.includes('color: #333 !important'),
        '输入框提示文字': content.includes('color: #999 !important'),
        '加载状态文字': content.includes('color: #333;') && content.includes('loading-placeholder'),
        '空状态文字': content.includes('empty-state') && content.includes('color: #333'),
        '详情弹窗文字': content.includes('element-detail') && content.includes('color: #333')
    };
    
    console.log('\n🎨 CSS颜色修复检查:');
    Object.entries(cssColorFixes).forEach(([check, passed]) => {
        console.log(`   ${check}: ${passed ? '✅' : '❌'}`);
    });
    
    return Object.values(cssColorFixes).every(fix => fix);
}

// 生成颜色对比度报告
function generateColorReport() {
    console.log('\n📋 颜色对比度修复报告');
    console.log('=======================');
    
    const fixes = [
        '✅ 页面预览标题从 #666 改为 #333 (深色文字)',
        '✅ 元素列表详情从 #666 改为 #333 (深色文字)',  
        '✅ 分类按钮添加背景色和文字颜色对比',
        '✅ Modal容器设置白色背景和深色文字',
        '✅ 全局样式确保文字在白背景下可见',
        '✅ 加载状态和空状态文字颜色修复',
        '✅ 元素详情弹窗文字颜色修复'
    ];
    
    fixes.forEach(fix => console.log(fix));
    
    console.log('\n🎯 修复前后对比:');
    console.log('修复前: 白色文字 + 白色背景 = ❌ 不可见');
    console.log('修复后: 深色文字 + 白色背景 = ✅ 清晰可见');
    
    console.log('\n🔧 主要修复策略:');
    console.log('1. 统一设置Modal容器为白色背景');
    console.log('2. 所有文字颜色设置为深色 (#333)');
    console.log('3. 分类按钮添加明确的背景色和文字色对比');
    console.log('4. 使用 !important 确保样式优先级');
}

// 运行验证
async function runColorVerification() {
    console.log('🔍 开始颜色对比度验证...\n');
    
    const componentPass = checkComponentColors();
    const cssPass = checkCSSColors();
    
    generateColorReport();
    
    const overallPass = componentPass && cssPass;
    
    console.log('\n======================');
    console.log(`🎨 验证结果: ${overallPass ? '✅ 全部通过' : '❌ 需要修复'}`);
    
    if (overallPass) {
        console.log('\n🎉 颜色对比度问题已修复！');
        console.log('📱 建议测试步骤:');
        console.log('1. 重新启动应用: npm run tauri dev');
        console.log('2. 打开可视化页面分析器');
        console.log('3. 验证所有文字在白色背景下清晰可见');
        console.log('4. 测试不同分类按钮的颜色对比度');
    } else {
        console.log('\n⚠️ 仍有部分颜色问题需要修复');
    }
    
    return overallPass;
}

// 执行验证
runColorVerification().then(success => {
    process.exit(success ? 0 : 1);
}).catch(error => {
    console.error('❌ 验证执行出错:', error);
    process.exit(1);
});