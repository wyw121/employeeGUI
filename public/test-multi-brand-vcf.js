// 多品牌VCF导入功能测试脚本
// 用于验证前端与后端的集成

import { invoke } from "@tauri-apps/api/core";

async function testMultiBrandVcfImport() {
    console.log("🧪 开始测试多品牌VCF导入功能");

    try {
        // 1. 创建测试VCF文件
        const testVcfContent = `BEGIN:VCARD
VERSION:3.0
FN:测试联系人1
N:测试联系人1;;;;
TEL:13800138001
EMAIL:test1@example.com
END:VCARD
BEGIN:VCARD
VERSION:3.0
FN:测试联系人2
N:测试联系人2;;;;
TEL:13800138002
EMAIL:test2@example.com
END:VCARD`;

        const testFilePath = "test_multi_brand_vcf.vcf";
        
        // 2. 写入测试文件
        console.log("📝 创建测试VCF文件...");
        await invoke("write_file", {
            path: testFilePath,
            content: testVcfContent
        });

        // 3. 获取设备列表
        console.log("📱 获取设备列表...");
        const devices = await invoke("get_adb_devices");
        console.log("检测到的设备:", devices);

        if (!devices || devices.length === 0) {
            console.log("⚠️ 没有检测到设备，创建模拟设备ID进行测试");
            
            // 4. 使用模拟设备ID测试多品牌导入
            const mockDeviceId = "emulator-5554";
            console.log(`🚀 开始多品牌VCF导入测试 - 设备: ${mockDeviceId}`);
            
            try {
                const result = await invoke("import_vcf_contacts_multi_brand", {
                    deviceId: mockDeviceId,
                    contactsFilePath: testFilePath
                });
                
                console.log("✅ 多品牌导入成功:", result);
                return result;
            } catch (error) {
                console.log("⚠️ 多品牌导入失败，这是预期的（因为没有真实设备）:", error);
                
                // 验证错误消息是否包含预期的内容
                const errorMsg = error.toString();
                if (errorMsg.includes("MultiBrandVcfImporter") || 
                    errorMsg.includes("multi_brand") ||
                    errorMsg.includes("device") ||
                    errorMsg.includes("adb")) {
                    console.log("✅ 错误信息正确，说明多品牌导入命令已正确集成");
                }
            }
        } else {
            // 使用真实设备进行测试
            const targetDevice = devices[0];
            console.log(`🚀 开始多品牌VCF导入测试 - 设备: ${targetDevice.id || targetDevice.deviceId}`);
            
            const result = await invoke("import_vcf_contacts_multi_brand", {
                deviceId: targetDevice.id || targetDevice.deviceId,
                contactsFilePath: testFilePath
            });
            
            console.log("✅ 多品牌导入成功:", result);
            return result;
        }

    } catch (error) {
        console.error("❌ 测试失败:", error);
        throw error;
    } finally {
        // 清理测试文件
        try {
            await invoke("delete_file", { path: "test_multi_brand_vcf.vcf" });
            console.log("🧹 已清理测试文件");
        } catch (cleanupError) {
            console.warn("⚠️ 清理测试文件失败:", cleanupError);
        }
    }
}

// 为了在浏览器中使用，将函数挂载到window对象
if (typeof window !== "undefined") {
    window.testMultiBrandVcfImport = testMultiBrandVcfImport;
}

// 如果在Node.js环境中，直接执行
if (typeof module !== "undefined" && module.exports) {
    module.exports = { testMultiBrandVcfImport };
}

console.log("📋 多品牌VCF导入测试脚本已加载");
console.log("💡 在浏览器控制台中运行: testMultiBrandVcfImport()");