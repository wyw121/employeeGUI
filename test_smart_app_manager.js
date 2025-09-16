// 测试 SmartAppManager 功能的简单脚本

async function testSmartAppManager() {
    try {
        console.log('🚀 开始测试 SmartAppManager...');
        
        // 检查是否存在 Tauri API
        if (!window.__TAURI__) {
            console.error('❌ Tauri API 不可用');
            return;
        }
        
        const { invoke } = window.__TAURI__.core;
        
        // 测试获取设备应用
        console.log('📱 测试获取设备应用列表...');
        const apps = await invoke('get_device_apps', { 
            deviceId: 'emulator-5554' 
        });
        
        console.log('✅ 成功获取应用列表：', apps);
        console.log(`📊 发现 ${apps.length} 个应用`);
        
        // 查找小红书应用
        const xiaohongshu = apps.find(app => 
            app.package_name.includes('xingin') || 
            app.app_name.includes('小红书')
        );
        
        if (xiaohongshu) {
            console.log('🎉 找到小红书应用：', xiaohongshu);
        } else {
            console.log('ℹ️ 未找到小红书应用');
        }
        
    } catch (error) {
        console.error('❌ 测试失败：', error);
    }
}

// 等待页面加载后测试
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', testSmartAppManager);
} else {
    testSmartAppManager();
}