/**
 * 测试智能脚本管理系统
 */

const { invoke } = window.__TAURI__.tauri;

async function testScriptManagement() {
    console.log('🧪 开始测试智能脚本管理系统...');

    try {
        // 1. 测试获取脚本模板
        console.log('📋 测试获取脚本模板...');
        const templates = await invoke('list_script_templates');
        console.log('✅ 脚本模板获取成功:', templates);

        // 2. 测试创建脚本
        console.log('📝 测试创建智能脚本...');
        const testScript = {
            name: '测试脚本',
            description: '这是一个测试脚本',
            steps: [
                {
                    type: 'click',
                    target: '登录',
                    description: '点击登录按钮',
                    config: {
                        element_selector: 'text("登录")',
                        wait_after: 1000
                    }
                }
            ],
            config: {
                continue_on_error: false,
                auto_verification_enabled: true,
                smart_recovery_enabled: true,
                detailed_logging: true
            },
            tags: ['测试', '登录'],
            created_by: 'Test User'
        };

        const scriptId = await invoke('save_smart_script', {
            script: testScript
        });
        console.log('✅ 脚本创建成功，ID:', scriptId);

        // 3. 测试获取脚本
        console.log('📖 测试读取脚本...');
        const savedScript = await invoke('load_smart_script', {
            scriptId: scriptId
        });
        console.log('✅ 脚本读取成功:', savedScript);

        // 4. 测试列出所有脚本
        console.log('📜 测试列出所有脚本...');
        const allScripts = await invoke('list_smart_scripts');
        console.log('✅ 脚本列表获取成功:', allScripts);

        // 5. 测试删除脚本
        console.log('🗑️ 测试删除脚本...');
        await invoke('delete_smart_script', {
            scriptId: scriptId
        });
        console.log('✅ 脚本删除成功');

        console.log('🎉 所有脚本管理功能测试通过！');
        return true;

    } catch (error) {
        console.error('❌ 脚本管理测试失败:', error);
        return false;
    }
}

// 测试智能脚本执行
async function testScriptExecution() {
    console.log('⚡ 开始测试智能脚本执行...');

    try {
        // 获取设备列表
        console.log('📱 获取设备列表...');
        const devices = await invoke('get_connected_devices');
        console.log('设备列表:', devices);

        if (devices.length === 0) {
            console.warn('⚠️ 没有找到连接的设备，使用模拟设备测试');
        }

        const deviceId = devices.length > 0 ? devices[0] : 'emulator-5554';
        
        // 测试脚本执行
        console.log('🚀 测试脚本执行，设备ID:', deviceId);
        
        const testSteps = [
            {
                type: 'click',
                target: '测试按钮',
                description: '点击测试按钮',
                config: {
                    element_selector: 'text("测试按钮")',
                    wait_after: 1000
                }
            }
        ];

        const result = await invoke('execute_smart_automation_script', {
            deviceId: deviceId,
            steps: testSteps,
            config: {
                continue_on_error: true,
                auto_verification_enabled: false,
                smart_recovery_enabled: false,
                detailed_logging: true
            }
        });

        console.log('✅ 脚本执行完成:', result);
        return true;

    } catch (error) {
        console.error('❌ 脚本执行测试失败:', error);
        return false;
    }
}

// 运行所有测试
async function runAllTests() {
    console.log('🎯 开始全面测试智能脚本系统...\n');
    
    const scriptManagementTest = await testScriptManagement();
    console.log('\n' + '='.repeat(50) + '\n');
    const scriptExecutionTest = await testScriptExecution();
    
    console.log('\n' + '='.repeat(50));
    console.log('📊 测试结果总结:');
    console.log(`   脚本管理功能: ${scriptManagementTest ? '✅ 通过' : '❌ 失败'}`);
    console.log(`   脚本执行功能: ${scriptExecutionTest ? '✅ 通过' : '❌ 失败'}`);
    
    if (scriptManagementTest && scriptExecutionTest) {
        console.log('🎉 所有测试通过！智能脚本系统工作正常');
    } else {
        console.log('⚠️ 部分测试失败，请检查相关功能');
    }
}

// 导出测试函数
window.testScriptSystem = {
    runAllTests,
    testScriptManagement,
    testScriptExecution
};

console.log('🔧 智能脚本系统测试工具已加载');
console.log('💡 使用方法: testScriptSystem.runAllTests()');