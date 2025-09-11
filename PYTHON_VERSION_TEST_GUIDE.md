# 🧪 测试 Python移植版 VCF导入功能指南

## 📋 **测试准备清单**

### 1. **确保编译通过**
```bash
cd src-tauri
cargo build
```

### 2. **准备测试环境**
- ✅ Android模拟器运行 (推荐: `emulator-5554` 或 `emulator-5556`)
- ✅ ADB连接正常
- ✅ VCF测试文件存在

### 3. **创建测试VCF文件**
```bash
# 确保这个文件存在
ls src-tauri/contacts_import.vcf
```

## 🚀 **测试方法**

### 方法一：前端界面测试 (推荐)

#### 1. 启动应用
```bash
npm run tauri dev
```

#### 2. 在前端添加测试按钮
在 `ContactImportManager.tsx` 中添加：

```typescript
// 新增Python移植版测试按钮
const testPythonVersion = async () => {
  try {
    setIsImporting(true);
    
    const result = await invoke<VcfImportResult>("import_vcf_contacts_python_version", {
      deviceId: selectedDevice,
      contactsFilePath: "src-tauri/contacts_import.vcf"
    });
    
    console.log("Python移植版结果:", result);
    
    if (result.success) {
      message.success(`🎉 Python移植版导入成功! 导入${result.imported_contacts}个联系人`);
    } else {
      message.error(`❌ Python移植版导入失败: ${result.message}`);
    }
  } catch (error) {
    console.error("Python移植版导入错误:", error);
    message.error(`导入过程出错: ${error}`);
  } finally {
    setIsImporting(false);
  }
};

// 在JSX中添加按钮
<Button 
  type="primary" 
  ghost
  onClick={testPythonVersion}
  loading={isImporting}
  icon={<ExperimentOutlined />}
>
  🧪 测试Python移植版
</Button>
```

### 方法二：直接命令行测试

#### 1. 创建独立测试脚本

```typescript
// test-python-version.js
import { invoke } from "@tauri-apps/api/core";

async function testPythonVersion() {
  try {
    console.log("🧪 开始测试Python移植版VCF导入...");
    
    const result = await invoke("import_vcf_contacts_python_version", {
      deviceId: "emulator-5554", // 替换为你的设备ID
      contactsFilePath: "src-tauri/contacts_import.vcf"
    });
    
    console.log("✅ 测试结果:", result);
    
    if (result.success) {
      console.log("🎉 Python移植版导入成功!");
      console.log(`📊 统计: 总数${result.total_contacts}, 成功${result.imported_contacts}, 失败${result.failed_contacts}`);
    } else {
      console.log("❌ 导入失败:", result.message);
    }
  } catch (error) {
    console.error("🚨 测试过程出错:", error);
  }
}

testPythonVersion();
```

### 方法三：浏览器控制台测试

1. 启动应用: `npm run tauri dev`
2. 打开浏览器开发者工具
3. 在控制台执行：

```javascript
// 测试Python移植版
(async () => {
  try {
    const { invoke } = window.__TAURI__.core;
    
    console.log("🧪 测试Python移植版VCF导入...");
    
    const result = await invoke("import_vcf_contacts_python_version", {
      deviceId: "emulator-5554", // 替换为你的设备ID
      contactsFilePath: "src-tauri/contacts_import.vcf"
    });
    
    console.log("测试结果:", result);
  } catch (error) {
    console.error("测试错误:", error);
  }
})();
```

## 📊 **对比测试 (三个版本)**

```javascript
// 对比测试所有三个版本
async function compareAllVersions() {
  const deviceId = "emulator-5554";
  const filePath = "src-tauri/contacts_import.vcf";
  
  const versions = [
    { name: "原始版本", command: "import_vcf_contacts" },
    { name: "优化版本", command: "import_vcf_contacts_optimized" },
    { name: "Python移植版", command: "import_vcf_contacts_python_version" }
  ];
  
  for (const version of versions) {
    try {
      console.log(`\n🧪 测试 ${version.name}...`);
      const startTime = Date.now();
      
      const result = await invoke(version.command, {
        deviceId,
        contactsFilePath: filePath
      });
      
      const endTime = Date.now();
      const duration = endTime - startTime;
      
      console.log(`✅ ${version.name} 结果:`, {
        success: result.success,
        duration: `${duration}ms`,
        imported: result.imported_contacts,
        message: result.message
      });
      
    } catch (error) {
      console.error(`❌ ${version.name} 失败:`, error);
    }
    
    // 等待一段时间再测试下一个版本
    await new Promise(resolve => setTimeout(resolve, 5000));
  }
}

// 运行对比测试
compareAllVersions();
```

## 🔍 **验证重点**

### 1. **Python移植版特有功能**
- ✅ 精确坐标导航 `(63,98)`, `(280,338)`, `(175,481)`
- ✅ 智能UI解析算法
- ✅ 多路径文件传输
- ✅ 联系人验证算法

### 2. **期望行为**
- 📱 自动导航到联系人应用
- 🎯 精确点击导入选项
- 📁 智能定位VCF文件
- ✅ 验证导入成功

### 3. **日志检查**
在控制台查看详细日志：
```
🧭 导航到Download文件夹（使用Python验证的坐标）
🖱️ 点击坐标 (63, 98) - 显示根目录
🖱️ 点击坐标 (280, 338) - 下载文件夹
📋 解析VCF文件坐标: (175, 481)
🎉 联系人导入成功！
```

## 🚨 **故障排除**

### 如果编译失败
```bash
# 修复编译错误后重新编译
cd src-tauri
cargo clean
cargo build
```

### 如果测试失败
1. 检查设备连接: `adb devices`
2. 确认VCF文件存在: `ls src-tauri/contacts_import.vcf`
3. 查看Rust日志输出
4. 对比Python脚本执行: `python vcf_import_final_fix.py emulator-5554`

你想用哪种方法开始测试？我推荐先用方法三（浏览器控制台），因为最快速简单！🚀
