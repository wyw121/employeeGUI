use anyhow::Result;
use std::process::Command;
use tracing::{error, info, warn};

#[cfg(windows)]
use std::os::windows::process::CommandExt;

/// ADB路径管理器 - 解决雷电模拟器ADB崩溃问题
pub struct SafeAdbManager {
    preferred_adb_path: Option<String>,
    fallback_paths: Vec<String>,
}

impl SafeAdbManager {
    pub fn new() -> Self {
        // 动态构建项目内的ADB路径
        let project_adb_path = Self::get_project_adb_path();
        
        let mut fallback_paths = vec![];
        
        // 1. 优先使用项目内的官方Google Platform Tools (最安全)
        if let Some(path) = project_adb_path {
            fallback_paths.push(path);
        }
        
        // 2. 系统PATH中的ADB
        fallback_paths.push("adb.exe".to_string());
        fallback_paths.push("adb".to_string());
        
        // 3. 标准Android SDK安装路径
        fallback_paths.push(r"C:\Users\%USERNAME%\AppData\Local\Android\Sdk\platform-tools\adb.exe".to_string());
        fallback_paths.push(r"C:\Android\Sdk\platform-tools\adb.exe".to_string());
        fallback_paths.push(r"D:\Android\Sdk\platform-tools\adb.exe".to_string());
        
        // 注意：故意不包含雷电模拟器的ADB路径，因为它有崩溃问题
        // r"D:\leidian\LDPlayer9\adb.exe" - 已知不稳定，不使用

        Self {
            preferred_adb_path: None,
            fallback_paths,
        }
    }

    /// 动态获取项目内的ADB路径
    fn get_project_adb_path() -> Option<String> {
        // 尝试从当前工作目录开始查找
        if let Ok(current_dir) = std::env::current_dir() {
            // 首先尝试当前目录的 platform-tools
            let adb_path = current_dir.join("platform-tools").join("adb.exe");
            info!("🔍 检查当前目录ADB路径: {:?}", adb_path);
            if adb_path.exists() {
                info!("✅ 找到当前目录ADB路径");
                return adb_path.to_str().map(|s| s.to_string());
            }
            
            // 然后尝试上级目录的 platform-tools（处理从src-tauri运行的情况）
            if let Some(parent_dir) = current_dir.parent() {
                let parent_adb_path = parent_dir.join("platform-tools").join("adb.exe");
                info!("🔍 检查父级目录ADB路径: {:?}", parent_adb_path);
                if parent_adb_path.exists() {
                    info!("✅ 找到父级目录ADB路径");
                    return parent_adb_path.to_str().map(|s| s.to_string());
                }
            }
        }

        // 尝试从可执行文件路径查找
        if let Ok(exe_path) = std::env::current_exe() {
            info!("🔍 从可执行文件路径查找: {:?}", exe_path);
            // 从exe路径向上查找项目根目录
            let mut parent = exe_path.parent();
            while let Some(dir) = parent {
                let adb_path = dir.join("platform-tools").join("adb.exe");
                if adb_path.exists() {
                    info!("✅ 找到可执行文件相对ADB路径");
                    return adb_path.to_str().map(|s| s.to_string());
                }
                
                // 也检查上级目录
                if let Some(parent_dir) = dir.parent() {
                    let parent_adb_path = parent_dir.join("platform-tools").join("adb.exe");
                    if parent_adb_path.exists() {
                        info!("✅ 找到可执行文件上级相对ADB路径");
                        return parent_adb_path.to_str().map(|s| s.to_string());
                    }
                }
                
                parent = dir.parent();
            }
        }

        warn!("⚠️ 未找到项目内的ADB路径");
        None
    }

    /// 查找可用的ADB路径，避免使用有问题的版本
    pub fn find_safe_adb_path(&mut self) -> Result<String> {
        info!("🔍 开始搜索安全的ADB路径...");

        // 如果已经有验证过的路径，直接返回
        if let Some(ref path) = self.preferred_adb_path {
            info!("✅ 使用已验证的ADB路径: {}", path);
            return Ok(path.clone());
        }

        // 测试每个候选路径
        for path in &self.fallback_paths {
            info!("🧪 测试ADB路径: {}", path);

            match self.test_adb_path(path) {
                Ok(true) => {
                    // 检查是否是雷电模拟器的ADB (已知有问题)
                    if path.contains("leidian") || path.contains("LDPlayer") {
                        warn!("⚠️ 跳过雷电模拟器ADB (已知崩溃问题): {}", path);
                        continue;
                    }

                    info!("✅ 找到可用的ADB: {}", path);
                    self.preferred_adb_path = Some(path.clone());
                    return Ok(path.clone());
                }
                Ok(false) => {
                    warn!("❌ ADB路径不可用: {}", path);
                }
                Err(e) => {
                    error!("💥 测试ADB路径时出错 {}: {}", path, e);
                }
            }
        }

        Err(anyhow::anyhow!("未找到可用的ADB路径"))
    }

    /// 测试ADB路径是否可用且安全
    fn test_adb_path(&self, path: &str) -> Result<bool> {
        info!("📋 测试ADB命令: {} version", path);

        let mut cmd = Command::new(path);
        cmd.arg("version");
        
        #[cfg(windows)]
        {
            cmd.creation_flags(0x08000000); // CREATE_NO_WINDOW
        }
        
        match cmd.output() {
            Ok(output) => {
                if output.status.success() {
                    let version_output = String::from_utf8_lossy(&output.stdout);
                    info!("✅ ADB版本信息: {}", version_output.trim());
                    Ok(true)
                } else {
                    let error_output = String::from_utf8_lossy(&output.stderr);
                    warn!("⚠️ ADB命令失败: {}", error_output.trim());
                    Ok(false)
                }
            }
            Err(e) => {
                warn!("❌ 无法执行ADB命令: {}", e);
                Ok(false)
            }
        }
    }

    /// 安全地执行ADB命令
    pub fn execute_adb_command(&self, args: &[&str]) -> Result<String> {
        let adb_path = self
            .preferred_adb_path
            .as_ref()
            .ok_or_else(|| anyhow::anyhow!("未找到有效的ADB路径，请先调用find_safe_adb_path()"))?;

        info!("🔧 执行ADB命令: {} {}", adb_path, args.join(" "));

        let mut cmd = Command::new(adb_path);
        cmd.args(args);
        
        #[cfg(windows)]
        {
            cmd.creation_flags(0x08000000); // CREATE_NO_WINDOW
        }
        
        let output = cmd.output()
            .map_err(|e| anyhow::anyhow!("ADB命令执行失败: {}", e))?;

        if output.status.success() {
            let result = String::from_utf8_lossy(&output.stdout).to_string();
            info!("✅ ADB命令成功: {}", result.trim());
            Ok(result)
        } else {
            let error = String::from_utf8_lossy(&output.stderr).to_string();
            error!("❌ ADB命令失败: {}", error.trim());
            Err(anyhow::anyhow!("ADB命令失败: {}", error))
        }
    }

    /// 异步安全地执行ADB命令
    pub async fn execute_adb_command_async(&self, args: &[&str]) -> Result<String> {
        let adb_path = self
            .preferred_adb_path
            .as_ref()
            .ok_or_else(|| anyhow::anyhow!("未找到有效的ADB路径，请先调用find_safe_adb_path()"))?;

        info!("🔧 异步执行ADB命令: {} {}", adb_path, args.join(" "));

        use tokio::process::Command as AsyncCommand;

        let mut cmd = AsyncCommand::new(adb_path);
        cmd.args(args);
        
        #[cfg(windows)]
        {
            cmd.creation_flags(0x08000000); // CREATE_NO_WINDOW
        }
        
        let output = cmd.output()
            .await
            .map_err(|e| anyhow::anyhow!("异步ADB命令执行失败: {}", e))?;

        if output.status.success() {
            let result = String::from_utf8_lossy(&output.stdout).to_string();
            info!("✅ 异步ADB命令成功: {}", result.trim());
            Ok(result)
        } else {
            let error = String::from_utf8_lossy(&output.stderr).to_string();
            error!("❌ 异步ADB命令失败: {}", error.trim());
            Err(anyhow::anyhow!("异步ADB命令失败: {}", error))
        }
    }

    /// 获取连接的设备列表（使用安全的ADB）
    pub fn get_devices(&self) -> Result<Vec<String>> {
        let output = self.execute_adb_command(&["devices"])?;

        let mut devices = Vec::new();
        for line in output.lines() {
            if line.contains("\tdevice") {
                if let Some(device_id) = line.split('\t').next() {
                    devices.push(device_id.to_string());
                }
            }
        }

        info!("📱 发现设备: {:?}", devices);
        Ok(devices)
    }

    /// 检查特定设备是否在线
    pub fn is_device_online(&self, device_id: &str) -> Result<bool> {
        let devices = self.get_devices()?;
        Ok(devices.contains(&device_id.to_string()))
    }
}

/// 安全的ADB设备检测命令 - 避免雷电ADB崩溃
#[tauri::command]
#[allow(non_snake_case)]
pub async fn get_adb_devices_safe() -> Result<Vec<String>, String> {
    info!("🚀 开始安全的ADB设备检测...");

    let mut adb_manager = SafeAdbManager::new();

    // 查找安全的ADB路径
    match adb_manager.find_safe_adb_path() {
        Ok(adb_path) => {
            info!("✅ 使用安全的ADB路径: {}", adb_path);
        }
        Err(e) => {
            error!("❌ 未找到安全的ADB路径: {}", e);
            return Err(format!("未找到安全的ADB路径: {}", e));
        }
    }

    // 获取设备列表
    match adb_manager.get_devices() {
        Ok(devices) => {
            info!("🎉 成功获取 {} 台设备", devices.len());
            Ok(devices)
        }
        Err(e) => {
            error!("💥 获取设备列表失败: {}", e);
            Err(format!("获取设备列表失败: {}", e))
        }
    }
}

/// 安全的文件传输命令 - 使用安全的ADB路径
#[tauri::command]
#[allow(non_snake_case)]
pub async fn safe_adb_push(
    deviceId: String,
    localPath: String,
    remotePath: String,
) -> Result<String, String> {
    info!(
        "📤 开始安全的文件传输: {} -> {} (设备: {})",
        localPath, remotePath, deviceId
    );

    let mut adb_manager = SafeAdbManager::new();

    // 确保ADB路径可用
    if let Err(e) = adb_manager.find_safe_adb_path() {
        return Err(format!("未找到安全的ADB路径: {}", e));
    }

    // 检查设备是否在线
    match adb_manager.is_device_online(&deviceId) {
        Ok(true) => {
            info!("✅ 设备 {} 在线", deviceId);
        }
        Ok(false) => {
            return Err(format!("设备 {} 不在线或未连接", deviceId));
        }
        Err(e) => {
            return Err(format!("检查设备状态失败: {}", e));
        }
    }

    // 执行文件传输
    let args = vec!["-s", &deviceId, "push", &localPath, &remotePath];
    match adb_manager.execute_adb_command(&args.iter().map(|s| *s).collect::<Vec<_>>()) {
        Ok(output) => {
            info!("🎉 文件传输成功");
            Ok(output)
        }
        Err(e) => {
            error!("💥 文件传输失败: {}", e);
            Err(format!("文件传输失败: {}", e))
        }
    }
}
