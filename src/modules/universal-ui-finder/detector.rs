// 应用检测器 - 智能检测和验证目标应用状态

use std::process::Command;
use regex::Regex;
use crate::{FindRequest, FindError};
use crate::logger::{InteractiveLogger, AppDetectionStep};

pub struct AppDetector {
    adb_path: String,
    device_id: Option<String>,
}

impl AppDetector {
    pub fn new(adb_path: &str, device_id: Option<String>) -> Result<Self, Box<dyn std::error::Error>> {
        Ok(Self {
            adb_path: adb_path.to_string(),
            device_id,
        })
    }
    
    /// 检测并准备应用 - 核心方法
    pub async fn detect_and_prepare_app(&self, request: &FindRequest, logger: &mut InteractiveLogger) 
        -> Result<AppStatus, FindError> {
        
        // 确保request.app_name不为None，因为只有在有应用名时才调用此方法
        let app_name = request.app_name.as_ref()
            .ok_or_else(|| FindError::ExecutionFailed("应用检测方法不应在直接ADB模式下被调用".to_string()))?;
        
        logger.log_app_detection(app_name, AppDetectionStep::Checking);
        
        // 步骤1: 根据应用名获取包名
        let package_name = self.get_package_name(app_name)?;
        logger.log_app_detection(app_name, AppDetectionStep::Found(package_name.clone()));
        
        // 步骤2: 检查应用是否安装
        if !self.is_app_installed(&package_name)? {
            logger.log_app_detection(app_name, AppDetectionStep::NotFound);
            
            if request.user_guidance {
                return self.handle_app_not_found(app_name, logger).await;
            } else {
                return Err(FindError::AppNotFound(format!("应用未安装: {}", app_name)));
            }
        }
        
        // 步骤3: 检查应用是否在前台运行
        if !self.is_app_in_foreground(&package_name)? {
            logger.log_app_detection(app_name, AppDetectionStep::NotRunning);
            
            if request.user_guidance {
                return self.handle_app_not_running(app_name, &package_name, logger).await;
            } else {
                return Err(FindError::AppNotOpened(format!("应用未在前台: {}", app_name)));
            }
        }
        
        logger.log_app_detection(app_name, AppDetectionStep::Ready);
        
        Ok(AppStatus {
            app_name: app_name.clone(),
            package_name,
            is_running: true,
            is_foreground: true,
        })
    }
    
    /// 根据应用名获取包名 - 支持模糊匹配
    fn get_package_name(&self, app_name: &str) -> Result<String, FindError> {
        let package_map = self.get_common_package_map();
        
        // 精确匹配
        if let Some(package) = package_map.get(app_name) {
            return Ok(package.to_string());
        }
        
        // 模糊匹配
        for (name, package) in &package_map {
            if name.contains(app_name) || app_name.contains(name) {
                return Ok(package.to_string());
            }
        }
        
        Err(FindError::AppNotFound(format!("未知应用: {}", app_name)))
    }
    
    /// 常用应用包名映射
    fn get_common_package_map(&self) -> std::collections::HashMap<&str, &str> {
        let mut map = std::collections::HashMap::new();
        
        // 社交应用
        map.insert("微信", "com.tencent.mm");
        map.insert("QQ", "com.tencent.mobileqq");
        map.insert("钉钉", "com.alibaba.android.rimet");
        map.insert("小红书", "com.xingin.xhs");
        map.insert("抖音", "com.ss.android.ugc.aweme");
        map.insert("快手", "com.smile.gifmaker");
        
        // 购物应用
        map.insert("淘宝", "com.taobao.taobao");
        map.insert("京东", "com.jingdong.app.mall");
        map.insert("拼多多", "com.xunmeng.pinduoduo");
        map.insert("天猫", "com.tmall.wireless");
        
        // 支付应用
        map.insert("支付宝", "com.eg.android.AlipayGphone");
        map.insert("云闪付", "com.unionpay");
        
        // 出行应用
        map.insert("滴滴", "com.sdu.didi.psnger");
        map.insert("高德地图", "com.autonavi.minimap");
        map.insert("百度地图", "com.baidu.BaiduMap");
        
        // 视频应用
        map.insert("爱奇艺", "com.qiyi.video");
        map.insert("腾讯视频", "com.tencent.qqlive");
        map.insert("优酷", "com.youku.phone");
        map.insert("B站", "tv.danmaku.bili");
        map.insert("bilibili", "tv.danmaku.bili");
        
        map
    }
    
    /// 检查应用是否已安装
    fn is_app_installed(&self, package_name: &str) -> Result<bool, Box<dyn std::error::Error>> {
        let mut cmd = Command::new(&self.adb_path);
        if let Some(device) = &self.device_id {
            cmd.arg("-s").arg(device);
        }
        cmd.args(&["shell", "pm", "list", "packages", package_name]);
        
        let output = cmd.output()?;
        let output_str = String::from_utf8_lossy(&output.stdout);
        
        Ok(output_str.contains(package_name))
    }
    
    /// 检查应用是否在前台运行
    fn is_app_in_foreground(&self, package_name: &str) -> Result<bool, Box<dyn std::error::Error>> {
        let mut cmd = Command::new(&self.adb_path);
        if let Some(device) = &self.device_id {
            cmd.arg("-s").arg(device);
        }
        cmd.args(&["shell", "dumpsys", "window", "windows", "|", "grep", "-E", "mCurrentFocus"]);
        
        let output = cmd.output()?;
        let output_str = String::from_utf8_lossy(&output.stdout);
        
        // 解析当前焦点窗口
        let focus_regex = Regex::new(r"mCurrentFocus=Window\{[^}]+ ([^/]+)/").unwrap();
        if let Some(captures) = focus_regex.captures(&output_str) {
            let current_package = captures.get(1).unwrap().as_str();
            return Ok(current_package == package_name);
        }
        
        // 备用检查方法：检查最近任务
        self.check_recent_tasks(package_name)
    }
    
    /// 检查最近任务中的应用
    fn check_recent_tasks(&self, package_name: &str) -> Result<bool, Box<dyn std::error::Error>> {
        let mut cmd = Command::new(&self.adb_path);
        if let Some(device) = &self.device_id {
            cmd.arg("-s").arg(device);
        }
        cmd.args(&["shell", "dumpsys", "activity", "recents", "|", "head", "-20"]);
        
        let output = cmd.output()?;
        let output_str = String::from_utf8_lossy(&output.stdout);
        
        Ok(output_str.contains(package_name))
    }
    
    /// 尝试启动应用
    fn try_launch_app(&self, package_name: &str) -> Result<bool, Box<dyn std::error::Error>> {
        let mut cmd = Command::new(&self.adb_path);
        if let Some(device) = &self.device_id {
            cmd.arg("-s").arg(device);
        }
        cmd.args(&["shell", "monkey", "-p", package_name, "-c", "android.intent.category.LAUNCHER", "1"]);
        
        let output = cmd.output()?;
        Ok(output.status.success())
    }
    
    /// 处理应用未找到的情况
    async fn handle_app_not_found(&self, app_name: &str, logger: &mut InteractiveLogger) 
        -> Result<AppStatus, FindError> {
        
        // 用户交互已在 logger 中处理
        
        // 给用户时间手动操作
        tokio::time::sleep(tokio::time::Duration::from_secs(2)).await;
        
        // 重新检测
        if let Ok(package_name) = self.get_package_name(app_name) {
            if self.is_app_installed(&package_name).unwrap_or(false) {
                logger.log_app_detection(app_name, AppDetectionStep::Found(package_name.clone()));
                
                if self.is_app_in_foreground(&package_name).unwrap_or(false) {
                    return Ok(AppStatus {
                        app_name: app_name.to_string(),
                        package_name,
                        is_running: true,
                        is_foreground: true,
                    });
                }
            }
        }
        
        Err(FindError::UserSkipped("用户未能解决应用未找到问题".to_string()))
    }
    
    /// 处理应用未运行的情况
    async fn handle_app_not_running(&self, app_name: &str, package_name: &str, logger: &mut InteractiveLogger) 
        -> Result<AppStatus, FindError> {
        
        // 用户交互已在 logger 中处理
        
        // 尝试自动启动应用
        if self.try_launch_app(package_name).unwrap_or(false) {
            // 等待应用启动
            tokio::time::sleep(tokio::time::Duration::from_secs(3)).await;
            
            if self.is_app_in_foreground(package_name).unwrap_or(false) {
                logger.log_app_detection(app_name, AppDetectionStep::Ready);
                return Ok(AppStatus {
                    app_name: app_name.to_string(),
                    package_name: package_name.to_string(),
                    is_running: true,
                    is_foreground: true,
                });
            }
        }
        
        // 给用户时间手动启动
        tokio::time::sleep(tokio::time::Duration::from_secs(5)).await;
        
        // 重新检测
        if self.is_app_in_foreground(package_name).unwrap_or(false) {
            logger.log_app_detection(app_name, AppDetectionStep::Ready);
            return Ok(AppStatus {
                app_name: app_name.to_string(),
                package_name: package_name.to_string(),
                is_running: true,
                is_foreground: true,
            });
        }
        
        Err(FindError::UserSkipped("用户未能启动目标应用".to_string()))
    }
}

/// 应用状态信息
#[derive(Debug, Clone)]
pub struct AppStatus {
    pub app_name: String,
    pub package_name: String,
    pub is_running: bool,
    pub is_foreground: bool,
}