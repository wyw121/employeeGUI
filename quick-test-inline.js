// 🧪 完整的内联测试脚本 - 直接复制粘贴到 Console

(function() {
  console.log('🧪 开始测试白色循环样式 (内联版本)...');

  // 1. 查找所有循环锚点卡片
  const loopAnchors = document.querySelectorAll('.loop-anchor');
  console.log(`找到 ${loopAnchors.length} 个循环锚点`);

  // 2. 查找所有循环体内步骤
  const inLoopSteps = document.querySelectorAll('.in-loop-step');
  console.log(`找到 ${inLoopSteps.length} 个循环体内步骤`);

  // 3. 应用内联样式的函数
  function applyInlineTestStyles() {
    let count = 0;
    
    [...loopAnchors, ...inLoopSteps].forEach((element, index) => {
      if (element.dataset.testStyleApplied) return;
      
      // 应用卡片样式
      Object.assign(element.style, {
        backgroundColor: '#ffffff',
        border: '2px solid #e879f9',
        boxShadow: '0 4px 12px rgba(232, 121, 249, 0.15)',
        position: 'relative'
      });
      
      // 查找并样式化头部
      const cardHead = element.querySelector('.ant-card-head');
      if (cardHead) {
        Object.assign(cardHead.style, {
          backgroundColor: '#fdf4ff',
          borderBottom: '2px solid #e879f9'
        });
        
        // 样式化头部标题区域
        const titleFlex = cardHead.querySelector('.flex');
        if (titleFlex) {
          Object.assign(titleFlex.style, {
            backgroundColor: '#a855f7',
            color: '#ffffff',
            borderRadius: '8px',
            boxShadow: '0 2px 4px rgba(168, 85, 247, 0.3)'
          });
          
          // 样式化头部所有文字和图标
          const textElements = titleFlex.querySelectorAll('.ant-typography, .anticon, .ant-tag, span, strong');
          textElements.forEach(el => {
            el.style.color = '#ffffff';
          });
        }
        
        // 样式化头部按钮
        const buttons = cardHead.querySelectorAll('.ant-btn');
        buttons.forEach(btn => {
          Object.assign(btn.style, {
            backgroundColor: 'rgba(255, 255, 255, 0.1)',
            borderColor: 'rgba(255, 255, 255, 0.4)',
            color: '#ffffff'
          });
          
          // 按钮内文字也设为白色
          const btnText = btn.querySelectorAll('span, .anticon');
          btnText.forEach(text => {
            text.style.color = '#ffffff';
          });
        });
      }
      
      // 查找并样式化内容区
      const cardBody = element.querySelector('.ant-card-body');
      if (cardBody) {
        Object.assign(cardBody.style, {
          backgroundColor: '#ffffff',
          color: '#1f2937'
        });
        
        // 样式化内容区文字和图标
        const bodyElements = cardBody.querySelectorAll('.ant-typography, .anticon, span');
        bodyElements.forEach(el => {
          if (!el.closest('.ant-btn-link')) {
            el.style.color = '#1f2937';
          }
        });
        
        // 样式化链接按钮
        const linkBtns = cardBody.querySelectorAll('.ant-btn-link');
        linkBtns.forEach(btn => {
          btn.style.color = '#a855f7';
          const btnText = btn.querySelectorAll('span, .anticon');
          btnText.forEach(text => {
            text.style.color = '#a855f7';
          });
        });
      }
      
      // 添加测试标签
      const testLabel = document.createElement('div');
      testLabel.innerHTML = '🧪 TEST';
      testLabel.className = 'inline-test-label';
      Object.assign(testLabel.style, {
        position: 'absolute',
        top: '-8px',
        left: '12px',
        backgroundColor: '#f59e0b',
        color: '#ffffff',
        fontSize: '10px',
        fontWeight: 'bold',
        padding: '2px 6px',
        borderRadius: '4px',
        zIndex: '10',
        boxShadow: '0 1px 3px rgba(0, 0, 0, 0.2)'
      });
      element.appendChild(testLabel);
      
      // 标记已应用
      element.dataset.testStyleApplied = 'true';
      count++;
      
      console.log(`✅ 已给元素 #${index + 1} 应用内联测试样式`);
    });
    
    console.log(`🎉 总共应用了 ${count} 个内联测试样式`);
    
    if (count > 0) {
      console.log('🔍 应该立即看到:');
      console.log('  🎨 卡片变为纯白背景 + 紫色边框');
      console.log('  💜 头部变为深紫色背景 + 白色文字');
      console.log('  🧪 左上角显示橙色 "🧪 TEST" 标签');
      console.log('  ✨ 与原来的蓝色系完全不同');
    }
  }

  // 4. 移除内联样式的函数
  function removeInlineTestStyles() {
    let count = 0;
    
    document.querySelectorAll('[data-test-style-applied]').forEach((element, index) => {
      // 移除内联样式
      element.style.cssText = '';
      
      // 移除测试标签
      const testLabel = element.querySelector('.inline-test-label');
      if (testLabel) {
        testLabel.remove();
      }
      
      // 重置子元素样式
      const allChildren = element.querySelectorAll('*');
      allChildren.forEach(child => {
        child.style.cssText = '';
      });
      
      delete element.dataset.testStyleApplied;
      count++;
      console.log(`🔄 已从元素 #${index + 1} 移除内联测试样式`);
    });
    
    console.log(`🎯 总共移除了 ${count} 个内联测试样式`);
  }

  // 5. 验证效果的函数
  function validateInlineStyles() {
    const styledElements = document.querySelectorAll('[data-test-style-applied]');
    
    if (styledElements.length === 0) {
      console.log('❌ 没有找到应用内联测试样式的元素');
      return false;
    }
    
    console.log(`🔍 正在验证 ${styledElements.length} 个内联样式元素...`);
    
    styledElements.forEach((element, index) => {
      const computedStyle = window.getComputedStyle(element);
      const bgColor = computedStyle.backgroundColor;
      const borderColor = computedStyle.borderColor;
      
      console.log(`元素 #${index + 1}:`);
      console.log(`  背景色: ${bgColor}`);
      console.log(`  边框色: ${borderColor}`);
      
      // 检查测试标签
      const testLabel = element.querySelector('.inline-test-label');
      const hasTestLabel = testLabel && testLabel.innerHTML === '🧪 TEST';
      console.log(`  测试标签: ${hasTestLabel ? '✅ 有' : '❌ 无'}`);
    });
    
    return true;
  }

  // 6. 导出全局函数
  window.testInline = {
    apply: applyInlineTestStyles,
    remove: removeInlineTestStyles,
    validate: validateInlineStyles,
    
    toggle: function() {
      const hasInlineStyle = document.querySelector('[data-test-style-applied]');
      if (hasInlineStyle) {
        this.remove();
        console.log('🔄 已切换到默认样式');
      } else {
        this.apply();
        console.log('🧪 已切换到内联测试样式');
      }
    }
  };

  console.log('🎮 内联样式版本可用命令:');
  console.log('  testInline.apply()    - 应用内联测试样式');
  console.log('  testInline.remove()   - 移除内联测试样式');
  console.log('  testInline.validate() - 验证样式效果');
  console.log('  testInline.toggle()   - 切换样式');

  // 7. 自动检测并提示
  if (loopAnchors.length > 0 || inLoopSteps.length > 0) {
    console.log('🚀 检测到循环元素，可以立即测试！');
    console.log('💡 执行 testInline.apply() 立即查看效果');
    console.log('✨ 这个版本使用内联样式，不依赖CSS文件加载！');
  } else {
    console.log('⚠️  没有检测到循环元素，请确认页面上有循环步骤');
  }

  console.log('');
  console.log('🎯 快速开始：复制下面这行命令并执行');
  console.log('testInline.apply()');

})();