# 设备检测问题修复说明

## 问题分析

您遇到的问题是：**设备管理能找到雷电模拟器，但通讯录导入时检测不到**。

### 原因对比

#### 🔍 **设备管理** (`RealDeviceManager`) - 能检测到雷电模拟器
```typescript
// ✅ 正确的方法
1. 初始化ADB路径: await invoke('detect_ldplayer_adb')
2. 使用检测到的ADB路径: await invoke('get_adb_devices', { adbPath })
3. 解析设备输出，正确识别雷电模拟器
```

#### ❌ **通讯录导入** (`ContactImportManager`) - 检测不到雷电模拟器
```typescript
// ❌ 有问题的方法 (之前)
1. 使用 DeviceAPI.getDevices() - 可能不支持雷电模拟器
2. 使用 AdbService.getInstance() - 没有初始化雷电ADB路径
3. 使用系统默认ADB - 检测不到雷电模拟器特定端口
```

## 修复方案

### 🛠️ **统一设备检测方法**

我已经将通讯录导入的设备检测逻辑**完全对齐**到设备管理的方法：

#### **1. ADB路径初始化**
```typescript
// 新增：检测雷电模拟器ADB路径
const initializeAdb = useCallback(async () => {
  try {
    const detectedPath = await invoke<string | null>('detect_ldplayer_adb');
    if (detectedPath) {
      setAdbPath(detectedPath); // 使用雷电ADB路径
      console.log('已检测到雷电模拟器ADB路径:', detectedPath);
    } else {
      setAdbPath('adb'); // 使用系统默认ADB
    }
  } catch (error) {
    console.error('初始化ADB失败:', error);
    setAdbPath('adb');
  }
}, []);
```

#### **2. 设备检测方法**
```typescript
// 修改：使用与RealDeviceManager相同的方法
const loadDevices = useCallback(async () => {
  const output = await invoke<string>('get_adb_devices', { adbPath });
  const devices = parseDevicesOutput(output);
  // ...
}, [adbPath]);
```

#### **3. 设备解析逻辑**
```typescript
// 新增：与RealDeviceManager完全一致的解析逻辑
const parseDevicesOutput = useCallback((output: string): Device[] => {
  // 检测雷电模拟器: deviceId.includes('127.0.0.1')
  if (isEmulator) {
    if (deviceId.includes('127.0.0.1')) {
      deviceName = `雷电模拟器 (${deviceId})`;
    } else {
      deviceName = `模拟器 (${deviceId})`;
    }
  }
  // ...
}, []);
```

### 🎯 **修复后的流程**

#### **初始化流程**:
1. **组件加载** → 调用 `initializeAdb()`
2. **检测雷电ADB** → 设置正确的ADB路径
3. **ADB路径就绪** → 自动调用 `loadDevices()`
4. **设备检测** → 使用雷电ADB路径检测设备

#### **设备检测结果**:
- ✅ **雷电模拟器**: `雷电模拟器 (127.0.0.1:5555)`
- ✅ **Android模拟器**: `模拟器 (emulator-5554)`
- ✅ **真机设备**: `Samsung Galaxy S21 (R5CW20WBZIP)`

## 测试方法

### 🧪 **验证修复效果**:

1. **启动雷电模拟器**
2. **打开GUI程序** → 通讯录管理 → 设备导入
3. **查看控制台输出**:
   ```
   已检测到雷电模拟器ADB路径: D:\leidian\LDPlayer9\adb.exe
   检测到的设备: [{ name: "雷电模拟器 (127.0.0.1:5555)", ... }]
   检测到 2 台设备
   ```
4. **确认设备选择下拉菜单**显示雷电模拟器

### 🔍 **对比验证**:

- **设备管理页面**: 应该显示相同的设备列表
- **通讯录导入页面**: 现在也应该显示相同的设备列表
- **两者完全一致** ✅

## 代码变更总结

### 📝 **主要变更**:

1. **移除旧的依赖**:
   - 删除 `DeviceAPI` 和 `AdbService` 导入
   - 添加 `invoke` 从 `@tauri-apps/api/core`

2. **新增ADB初始化**:
   - 添加 `adbPath` 状态
   - 添加 `initializeAdb()` 函数
   - 添加 `parseDevicesOutput()` 函数

3. **修改设备检测**:
   - 使用 `invoke('get_adb_devices')` 替代旧方法
   - 使用雷电模拟器特定的ADB路径
   - 正确解析和识别设备类型

4. **优化用户体验**:
   - 添加详细的控制台日志
   - 保持错误处理和用户提示

---

🎉 **修复完成！**

现在您的通讯录导入功能应该能够正确检测到雷电模拟器设备，与设备管理页面保持完全一致！
