// 🧪 循环体皮肤测试工具
// 这个脚本将帮你快速创建测试用的循环体步骤并验证皮肤切换功能

console.log('🧪 循环体皮肤测试工具启动...');

// 1. 检查当前是否有循环体步骤
function checkExistingLoops() {
  console.log('\n🔍 检查现有循环体步骤...');
  
  const loopElements = document.querySelectorAll('[class*="loop-start"], [class*="loop-end"], [class*="loop-surface"]');
  console.log(`找到 ${loopElements.length} 个循环相关元素`);
  
  if (loopElements.length === 0) {
    console.log('⚠️  当前没有循环体步骤，皮肤效果无法显示');
    console.log('💡 建议：先添加循环开始/结束步骤，然后测试皮肤切换');
    return false;
  }
  
  loopElements.forEach((el, index) => {
    const classes = Array.from(el.classList).filter(c => c.includes('loop'));
    console.log(`  ${index + 1}. ${classes.join(' ')}`);
  });
  
  return true;
}

// 2. 测试皮肤切换并实时观察变化
function testSkinSwitchingWithObserver() {
  console.log('\n🔄 启动皮肤切换实时监控...');
  
  const skinCard = document.querySelector('[title="🎨 外观换肤"]');
  if (!skinCard) {
    console.log('❌ 找不到外观换肤卡片');
    return;
  }
  
  const loopSkinSelect = skinCard.querySelector('.ant-select');
  if (!loopSkinSelect) {
    console.log('❌ 找不到循环体皮肤选择器');
    return;
  }
  
  // 监控DOM变化
  const observer = new MutationObserver((mutations) => {
    mutations.forEach((mutation) => {
      if (mutation.type === 'attributes' && mutation.attributeName === 'class') {
        const target = mutation.target;
        const classes = Array.from(target.classList);
        const themeClasses = classes.filter(c => c.includes('loop-theme-'));
        
        if (themeClasses.length > 0) {
          console.log('🎨 检测到皮肤类变化:', themeClasses.join(' '));
        }
      }
    });
  });
  
  // 监控所有步骤卡片的类变化
  document.querySelectorAll('[class*="step-card"], [class*="draggable"]').forEach(el => {
    observer.observe(el, { attributes: true, attributeFilter: ['class'] });
  });
  
  console.log('✅ DOM变化监控已启动');
  console.log('💡 现在手动切换皮肤，将实时显示变化');
  
  // 30秒后停止监控
  setTimeout(() => {
    observer.disconnect();
    console.log('🛑 监控已停止');
  }, 30000);
}

// 3. 手动检查步骤参数中的皮肤设置
function inspectStepParameters() {
  console.log('\n📝 检查步骤参数中的皮肤设置...');
  
  // 尝试通过DOM属性查找步骤数据
  const stepElements = document.querySelectorAll('[data-testid*="step"], .draggable-step-card, [class*="step-card"]');
  
  if (stepElements.length === 0) {
    console.log('❌ 未找到步骤元素');
    return;
  }
  
  console.log(`找到 ${stepElements.length} 个步骤元素`);
  
  stepElements.forEach((el, index) => {
    const classes = Array.from(el.classList);
    const themeClasses = classes.filter(c => c.includes('loop-theme-') || c.includes('unique-blue'));
    const surfaceClasses = classes.filter(c => c.includes('surface'));
    
    if (themeClasses.length > 0 || surfaceClasses.length > 0) {
      console.log(`  步骤 ${index + 1}:`);
      console.log(`    皮肤类: ${themeClasses.join(', ') || '无'}`);
      console.log(`    表面类: ${surfaceClasses.join(', ') || '无'}`);
    }
  });
}

// 4. 强制应用皮肤进行测试
function forceApplySkinForTesting(themeName = 'rose') {
  console.log(`\n🎭 强制应用 ${themeName} 皮肤进行测试...`);
  
  const stepCards = document.querySelectorAll('.draggable-step-card, [class*="step-card"]');
  
  if (stepCards.length === 0) {
    console.log('❌ 未找到步骤卡片');
    return;
  }
  
  let appliedCount = 0;
  
  stepCards.forEach(card => {
    // 移除现有的皮肤类
    const classList = card.classList;
    Array.from(classList).forEach(className => {
      if (className.includes('loop-theme-')) {
        classList.remove(className);
      }
    });
    
    // 添加新的皮肤类
    const hasLoopSurface = Array.from(classList).some(c => c.includes('loop-surface') || c.includes('light-surface'));
    
    if (hasLoopSurface) {
      classList.add(`loop-theme-${themeName}`);
      appliedCount++;
    }
  });
  
  console.log(`✅ ${appliedCount} 个步骤卡片应用了 ${themeName} 皮肤`);
  
  if (appliedCount === 0) {
    console.log('⚠️  没有找到带有 loop-surface 或 light-surface 的卡片');
    console.log('💡 尝试给所有步骤卡片添加表面类...');
    
    stepCards.forEach(card => {
      card.classList.add('light-surface', `loop-theme-${themeName}`);
    });
    
    console.log(`✅ 强制给 ${stepCards.length} 个卡片添加了表面类和皮肤类`);
  }
}

// 5. 完整的皮肤功能测试流程
function runFullSkinTest() {
  console.log('🚀 开始完整的皮肤功能测试...\n');
  
  // Step 1: 检查现有循环
  const hasLoops = checkExistingLoops();
  
  // Step 2: 检查步骤参数
  inspectStepParameters();
  
  // Step 3: 如果没有明显的皮肤应用，强制测试
  setTimeout(() => {
    console.log('\n🔄 3秒后开始强制皮肤测试...');
    
    forceApplySkinForTesting('rose');
    
    setTimeout(() => {
      console.log('\n🔄 5秒后切换到天空皮肤...');
      forceApplySkinForTesting('sky');
      
      setTimeout(() => {
        console.log('\n🔄 再5秒后恢复默认...');
        // 移除所有皮肤类
        document.querySelectorAll('[class*="loop-theme-"]').forEach(el => {
          Array.from(el.classList).forEach(className => {
            if (className.includes('loop-theme-')) {
              el.classList.remove(className);
            }
          });
        });
        console.log('✅ 皮肤测试完成');
      }, 5000);
    }, 5000);
  }, 3000);
  
  // Step 4: 启动实时监控
  testSkinSwitchingWithObserver();
}

// 导出函数到全局
window.loopSkinTester = {
  checkExistingLoops,
  testSkinSwitchingWithObserver,
  inspectStepParameters,
  forceApplySkinForTesting,
  runFullSkinTest
};

console.log('\n🛠️  循环体皮肤测试工具准备就绪！');
console.log('');
console.log('快速命令：');
console.log('  loopSkinTester.runFullSkinTest()     - 运行完整测试');
console.log('  loopSkinTester.checkExistingLoops()  - 检查现有循环');
console.log('  loopSkinTester.forceApplySkinForTesting("rose") - 强制应用玫瑰皮肤');
console.log('  loopSkinTester.forceApplySkinForTesting("sky")  - 强制应用天空皮肤');
console.log('');

// 自动运行检查
checkExistingLoops();