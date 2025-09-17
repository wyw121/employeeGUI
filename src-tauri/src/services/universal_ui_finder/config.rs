// 配置管理 - 支持多应用和多场景的配置化管理

use std::collections::HashMap;
use serde::{Deserialize, Serialize};

/// 应用配置管理器
pub struct AppConfigManager {
    app_configs: HashMap<String, AppConfig>,
    ui_templates: HashMap<String, UITemplate>,
}

impl AppConfigManager {
    pub fn new() -> Self {
        let mut manager = Self {
            app_configs: HashMap::new(),
            ui_templates: HashMap::new(),
        };
        
        // 初始化常用应用配置
        manager.load_default_app_configs();
        manager.load_default_ui_templates();
        
        manager
    }
    
    /// 获取应用配置
    pub fn get_app_config(&self, app_name: &str) -> Option<&AppConfig> {
        self.app_configs.get(app_name)
    }
    
    /// 获取UI模板
    pub fn get_ui_template(&self, template_name: &str) -> Option<&UITemplate> {
        self.ui_templates.get(template_name)
    }
    
    /// 创建查找请求配置
    pub fn create_find_request(&self, app_name: &str, button_text: &str, position_hint: Option<&str>) 
        -> Result<crate::services::universal_ui_finder::FindRequest, String> {
        
        let app_config = self.get_app_config(app_name)
            .ok_or_else(|| format!("未找到应用配置: {}", app_name))?;
        
        // 根据按钮类型推断预操作
        let pre_actions = self.infer_pre_actions(button_text, position_hint, app_config);
        
        Ok(crate::services::universal_ui_finder::FindRequest {
            app_name: Some(app_name.to_string()), // 指定应用模式
            target_text: button_text.to_string(),
            position_hint: position_hint.map(|s| s.to_string()),
            pre_actions,
            user_guidance: true, // 默认启用用户引导
            timeout: Some(30), // 默认30秒超时
            retry_count: Some(3), // 默认重试3次
        })
    }
    
    /// 推断预操作步骤
    fn infer_pre_actions(&self, button_text: &str, position_hint: Option<&str>, app_config: &AppConfig) 
        -> Option<Vec<String>> {
        
        let mut actions = Vec::new();
        
        // 根据位置提示推断预操作
        if let Some(position) = position_hint {
            match position {
                "左侧边栏" => {
                    actions.push("右滑展开".to_string());
                    actions.push("等待动画500ms".to_string());
                },
                "右侧边栏" => {
                    actions.push("左滑展开".to_string());
                    actions.push("等待动画500ms".to_string());
                },
                _ => {}
            }
        }
        
        // 根据按钮文本推断预操作
        match button_text {
            text if text.contains("关注") => {
                if app_config.requires_sidebar_for_follow {
                    actions.push("右滑展开".to_string());
                    actions.push("等待动画800ms".to_string());
                }
            },
            text if text.contains("设置") => {
                if app_config.settings_in_profile {
                    actions.push("等待页面加载".to_string());
                }
            },
            _ => {}
        }
        
        if actions.is_empty() { None } else { Some(actions) }
    }
    
    /// 加载默认应用配置
    fn load_default_app_configs(&mut self) {
        // 小红书配置
        self.app_configs.insert("小红书".to_string(), AppConfig {
            package_name: "com.xingin.xhs".to_string(),
            app_name: "小红书".to_string(),
            navigation_height: 135,
            button_min_size: (60, 35),
            button_max_size: (300, 100),
            common_buttons: vec![
                "首页".to_string(), "购物".to_string(), "发布".to_string(), 
                "消息".to_string(), "我".to_string()
            ],
            sidebar_buttons: vec![
                "关注好友".to_string(), "创作中心".to_string(), "购物助手".to_string()
            ],
            requires_sidebar_for_follow: true,
            settings_in_profile: true,
            special_gestures: HashMap::new(),
        });
        
        // 微信配置
        self.app_configs.insert("微信".to_string(), AppConfig {
            package_name: "com.tencent.mm".to_string(),
            app_name: "微信".to_string(),
            navigation_height: 128,
            button_min_size: (70, 40),
            button_max_size: (280, 90),
            common_buttons: vec![
                "微信".to_string(), "通讯录".to_string(), 
                "发现".to_string(), "我".to_string()
            ],
            sidebar_buttons: vec![
                "收藏".to_string(), "相册".to_string(), "卡包".to_string(), "设置".to_string()
            ],
            requires_sidebar_for_follow: false,
            settings_in_profile: true,
            special_gestures: HashMap::new(),
        });
        
        // QQ配置
        self.app_configs.insert("QQ".to_string(), AppConfig {
            package_name: "com.tencent.mobileqq".to_string(),
            app_name: "QQ".to_string(),
            navigation_height: 140,
            button_min_size: (65, 38),
            button_max_size: (320, 95),
            common_buttons: vec![
                "消息".to_string(), "联系人".to_string(), 
                "动态".to_string(), "我的".to_string()
            ],
            sidebar_buttons: vec![
                "好友推荐".to_string(), "群聊".to_string(), "设备管理".to_string()
            ],
            requires_sidebar_for_follow: true,
            settings_in_profile: false,
            special_gestures: HashMap::new(),
        });
        
        // 支付宝配置
        self.app_configs.insert("支付宝".to_string(), AppConfig {
            package_name: "com.eg.android.AlipayGphone".to_string(),
            app_name: "支付宝".to_string(),
            navigation_height: 132,
            button_min_size: (75, 42),
            button_max_size: (290, 88),
            common_buttons: vec![
                "首页".to_string(), "理财".to_string(), "生活".to_string(), 
                "口碑".to_string(), "我的".to_string()
            ],
            sidebar_buttons: vec![
                "设置".to_string(), "客服".to_string(), "关于".to_string()
            ],
            requires_sidebar_for_follow: false,
            settings_in_profile: true,
            special_gestures: HashMap::new(),
        });
        
        // 更多应用可以继续添加...
    }
    
    /// 加载默认UI模板
    fn load_default_ui_templates(&mut self) {
        // 导航栏模板
        self.ui_templates.insert("bottom_navigation".to_string(), UITemplate {
            name: "底部导航栏".to_string(),
            position_area: PositionArea {
                x_min_ratio: 0.0,
                x_max_ratio: 1.0,
                y_min_ratio: 0.8,
                y_max_ratio: 1.0,
            },
            element_characteristics: ElementCharacteristics {
                min_size: (50, 30),
                max_size: (300, 120),
                expected_count: 3..=6,
                layout_type: LayoutType::Horizontal,
            },
            validation_rules: vec![
                "clickable must be true".to_string(),
                "text must not be empty".to_string(),
            ],
        });
        
        // 侧边栏模板
        self.ui_templates.insert("left_sidebar".to_string(), UITemplate {
            name: "左侧边栏".to_string(),
            position_area: PositionArea {
                x_min_ratio: 0.0,
                x_max_ratio: 0.4,
                y_min_ratio: 0.1,
                y_max_ratio: 0.9,
            },
            element_characteristics: ElementCharacteristics {
                min_size: (100, 35),
                max_size: (400, 80),
                expected_count: 2..=10,
                layout_type: LayoutType::Vertical,
            },
            validation_rules: vec![
                "clickable must be true".to_string(),
                "bounds.left < screen_width / 3".to_string(),
            ],
        });
    }
    
    /// 添加自定义应用配置
    pub fn add_app_config(&mut self, app_name: String, config: AppConfig) {
        self.app_configs.insert(app_name, config);
    }
    
    /// 获取所有支持的应用列表
    pub fn get_supported_apps(&self) -> Vec<String> {
        self.app_configs.keys().cloned().collect()
    }
}

/// 应用特定配置
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AppConfig {
    pub package_name: String,
    pub app_name: String,
    pub navigation_height: i32,
    pub button_min_size: (i32, i32), // (width, height)
    pub button_max_size: (i32, i32),
    pub common_buttons: Vec<String>, // 常见按钮文本
    pub sidebar_buttons: Vec<String>, // 侧边栏按钮
    pub requires_sidebar_for_follow: bool, // 关注功能是否需要侧边栏
    pub settings_in_profile: bool, // 设置是否在个人页面
    pub special_gestures: HashMap<String, String>, // 特殊手势映射
}

/// UI模板配置
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct UITemplate {
    pub name: String,
    pub position_area: PositionArea,
    pub element_characteristics: ElementCharacteristics,
    pub validation_rules: Vec<String>,
}

/// 位置区域定义
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PositionArea {
    pub x_min_ratio: f32, // 相对屏幕宽度的比例
    pub x_max_ratio: f32,
    pub y_min_ratio: f32, // 相对屏幕高度的比例
    pub y_max_ratio: f32,
}

/// 元素特征定义
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ElementCharacteristics {
    pub min_size: (i32, i32),
    pub max_size: (i32, i32),
    pub expected_count: std::ops::RangeInclusive<usize>,
    pub layout_type: LayoutType,
}

/// 布局类型
#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum LayoutType {
    Horizontal, // 水平排列
    Vertical,   // 垂直排列
    Grid,       // 网格排列
    Free,       // 自由排列
}

impl Default for AppConfigManager {
    fn default() -> Self {
        Self::new()
    }
}
