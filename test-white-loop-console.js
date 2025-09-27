// 🧪 测试白色循环样式 - 浏览器Console验证脚本

console.log('🧪 开始测试白色循环样式...');

// 1. 查找所有循环锚点卡片
const loopAnchors = document.querySelectorAll('.loop-anchor');
console.log(`找到 ${loopAnchors.length} 个循环锚点`);

// 2. 查找所有循环体内步骤
const inLoopSteps = document.querySelectorAll('.in-loop-step');
console.log(`找到 ${inLoopSteps.length} 个循环体内步骤`);

// 3. 应用测试样式的函数
function applyTestWhiteStyle() {
  let count = 0;
  
  // 给循环锚点应用测试样式
  loopAnchors.forEach((element, index) => {
    if (!element.classList.contains('test-white-loop')) {
      element.classList.add('test-white-loop');
      count++;
      console.log(`✅ 已给循环锚点 #${index + 1} 应用测试样式`);
    }
  });
  
  // 给循环体内步骤应用测试样式  
  inLoopSteps.forEach((element, index) => {
    if (!element.classList.contains('test-white-loop')) {
      element.classList.add('test-white-loop');
      count++;
      console.log(`✅ 已给循环体步骤 #${index + 1} 应用测试样式`);
    }
  });
  
  console.log(`🎉 总共应用了 ${count} 个测试样式`);
  
  if (count > 0) {
    console.log('🔍 验证要点:');
    console.log('  1. 卡片背景应该变为纯白色');
    console.log('  2. 边框应该变为淡紫色');
    console.log('  3. 头部应该变为深紫色背景');
    console.log('  4. 左上角应该显示 "🧪 TEST" 标签');
    console.log('  5. 所有文字应该清晰可读');
  }
}

// 4. 移除测试样式的函数
function removeTestWhiteStyle() {
  let count = 0;
  
  document.querySelectorAll('.test-white-loop').forEach((element, index) => {
    element.classList.remove('test-white-loop');
    count++;
    console.log(`🔄 已从元素 #${index + 1} 移除测试样式`);
  });
  
  console.log(`🎯 总共移除了 ${count} 个测试样式`);
}

// 5. 样式验证函数
function validateTestStyles() {
  const testElements = document.querySelectorAll('.test-white-loop');
  
  if (testElements.length === 0) {
    console.log('❌ 没有找到应用测试样式的元素');
    return false;
  }
  
  console.log(`🔍 正在验证 ${testElements.length} 个测试样式元素...`);
  
  testElements.forEach((element, index) => {
    const computedStyle = window.getComputedStyle(element);
    const bgColor = computedStyle.backgroundColor;
    const borderColor = computedStyle.borderColor;
    
    console.log(`元素 #${index + 1}:`);
    console.log(`  背景色: ${bgColor}`);
    console.log(`  边框色: ${borderColor}`);
    
    // 检查是否有测试标签
    const hasTestLabel = element.querySelector('::before') || 
                        computedStyle.getPropertyValue('content').includes('TEST');
    console.log(`  测试标签: ${hasTestLabel ? '✅ 有' : '❌ 无'}`);
  });
  
  return true;
}

// 6. 导出全局函数供手动调用
window.testWhiteLoop = {
  apply: applyTestWhiteStyle,
  remove: removeTestWhiteStyle,
  validate: validateTestStyles,
  
  // 快捷方法
  toggle: function() {
    const hasTestStyle = document.querySelector('.test-white-loop');
    if (hasTestStyle) {
      this.remove();
      console.log('🔄 已切换到默认样式');
    } else {
      this.apply();
      console.log('🧪 已切换到测试样式');
    }
  }
};

console.log('🎮 可用命令:');
console.log('  testWhiteLoop.apply()    - 应用测试样式');
console.log('  testWhiteLoop.remove()   - 移除测试样式'); 
console.log('  testWhiteLoop.validate() - 验证样式效果');
console.log('  testWhiteLoop.toggle()   - 切换样式');

// 7. 自动检测并提示
if (loopAnchors.length > 0 || inLoopSteps.length > 0) {
  console.log('🚀 检测到循环元素，可以开始测试！');
  console.log('💡 执行 testWhiteLoop.apply() 立即查看效果');
} else {
  console.log('⚠️  没有检测到循环元素，请确认页面上有循环步骤');
}

// 8. 监听CSS加载状态
const checkCSSLoaded = () => {
  try {
    // 方法1: 检查stylesheets
    const fromStyleSheets = [...document.styleSheets].some(sheet => {
      try {
        return [...sheet.cssRules].some(rule => 
          rule.selectorText && rule.selectorText.includes('test-white-loop')
        );
      } catch (e) {
        return false;
      }
    });
    
    // 方法2: 创建临时元素测试样式
    const testEl = document.createElement('div');
    testEl.className = 'test-white-loop';
    testEl.style.position = 'absolute';
    testEl.style.left = '-9999px';
    document.body.appendChild(testEl);
    
    const computedStyle = window.getComputedStyle(testEl);
    const hasBorder = computedStyle.borderColor.includes('232, 121, 249') || 
                     computedStyle.borderColor.includes('#e879f9');
    
    document.body.removeChild(testEl);
    
    return fromStyleSheets || hasBorder;
  } catch (e) {
    return false;
  }
};

const loopCssLoaded = checkCSSLoaded();

console.log(`CSS 加载状态: ${loopCssLoaded ? '✅ 已加载' : '❌ 未加载 test-white-loop 样式'}`);

if (!loopCssLoaded) {
  console.warn('⚠️  未检测到 test-white-loop 样式，可能需要:');
  console.warn('   1. 强制刷新页面 (Ctrl+F5)');
  console.warn('   2. 检查 loop.css 文件是否正确加载');
  console.warn('   3. 启动开发服务器 (npm run tauri dev)');
} else {
  console.log('🎉 样式已加载，可以开始测试了！');
}