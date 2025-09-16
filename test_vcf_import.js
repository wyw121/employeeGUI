// VCF导入测试脚本
const { invoke } = require('@tauri-apps/api/core');

// 测试联系人数据
const testContacts = [
  {
    id: "1",
    name: "测试联系人001",
    phone: "13800138001",
    email: "",
    address: "",
    occupation: ""
  },
  {
    id: "2", 
    name: "测试联系人002",
    phone: "13800138002",
    email: "",
    address: "",
    occupation: ""
  },
  {
    id: "3",
    name: "测试联系人003", 
    phone: "13800138003",
    email: "",
    address: "",
    occupation: ""
  }
];

async function testImport() {
  try {
    console.log('🧪 开始测试VCF导入功能...');
    
    // 方法1: 测试generate_vcf_file + import_vcf_contacts_async_safe
    console.log('\n📋 方法1: 测试generate_vcf_file + import_vcf_contacts_async_safe');
    
    const vcfFilePath = await invoke("generate_vcf_file", {
      contacts: testContacts,
      fileName: `test_contacts_${Date.now()}.vcf`
    });
    
    console.log(`✅ VCF文件生成成功: ${vcfFilePath}`);
    
    const importResult = await invoke("import_vcf_contacts_async_safe", {
      deviceId: "A2TB6R3308000938",
      vcfFilePath: vcfFilePath
    });
    
    console.log('📊 导入结果:', importResult);
    
  } catch (error) {
    console.error('❌ 导入失败:', error);
    
    try {
      // 方法2: 测试test_vcf_import_with_permission
      console.log('\n📋 方法2: 测试test_vcf_import_with_permission');
      
      // 生成临时文件内容
      const contactsContent = testContacts.map(contact =>
        `${contact.name},${contact.phone},,, `
      ).join('\n');
      
      const tempPath = `temp_test_contacts_${Date.now()}.txt`;
      
      await invoke("write_file", {
        path: tempPath,
        content: contactsContent,
      });
      
      const permissionTestResult = await invoke("test_vcf_import_with_permission", {
        deviceId: "A2TB6R3308000938",
        contactsFile: tempPath,
      });
      
      console.log('📊 权限测试结果:', permissionTestResult);
      
      // 清理临时文件
      await invoke("delete_file", { path: tempPath });
      
    } catch (method2Error) {
      console.error('❌ 方法2也失败:', method2Error);
    }
  }
}

// 如果是Node.js环境直接运行
if (typeof window === 'undefined') {
  console.log('⚠️  此脚本需要在Tauri应用内运行');
}

module.exports = { testImport, testContacts };