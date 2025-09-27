// 🔵 蓝色循环样式内联解决方案
// 解决CSS文件加载问题，直接通过JavaScript注入样式

(function() {
  console.log('🔵 正在注入蓝色循环样式...');
  
  // 1. 创建样式表
  function createBlueLoopStyles() {
    // 检查是否已存在
    let existingStyle = document.getElementById('blue-loop-inline-styles');
    if (existingStyle) {
      existingStyle.remove();
    }
    
    const style = document.createElement('style');
    style.id = 'blue-loop-inline-styles';
    style.textContent = `
/* 🔵 独特蓝色循环样式 - 内联版本 */

.unique-blue-loop {
  background-color: #f0f9ff !important;
  border-color: #2563eb !important;
  box-shadow: 0 4px 6px -1px rgba(37, 99, 235, 0.1), 0 2px 4px -2px rgba(37, 99, 235, 0.1) !important;
}

.unique-blue-loop::before {
  content: "🔵 BLUE";
  position: absolute;
  top: 8px;
  left: 12px;
  background-color: #3b82f6;
  color: white;
  font-size: 10px;
  font-weight: bold;
  padding: 2px 6px;
  border-radius: 4px;
  z-index: 10;
  pointer-events: none;
}

.unique-blue-loop .ant-card-head {
  background-color: #1d4ed8 !important;
  border-color: #2563eb !important;
}

.unique-blue-loop .ant-card-head-title > .flex {
  background-color: transparent !important;
  padding: 8px 0 !important;
  margin: -8px 0 !important;
  border-radius: 8px !important;
}

.unique-blue-loop .ant-card-head .ant-typography,
.unique-blue-loop .ant-card-head .anticon,
.unique-blue-loop .ant-card-head .ant-tag {
  color: #ffffff !important;
}

.unique-blue-loop .ant-card-head .ant-tag {
  background-color: rgba(255, 255, 255, 0.2) !important;
  border-color: rgba(255, 255, 255, 0.3) !important;
  color: #ffffff !important;
}

.unique-blue-loop .ant-card-head .ant-btn {
  background-color: rgba(255, 255, 255, 0.15) !important;
  border-color: rgba(255, 255, 255, 0.25) !important;
  color: #ffffff !important;
}

.unique-blue-loop .ant-card-head .ant-btn:hover {
  background-color: rgba(255, 255, 255, 0.25) !important;
  border-color: rgba(255, 255, 255, 0.4) !important;
}

.unique-blue-loop .ant-card-head .ant-switch-checked {
  background-color: #60a5fa !important;
}

.unique-blue-loop .ant-card-body {
  background-color: #f0f9ff !important;
  color: #1e40af !important;
}

.unique-blue-loop .ant-card-body .ant-typography,
.unique-blue-loop .ant-card-body .anticon,
.unique-blue-loop .ant-card-body .ant-btn {
  color: #1e40af !important;
}

.unique-blue-loop .ant-card-body .ant-btn-link {
  color: #2563eb !important;
}

.unique-blue-loop .ant-card-body .ant-btn-link:hover {
  color: #1d4ed8 !important;
}

/* 循环体内步骤的蓝色样式 */
.unique-blue-loop.in-loop-step,
.unique-blue-loop .in-loop-step {
  background-color: #eff6ff !important;
  color: #1e40af !important;
}

.unique-blue-loop.in-loop-step .ant-card-head,
.unique-blue-loop.in-loop-step .ant-card-body,
.unique-blue-loop .in-loop-step .ant-card-head,
.unique-blue-loop .in-loop-step .ant-card-body {
  background-color: #eff6ff !important;
  color: #1e40af !important;
}

.unique-blue-loop .in-loop-step .ant-typography,
.unique-blue-loop .in-loop-step .anticon,
.unique-blue-loop .in-loop-step .ant-btn {
  color: #1e40af !important;
}
`;
    
    document.head.appendChild(style);
    console.log('✅ 蓝色样式已注入到页面');
    return style;
  }
  
  // 2. 应用蓝色类名到循环卡片
  function applyBlueClasses() {
    const loopCards = document.querySelectorAll('.loop-anchor, .loop-surface');
    let appliedCount = 0;
    
    loopCards.forEach((card, index) => {
      if (!card.classList.contains('unique-blue-loop')) {
        card.classList.add('unique-blue-loop');
        appliedCount++;
        console.log(`✅ 卡片 #${index + 1} 已添加 unique-blue-loop 类`);
      }
    });
    
    console.log(`🔵 总共应用了 ${appliedCount} 个蓝色类名`);
    return appliedCount;
  }
  
  // 3. 移除蓝色样式
  function removeBlueStyles() {
    // 移除样式表
    const style = document.getElementById('blue-loop-inline-styles');
    if (style) style.remove();
    
    // 移除类名
    const blueCards = document.querySelectorAll('.unique-blue-loop');
    blueCards.forEach(card => card.classList.remove('unique-blue-loop'));
    
    console.log(`🔄 已移除蓝色样式和 ${blueCards.length} 个类名`);
  }
  
  // 4. 完整的蓝色样式应用
  function activateBlueLoop() {
    console.log('🚀 激活完整蓝色循环样式...');
    createBlueLoopStyles();
    const applied = applyBlueClasses();
    
    if (applied > 0) {
      console.log('🎉 蓝色循环样式已成功激活！');
      console.log('你现在应该看到:');
      console.log('- 深蓝色边框和浅蓝色背景');
      console.log('- 深蓝色头部区域');  
      console.log('- 左上角的 "🔵 BLUE" 标签');
      console.log('- 白色文字在蓝色头部');
    }
    
    return applied;
  }
  
  // 5. 检测步骤参数中的uniqueBlueLoop设置
  function detectBlueLoopParams() {
    console.log('🔍 检测步骤参数中的 uniqueBlueLoop 设置...');
    
    // 这里需要检查实际的步骤数据
    // 由于无法直接访问React状态，我们提供指导
    console.log('要启用蓝色样式，请在步骤参数中设置:');
    console.log('{');
    console.log('  "parameters": {');
    console.log('    "uniqueBlueLoop": true,');
    console.log('    "loops": 3,');
    console.log('    // ...其他参数');
    console.log('  }');
    console.log('}');
  }
  
  // 立即执行
  activateBlueLoop();
  detectBlueLoopParams();
  
  // 暴露到全局
  window.blueLoopFix = {
    activate: activateBlueLoop,
    createStyles: createBlueLoopStyles,
    applyClasses: applyBlueClasses,
    remove: removeBlueStyles,
    detect: detectBlueLoopParams
  };
  
  console.log('💡 可用命令:');
  console.log('- blueLoopFix.activate() // 完整激活');
  console.log('- blueLoopFix.remove() // 移除样式');
  console.log('- blueLoopFix.detect() // 参数设置指导');
  
})();