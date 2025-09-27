// 🔍 循环体皮肤切换问题诊断脚本
// 在浏览器控制台中运行此脚本，快速定位问题

console.log('🚀 开始诊断循环体皮肤切换问题...');

// 1. 检查外观换肤UI是否存在
function checkSkinUI() {
  console.log('\n📋 1. 检查外观换肤UI组件...');
  
  const skinCard = document.querySelector('[title="🎨 外观换肤"]');
  if (!skinCard) {
    console.log('❌ 找不到"🎨 外观换肤"卡片');
    return false;
  }
  console.log('✅ 外观换肤卡片存在');
  
  const loopSkinSelect = skinCard.querySelector('.ant-select[title="默认皮肤"]');
  const nonLoopSkinSelect = skinCard.querySelectorAll('.ant-select')[1];
  
  console.log('循环体皮肤选择器:', loopSkinSelect ? '✅ 存在' : '❌ 不存在');
  console.log('非循环皮肤选择器:', nonLoopSkinSelect ? '✅ 存在' : '❌ 不存在');
  
  return skinCard;
}

// 2. 检查皮肤主题样式是否加载
function checkThemeStyles() {
  console.log('\n🎨 2. 检查皮肤主题样式...');
  
  const stylesheets = Array.from(document.styleSheets);
  let foundThemeStyles = false;
  
  for (let sheet of stylesheets) {
    try {
      const rules = Array.from(sheet.cssRules || []);
      const themeRules = rules.filter(rule => 
        rule.selectorText && (
          rule.selectorText.includes('loop-theme-rose') ||
          rule.selectorText.includes('loop-theme-sky')
        )
      );
      
      if (themeRules.length > 0) {
        foundThemeStyles = true;
        console.log('✅ 找到皮肤主题样式:', themeRules.length, '条规则');
        themeRules.slice(0, 3).forEach(rule => {
          console.log('  -', rule.selectorText);
        });
      }
    } catch (e) {
      // 跨域样式表，跳过
    }
  }
  
  if (!foundThemeStyles) {
    console.log('❌ 未找到皮肤主题样式 (loop-theme-rose, loop-theme-sky)');
  }
  
  return foundThemeStyles;
}

// 3. 测试皮肤切换功能
function testSkinSwitching() {
  console.log('\n🔄 3. 测试皮肤切换功能...');
  
  const skinCard = document.querySelector('[title="🎨 外观换肤"]');
  if (!skinCard) {
    console.log('❌ 无法测试：找不到外观换肤卡片');
    return;
  }
  
  const selectors = skinCard.querySelectorAll('.ant-select');
  if (selectors.length < 2) {
    console.log('❌ 无法测试：皮肤选择器数量不足');
    return;
  }
  
  console.log('💡 手动测试步骤:');
  console.log('  1. 点击"循环体皮肤"下拉框');
  console.log('  2. 选择"玫瑰（rose）"或"晴空（sky）"');
  console.log('  3. 观察循环体步骤卡片是否变色');
  console.log('  4. 检查浏览器开发者工具中步骤参数是否包含 loopTheme 字段');
  
  // 自动点击测试（可选）
  const firstSelect = selectors[0];
  firstSelect.click();
  setTimeout(() => {
    const dropdown = document.querySelector('.ant-select-dropdown:not(.ant-select-dropdown-hidden)');
    if (dropdown) {
      console.log('✅ 下拉菜单已打开');
      const roseOption = Array.from(dropdown.querySelectorAll('.ant-select-item')).find(
        item => item.textContent?.includes('玫瑰')
      );
      if (roseOption) {
        console.log('✅ 找到玫瑰皮肤选项，即将自动选择...');
        roseOption.click();
        
        setTimeout(() => {
          checkAppliedThemes();
        }, 500);
      }
    }
  }, 100);
}

// 4. 检查已应用的主题
function checkAppliedThemes() {
  console.log('\n🔍 4. 检查已应用的主题...');
  
  const stepCards = document.querySelectorAll('.draggable-step-card, [class*="step-card"]');
  console.log(`找到 ${stepCards.length} 个步骤卡片`);
  
  let appliedCount = 0;
  stepCards.forEach((card, index) => {
    const classes = Array.from(card.classList);
    const themeClasses = classes.filter(cls => cls.includes('loop-theme-') || cls.includes('unique-blue-loop'));
    
    if (themeClasses.length > 0) {
      appliedCount++;
      console.log(`  步骤 ${index + 1}: ${themeClasses.join(', ')}`);
    }
  });
  
  console.log(`✅ ${appliedCount} 个步骤卡片应用了皮肤主题`);
  
  if (appliedCount === 0) {
    console.log('❌ 没有步骤卡片应用皮肤主题');
    console.log('💡 可能的原因:');
    console.log('  1. 步骤参数中缺少 loopTheme/cardTheme 字段');
    console.log('  2. CSS 类名生成逻辑有问题');
    console.log('  3. 样式文件未正确加载');
  }
}

// 5. 检查步骤参数中的主题设置
function checkStepParameters() {
  console.log('\n📝 5. 检查步骤参数中的主题设置...');
  
  // 尝试从 React DevTools 或全局状态中获取步骤数据
  if (window.React && window.React.__SECRET_INTERNALS_DO_NOT_USE_OR_YOU_WILL_BE_FIRED) {
    console.log('🔍 尝试从 React 内部获取状态...');
    // 这部分需要更复杂的实现
  }
  
  // 检查 DOM 中的数据属性
  const stepElements = document.querySelectorAll('[data-step-id], [data-testid*="step"]');
  console.log(`找到 ${stepElements.length} 个可能的步骤元素`);
  
  console.log('💡 手动检查步骤参数:');
  console.log('  1. 打开浏览器开发者工具');
  console.log('  2. 在 Components 标签中查找 DraggableStepCard');
  console.log('  3. 检查 step.parameters 中是否有 loopTheme/cardTheme 字段');
}

// 执行诊断
async function runDiagnosis() {
  checkSkinUI();
  checkThemeStyles();
  checkStepParameters();
  
  console.log('\n🎯 下一步测试建议:');
  console.log('  执行 testSkinSwitching() 来测试皮肤切换');
  
  // 自动执行皮肤切换测试
  setTimeout(() => {
    testSkinSwitching();
  }, 1000);
}

// 导出测试函数到全局
window.debugLoopSkin = {
  runDiagnosis,
  checkSkinUI,
  checkThemeStyles,
  testSkinSwitching,
  checkAppliedThemes,
  checkStepParameters
};

console.log('\n🛠️  诊断工具已准备就绪!');
console.log('执行 debugLoopSkin.runDiagnosis() 开始完整诊断');
console.log('或单独执行各个检查函数：');
console.log('  debugLoopSkin.checkSkinUI()');
console.log('  debugLoopSkin.testSkinSwitching()');
console.log('  debugLoopSkin.checkAppliedThemes()');

// 自动开始诊断
runDiagnosis();