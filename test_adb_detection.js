// 测试智能ADB路径检测的脚本
// 通过浏览器控制台运行此脚本

async function testSmartAdbDetection() {
    console.log('开始测试智能ADB路径检测...');
    
    try {
        // 测试智能ADB路径检测
        const smartPath = await window.__TAURI__.invoke('detect_smart_adb_path');
        console.log('智能ADB路径检测成功:', smartPath);
        
        // 使用检测到的路径测试设备列表
        if (smartPath) {
            const devices = await window.__TAURI__.invoke('get_adb_devices', { 
                adb_path: smartPath 
            });
            console.log('设备检测结果:', devices);
            
            if (devices && devices.includes('device')) {
                console.log('✅ 成功检测到连接的设备');
                return { success: true, path: smartPath, devices };
            } else {
                console.log('⚠️ 未检测到连接的设备');
                return { success: false, path: smartPath, devices, error: '无设备连接' };
            }
        } else {
            console.log('❌ 未能检测到ADB路径');
            return { success: false, error: '无法检测ADB路径' };
        }
    } catch (error) {
        console.error('❌ 测试失败:', error);
        return { success: false, error: error.toString() };
    }
}

// 运行测试
testSmartAdbDetection().then(result => {
    console.log('测试结果:', result);
    if (result.success) {
        console.log('🎉 智能ADB路径检测功能正常工作！');
    } else {
        console.log('💥 智能ADB路径检测存在问题');
    }
});