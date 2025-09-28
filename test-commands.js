// 测试新添加的 Tauri 命令
console.log("开始测试新添加的命令...");

// 导入 Tauri API
const { invoke } = window.__TAURI__.tauri;

// 测试 adb_start_activity 命令
async function testAdbStartActivity() {
    try {
        console.log("测试 adb_start_activity 命令...");
        const result = await invoke('adb_start_activity', {
            deviceId: 'test_device',
            packageName: 'com.android.settings',
            activityName: 'com.android.settings.Settings'
        });
        console.log("✅ adb_start_activity 命令成功:", result);
    } catch (error) {
        console.error("❌ adb_start_activity 命令失败:", error);
    }
}

// 测试 adb_open_contacts_app 命令
async function testAdbOpenContacts() {
    try {
        console.log("测试 adb_open_contacts_app 命令...");
        const result = await invoke('adb_open_contacts_app', {
            deviceId: 'test_device'
        });
        console.log("✅ adb_open_contacts_app 命令成功:", result);
    } catch (error) {
        console.error("❌ adb_open_contacts_app 命令失败:", error);
    }
}

// 测试 adb_view_file 命令
async function testAdbViewFile() {
    try {
        console.log("测试 adb_view_file 命令...");
        const result = await invoke('adb_view_file', {
            deviceId: 'test_device',
            filePath: '/sdcard/test.vcf'
        });
        console.log("✅ adb_view_file 命令成功:", result);
    } catch (error) {
        console.error("❌ adb_view_file 命令失败:", error);
    }
}

// 运行所有测试
async function runAllTests() {
    console.log("🚀 开始执行命令测试...");
    await testAdbStartActivity();
    await testAdbOpenContacts();
    await testAdbViewFile();
    console.log("✨ 所有测试执行完毕！");
}

// 自动执行测试
runAllTests();