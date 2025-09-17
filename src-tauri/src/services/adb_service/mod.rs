// ADB服务模块化结构
// 
// 这个模块将原来的单一文件 adb_service.rs 重构为多个子模块，
// 按功能职责分离，提高代码的可维护性和可扩展性。

// 子模块声明
pub mod core;           // 核心结构和数据类型
pub mod commands;       // 基础命令执行
pub mod devices;        // 设备管理
pub mod ui_automation;  // UI自动化操作
pub mod file_operations;// 文件操作
pub mod detection;      // 路径检测和验证

// 重新导出公共接口，保持向后兼容性
pub use core::{AdbService, AdbCommandResult};

// 导出常用的结果类型，方便其他模块使用
pub type AdbResult<T> = Result<T, Box<dyn std::error::Error>>;

// 提供便捷的创建函数
pub fn create_adb_service() -> AdbService {
    AdbService::new()
}

// 模块功能说明：
//
// - core.rs: 包含AdbService结构体定义和AdbCommandResult数据类型
// - commands.rs: 基础ADB命令执行，包括日志记录和错误处理
// - devices.rs: 设备连接、断开、列表获取、属性查询等设备管理功能
// - ui_automation.rs: UI相关自动化操作，如dump_ui_hierarchy、tap、input等
// - file_operations.rs: 文件推送、拉取、创建目录、删除文件等操作
// - detection.rs: ADB路径检测、版本验证等工具功能
//
// 这种模块化结构的优势：
// 1. 代码组织更清晰，按功能分组
// 2. 便于团队协作开发和维护
// 3. 减少代码合并冲突
// 4. 更容易编写针对性的单元测试
// 5. 符合单一职责原则
// 6. 便于功能扩展，新增功能只需要添加对应模块即可