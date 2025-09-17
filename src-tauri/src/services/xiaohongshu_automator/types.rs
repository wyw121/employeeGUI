use serde::{Deserialize, Serialize};

// ===== 应用状态相关类型 =====

/// 应用状态检查结果
#[derive(Debug, Serialize, Deserialize)]
pub struct AppStatusResult {
    pub app_installed: bool,
    pub app_running: bool,
    pub message: String,
    pub app_version: Option<String>,
    pub package_name: Option<String>,
}

// ===== 导航相关类型 =====

/// 导航操作结果
#[derive(Debug, Serialize, Deserialize)]
pub struct NavigationResult {
    pub success: bool,
    pub message: String,
}

// ===== 关注操作相关类型 =====

/// 关注操作配置
#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct XiaohongshuFollowOptions {
    pub max_pages: Option<usize>,
    pub follow_interval: Option<u64>,
    pub skip_existing: Option<bool>,
    pub return_to_home: Option<bool>,
}

impl Default for XiaohongshuFollowOptions {
    fn default() -> Self {
        Self {
            max_pages: Some(5),
            follow_interval: Some(2000),
            skip_existing: Some(true),
            return_to_home: Some(true),
        }
    }
}

/// 关注操作结果
#[derive(Debug, Serialize, Deserialize)]
pub struct XiaohongshuFollowResult {
    pub success: bool,
    pub total_followed: usize,
    pub pages_processed: usize,
    pub duration: u64,
    pub details: Vec<FollowDetail>,
    pub message: String,
}

/// 单个关注操作的详细信息
#[derive(Debug, Serialize, Deserialize)]
pub struct FollowDetail {
    pub user_position: (i32, i32),
    pub follow_success: bool,
    pub button_text_before: Option<String>,
    pub button_text_after: Option<String>,
    pub error: Option<String>,
}

// ===== 页面状态相关类型 =====

/// 页面状态枚举
#[derive(Debug, Clone, PartialEq)]
pub enum PageState {
    Unknown,         // 未知页面
    Home,            // Android桌面
    MainPage,        // 小红书主页
    SidebarOpen,     // 侧边栏已打开
    DiscoverFriends, // 发现好友页面（包括WebView）
    WebViewFriends,  // WebView好友发现页面（特殊处理）
    ContactsList,    // 通讯录列表页面
    UserProfile,     // 用户资料页面
}

/// 关注按钮信息
#[derive(Debug, Clone)]
pub struct FollowButton {
    pub x: i32,
    pub y: i32,
    pub state: ButtonState,
    pub text: String,
}

/// 按钮状态枚举
#[derive(Debug, Clone, PartialEq)]
pub enum ButtonState {
    CanFollow,       // 可以关注
    AlreadyFollowed, // 已经关注
    Loading,         // 加载中
    Unknown,         // 未知状态
}

/// 页面识别结果
#[derive(Debug, Clone)]
pub struct PageRecognitionResult {
    pub current_state: PageState,
    pub confidence: f32,
    pub key_elements: Vec<String>,
    pub ui_elements: Vec<UIElement>,
    pub message: String,
}

// ===== UI元素相关类型 =====

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

// ===== 屏幕相关类型 =====

/// 屏幕信息
#[derive(Debug)]
pub struct ScreenInfo {
    pub width: i32,
    pub height: i32,
}

// ===== 自动关注相关类型 =====

/// 关注操作结果（标准化版本）
#[derive(Debug, Clone)]
pub struct FollowResult {
    pub user_name: String,
    pub status: FollowStatus,
    pub message: String,
    pub timestamp: chrono::DateTime<chrono::Utc>,
}

/// 关注状态（标准化版本）
#[derive(Debug, Clone, PartialEq)]
pub enum FollowStatus {
    Success,         // 关注成功
    AlreadyFollowed, // 已经关注
    Failed,          // 关注失败
    NotFound,        // 未找到用户
    Error,           // 发生错误
}

/// 屏幕设备类型分类
#[derive(Debug, Clone)]
pub enum ScreenCategory {
    SmallPhone,    // 小屏手机 (< 1M像素)
    StandardPhone, // 标准手机 (1080x1920等)
    LargePhone,    // 大屏手机 (1440x2560等)
    LongScreen,    // 异形屏/长屏 (宽高比 > 2.0)
    Tablet,        // 平板设备 (> 1200px宽度)
}

// ===== 导航状态相关类型 =====

/// 应用导航状态
#[derive(Debug, Clone, PartialEq)]
pub enum NavigationState {
    Unknown,
    Home,         // 主页
    DiscoverMenu, // 发现菜单
    ContactsList, // 通讯录列表
    FollowPage,   // 关注页面
    ProfilePage,  // 个人资料页面
}