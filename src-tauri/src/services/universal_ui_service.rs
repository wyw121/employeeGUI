// Universal UI Finder Tauri服务
// 桥接前端智能导航配置，基于现有的smart_element_finder_service实现

use serde::{Deserialize, Serialize};
use tauri::command;
use crate::services::smart_element_finder_service::{
    SmartElementFinderService, NavigationBarConfig, PositionRatio as ServicePositionRatio, 
    DetectedElement, ElementFinderResult, ClickResult
};
use crate::services::adb_service::AdbService;

/// 前端智能导航参数结构 
/// 对应SmartScriptStep的parameters字段
#[derive(Debug, Deserialize, Serialize, Clone)]
pub struct SmartNavigationParams {
    pub navigation_type: Option<String>,  // "bottom", "top", "side", "floating" 
    pub target_button: String,            // "我", "首页", "消息"
    pub click_action: Option<String>,     // "single_tap", "double_tap", "long_press"
    pub app_name: Option<String>,         // "小红书", "微信" - None表示直接ADB模式
    pub position_ratio: Option<PositionRatio>,  // 详细位置配置（专业模式）
    pub custom_config: Option<serde_json::Value>, // 自定义配置
}

#[derive(Debug, Deserialize, Serialize, Clone)]
pub struct PositionRatio {
    pub x_start: f64,
    pub x_end: f64,
    pub y_start: f64,
    pub y_end: f64,
}

/// Universal UI Finder 结果（统一格式）
#[derive(Debug, Serialize)]
pub struct UniversalClickResult {
    pub success: bool,
    pub element_found: bool, 
    pub click_executed: bool,
    pub execution_time_ms: u64,
    pub error_message: Option<String>,
    pub found_element: Option<FoundElement>,
    pub mode: String, // "指定应用模式" | "直接ADB模式"
}

#[derive(Debug, Serialize)]
pub struct FoundElement {
    pub text: String,
    pub bounds: String,
    pub position: (i32, i32),
}

/// 智能导航执行服务
pub struct UniversalUIService;

impl UniversalUIService {
    /// 将前端参数转换为NavigationBarConfig
    fn convert_to_navigation_config(&self, params: &SmartNavigationParams) -> NavigationBarConfig {
        // 使用默认位置比例或用户提供的
        let position_ratio = if let Some(ratio) = &params.position_ratio {
            ServicePositionRatio {
                x_start: ratio.x_start,
                x_end: ratio.x_end,
                y_start: ratio.y_start,
                y_end: ratio.y_end,
            }
        } else {
            // 根据导航类型推断默认位置
            self.get_default_position_ratio(&params.navigation_type)
        };

        // 根据应用推断按钮模式
        let button_patterns = self.get_button_patterns(&params.app_name);

        NavigationBarConfig {
            position_type: params.navigation_type.clone().unwrap_or_else(|| "bottom".to_string()),
            position_ratio: Some(position_ratio),
            button_count: Some(button_patterns.len() as i32),
            button_patterns: button_patterns, // 修复：直接使用Vec<String>，不包装Option
            target_button: params.target_button.clone(),
            click_action: params.click_action.clone().unwrap_or_else(|| "single_tap".to_string()),
        }
    }

    /// 获取默认位置比例
    fn get_default_position_ratio(&self, navigation_type: &Option<String>) -> ServicePositionRatio {
        match navigation_type.as_deref().unwrap_or("bottom") {
            "bottom" => ServicePositionRatio { x_start: 0.0, x_end: 1.0, y_start: 0.85, y_end: 1.0 },
            "top" => ServicePositionRatio { x_start: 0.0, x_end: 1.0, y_start: 0.0, y_end: 0.15 },
            "side" => ServicePositionRatio { x_start: 0.0, x_end: 0.3, y_start: 0.0, y_end: 1.0 },
            "floating" => ServicePositionRatio { x_start: 0.7, x_end: 1.0, y_start: 0.7, y_end: 1.0 },
            _ => ServicePositionRatio { x_start: 0.0, x_end: 1.0, y_start: 0.85, y_end: 1.0 },
        }
    }

    /// 根据应用获取按钮模式
    fn get_button_patterns(&self, app_name: &Option<String>) -> Vec<String> {
        match app_name.as_deref().unwrap_or("") {
            "小红书" => vec![
                "首页".to_string(), "市集".to_string(), "发布".to_string(), 
                "消息".to_string(), "我".to_string()
            ],
            "微信" => vec![
                "微信".to_string(), "通讯录".to_string(), "发现".to_string(), "我".to_string()
            ],
            "支付宝" => vec![
                "首页".to_string(), "理财".to_string(), "生活".to_string(), 
                "口碑".to_string(), "我的".to_string()
            ],
            _ => vec![
                "首页".to_string(), "消息".to_string(), "我".to_string()
            ],
        }
    }

    /// 转换执行结果为统一格式
    fn convert_result(&self, 
        find_result: ElementFinderResult, 
        click_result: Option<ClickResult>,
        mode: &str,
        start_time: std::time::Instant
    ) -> UniversalClickResult {
        let execution_time_ms = start_time.elapsed().as_millis() as u64;

        let found_element = find_result.target_element.map(|elem| FoundElement {
            text: elem.text,
            bounds: elem.bounds,
            position: elem.position,
        });

        let (click_executed, overall_success, error_message) = if let Some(click_res) = click_result {
            (true, find_result.success && click_res.success, 
             if click_res.success { None } else { Some(click_res.message) })
        } else {
            (false, false, Some("未执行点击操作".to_string()))
        };

        UniversalClickResult {
            success: overall_success,
            element_found: find_result.success,
            click_executed,
            execution_time_ms,
            error_message: error_message.or_else(|| {
                if !find_result.success { Some(find_result.message) } else { None }
            }),
            found_element,
            mode: mode.to_string(),
        }
    }
}

// ==================== Tauri Commands ====================

/// 执行智能导航点击（统一入口）
/// 支持双模式：指定应用模式 vs 直接ADB模式
#[command]
pub async fn execute_universal_ui_click(
    device_id: String,
    params: SmartNavigationParams,
    adb_service: tauri::State<'_, std::sync::Mutex<AdbService>>,
) -> Result<UniversalClickResult, String> {
    let start_time = std::time::Instant::now();
    
    // 确定执行模式
    let mode = if params.app_name.is_some() { 
        "指定应用模式" 
    } else { 
        "直接ADB模式" 
    };

    println!("🔧 执行智能导航 [{}]: {} -> {}", 
        mode, 
        params.app_name.as_deref().unwrap_or("当前界面"), 
        params.target_button);

    // 创建服务实例
    let service = UniversalUIService;
    let config = service.convert_to_navigation_config(&params);

    // 获取ADB服务
    let adb_svc = {
        let lock = adb_service.lock().map_err(|e| e.to_string())?;
        lock.clone()
    };
    let finder_service = SmartElementFinderService::new(adb_svc);

    // TODO: 在指定应用模式下，可以添加应用检测和切换逻辑
    if params.app_name.is_some() {
        println!("   📱 应用模式：将来可以添加应用检测逻辑");
        // 这里可以集成app_state_detector或其他应用检测服务
    }

    // 执行元素查找
    let find_result = finder_service.smart_element_finder(&device_id, config).await?;

    // 如果找到目标元素，执行点击
    let click_result = if find_result.success {
        if let Some(target_element) = &find_result.target_element {
            let click_type = params.click_action.as_deref().unwrap_or("single_tap");
            Some(finder_service.click_detected_element(&device_id, target_element.clone(), click_type).await?)
        } else {
            None
        }
    } else {
        None
    };

    let result = service.convert_result(find_result, click_result, mode, start_time);
    
    if result.success {
        println!("✅ 智能导航执行成功: {} ({}ms)", params.target_button, result.execution_time_ms);
    } else {
        println!("❌ 智能导航执行失败: {}", result.error_message.as_deref().unwrap_or("未知错误"));
    }

    Ok(result)
}

/// 快速点击（简化接口）
#[command] 
pub async fn execute_universal_quick_click(
    device_id: String,
    app_name: String,
    button_text: String,
    adb_service: tauri::State<'_, std::sync::Mutex<AdbService>>,
) -> Result<UniversalClickResult, String> {
    let params = SmartNavigationParams {
        navigation_type: Some("bottom".to_string()), // 默认底部导航
        target_button: button_text,
        click_action: Some("single_tap".to_string()),
        app_name: Some(app_name),
        position_ratio: None,
        custom_config: None,
    };

    execute_universal_ui_click(device_id, params, adb_service).await
}

/// 直接ADB点击（跳过应用检测）
#[command]
pub async fn execute_universal_direct_click(
    device_id: String,
    button_text: String,
    position_hint: Option<String>,
    adb_service: tauri::State<'_, std::sync::Mutex<AdbService>>,
) -> Result<UniversalClickResult, String> {
    // 推断导航类型
    let navigation_type = match position_hint.as_deref() {
        Some(hint) if hint.contains("下方") || hint.contains("底部") => Some("bottom".to_string()),
        Some(hint) if hint.contains("顶部") || hint.contains("上方") => Some("top".to_string()),
        Some(hint) if hint.contains("侧边") || hint.contains("左侧") || hint.contains("右侧") => Some("side".to_string()),
        Some(hint) if hint.contains("悬浮") => Some("floating".to_string()),
        _ => Some("bottom".to_string()), // 默认
    };

    let params = SmartNavigationParams {
        navigation_type,
        target_button: button_text,
        click_action: Some("single_tap".to_string()),
        app_name: None, // 关键：None表示直接ADB模式
        position_ratio: None,
        custom_config: None,
    };

    execute_universal_ui_click(device_id, params, adb_service).await
}

/// 获取预设配置信息
#[command]
pub async fn get_universal_navigation_presets() -> Result<serde_json::Value, String> {
    let presets = serde_json::json!({
        "apps": [
            {
                "name": "小红书",
                "buttons": ["首页", "市集", "发布", "消息", "我"],
                "navigation_type": "bottom"
            },
            {
                "name": "微信", 
                "buttons": ["微信", "通讯录", "发现", "我"],
                "navigation_type": "bottom"
            },
            {
                "name": "支付宝",
                "buttons": ["首页", "理财", "生活", "口碑", "我的"], 
                "navigation_type": "bottom"
            }
        ],
        "navigation_types": [
            { "key": "bottom", "label": "下方导航栏", "position": [0.0, 1.0, 0.85, 1.0] },
            { "key": "top", "label": "顶部导航栏", "position": [0.0, 1.0, 0.0, 0.15] },
            { "key": "side", "label": "侧边导航栏", "position": [0.0, 0.3, 0.0, 1.0] },
            { "key": "floating", "label": "悬浮按钮", "position": [0.7, 1.0, 0.7, 1.0] }
        ]
    });
    
    Ok(presets)
}