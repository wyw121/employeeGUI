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
pub mod page_analyzer_service;  // 新增：页面分析服务
pub mod universal_ui_page_analyzer;  // 新增：Universal UI 页面分析器
pub mod simple_xml_parser;  // 新增：简化XML解析器
pub mod contact_service;
pub mod crash_debugger;
pub mod employee_service;
pub mod ldplayer_vcf_opener;
pub mod log_bridge;
pub mod safe_adb_manager;
pub mod script_executor;
pub mod smart_app_manager;
pub mod smart_app_service;
pub mod smart_element_finder_service;  // 新增：智能元素查找服务
pub mod smart_script_executor;
pub mod smart_vcf_opener;
pub mod ui_reader_service;
pub mod universal_ui_finder;  // Universal UI Finder 核心模块
pub mod universal_ui_service;  // Universal UI Finder 服务桥接
pub mod vcf_importer;
pub mod vcf_importer_async;
pub mod vcf_importer_optimized;
pub mod xiaohongshu_automator;
pub mod xiaohongshu_follow_service;
pub mod xiaohongshu_long_connection_automator;
pub mod xiaohongshu_long_connection_service;
pub mod xiaohongshu_service;
