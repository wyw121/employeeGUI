use serde::{Deserialize, Serialize};
use std::collections::HashMap;

/// 页面信息结构
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PageInfo {
    /// 页面名称（如：小红书首页、个人中心等）
    pub page_name: String,
    /// 应用包名
    pub app_package: String,
    /// Activity 名称
    pub activity_name: String,
    /// 页面类型
    pub page_type: PageType,
    /// 页面标题
    pub page_title: Option<String>,
    /// 分析时间戳
    pub analysis_timestamp: u64,
}

/// 页面类型枚举
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub enum PageType {
    /// 首页
    Home,
    /// 个人中心/我的页面
    Profile,
    /// 消息页面
    Messages,
    /// 搜索页面
    Search,
    /// 详情页面
    Detail,
    /// 设置页面
    Settings,
    /// 登录页面
    Login,
    /// 未知页面类型
    Unknown(String),
}

/// 可操作元素结构
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ActionableElement {
    /// 元素唯一ID
    pub id: String,
    /// 显示文本
    pub text: String,
    /// 元素类型
    pub element_type: ElementType,
    /// 元素位置和尺寸
    pub bounds: ElementBounds,
    /// 资源ID（如果有）
    pub resource_id: Option<String>,
    /// 类名
    pub class_name: String,
    /// 是否可点击
    pub is_clickable: bool,
    /// 是否可编辑
    pub is_editable: bool,
    /// 是否已启用
    pub is_enabled: bool,
    /// 是否可滚动
    pub is_scrollable: bool,
    /// 支持的操作列表
    pub supported_actions: Vec<ElementAction>,
    /// 元素分组信息（用于去重）
    pub group_info: ElementGroupInfo,
    /// 元素描述（用于用户理解）
    pub description: String,
}

/// 元素类型枚举
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq, Hash)]
pub enum ElementType {
    /// 按钮
    Button,
    /// 文本输入框
    EditText,
    /// 文本显示
    TextView,
    /// 图片
    ImageView,
    /// 列表项
    ListItem,
    /// 导航按钮
    NavigationButton,
    /// 选项卡
    Tab,
    /// 开关
    Switch,
    /// 复选框
    CheckBox,
    /// 下拉框
    Spinner,
    /// 其他类型
    Other(String),
}

/// 元素位置和尺寸
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ElementBounds {
    pub left: i32,
    pub top: i32,
    pub right: i32,
    pub bottom: i32,
}

impl ElementBounds {
    pub fn width(&self) -> i32 {
        self.right - self.left
    }
    
    pub fn height(&self) -> i32 {
        self.bottom - self.top
    }
    
    pub fn center_x(&self) -> i32 {
        (self.left + self.right) / 2
    }
    
    pub fn center_y(&self) -> i32 {
        (self.top + self.bottom) / 2
    }
}

/// 元素操作类型
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub enum ElementAction {
    /// 单击
    Click,
    /// 长按
    LongClick,
    /// 输入文本
    InputText(String),
    /// 清除文本
    ClearText,
    /// 向上滑动
    SwipeUp,
    /// 向下滑动
    SwipeDown,
    /// 向左滑动
    SwipeLeft,
    /// 向右滑动
    SwipeRight,
    /// 滚动到指定位置
    ScrollTo(i32, i32),
    /// 设置开关状态
    SetSwitchState(bool),
    /// 选择选项
    SelectOption(String),
}

/// 元素分组信息（用于去重）
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ElementGroupInfo {
    /// 分组键（相同键值的元素会被认为是同类元素）
    pub group_key: String,
    /// 分组类型
    pub group_type: ElementGroupType,
    /// 在分组中的索引
    pub group_index: usize,
    /// 分组总数
    pub group_total: usize,
    /// 是否是代表元素（去重后显示的那一个）
    pub is_representative: bool,
}

/// 元素分组类型
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub enum ElementGroupType {
    /// 导航栏按钮组
    NavigationButtons,
    /// 操作按钮组
    ActionButtons,
    /// 列表项组
    ListItems,
    /// 选项卡组
    TabItems,
    /// 社交按钮组（点赞、评论、分享等）
    SocialButtons,
    /// 输入框组
    InputFields,
    /// 独立元素（不需要分组）
    Individual,
}

/// 页面分析结果
#[derive(Debug, Serialize, Deserialize)]
pub struct PageAnalysisResult {
    /// 页面信息
    pub page_info: PageInfo,
    /// 去重后的可操作元素列表
    pub actionable_elements: Vec<ActionableElement>,
    /// 元素分类统计
    pub element_statistics: ElementStatistics,
    /// 分析成功状态
    pub success: bool,
    /// 错误信息（如果有）
    pub error_message: Option<String>,
}

/// 元素统计信息
#[derive(Debug, Serialize, Deserialize)]
pub struct ElementStatistics {
    /// 总元素数（去重前）
    pub total_elements: usize,
    /// 去重后元素数
    pub unique_elements: usize,
    /// 各类型元素数量
    pub type_counts: HashMap<String, usize>,
    /// 各分组类型数量
    pub group_counts: HashMap<String, usize>,
}

/// 用户选择的元素配置
#[derive(Debug, Serialize, Deserialize)]
pub struct SelectedElementConfig {
    /// 选中的元素ID
    pub element_id: String,
    /// 选择的操作
    pub action: ElementAction,
    /// 操作参数（如输入的文本）
    pub action_parameters: HashMap<String, String>,
    /// 操作延迟（毫秒）
    pub delay_ms: u64,
    /// 操作重试次数
    pub retry_count: u32,
    /// 操作描述
    pub description: String,
}

/// 页面分析配置
#[derive(Debug, Serialize, Deserialize)]
pub struct PageAnalysisConfig {
    /// 是否启用元素去重
    pub enable_deduplication: bool,
    /// 最小元素尺寸（过滤太小的元素）
    pub min_element_size: (i32, i32),
    /// 是否包含不可见元素
    pub include_invisible_elements: bool,
    /// 元素文本最小长度（过滤空文本元素）
    pub min_text_length: usize,
    /// 是否分析页面类型
    pub analyze_page_type: bool,
}

impl Default for PageAnalysisConfig {
    fn default() -> Self {
        Self {
            enable_deduplication: true,
            min_element_size: (20, 20),
            include_invisible_elements: false,
            min_text_length: 0,
            analyze_page_type: true,
        }
    }
}