use serde::{Deserialize, Serialize};
use std::time::Duration;
use std::collections::HashMap;

/// 检测配置结构体
/// 定义应用状态检测的各项参数
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DetectionConfig {
    /// 最大等待时间
    pub max_wait_time: Duration,
    
    /// 检测间隔
    pub check_interval: Duration,
    
    /// 启动画面超时
    pub splash_timeout: Duration,
    
    /// UI加载超时
    pub ui_load_timeout: Duration,
    
    /// 权限弹窗超时
    pub permission_timeout: Duration,
    
    /// 网络检查超时
    pub network_timeout: Duration,
    
    /// 是否自动处理权限弹窗
    pub auto_handle_permissions: bool,
    
    /// 是否跳过广告页面
    pub skip_advertisements: bool,
    
    /// 重试次数
    pub max_retries: usize,
    
    /// 应用特定的检测关键词
    pub detection_keywords: DetectionKeywords,
}

/// 检测关键词配置
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DetectionKeywords {
    /// 首页/主页标识符
    pub homepage_indicators: Vec<String>,
    
    /// 启动画面标识符
    pub splash_indicators: Vec<String>,
    
    /// 加载页面标识符
    pub loading_indicators: Vec<String>,
    
    /// 权限弹窗标识符
    pub permission_indicators: Vec<String>,
    
    /// 登录页面标识符
    pub login_indicators: Vec<String>,
    
    /// 网络错误标识符
    pub network_error_indicators: Vec<String>,
    
    /// 广告页面标识符
    pub advertisement_indicators: Vec<String>,
    
    /// 更新提示标识符
    pub update_indicators: Vec<String>,
}

impl Default for DetectionConfig {
    fn default() -> Self {
        Self {
            max_wait_time: Duration::from_secs(30),
            check_interval: Duration::from_millis(1000),
            splash_timeout: Duration::from_secs(10),
            ui_load_timeout: Duration::from_secs(15),
            permission_timeout: Duration::from_secs(20),
            network_timeout: Duration::from_secs(25),
            auto_handle_permissions: false,
            skip_advertisements: true,
            max_retries: 3,
            detection_keywords: DetectionKeywords::default(),
        }
    }
}

impl Default for DetectionKeywords {
    fn default() -> Self {
        Self {
            homepage_indicators: vec![
                "首页".to_string(), "主页".to_string(), "Home".to_string(),
                "MainActivity".to_string(), "主界面".to_string()
            ],
            splash_indicators: vec![
                "正在加载".to_string(), "Loading".to_string(), "启动中".to_string(),
                "加载中".to_string(), "欢迎".to_string(), "Welcome".to_string(),
                "请稍等".to_string(), "Please wait".to_string()
            ],
            loading_indicators: vec![
                "加载中".to_string(), "Loading".to_string(), "请稍候".to_string(),
                "正在加载".to_string(), "数据加载中".to_string(), "内容加载中".to_string()
            ],
            permission_indicators: vec![
                "允许".to_string(), "拒绝".to_string(), "权限".to_string(),
                "位置信息".to_string(), "定位".to_string(), "相机".to_string(),
                "麦克风".to_string(), "存储".to_string(), "通知".to_string(),
                "联系人".to_string(), "Allow".to_string(), "Deny".to_string(),
                "Permission".to_string(), "Location".to_string()
            ],
            login_indicators: vec![
                "登录".to_string(), "Login".to_string(), "登陆".to_string(),
                "Sign in".to_string(), "账号".to_string(), "Account".to_string(),
                "用户名".to_string(), "密码".to_string(), "Password".to_string(),
                "手机号".to_string(), "验证码".to_string()
            ],
            network_error_indicators: vec![
                "网络连接".to_string(), "Network".to_string(), "无网络".to_string(),
                "No network".to_string(), "连接失败".to_string(), "Connection failed".to_string(),
                "检查网络".to_string(), "Check network".to_string(), "网络异常".to_string(),
                "Network error".to_string(), "请检查网络".to_string()
            ],
            advertisement_indicators: vec![
                "广告".to_string(), "Advertisement".to_string(), "跳过".to_string(),
                "Skip".to_string(), "关闭".to_string(), "Close".to_string(),
                "Ad".to_string(), "推广".to_string(), "Sponsored".to_string()
            ],
            update_indicators: vec![
                "更新".to_string(), "Update".to_string(), "升级".to_string(),
                "新版本".to_string(), "New version".to_string(), "立即更新".to_string(),
                "Update now".to_string(), "稍后更新".to_string(), "Later".to_string()
            ],
        }
    }
}

/// 应用配置管理器
/// 管理不同应用的检测配置
pub struct AppConfigManager {
    configs: HashMap<String, DetectionConfig>,
}

impl AppConfigManager {
    pub fn new() -> Self {
        let mut manager = Self {
            configs: HashMap::new(),
        };
        
        // 预置一些热门应用的配置
        manager.init_predefined_configs();
        manager
    }
    
    /// 初始化预定义的应用配置
    fn init_predefined_configs(&mut self) {
        // 小红书配置
        self.configs.insert("com.xingin.xhs".to_string(), DetectionConfig {
            max_wait_time: Duration::from_secs(45),
            check_interval: Duration::from_millis(1500),
            splash_timeout: Duration::from_secs(15),
            ui_load_timeout: Duration::from_secs(20),
            permission_timeout: Duration::from_secs(25),
            network_timeout: Duration::from_secs(30),
            auto_handle_permissions: true,
            skip_advertisements: true,
            max_retries: 3,
            detection_keywords: DetectionKeywords {
                homepage_indicators: vec![
                    "首页".to_string(), "发现".to_string(), "购物".to_string(),
                    "消息".to_string(), "我".to_string(), "关注".to_string(),
                    "推荐".to_string(), "附近".to_string(), "com.xingin.xhs:id/tab_".to_string()
                ],
                splash_indicators: vec![
                    "小红书".to_string(), "正在加载".to_string(), "Loading".to_string(),
                    "启动中".to_string(), "欢迎使用小红书".to_string()
                ],
                ..DetectionKeywords::default()
            },
        });
        
        // 微信配置
        self.configs.insert("com.tencent.mm".to_string(), DetectionConfig {
            max_wait_time: Duration::from_secs(30),
            check_interval: Duration::from_millis(1000),
            splash_timeout: Duration::from_secs(8),
            ui_load_timeout: Duration::from_secs(12),
            permission_timeout: Duration::from_secs(15),
            network_timeout: Duration::from_secs(20),
            auto_handle_permissions: true,
            skip_advertisements: false, // 微信一般没有广告
            max_retries: 2,
            detection_keywords: DetectionKeywords {
                homepage_indicators: vec![
                    "微信".to_string(), "WeChat".to_string(), "聊天".to_string(),
                    "通讯录".to_string(), "发现".to_string(), "我".to_string(),
                    "消息".to_string(), "com.tencent.mm:id/".to_string()
                ],
                splash_indicators: vec![
                    "微信".to_string(), "WeChat".to_string(), "正在加载".to_string(),
                    "Loading".to_string()
                ],
                ..DetectionKeywords::default()
            },
        });
        
        // QQ配置
        self.configs.insert("com.tencent.mobileqq".to_string(), DetectionConfig {
            max_wait_time: Duration::from_secs(35),
            check_interval: Duration::from_millis(1200),
            splash_timeout: Duration::from_secs(10),
            ui_load_timeout: Duration::from_secs(15),
            permission_timeout: Duration::from_secs(20),
            network_timeout: Duration::from_secs(25),
            auto_handle_permissions: true,
            skip_advertisements: true,
            max_retries: 3,
            detection_keywords: DetectionKeywords {
                homepage_indicators: vec![
                    "QQ".to_string(), "消息".to_string(), "联系人".to_string(),
                    "动态".to_string(), "看点".to_string(), "我".to_string(),
                    "com.tencent.mobileqq:id/".to_string()
                ],
                splash_indicators: vec![
                    "QQ".to_string(), "正在加载".to_string(), "Loading".to_string(),
                    "启动中".to_string()
                ],
                ..DetectionKeywords::default()
            },
        });
        
        // 抖音配置
        self.configs.insert("com.ss.android.ugc.aweme".to_string(), DetectionConfig {
            max_wait_time: Duration::from_secs(40),
            check_interval: Duration::from_millis(1300),
            splash_timeout: Duration::from_secs(12),
            ui_load_timeout: Duration::from_secs(18),
            permission_timeout: Duration::from_secs(22),
            network_timeout: Duration::from_secs(28),
            auto_handle_permissions: true,
            skip_advertisements: true,
            max_retries: 3,
            detection_keywords: DetectionKeywords {
                homepage_indicators: vec![
                    "首页".to_string(), "关注".to_string(), "朋友".to_string(),
                    "我".to_string(), "推荐".to_string(), "抖音".to_string(),
                    "com.ss.android.ugc.aweme:id/".to_string()
                ],
                splash_indicators: vec![
                    "抖音".to_string(), "正在加载".to_string(), "Loading".to_string(),
                    "启动中".to_string(), "欢迎使用抖音".to_string()
                ],
                ..DetectionKeywords::default()
            },
        });
    }
    
    /// 获取应用的检测配置
    pub fn get_config(&self, package_name: &str) -> DetectionConfig {
        self.configs.get(package_name)
            .cloned()
            .unwrap_or_else(DetectionConfig::default)
    }
    
    /// 设置应用配置
    pub fn set_config(&mut self, package_name: String, config: DetectionConfig) {
        self.configs.insert(package_name, config);
    }
    
    /// 移除应用配置
    pub fn remove_config(&mut self, package_name: &str) {
        self.configs.remove(package_name);
    }
    
    /// 检查是否有应用的自定义配置
    pub fn has_config(&self, package_name: &str) -> bool {
        self.configs.contains_key(package_name)
    }
    
    /// 获取所有已配置的应用列表
    pub fn get_configured_apps(&self) -> Vec<String> {
        self.configs.keys().cloned().collect()
    }
    
    /// 从文件加载配置
    pub fn load_from_file(&mut self, file_path: &str) -> anyhow::Result<()> {
        // TODO: 实现从JSON或TOML文件加载配置
        Ok(())
    }
    
    /// 保存配置到文件
    pub fn save_to_file(&self, file_path: &str) -> anyhow::Result<()> {
        // TODO: 实现保存配置到JSON或TOML文件
        Ok(())
    }
}

impl Default for AppConfigManager {
    fn default() -> Self {
        Self::new()
    }
}