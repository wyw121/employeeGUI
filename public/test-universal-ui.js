/**
 * 测试Universal UI页面分析功能
 */

// 仅在 Tauri 环境下启用该测试脚本，防止在浏览器环境报错
const invoke = (function() {
  try {
    return window.__TAURI__ && window.__TAURI__.core && window.__TAURI__.core.invoke
      ? window.__TAURI__.core.invoke
      : null;
  } catch (_) {
    return null;
  }
})();

async function testAnalyzeUniversalUIPage() {
  console.log('🔍 开始测试Universal UI页面分析...');
  
  try {
    if (!invoke) {
      console.warn('⚠️ 跳过 Universal UI 测试：当前非 Tauri 环境或 __TAURI__.core 未就绪');
      return { success: false, error: 'TAURI_CORE_UNAVAILABLE' };
    }
    // 测试分析页面
    const result = await invoke('analyze_universal_ui_page', { 
      device_id: 'emulator-5554'
    });
    
    console.log('✅ 页面分析成功!');
    console.log(`📏 XML长度: ${result.length}`);
    console.log(`🔍 包含XML标记: ${result.includes('<?xml') || result.includes('<hierarchy')}`);
    
    if (result.length > 0) {
      // 测试元素提取
      console.log('🔍 开始提取页面元素...');
      const elements = await invoke('extract_page_elements', { 
        xml_content: result 
      });
      
      console.log(`✅ 元素提取成功! 共找到 ${elements.length} 个元素`);
      
      if (elements.length > 0) {
        console.log('📋 示例元素:', elements.slice(0, 3));
        
        // 测试去重
        console.log('🔍 开始去重处理...');
        const deduplicated = await invoke('deduplicate_elements', { 
          elements: elements 
        });
        
        console.log(`✅ 去重完成! 最终 ${deduplicated.length} 个唯一元素`);
      }
    }
    
    return { success: true, xmlLength: result.length };
  } catch (error) {
    console.error('❌ 测试失败:', error);
    return { success: false, error: error.toString() };
  }
}

// 将测试函数暴露到全局（始终暴露，但在非 Tauri 环境下将提示跳过）
window.testUniversalUI = testAnalyzeUniversalUIPage;
console.log('🧪 Universal UI测试函数已准备就绪! 运行: testUniversalUI()');