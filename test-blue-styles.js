// 🔵 蓝色循环样式测试脚本
// 复制此代码到浏览器 Console 中运行

(function() {
  console.log('🔵 开始蓝色循环样式测试...');
  
  // 测试1: 验证CSS是否加载
  function checkCSSLoaded() {
    const stylesheets = document.styleSheets;
    let loopCssFound = false;
    
    for (let sheet of stylesheets) {
      try {
        for (let rule of sheet.cssRules) {
          if (rule.selectorText && rule.selectorText.includes('unique-blue-loop')) {
            loopCssFound = true;
            break;
          }
        }
      } catch (e) {
        // 跨域样式表
      }
    }
    
    console.log(`✅ CSS状态检查: ${loopCssFound ? '✅ unique-blue-loop 样式已加载' : '❌ unique-blue-loop 样式未找到'}`);
    return loopCssFound;
  }
  
  // 测试2: 查找所有循环卡片
  function findLoopCards() {
    const loopCards = document.querySelectorAll('.loop-anchor, .loop-surface');
    console.log(`🔍 找到 ${loopCards.length} 个循环相关卡片`);
    
    loopCards.forEach((card, index) => {
      const classes = Array.from(card.classList);
      console.log(`卡片 #${index + 1}:`, classes.join(', '));
    });
    
    return loopCards;
  }
  
  // 测试3: 临时添加蓝色样式
  function applyBlueStyles() {
    const loopCards = document.querySelectorAll('.loop-anchor, .loop-surface');
    let appliedCount = 0;
    
    loopCards.forEach((card, index) => {
      if (!card.classList.contains('unique-blue-loop')) {
        card.classList.add('unique-blue-loop');
        appliedCount++;
        console.log(`✅ 卡片 #${index + 1} 已应用蓝色样式`);
      } else {
        console.log(`ℹ️ 卡片 #${index + 1} 已有蓝色样式`);
      }
    });
    
    console.log(`🔵 总共应用了 ${appliedCount} 个蓝色样式`);
    return appliedCount;
  }
  
  // 测试4: 移除蓝色样式
  function removeBlueStyles() {
    const blueCards = document.querySelectorAll('.unique-blue-loop');
    blueCards.forEach(card => card.classList.remove('unique-blue-loop'));
    console.log(`🔄 已移除 ${blueCards.length} 个蓝色样式`);
  }
  
  // 测试5: 通过参数启用蓝色样式（模拟真实使用）
  function simulateBlueLoop() {
    console.log('🎯 模拟在步骤参数中启用蓝色样式...');
    console.log('在实际使用中，你需要在步骤数据中添加:');
    console.log(`{
  "parameters": {
    "uniqueBlueLoop": true,
    "loops": 3,
    // ...其他参数
  }
}`);
    
    // 检查是否有循环开始步骤
    const loopStarts = document.querySelectorAll('[data-loop-badge="START"]');
    if (loopStarts.length > 0) {
      console.log(`✅ 找到 ${loopStarts.length} 个循环开始步骤`);
      console.log('可以通过编辑这些步骤的参数来启用蓝色样式');
    } else {
      console.log('ℹ️ 当前页面没有循环步骤，请先创建循环步骤');
    }
  }
  
  // 执行所有测试
  console.log('='.repeat(50));
  checkCSSLoaded();
  console.log('='.repeat(50));
  findLoopCards();
  console.log('='.repeat(50));
  simulateBlueLoop();
  console.log('='.repeat(50));
  
  // 暴露测试函数到全局
  window.blueStyleTest = {
    checkCSS: checkCSSLoaded,
    findCards: findLoopCards,
    apply: applyBlueStyles,
    remove: removeBlueStyles,
    simulate: simulateBlueLoop,
    
    // 快速测试函数
    quickTest() {
      console.log('🚀 快速测试蓝色样式...');
      const applied = applyBlueStyles();
      if (applied > 0) {
        console.log('✅ 蓝色样式已应用！你应该看到卡片变成蓝色系');
        setTimeout(() => {
          console.log('⏰ 5秒后自动移除测试样式...');
          removeBlueStyles();
          console.log('🔄 测试样式已移除');
        }, 5000);
      }
      return applied;
    }
  };
  
  console.log('💡 使用方法:');
  console.log('- blueStyleTest.quickTest() // 快速测试（5秒后自动移除）');
  console.log('- blueStyleTest.apply() // 应用蓝色样式');
  console.log('- blueStyleTest.remove() // 移除蓝色样式');
  console.log('- blueStyleTest.checkCSS() // 检查CSS加载状态');
  
})();