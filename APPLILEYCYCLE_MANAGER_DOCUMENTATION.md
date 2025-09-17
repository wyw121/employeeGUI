# 应用生命周期管理模块 (AppLifecycleManager)

## 📋 概述

应用生命周期管理模块是一个独立的、可复用的Rust服务，专门用于"指定应用模式"下的应用检测、启动和状态管理。该模块具备完整的日志记录、重试机制和失败终止功能。

## ✨ 核心特性

- 🔄 **智能重试机制**: 可配置的重试次数和超时时间
- 📝 **详细日志记录**: 完整的执行日志，便于调试和监控
- 🚀 **多种启动方法**: ActivityManager、MonkeyRunner、桌面图标点击
- 🎯 **精准状态检测**: 6种应用状态的准确识别
- ⚡ **异步执行**: 基于Tokio的高性能异步处理
- 🛡️ **错误处理**: 优雅的错误处理和故障恢复
- 🔌 **模块化设计**: 可被多个服务复用的独立模块

## 🏗️ 架构设计

```
AppLifecycleManager
├── 核心服务 (services/app_lifecycle_manager.rs)
│   ├── ensure_app_running()     # 主要入口方法
│   ├── detect_app_state()       # 状态检测
│   ├── launch_app()             # 应用启动
│   └── wait_for_app_ready()     # 就绪等待
├── Tauri命令接口 (commands/app_lifecycle_commands.rs)
│   ├── ensure_app_running       # 前端调用接口
│   └── detect_app_state         # 状态查询接口
└── 使用示例
    ├── 后端示例 (examples/app_lifecycle_usage_example.rs)
    └── 前端示例 (examples/AppLifecycleExample.tsx)
```

## 📦 数据结构

### AppLaunchConfig - 启动配置
```rust
pub struct AppLaunchConfig {
    pub max_retries: u32,              // 最大重试次数 (建议: 3-5)
    pub launch_timeout_secs: u64,      // 启动超时时间 (建议: 30-60秒)
    pub ready_check_interval_ms: u64,  // 就绪检查间隔 (建议: 1000-2000ms)
    pub launch_method: LaunchMethod,   // 首选启动方法
    pub package_name: Option<String>,  // 应用包名 (可选)
}
```

### LaunchMethod - 启动方法枚举
```rust
pub enum LaunchMethod {
    ActivityManager,  // 通过系统ActivityManager启动 (推荐)
    MonkeyRunner,     // 通过Monkey工具启动
    DesktopIcon,      // 通过桌面图标点击启动 (实验性)
}
```

### AppState - 应用状态枚举
```rust
pub enum AppState {
    NotInstalled,   // 未安装
    Installed,      // 已安装但未运行
    Background,     // 后台运行
    Foreground,     // 前台运行
    Starting,       // 启动中
    Unknown,        // 未知状态
}
```

### AppLifecycleResult - 执行结果
```rust
pub struct AppLifecycleResult {
    pub final_state: AppState,           // 最终应用状态
    pub total_duration_ms: u64,          // 总执行时间
    pub retry_count: u32,                // 实际重试次数
    pub execution_logs: Vec<String>,     // 详细执行日志
    pub message: String,                 // 结果消息
}
```

## 🚀 使用指南

### 1. 基本用法 (Rust后端)

```rust
use crate::services::app_lifecycle_manager::{AppLifecycleManager, AppLaunchConfig, LaunchMethod};
use crate::services::adb_service::AdbService;

// 创建管理器实例
let adb_service = AdbService::new();
let lifecycle_manager = AppLifecycleManager::new(adb_service);

// 配置启动参数
let config = AppLaunchConfig {
    max_retries: 3,
    launch_timeout_secs: 30,
    ready_check_interval_ms: 2000,
    launch_method: LaunchMethod::ActivityManager,
    package_name: Some("com.xingin.xhs".to_string()),
};

// 启动应用并等待就绪
let result = lifecycle_manager
    .ensure_app_running("device_id", "小红书", config)
    .await?;

println!("应用状态: {:?}", result.final_state);
println!("总耗时: {}ms", result.total_duration_ms);
```

### 2. 前端调用 (TypeScript)

```typescript
import { invoke } from '@tauri-apps/api/tauri';

// 配置参数
const config = {
  maxRetries: 3,
  launchTimeoutSecs: 30,
  readyCheckIntervalMs: 2000,
  launchMethod: 'ActivityManager',
  packageName: 'com.xingin.xhs',
};

// 启动应用
const result = await invoke('ensure_app_running', {
  deviceId: 'emulator-5554',
  appName: '小红书',
  config,
});

console.log('启动结果:', result);
```

### 3. 状态检测

```rust
// 检测应用当前状态
let state = lifecycle_manager
    .detect_app_state("device_id", "小红书", Some("com.xingin.xhs".to_string()))
    .await?;

match state {
    AppState::Foreground => println!("应用正在前台运行"),
    AppState::Background => println!("应用在后台运行"),
    AppState::NotInstalled => println!("应用未安装"),
    _ => println!("其他状态: {:?}", state),
}
```

## 🛠️ 配置建议

### 性能优化配置
```rust
let performance_config = AppLaunchConfig {
    max_retries: 2,                    // 减少重试次数
    launch_timeout_secs: 20,           // 较短的超时时间
    ready_check_interval_ms: 1000,     // 频繁检查
    launch_method: LaunchMethod::ActivityManager,
    package_name: Some("known.package.name".to_string()),
};
```

### 稳定性优先配置
```rust
let stability_config = AppLaunchConfig {
    max_retries: 5,                    // 更多重试机会
    launch_timeout_secs: 60,           // 更长的等待时间
    ready_check_interval_ms: 2000,     // 温和的检查间隔
    launch_method: LaunchMethod::ActivityManager,
    package_name: None,                // 让系统自动推断
};
```

### 调试模式配置
```rust
let debug_config = AppLaunchConfig {
    max_retries: 1,                    // 快速失败
    launch_timeout_secs: 15,           // 短超时时间
    ready_check_interval_ms: 500,      // 频繁检查
    launch_method: LaunchMethod::MonkeyRunner,
    package_name: None,
};
```

## 🔧 集成示例

### 在现有服务中集成

```rust
// 在 universal_ui_service.rs 中的集成示例
impl UniversalUiService {
    pub async fn navigate_with_app_lifecycle(&self, device_id: &str, app_name: &str) -> Result<(), String> {
        // 1. 确保应用正在运行
        let lifecycle_manager = AppLifecycleManager::new(self.adb_service.clone());
        
        let config = AppLaunchConfig {
            max_retries: 3,
            launch_timeout_secs: 45,
            ready_check_interval_ms: 1500,
            launch_method: LaunchMethod::ActivityManager,
            package_name: None,
        };
        
        let result = lifecycle_manager
            .ensure_app_running(device_id, app_name, config)
            .await
            .map_err(|e| format!("应用启动失败: {}", e.message))?;
        
        println!("✅ 应用已就绪，状态: {:?}", result.final_state);
        
        // 2. 继续执行UI导航逻辑
        self.perform_navigation(device_id).await?;
        
        Ok(())
    }
}
```

### 批量应用管理

```rust
pub async fn batch_app_management(device_id: &str) -> Result<(), Box<dyn std::error::Error>> {
    let adb_service = AdbService::new();
    let lifecycle_manager = AppLifecycleManager::new(adb_service);
    
    let apps = vec![
        ("小红书", Some("com.xingin.xhs".to_string())),
        ("微信", Some("com.tencent.mm".to_string())),
        ("支付宝", Some("com.eg.android.AlipayGphone".to_string())),
    ];
    
    for (app_name, package_name) in apps {
        let config = AppLaunchConfig {
            max_retries: 3,
            launch_timeout_secs: 30,
            ready_check_interval_ms: 2000,
            launch_method: LaunchMethod::ActivityManager,
            package_name,
        };
        
        match lifecycle_manager.ensure_app_running(device_id, app_name, config).await {
            Ok(result) => {
                println!("✅ {} 启动成功，耗时: {}ms", app_name, result.total_duration_ms);
            },
            Err(error) => {
                println!("❌ {} 启动失败: {}", app_name, error.message);
                // 记录详细日志用于调试
                for log in error.execution_logs {
                    println!("   {}", log);
                }
            }
        }
        
        // 应用间延迟
        tokio::time::sleep(tokio::time::Duration::from_millis(2000)).await;
    }
    
    Ok(())
}
```

## 🐛 故障排除

### 常见问题及解决方案

1. **应用启动失败**
   ```
   错误: 应用启动超时
   解决: 增加 launch_timeout_secs 或检查设备性能
   ```

2. **状态检测不准确**
   ```
   错误: 应用状态显示为 Unknown
   解决: 提供正确的 package_name 或更新状态检测逻辑
   ```

3. **重试次数过多**
   ```
   错误: 达到最大重试次数但仍未成功
   解决: 检查应用是否正确安装，设备是否正常连接
   ```

### 调试技巧

1. **查看详细日志**
   ```rust
   match result {
       Err(error) => {
           println!("错误信息: {}", error.message);
           println!("详细日志:");
           for log in error.execution_logs {
               println!("  {}", log);
           }
       }
   }
   ```

2. **单步调试**
   ```rust
   // 先检测状态
   let state = lifecycle_manager.detect_app_state(device_id, app_name, package_name).await?;
   println!("当前状态: {:?}", state);
   
   // 再尝试启动
   if matches!(state, AppState::NotInstalled | AppState::Installed) {
       let result = lifecycle_manager.launch_app(device_id, app_name, &config).await?;
   }
   ```

3. **性能监控**
   ```rust
   let start_time = std::time::Instant::now();
   let result = lifecycle_manager.ensure_app_running(device_id, app_name, config).await?;
   println!("实际耗时: {:?}", start_time.elapsed());
   println!("报告耗时: {}ms", result.total_duration_ms);
   ```

## 📚 API 文档

### ensure_app_running
确保应用正在运行的主要方法。

**参数:**
- `device_id: &str` - 设备标识符
- `app_name: &str` - 应用名称
- `config: AppLaunchConfig` - 启动配置

**返回值:**
- `Ok(AppLifecycleResult)` - 成功结果
- `Err(AppLifecycleResult)` - 失败结果（包含错误信息）

### detect_app_state
检测应用当前状态。

**参数:**
- `device_id: &str` - 设备标识符  
- `app_name: &str` - 应用名称
- `package_name: Option<String>` - 应用包名（可选）

**返回值:**
- `Result<AppState, String>` - 应用状态或错误信息

### launch_app
启动应用。

**参数:**
- `device_id: &str` - 设备标识符
- `app_name: &str` - 应用名称  
- `config: &AppLaunchConfig` - 启动配置

**返回值:**
- `Result<bool, String>` - 启动是否成功

## 🔄 版本历史

### v1.0.0 (当前版本)
- ✅ 基本应用生命周期管理功能
- ✅ 多种启动方法支持
- ✅ 完整的状态检测系统
- ✅ 详细日志记录和错误处理
- ✅ Tauri前后端集成接口
- ✅ 完整的使用示例和文档

### 未来计划
- 🔄 应用卸载和重新安装功能
- 📊 性能指标收集和分析
- 🎯 更智能的包名推断算法
- 🔧 图形化配置界面
- 📱 更多设备和应用兼容性测试

## 📞 技术支持

如果在使用过程中遇到问题，请：

1. 查阅本文档的故障排除部分
2. 检查执行日志获取详细错误信息
3. 验证设备连接和ADB配置
4. 确认应用包名和设备ID的正确性

---

**注意**: 此模块已完全集成到项目中，编译通过并可以直接使用。所有功能都经过测试和验证。