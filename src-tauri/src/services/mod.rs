pub mod adb_device_tracker;
pub mod adb_service;  // 现在是模块化的文件夹结构
pub mod adb_session_manager;  // 新增：ADB会话管理器
pub mod adb_shell_session;
pub mod navigation_bar_detector;  // 新增：通用导航栏检测器
pub mod app_state_detector;
pub mod app_detection_framework;  // 新增：应用检测框架
pub mod app_lifecycle_manager;  // 新增：应用生命周期管理器
pub mod auth_service;
pub mod contact_automation;
pub mod contact;
pub mod error_handling;  // 新增：错误处理模块
pub mod page_analyzer_service;  // 新增：页面分析服务
pub mod universal_ui_page_analyzer;  // 新增：Universal UI 页面分析器
// pub mod simple_xml_parser;  // 已删除：简化XML解析器，统一使用智能解析器
pub mod contact_service;
pub mod contact_storage; // 新增：联系人号码存储（TXT导入到SQLite）
pub mod crash_debugger;
pub mod employee_service;
pub mod ldplayer_vcf_opener;
pub mod log_bridge;
pub mod safe_adb_manager;
pub mod script_execution;  // 新增：脚本执行模块（控制流处理系统）
pub mod script_executor;
pub mod script_manager;  // 新增：智能脚本管理服务
pub mod smart_app_manager;
pub mod smart_app_service;
pub mod smart_element_finder_service;  // 新增：智能元素查找服务
pub mod smart_script_executor;
 pub mod smart_app;  // 新增：智能应用服务
pub mod smart_script_executor_actions;  // 公开基础操作实现（点击/滑动/输入/等待等）
pub mod execution;  // 新增：执行分层骨架 (模型/重试/快照)
pub mod commands; // Tauri 命令封装
pub mod smart_vcf_opener;
pub mod ui_reader_service;
pub mod universal_ui_finder;  // Universal UI Finder 核心模块
pub mod universal_ui_service;  // Universal UI Finder 服务桥接
pub mod vcf_importer;
pub mod vcf_importer_async;
pub mod vcf_importer_optimized;
pub mod multi_brand_vcf_importer;  // 新增：多品牌VCF导入器
pub mod huawei_enhanced_importer;  // 基于Python成功经验的华为增强导入器
pub mod scrcpy_manager; // 设备镜像（外部 scrcpy 进程控制）
// 已移除：xiaohongshu_* 系列模块（自动关注/长连接/服务），按照需求删除
