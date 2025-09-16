use std::sync::Arc;
use anyhow::Result;
use tracing::{info, debug};

use crate::services::adb_shell_session::AdbShellSession;
use super::super::core::{AppDetector, AppConfigManager, DetectionConfig};
use super::super::detectors::{XiaohongshuDetector, WechatDetector, GenericDetector};

/// 应用检测器工厂
/// 根据应用包名创建对应的检测器实例
pub struct DetectorFactory {
    config_manager: AppConfigManager,
}

impl DetectorFactory {
    pub fn new() -> Self {
        Self {
            config_manager: AppConfigManager::new(),
        }
    }
    
    pub fn with_config_manager(config_manager: AppConfigManager) -> Self {
        Self {
            config_manager,
        }
    }
    
    /// 创建应用检测器
    /// 根据包名选择合适的检测器实现
    pub fn create_detector(
        &self, 
        package_name: &str, 
        app_name: &str,
        shell_session: AdbShellSession
    ) -> Arc<dyn AppDetector> {
        info!("🏭 创建应用检测器: {} ({})", app_name, package_name);
        
        match package_name {
            "com.xingin.xhs" => {
                debug!("📱 使用小红书专用检测器");
                Arc::new(XiaohongshuDetector::new(shell_session))
            },
            "com.tencent.mm" => {
                debug!("💬 使用微信专用检测器");
                Arc::new(WechatDetector::new(shell_session))
            },
            // TODO: 添加更多专用检测器
            // "com.tencent.mobileqq" => {
            //     debug!("🐧 使用QQ专用检测器");
            //     Arc::new(QQDetector::new(shell_session))
            // },
            // "com.ss.android.ugc.aweme" => {
            //     debug!("🎵 使用抖音专用检测器");
            //     Arc::new(DouyinDetector::new(shell_session))
            // },
            _ => {
                debug!("🔧 使用通用检测器");
                let config = self.config_manager.get_config(package_name);
                Arc::new(GenericDetector::new(
                    package_name.to_string(),
                    app_name.to_string(),
                    shell_session
                ).with_config(config))
            }
        }
    }
    
    /// 批量创建多个应用的检测器
    pub fn create_detectors(
        &self,
        app_infos: &[(String, String)], // (package_name, app_name)
        shell_session: AdbShellSession
    ) -> Vec<Arc<dyn AppDetector>> {
        info!("🏭 批量创建 {} 个应用检测器", app_infos.len());
        
        app_infos.iter().map(|(package_name, app_name)| {
            self.create_detector(package_name, app_name, shell_session.clone())
        }).collect()
    }
    
    /// 获取支持的应用列表
    pub fn get_supported_apps(&self) -> Vec<&'static str> {
        vec![
            "com.xingin.xhs",        // 小红书
            "com.tencent.mm",        // 微信
            // TODO: 添加更多支持的应用
            // "com.tencent.mobileqq",  // QQ
            // "com.ss.android.ugc.aweme", // 抖音
        ]
    }
    
    /// 检查应用是否有专用检测器
    pub fn has_specialized_detector(&self, package_name: &str) -> bool {
        self.get_supported_apps().contains(&package_name)
    }
    
    /// 获取应用的推荐配置
    pub fn get_recommended_config(&self, package_name: &str) -> DetectionConfig {
        self.config_manager.get_config(package_name)
    }
    
    /// 设置应用的自定义配置
    pub fn set_app_config(&mut self, package_name: String, config: DetectionConfig) {
        info!("⚙️ 设置应用自定义配置: {}", package_name);
        self.config_manager.set_config(package_name, config);
    }
    
    /// 获取配置管理器的引用
    pub fn config_manager(&self) -> &AppConfigManager {
        &self.config_manager
    }
    
    /// 获取配置管理器的可变引用
    pub fn config_manager_mut(&mut self) -> &mut AppConfigManager {
        &mut self.config_manager
    }
    
    /// 便捷静态方法：直接创建检测器
    pub fn create_detector_for(
        package_name: &str,
        device_id: &str
    ) -> Result<Arc<dyn AppDetector>> {
        info!("🏭 创建应用检测器: {}", package_name);
        
        // 使用智能ADB路径检测创建会话
        let adb_path = crate::utils::adb_utils::get_adb_path();
        let shell_session = AdbShellSession::new(device_id.to_string(), adb_path);
        
        let detector: Arc<dyn AppDetector> = match package_name {
            "com.xingin.xhs" => {
                debug!("📱 使用小红书专用检测器");
                Arc::new(XiaohongshuDetector::new(shell_session))
            },
            "com.tencent.mm" => {
                debug!("💬 使用微信专用检测器");
                Arc::new(WechatDetector::new(shell_session))
            },
            _ => {
                debug!("🔧 使用通用检测器: {}", package_name);
                Arc::new(GenericDetector::new(
                    package_name.to_string(),
                    package_name.to_string(), // 使用包名作为应用名
                    shell_session
                ))
            }
        };
        
        Ok(detector)
    }
}

impl Default for DetectorFactory {
    fn default() -> Self {
        Self::new()
    }
}

/// 应用检测器注册表
/// 用于管理全局的检测器工厂实例
pub struct DetectorRegistry {
    factory: DetectorFactory,
}

impl DetectorRegistry {
    pub fn new() -> Self {
        Self {
            factory: DetectorFactory::new(),
        }
    }
    
    /// 获取工厂实例
    pub fn factory(&self) -> &DetectorFactory {
        &self.factory
    }
    
    /// 获取工厂实例的可变引用
    pub fn factory_mut(&mut self) -> &mut DetectorFactory {
        &mut self.factory
    }
    
    /// 创建检测器的便捷方法
    pub fn create_detector_for(
        &self,
        package_name: &str,
        app_name: &str,
        shell_session: AdbShellSession
    ) -> Arc<dyn AppDetector> {
        self.factory.create_detector(package_name, app_name, shell_session)
    }
    
    /// 获取全局单例
    pub fn global() -> &'static std::sync::Mutex<DetectorRegistry> {
        static REGISTRY: std::sync::OnceLock<std::sync::Mutex<DetectorRegistry>> = std::sync::OnceLock::new();
        REGISTRY.get_or_init(|| std::sync::Mutex::new(DetectorRegistry::new()))
    }
}

impl Default for DetectorRegistry {
    fn default() -> Self {
        Self::new()
    }
}

/// 便捷函数：创建应用检测器
pub fn create_app_detector(
    package_name: &str,
    app_name: &str,
    shell_session: AdbShellSession
) -> Arc<dyn AppDetector> {
    let factory = DetectorFactory::new();
    factory.create_detector(package_name, app_name, shell_session)
}

/// 便捷函数：检查应用是否支持专用检测器
pub fn is_specialized_app(package_name: &str) -> bool {
    let factory = DetectorFactory::new();
    factory.has_specialized_detector(package_name)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_detector_factory_creation() {
        let factory = DetectorFactory::new();
        
        // 测试支持的应用
        assert!(factory.has_specialized_detector("com.xingin.xhs"));
        assert!(factory.has_specialized_detector("com.tencent.mm"));
        
        // 测试不支持的应用
        assert!(!factory.has_specialized_detector("com.unknown.app"));
    }
    
    #[test]
    fn test_supported_apps_list() {
        let factory = DetectorFactory::new();
        let supported_apps = factory.get_supported_apps();
        
        assert!(supported_apps.contains(&"com.xingin.xhs"));
        assert!(supported_apps.contains(&"com.tencent.mm"));
    }
}