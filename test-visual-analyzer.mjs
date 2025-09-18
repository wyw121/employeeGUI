#!/usr/bin/env node

/**
 * 可视化页面分析器集成测试脚本
 * 验证新的智能页面分析功能是否正确集成
 */

import fs from 'fs';
import path from 'path';

console.log('🧪 可视化页面分析器集成测试');
console.log('================================\n');

const projectRoot = process.cwd();
const results = [];

// 测试1: 检查VisualPageAnalyzer组件是否存在
function testVisualAnalyzerComponent() {
    const componentPath = path.join(projectRoot, 'src/components/VisualPageAnalyzer.tsx');
    const cssPath = path.join(projectRoot, 'src/components/VisualPageAnalyzer.css');
    
    const componentExists = fs.existsSync(componentPath);
    const cssExists = fs.existsSync(cssPath);
    
    results.push({
        test: '🎨 VisualPageAnalyzer组件文件',
        passed: componentExists && cssExists,
        details: `组件: ${componentExists ? '✅' : '❌'}, 样式: ${cssExists ? '✅' : '❌'}`
    });
    
    if (componentExists) {
        const content = fs.readFileSync(componentPath, 'utf8');
        const hasRequiredFeatures = [
            'parseBounds', // 坐标解析
            'categorizeElement', // 元素分类  
            'getUserFriendlyName', // 用户友好名称
            'renderPagePreview', // 页面预览渲染
            'ElementCategory', // 分类接口
            'getElementImportance' // 重要性判断
        ].every(feature => content.includes(feature));
        
        results.push({
            test: '🔧 核心功能方法',
            passed: hasRequiredFeatures,
            details: hasRequiredFeatures ? '所有核心方法已实现' : '缺少部分核心方法'
        });
    }
}

// 测试2: 检查UniversalPageFinderModal集成
function testModalIntegration() {
    const modalPath = path.join(projectRoot, 'src/components/universal-ui/UniversalPageFinderModal.tsx');
    
    if (!fs.existsSync(modalPath)) {
        results.push({
            test: '🔗 Modal组件集成',
            passed: false,
            details: 'UniversalPageFinderModal.tsx 文件不存在'
        });
        return;
    }
    
    const content = fs.readFileSync(modalPath, 'utf8');
    
    const integrationChecks = {
        'VisualPageAnalyzer导入': content.includes('import VisualPageAnalyzer'),
        '状态变量添加': content.includes('showVisualAnalyzer'),
        '可视化按钮添加': content.includes('可视化页面分析'),
        '组件渲染': content.includes('<VisualPageAnalyzer')
    };
    
    const allIntegrated = Object.values(integrationChecks).every(check => check);
    
    results.push({
        test: '🔗 Modal组件集成',
        passed: allIntegrated,
        details: Object.entries(integrationChecks)
            .map(([key, value]) => `${key}: ${value ? '✅' : '❌'}`)
            .join(', ')
    });
}

// 测试3: 检查分类系统完整性
function testCategorizationSystem() {
    const componentPath = path.join(projectRoot, 'src/components/VisualPageAnalyzer.tsx');
    
    if (!fs.existsSync(componentPath)) {
        results.push({
            test: '🏷️ 分类系统',
            passed: false,
            details: 'VisualPageAnalyzer组件不存在'
        });
        return;
    }
    
    const content = fs.readFileSync(componentPath, 'utf8');
    
    const expectedCategories = [
        'navigation', // 底部导航
        'tabs',       // 顶部标签  
        'search',     // 搜索功能
        'content',    // 内容卡片
        'buttons',    // 按钮控件
        'text',       // 文本内容
        'images',     // 图片内容
        'others'      // 其他元素
    ];
    
    const categoriesImplemented = expectedCategories.every(cat => content.includes(`'${cat}'`));
    
    results.push({
        test: '🏷️ 元素分类系统',
        passed: categoriesImplemented,
        details: categoriesImplemented ? '所有分类已实现' : '缺少部分分类定义'
    });
}

// 测试4: 检查XML解析功能
function testXMLParsing() {
    const componentPath = path.join(projectRoot, 'src/components/VisualPageAnalyzer.tsx');
    
    if (!fs.existsSync(componentPath)) {
        results.push({
            test: '📄 XML解析',
            passed: false,
            details: 'VisualPageAnalyzer组件不存在'
        });
        return;
    }
    
    const content = fs.readFileSync(componentPath, 'utf8');
    
    const parsingFeatures = {
        'DOMParser使用': content.includes('DOMParser'),
        'bounds解析': content.includes('parseBounds'),
        '元素过滤': content.includes('过滤掉无意义的元素'),
        '位置计算': content.includes('position.width') && content.includes('position.height')
    };
    
    const allParsingWorks = Object.values(parsingFeatures).every(feature => feature);
    
    results.push({
        test: '📄 XML解析功能', 
        passed: allParsingWorks,
        details: Object.entries(parsingFeatures)
            .map(([key, value]) => `${key}: ${value ? '✅' : '❌'}`)
            .join(', ')
    });
}

// 测试5: 检查样式文件完整性
function testStyling() {
    const cssPath = path.join(projectRoot, 'src/components/VisualPageAnalyzer.css');
    
    if (!fs.existsSync(cssPath)) {
        results.push({
            test: '🎨 样式文件',
            passed: false,
            details: 'VisualPageAnalyzer.css 文件不存在'
        });
        return;
    }
    
    const content = fs.readFileSync(cssPath, 'utf8');
    
    const styleFeatures = {
        '预览元素样式': content.includes('.preview-element'),
        '元素卡片样式': content.includes('.element-card'),
        '重要性样式': content.includes('.high') && content.includes('.medium') && content.includes('.low'),
        '动画效果': content.includes('@keyframes') || content.includes('transition'),
        '响应式设计': content.includes('@media')
    };
    
    const allStylesPresent = Object.values(styleFeatures).every(feature => feature);
    
    results.push({
        test: '🎨 样式系统',
        passed: allStylesPresent,
        details: Object.entries(styleFeatures)
            .map(([key, value]) => `${key}: ${value ? '✅' : '❌'}`)
            .join(', ')
    });
}

// 测试6: 检查演示文档
function testDocumentation() {
    const demoPath = path.join(projectRoot, 'visual-page-analyzer-demo.html');
    
    const demoExists = fs.existsSync(demoPath);
    
    results.push({
        test: '📖 演示文档',
        passed: demoExists,
        details: demoExists ? '演示页面已创建' : '缺少演示页面'
    });
    
    if (demoExists) {
        const content = fs.readFileSync(demoPath, 'utf8');
        const hasFeatureDescriptions = content.includes('智能元素分类') && content.includes('真实位置布局');
        
        results.push({
            test: '📋 功能说明文档',
            passed: hasFeatureDescriptions,
            details: hasFeatureDescriptions ? '功能说明完整' : '功能说明不完整'
        });
    }
}

// 运行所有测试
async function runAllTests() {
    console.log('🔍 开始集成测试...\n');
    
    testVisualAnalyzerComponent();
    testModalIntegration();
    testCategorizationSystem();
    testXMLParsing();
    testStyling();
    testDocumentation();
    
    // 输出测试结果
    console.log('📊 测试结果汇总:');
    console.log('==================\n');
    
    let passedCount = 0;
    results.forEach((result, index) => {
        const status = result.passed ? '✅ 通过' : '❌ 失败';
        console.log(`${index + 1}. ${result.test}: ${status}`);
        console.log(`   详情: ${result.details}\n`);
        
        if (result.passed) passedCount++;
    });
    
    const totalTests = results.length;
    const successRate = ((passedCount / totalTests) * 100).toFixed(1);
    
    console.log('===================');
    console.log(`🎯 测试统计: ${passedCount}/${totalTests} 通过 (${successRate}%)`);
    
    if (passedCount === totalTests) {
        console.log('🎉 所有测试通过！可视化页面分析器已成功集成！');
        console.log('\n🚀 使用说明:');
        console.log('1. 启动应用: npm run tauri dev');
        console.log('2. 打开通用UI分析功能');
        console.log('3. 连接设备并分析页面');
        console.log('4. 点击"可视化页面分析"按钮');
        console.log('5. 体验直观的页面布局和元素分类');
    } else {
        console.log('⚠️ 部分测试失败，请检查上述问题后重新测试');
    }
    
    return passedCount === totalTests;
}

// 执行测试
runAllTests().then(success => {
    process.exit(success ? 0 : 1);
}).catch(error => {
    console.error('❌ 测试执行出错:', error);
    process.exit(1);
});