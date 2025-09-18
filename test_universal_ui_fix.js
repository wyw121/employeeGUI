/**
 * 测试修复后的Universal UI页面分析功能
 */

async function testUniversalUIPageAnalysis() {
    console.log('🚀 开始测试修复后的Universal UI页面分析功能...\n');

    // 测试的设备ID
    const deviceId = 'emulator-5554';
    
    try {
        console.log(`📱 使用设备: ${deviceId}`);
        console.log('⏳ 调用 analyze_universal_ui_page...');
        
        // 直接调用Tauri命令进行测试
        const { invoke } = window.__TAURI__.tauri;
        
        const startTime = Date.now();
        const result = await invoke('analyze_universal_ui_page', { 
            device_id: deviceId 
        });
        const endTime = Date.now();
        
        console.log(`✅ 分析完成，耗时: ${endTime - startTime}ms`);
        console.log('📄 返回的XML长度:', result.length);
        
        // 检查返回结果是否包含XML内容
        const hasXML = result.includes('<?xml') || result.includes('<hierarchy');
        console.log('🔍 包含XML内容:', hasXML ? '✅ 是' : '❌ 否');
        
        if (hasXML) {
            console.log('🎉 修复成功！现在返回真正的XML内容');
            console.log('📋 XML预览 (前200字符):');
            console.log(result.substring(0, 200) + '...');
            
            // 测试XML解析
            console.log('\n🔧 测试XML元素提取...');
            const elements = await invoke('extract_page_elements', {
                xml_content: result
            });
            console.log('🎯 提取到的元素数量:', elements.length);
            
            if (elements.length > 0) {
                console.log('📝 前5个元素示例:');
                elements.slice(0, 5).forEach((element, index) => {
                    console.log(`  ${index + 1}. ${element.element_type} - "${element.text || '(无文本)'}" - 可点击: ${element.clickable}`);
                });
            }
            
        } else {
            console.log('❌ 修复失败：仍然返回简单字符串');
            console.log('📄 实际返回内容:', result);
        }
        
    } catch (error) {
        console.error('❌ 测试失败:', error);
    }
}

// 在浏览器控制台中运行测试
console.log('📋 请在浏览器控制台中运行 testUniversalUIPageAnalysis() 来测试修复后的功能');

// 如果在支持的环境中，自动运行测试
if (typeof window !== 'undefined' && window.__TAURI__) {
    // 延迟执行，确保页面加载完成
    setTimeout(() => {
        testUniversalUIPageAnalysis().catch(console.error);
    }, 2000);
}