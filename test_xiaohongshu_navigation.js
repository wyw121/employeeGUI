// 测试小红书导航功能的简单脚本
import { execSync } from 'child_process';

console.log('🧪 测试小红书导航功能');

try {
    // 1. 检查ADB连接
    console.log('📱 1. 检查ADB设备连接...');
    const devices = execSync('cd platform-tools && .\\adb.exe devices', { encoding: 'utf8' });
    console.log('设备列表:', devices);
    
    if (!devices.includes('emulator-5554')) {
        console.error('❌ 模拟器未连接');
        process.exit(1);
    }
    
    // 2. 检查小红书应用状态
    console.log('📱 2. 检查小红书应用状态...');
    const activity = execSync('cd platform-tools && .\\adb.exe -s emulator-5554 shell "dumpsys activity activities | grep mResumedActivity"', { encoding: 'utf8' });
    console.log('当前活动:', activity.trim());
    
    const isXiaohongshuRunning = activity.includes('com.xingin.xhs');
    console.log(`小红书运行状态: ${isXiaohongshuRunning ? '✅ 正在运行' : '❌ 未运行'}`);
    
    if (!isXiaohongshuRunning) {
        console.log('🚀 启动小红书应用...');
        execSync('cd platform-tools && .\\adb.exe -s emulator-5554 shell "am start -n com.xingin.xhs/.index.v2.IndexActivityV2"', { encoding: 'utf8' });
        console.log('⏳ 等待应用启动...');
        setTimeout(() => {}, 3000); // 等待3秒
    }
    
    // 3. 获取UI dump测试
    console.log('📄 3. 测试UI dump功能...');
    const uiDump = execSync('cd platform-tools && .\\adb.exe -s emulator-5554 shell "uiautomator dump && cat /sdcard/window_dump.xml"', { encoding: 'utf8' });
    
    if (uiDump.includes('<?xml')) {
        console.log('✅ UI dump成功，XML长度:', uiDump.length, '字符');
        
        // 检查关键元素
        const hasXiaohongshu = uiDump.includes('com.xingin.xhs');
        const hasSidebar = uiDump.includes('设置') || uiDump.includes('我的主页');
        const hasFollow = uiDump.includes('关注');
        
        console.log('UI元素检测:');
        console.log(`- 小红书包名: ${hasXiaohongshu ? '✅' : '❌'}`);
        console.log(`- 侧边栏元素: ${hasSidebar ? '✅' : '❌'}`);
        console.log(`- 关注相关: ${hasFollow ? '✅' : '❌'}`);
        
        // 如果没有侧边栏，尝试点击头像
        if (!hasSidebar) {
            console.log('👤 4. 尝试点击头像打开侧边栏...');
            execSync('cd platform-tools && .\\adb.exe -s emulator-5554 shell "input tap 60 100"', { encoding: 'utf8' });
            console.log('⏳ 等待侧边栏打开...');
            setTimeout(() => {}, 2000);
            
            // 重新获取UI
            const sidebarUI = execSync('cd platform-tools && .\\adb.exe -s emulator-5554 shell "uiautomator dump && cat /sdcard/window_dump.xml"', { encoding: 'utf8' });
            const sidebarOpened = sidebarUI.includes('设置') || sidebarUI.includes('我的主页') || sidebarUI.includes('发现好友');
            console.log(`侧边栏打开结果: ${sidebarOpened ? '✅ 成功' : '❌ 失败'}`);
        }
        
    } else {
        console.error('❌ UI dump失败');
    }
    
    console.log('🎉 测试完成');
    
} catch (error) {
    console.error('❌ 测试过程中出错:', error.message);
}