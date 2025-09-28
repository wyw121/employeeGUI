// 简单测试新添加的 Tauri 命令
// 通过浏览器控制台运行
console.log("🧪 开始测试 adb_start_activity 命令");

async function testNewCommand() {
    try {
        // 检查Tauri环境
        if (typeof window.__TAURI__ === 'undefined') {
            console.error("❌ 不在 Tauri 环境中");
            return;
        }
        
        console.log("✅ 在 Tauri 环境中，开始测试...");
        
        // 测试新的adb_start_activity命令
        const result = await window.__TAURI__.tauri.invoke('adb_start_activity', {
            device_id: 'test_device',
            action: 'android.intent.action.VIEW',
            data_uri: 'file:///sdcard/test.vcf',
            mime_type: 'text/x-vcard',
            component: null
        });
        
        console.log("✅ adb_start_activity 命令调用成功:", result);
        
        if (result.success) {
            console.log("🎉 命令执行成功!");
        } else {
            console.log("⚠️ 命令执行失败，但调用成功:", result.message);
        }
        
    } catch (error) {
        console.error("❌ 命令调用失败:", error);
    }
}

// 运行测试
testNewCommand();