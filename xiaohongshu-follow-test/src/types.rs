use serde::{Deserialize, Serialize};

/// 应用状态检查结果
#[derive(Debug, Serialize, Deserialize)]
pub struct AppStatusResult {
    pub app_installed: bool,
    pub app_running: bool,
    pub message: String,
}

/// 导航结果
#[derive(Debug, Serialize, Deserialize)]
pub struct NavigationResult {
    pub success: bool,
    pub message: String,
}

/// 关注结果
#[derive(Debug, Serialize, Deserialize)]
pub struct FollowResult {
    pub success: bool,
    pub followed_count: usize,
    pub message: String,
}

/// 小红书关注选项配置
#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct XiaohongshuFollowOptions {
    /// 最大处理页数
    pub max_pages: Option<usize>,
    /// 关注间隔（毫秒）
    pub follow_interval: Option<u64>,
    /// 跳过已关注用户
    pub skip_existing: Option<bool>,
    /// 是否截图记录
    pub take_screenshots: Option<bool>,
    /// 完成后返回主页
    pub return_to_home: Option<bool>,
}

/// 小红书关注结果
#[derive(Debug, Serialize, Deserialize)]
pub struct XiaohongshuFollowResult {
    /// 操作是否成功
    pub success: bool,
    /// 总关注用户数
    pub total_followed: usize,
    /// 处理的页数
    pub pages_processed: usize,
    /// 执行时长（秒）
    pub duration: u64,
    /// 详细操作记录
    pub details: Vec<FollowDetail>,
    /// 结果消息
    pub message: String,
}

/// 单个关注操作的详细信息
#[derive(Debug, Serialize, Deserialize)]
pub struct FollowDetail {
    /// 用户位置坐标 (x, y)
    pub user_position: (i32, i32),
    /// 关注是否成功
    pub follow_success: bool,
    /// 关注前按钮文本
    pub button_text_before: Option<String>,
    /// 关注后按钮文本
    pub button_text_after: Option<String>,
    /// 错误信息（如果有）
    pub error: Option<String>,
}

impl Default for XiaohongshuFollowOptions {
    fn default() -> Self {
        Self {
            max_pages: Some(5),
            follow_interval: Some(2000),
            skip_existing: Some(true),
            take_screenshots: Some(false),
            return_to_home: Some(true),
        }
    }
}

/// 页面状态枚举
#[derive(Debug, Clone, PartialEq)]
pub enum PageState {
    Unknown,                    // 未知页面
    MainPage,                  // 小红书主页
    SidebarOpen,               // 侧边栏已打开
    DiscoverFriends,           // 发现好友页面
    ContactsList,              // 通讯录列表页面
    UserProfile,               // 用户资料页面
    SettingsPage,              // 设置页面
}

/// 页面识别结果
#[derive(Debug, Clone)]
pub struct PageRecognitionResult {
    pub current_state: PageState,
    pub confidence: f32,        // 识别信心度 (0.0-1.0)
    pub key_elements: Vec<String>, // 识别到的关键元素
    pub ui_elements: Vec<UIElement>, // 可操作的UI元素
    pub message: String,
}

/// UI元素信息
#[derive(Debug, Clone)]
pub struct UIElement {
    pub element_type: UIElementType,
    pub text: String,
    pub bounds: (i32, i32, i32, i32), // (left, top, right, bottom)
    pub clickable: bool,
    pub resource_id: Option<String>,
    pub class_name: Option<String>,
}

/// UI元素类型
#[derive(Debug, Clone, PartialEq)]
pub enum UIElementType {
    Button,
    TextView,
    ImageView,
    EditText,
    RecyclerView,
    LinearLayout,
    RelativeLayout,
    Unknown,
}