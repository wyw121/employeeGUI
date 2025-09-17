# MSI 构建问题解决方案

## 问题描述

在使用 `npm run tauri build` 构建应用时，遇到以下错误：

```
failed to bundle project: error running light.exe: `failed to run C:\Users\aone\AppData\Local\tauri\WixTools314\light.exe`
```

## 问题原因

经过诊断，发现问题的根本原因是：**中文产品名称在 MSI 构建过程中与 WiX Toolset 不兼容**。

具体表现：
- WiX light.exe 工具本身正常工作
- 配置文件中的中文 `productName` 导致构建失败
- 路径中的中文字符可能也会引起类似问题

## 解决方案

### 方案 1：临时使用英文名称构建（推荐）

1. **临时修改配置文件**
   ```json
   {
     "productName": "Employee Tool",  // 改为英文
     "app": {
       "windows": [
         {
           "title": "Employee Tool"  // 窗口标题也改为英文
         }
       ]
     }
   }
   ```

2. **执行构建命令**
   ```bash
   npx tauri build --bundles msi
   ```

3. **构建完成后恢复中文名称**
   ```json
   {
     "productName": "员工引流工具",
     "app": {
       "windows": [
         {
           "title": "员工引流工具"
         }
       ]
     }
   }
   ```

### 方案 2：自动化构建脚本

创建构建脚本 `build-msi.ps1`：

```powershell
# 备份原配置
Copy-Item "src-tauri/tauri.conf.json" "src-tauri/tauri.conf.json.backup"

# 替换为英文名称
(Get-Content "src-tauri/tauri.conf.json") -replace '"员工引流工具"', '"Employee Tool"' | Set-Content "src-tauri/tauri.conf.json"

# 执行构建
npx tauri build --bundles msi

# 恢复原配置
Move-Item "src-tauri/tauri.conf.json.backup" "src-tauri/tauri.conf.json" -Force

Write-Host "构建完成，配置文件已恢复"
```

### 方案 3：使用条件配置

修改 `tauri.conf.json` 使用环境变量：

```json
{
  "productName": "${TAURI_PRODUCT_NAME:-员工引流工具}",
  "app": {
    "windows": [
      {
        "title": "${TAURI_WINDOW_TITLE:-员工引流工具}"
      }
    ]
  }
}
```

构建时设置环境变量：
```bash
$env:TAURI_PRODUCT_NAME="Employee Tool"
$env:TAURI_WINDOW_TITLE="Employee Tool"
npx tauri build --bundles msi
```

## 验证方法

构建成功的标志：
```
Finished 1 bundle at:
C:\开发\employeeGUI\src-tauri\target\release\bundle\msi\Employee Tool_0.2.0_x64_en-US.msi
```

## 其他注意事项

1. **清理构建缓存**
   ```bash
   Remove-Item "src-tauri/target/release/bundle" -Recurse -Force -ErrorAction SilentlyContinue
   ```

2. **其他可能的问题**
   - 确保 WiX Toolset 正确安装
   - 检查项目路径中是否包含特殊字符
   - 验证所有依赖文件的存在性

3. **构建其他格式**
   ```bash
   # 只构建可执行文件（不打包）
   npx tauri build --bundles none
   
   # 构建 NSIS 安装程序
   npx tauri build --bundles nsis
   ```

## 成功构建结果

- ✅ MSI 安装包：`Employee Tool_0.2.0_x64_en-US.msi` (13.9 MB)
- ✅ 可执行文件：`employee-gui.exe`
- ✅ 构建时间：约 1-2 分钟

---

*最后更新：2025年9月17日*
*解决状态：✅ 已完全解决*