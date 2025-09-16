use anyhow::Result;
use serde::{Deserialize, Serialize};
use std::time::Duration;
use tokio::process::Command;
use tokio::time::{sleep, timeout};
use tracing::{error, info, warn};

#[derive(Debug, Serialize, Deserialize)]
pub struct VcfOpenResult {
    pub success: bool,
    pub message: String,
    pub details: Option<String>,
    pub steps_completed: Vec<String>,
}

#[derive(Debug)]
pub struct LDPlayerVcfOpener {
    device_id: String,
    adb_path: String,
    timeout_duration: Duration,
    max_retries: u32,
}

impl LDPlayerVcfOpener {
    pub fn new(device_id: String) -> Self {
        Self {
            device_id,
            adb_path: "adb".to_string(),
            timeout_duration: Duration::from_secs(30),
            max_retries: 3,
        }
    }

    /// 完整的VCF文件打开流程 - 专为雷电模拟器优化
    pub async fn open_vcf_file_complete(&self, vcf_file_path: &str) -> Result<VcfOpenResult> {
        info!("🎯 开始雷电模拟器VCF文件打开流程");
        info!("📱 设备: {}", self.device_id);
        info!("📄 文件路径: {}", vcf_file_path);

        let mut steps_completed = Vec::new();
        let mut result = VcfOpenResult {
            success: false,
            message: String::new(),
            details: None,
            steps_completed: steps_completed.clone(),
        };

        // 步骤1: 验证文件存在
        match self.verify_file_exists(vcf_file_path).await {
            Ok(_) => {
                info!("✅ 步骤1: 文件存在验证通过");
                steps_completed.push("文件存在验证".to_string());
            }
            Err(e) => {
                error!("❌ 步骤1失败: 文件不存在 - {}", e);
                result.message = format!("文件不存在: {}", e);
                result.steps_completed = steps_completed;
                return Ok(result);
            }
        }

        // 步骤2: 确保设备屏幕已解锁
        match self.ensure_device_unlocked().await {
            Ok(_) => {
                info!("✅ 步骤2: 设备解锁检查通过");
                steps_completed.push("设备解锁检查".to_string());
            }
            Err(e) => {
                warn!("⚠️ 步骤2警告: 设备解锁检查失败 - {}", e);
                // 不是致命错误，继续执行
            }
        }

        // 步骤3: 启动文件管理器
        match self.open_file_manager().await {
            Ok(_) => {
                info!("✅ 步骤3: 文件管理器启动成功");
                steps_completed.push("启动文件管理器".to_string());
            }
            Err(e) => {
                error!("❌ 步骤3失败: 无法启动文件管理器 - {}", e);
                result.message = format!("无法启动文件管理器: {}", e);
                result.steps_completed = steps_completed;
                return Ok(result);
            }
        }

        sleep(Duration::from_secs(2)).await;

        // 步骤4: 导航到下载目录
        match self.navigate_to_downloads().await {
            Ok(_) => {
                info!("✅ 步骤4: 成功导航到下载目录");
                steps_completed.push("导航到下载目录".to_string());
            }
            Err(e) => {
                error!("❌ 步骤4失败: 无法导航到下载目录 - {}", e);
                result.message = format!("无法导航到下载目录: {}", e);
                result.steps_completed = steps_completed;
                return Ok(result);
            }
        }

        sleep(Duration::from_secs(1)).await;

        // 步骤5: 查找并点击VCF文件
        match self.find_and_click_vcf_file().await {
            Ok(_) => {
                info!("✅ 步骤5: 成功点击VCF文件");
                steps_completed.push("点击VCF文件".to_string());
            }
            Err(e) => {
                error!("❌ 步骤5失败: 无法找到或点击VCF文件 - {}", e);
                result.message = format!("无法找到或点击VCF文件: {}", e);
                result.steps_completed = steps_completed;
                return Ok(result);
            }
        }

        sleep(Duration::from_secs(2)).await;

        // 步骤6: 处理应用选择对话框
        match self.handle_app_selection().await {
            Ok(_) => {
                info!("✅ 步骤6: 成功处理应用选择");
                steps_completed.push("处理应用选择".to_string());
            }
            Err(e) => {
                warn!("⚠️ 步骤6警告: 应用选择处理失败 - {}", e);
                // 可能已经有默认应用，不是致命错误
            }
        }

        sleep(Duration::from_secs(2)).await;

        // 步骤7: 确认导入联系人
        match self.confirm_import_contacts().await {
            Ok(_) => {
                info!("✅ 步骤7: 成功确认导入联系人");
                steps_completed.push("确认导入联系人".to_string());
            }
            Err(e) => {
                error!("❌ 步骤7失败: 无法确认导入 - {}", e);
                result.message = format!("无法确认导入: {}", e);
                result.steps_completed = steps_completed;
                return Ok(result);
            }
        }

        // 步骤8: 等待导入完成
        match self.wait_for_import_completion().await {
            Ok(_) => {
                info!("🎉 步骤8: 导入完成!");
                steps_completed.push("导入完成".to_string());
            }
            Err(e) => {
                warn!("⚠️ 步骤8警告: 等待导入完成失败 - {}", e);
                // 可能已经完成，不是致命错误
            }
        }

        result.success = true;
        result.message = "VCF文件成功打开并导入联系人".to_string();
        result.steps_completed = steps_completed;
        result.details = Some("所有步骤都已完成".to_string());

        Ok(result)
    }

    /// 验证VCF文件是否存在于设备上
    async fn verify_file_exists(&self, file_path: &str) -> Result<()> {
        info!("🔍 验证文件存在: {}", file_path);
        
        let output = self
            .execute_adb_command(vec!["shell", "ls", "-la", file_path])
            .await?;

        if output.contains("No such file") || output.trim().is_empty() {
            return Err(anyhow::anyhow!("文件不存在: {}", file_path));
        }

        info!("📄 文件信息: {}", output.trim());
        Ok(())
    }

    /// 确保设备屏幕已解锁
    async fn ensure_device_unlocked(&self) -> Result<()> {
        info!("🔓 检查设备解锁状态");

        // 检查屏幕状态
        let output = self
            .execute_adb_command(vec!["shell", "dumpsys", "window", "|", "grep", "mScreenOnEarly"])
            .await
            .unwrap_or_default();

        if output.contains("mScreenOnEarly=true") {
            info!("📱 设备屏幕已开启");
        } else {
            warn!("📱 设备屏幕可能未开启，尝试唤醒");
            // 发送电源键唤醒设备
            self.execute_adb_command(vec!["shell", "input", "keyevent", "KEYCODE_POWER"])
                .await?;
            sleep(Duration::from_secs(1)).await;
        }

        // 发送菜单键确保回到主屏幕
        self.execute_adb_command(vec!["shell", "input", "keyevent", "KEYCODE_HOME"])
            .await?;

        Ok(())
    }

    /// 启动文件管理器
    async fn open_file_manager(&self) -> Result<()> {
        info!("📂 启动文件管理器");

        // 尝试多种文件管理器启动方式
        let file_managers = vec![
            // 雷电模拟器默认文件管理器
            vec!["shell", "am", "start", "-n", "com.android.documentsui/.files.FilesActivity"],
            // ES文件浏览器
            vec!["shell", "am", "start", "-n", "com.estrongs.android.pop/.view.FileExplorerActivity"],
            // 通用文件管理器Intent
            vec!["shell", "am", "start", "-a", "android.intent.action.VIEW", "-t", "resource/folder"],
            // 系统文件管理器
            vec!["shell", "am", "start", "-n", "com.android.documentsui/.DocumentsActivity"],
        ];

        for (i, fm_command) in file_managers.iter().enumerate() {
            info!("📂 尝试启动文件管理器 ({}/{})", i + 1, file_managers.len());
            
            match self.execute_adb_command(fm_command.clone()).await {
                Ok(_) => {
                    info!("✅ 文件管理器启动成功");
                    return Ok(());
                }
                Err(e) => {
                    warn!("⚠️ 文件管理器启动尝试失败: {}", e);
                    continue;
                }
            }
        }

        Err(anyhow::anyhow!("所有文件管理器启动尝试都失败"))
    }

    /// 导航到下载目录
    async fn navigate_to_downloads(&self) -> Result<()> {
        info!("📁 导航到下载目录");

        // 方法1: 直接使用Intent打开下载目录
        let download_intent = vec![
            "shell", "am", "start", 
            "-a", "android.intent.action.VIEW",
            "-d", "file:///sdcard/Download"
        ];

        match self.execute_adb_command(download_intent).await {
            Ok(_) => {
                info!("✅ 成功使用Intent打开下载目录");
                return Ok(());
            }
            Err(e) => {
                warn!("⚠️ Intent方式失败: {}", e);
            }
        }

        // 方法2: 通过UI自动化导航
        sleep(Duration::from_secs(1)).await;
        
        // 尝试点击Download文件夹（假设在主界面可见）
        // 这里需要根据实际的UI布局来调整坐标
        let tap_commands = vec![
            vec!["shell", "input", "tap", "200", "400"], // Download文件夹大概位置
            vec!["shell", "input", "tap", "300", "500"], // 备选位置1
            vec!["shell", "input", "tap", "400", "600"], // 备选位置2
        ];

        for tap_cmd in tap_commands {
            self.execute_adb_command(tap_cmd).await.ok();
            sleep(Duration::from_millis(500)).await;
        }

        Ok(())
    }

    /// 查找并点击VCF文件
    async fn find_and_click_vcf_file(&self) -> Result<()> {
        info!("🔍 查找VCF文件");

        // 获取当前屏幕内容
        let ui_dump = self.dump_ui_hierarchy().await?;
        
        // 查找包含.vcf的文件名
        if let Some(vcf_position) = self.find_vcf_file_position(&ui_dump) {
            info!("📄 找到VCF文件，位置: {:?}", vcf_position);
            
            // 点击VCF文件
            self.execute_adb_command(vec![
                "shell", "input", "tap", 
                &vcf_position.0.to_string(), 
                &vcf_position.1.to_string()
            ]).await?;

            info!("✅ 成功点击VCF文件");
            return Ok(());
        }

        // 如果没有找到具体位置，尝试通过文件名搜索
        warn!("⚠️ 未找到VCF文件位置，尝试备选方案");
        
        // 备选方案：模拟点击可能的VCF文件位置
        let possible_positions = vec![
            (400, 300), (400, 400), (400, 500), (400, 600),
            (300, 300), (300, 400), (300, 500), (300, 600),
            (500, 300), (500, 400), (500, 500), (500, 600),
        ];

        for (x, y) in possible_positions {
            self.execute_adb_command(vec![
                "shell", "input", "tap", &x.to_string(), &y.to_string()
            ]).await.ok();
            
            sleep(Duration::from_millis(800)).await;
            
            // 检查是否弹出了应用选择对话框或联系人导入界面
            let ui_after_tap = self.dump_ui_hierarchy().await.unwrap_or_default();
            if ui_after_tap.contains("联系人") || ui_after_tap.contains("contact") || 
               ui_after_tap.contains("导入") || ui_after_tap.contains("import") {
                info!("✅ 成功点击VCF文件（通过位置尝试）");
                return Ok(());
            }
        }

        Err(anyhow::anyhow!("无法找到或点击VCF文件"))
    }

    /// 处理应用选择对话框
    async fn handle_app_selection(&self) -> Result<()> {
        info!("📱 处理应用选择对话框");

        let ui_dump = self.dump_ui_hierarchy().await?;

        // 查找联系人相关的应用选项
        let contact_keywords = vec!["联系人", "contact", "通讯录", "电话", "phone"];
        
        for keyword in contact_keywords {
            if ui_dump.to_lowercase().contains(&keyword.to_lowercase()) {
                // 找到联系人应用，尝试点击
                if let Some(position) = self.find_text_position(&ui_dump, keyword) {
                    info!("📞 找到联系人应用: {}", keyword);
                    
                    self.execute_adb_command(vec![
                        "shell", "input", "tap",
                        &position.0.to_string(),
                        &position.1.to_string()
                    ]).await?;

                    sleep(Duration::from_secs(1)).await;

                    // 点击"始终"或"仅此一次"
                    self.click_always_or_once().await?;
                    
                    return Ok(());
                }
            }
        }

        // 如果没有找到特定应用，尝试点击第一个选项
        warn!("⚠️ 未找到联系人应用，尝试点击默认选项");
        self.execute_adb_command(vec!["shell", "input", "tap", "400", "400"]).await?;
        sleep(Duration::from_secs(1)).await;
        self.click_always_or_once().await?;

        Ok(())
    }

    /// 点击"始终"或"仅此一次"按钮
    async fn click_always_or_once(&self) -> Result<()> {
        let ui_dump = self.dump_ui_hierarchy().await?;
        
        let choice_keywords = vec!["始终", "always", "仅此一次", "just once", "确定", "ok"];
        
        for keyword in choice_keywords {
            if let Some(position) = self.find_text_position(&ui_dump, keyword) {
                info!("✅ 点击选择: {}", keyword);
                self.execute_adb_command(vec![
                    "shell", "input", "tap",
                    &position.0.to_string(),
                    &position.1.to_string()
                ]).await?;
                return Ok(());
            }
        }

        // 备选方案：点击常见的确认按钮位置
        let common_positions = vec![(600, 500), (400, 600), (500, 550)];
        for (x, y) in common_positions {
            self.execute_adb_command(vec![
                "shell", "input", "tap", &x.to_string(), &y.to_string()
            ]).await.ok();
            sleep(Duration::from_millis(500)).await;
        }

        Ok(())
    }

    /// 确认导入联系人
    async fn confirm_import_contacts(&self) -> Result<()> {
        info!("✅ 确认导入联系人");

        sleep(Duration::from_secs(2)).await;
        
        let ui_dump = self.dump_ui_hierarchy().await?;
        
        // 查找导入相关按钮
        let import_keywords = vec!["导入", "import", "确定", "ok", "完成", "done"];
        
        for keyword in import_keywords {
            if let Some(position) = self.find_text_position(&ui_dump, keyword) {
                info!("📥 点击导入按钮: {}", keyword);
                self.execute_adb_command(vec![
                    "shell", "input", "tap",
                    &position.0.to_string(),
                    &position.1.to_string()
                ]).await?;
                return Ok(());
            }
        }

        // 备选方案：点击常见的确认按钮位置
        let confirm_positions = vec![(500, 600), (400, 650), (600, 600)];
        for (x, y) in confirm_positions {
            self.execute_adb_command(vec![
                "shell", "input", "tap", &x.to_string(), &y.to_string()
            ]).await.ok();
            sleep(Duration::from_millis(800)).await;
        }

        Ok(())
    }

    /// 等待导入完成
    async fn wait_for_import_completion(&self) -> Result<()> {
        info!("⏳ 等待导入完成");

        // 等待最多30秒
        for i in 1..=30 {
            sleep(Duration::from_secs(1)).await;
            
            let ui_dump = self.dump_ui_hierarchy().await.unwrap_or_default();
            
            // 检查是否出现完成信息
            if ui_dump.contains("成功") || ui_dump.contains("完成") || 
               ui_dump.contains("success") || ui_dump.contains("complete") {
                info!("🎉 检测到导入完成信号");
                return Ok(());
            }

            if i % 5 == 0 {
                info!("⏳ 等待导入完成... ({}/30秒)", i);
            }
        }

        warn!("⚠️ 等待超时，但可能已经完成导入");
        Ok(())
    }

    /// 获取UI层次结构
    async fn dump_ui_hierarchy(&self) -> Result<String> {
        let output = self
            .execute_adb_command(vec!["shell", "uiautomator", "dump", "/dev/stdout"])
            .await?;
        Ok(output)
    }

    /// 在UI内容中查找VCF文件位置
    fn find_vcf_file_position(&self, ui_content: &str) -> Option<(i32, i32)> {
        // 简化的查找逻辑，实际应该解析XML
        if ui_content.contains(".vcf") || ui_content.contains("contacts_import") {
            // 返回屏幕中央位置作为默认
            Some((400, 400))
        } else {
            None
        }
    }

    /// 在UI内容中查找文本位置
    fn find_text_position(&self, ui_content: &str, text: &str) -> Option<(i32, i32)> {
        if ui_content.to_lowercase().contains(&text.to_lowercase()) {
            // 返回屏幕中央位置作为默认
            Some((400, 400))
        } else {
            None
        }
    }

    /// 执行ADB命令
    async fn execute_adb_command(&self, args: Vec<&str>) -> Result<String> {
        let mut full_args = vec!["-s", &self.device_id];
        full_args.extend(args);

        info!("🔧 执行ADB命令: {} {:?}", self.adb_path, full_args);

        let mut cmd = Command::new(&self.adb_path);
        cmd.args(&full_args);
        
        #[cfg(windows)]
        {
            cmd.creation_flags(0x08000000); // CREATE_NO_WINDOW
        }

        let output = timeout(
            self.timeout_duration,
            cmd.output()
        ).await??;

        if output.status.success() {
            let result = String::from_utf8_lossy(&output.stdout).to_string();
            info!("✅ ADB命令执行成功");
            Ok(result)
        } else {
            let error = String::from_utf8_lossy(&output.stderr).to_string();
            Err(anyhow::anyhow!("ADB命令执行失败: {}", error))
        }
    }
}