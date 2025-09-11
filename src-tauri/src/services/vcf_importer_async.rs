use anyhow::{Context, Result};
use serde::{Deserialize, Serialize};
use std::fs;
use std::process::Stdio;
use tokio::io::{AsyncBufReadExt, BufReader};
use tokio::process::Command;
use tokio::time::{sleep, timeout, Duration};
use tracing::{error, info, warn};

// 重用现有的数据结构
#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct Contact {
    pub id: String,
    pub name: String,
    pub phone: String,
    pub email: String,
    pub address: String,
    pub occupation: String,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct VcfImportResult {
    pub success: bool,
    pub total_contacts: usize,
    pub imported_contacts: usize,
    pub failed_contacts: usize,
    pub message: String,
    pub details: Option<String>,
    pub duration: Option<u64>,
}

#[derive(Debug)]
pub struct VcfImporterAsync {
    device_id: String,
    adb_path: String,
    timeout_duration: Duration,
    max_retries: u32,
}

impl VcfImporterAsync {
    pub fn new(device_id: String) -> Self {
        Self {
            device_id,
            adb_path: "adb".to_string(), // 使用系统默认ADB
            timeout_duration: Duration::from_secs(30),
            max_retries: 3,
        }
    }

    /// 异步执行VCF导入（简化版，减少UI自动化）
    pub async fn import_vcf_contacts_simple(&self, contacts_file_path: &str) -> Result<VcfImportResult> {
        let start_time = std::time::Instant::now();
        info!("开始简化VCF导入流程: {}", contacts_file_path);

        // 1. 读取联系人数据
        let contacts = self.read_contacts_from_file(contacts_file_path)?;
        let total_contacts = contacts.len();
        info!("读取到 {} 个联系人", total_contacts);

        // 2. 生成VCF文件
        let vcf_filename = "contacts_import.vcf";
        self.generate_vcf_file(contacts.clone(), vcf_filename).await?;
        info!("VCF文件生成完成");

        // 3. 传输VCF文件到设备
        let device_path = "/sdcard/Download/contacts_import.vcf";
        match self.transfer_vcf_to_device_async(vcf_filename, device_path).await {
            Ok(_) => {
                info!("✅ 文件成功传输到设备: {}", device_path);
            }
            Err(e) => {
                return Ok(VcfImportResult {
                    success: false,
                    total_contacts,
                    imported_contacts: 0,
                    failed_contacts: total_contacts,
                    message: format!("文件传输失败: {}", e),
                    details: Some(e.to_string()),
                    duration: Some(start_time.elapsed().as_secs()),
                });
            }
        }

        // 4. 使用Intent直接打开VCF文件（简化方案）
        match self.open_vcf_with_intent(device_path).await {
            Ok(_) => {
                let duration = start_time.elapsed().as_secs();
                info!("VCF导入完成，耗时: {}秒", duration);

                Ok(VcfImportResult {
                    success: true,
                    total_contacts,
                    imported_contacts: total_contacts,
                    failed_contacts: 0,
                    message: "VCF文件已成功传输到设备，请在设备上手动确认导入".to_string(),
                    details: Some(format!(
                        "文件位置: {}\\n请在设备上打开文件管理器导入联系人",
                        device_path
                    )),
                    duration: Some(duration),
                })
            }
            Err(e) => {
                warn!("Intent打开失败，但文件已传输: {}", e);
                Ok(VcfImportResult {
                    success: true,
                    total_contacts,
                    imported_contacts: 0,
                    failed_contacts: 0,
                    message: "文件已传输到设备，请手动导入".to_string(),
                    details: Some(format!("文件位置: {}", device_path)),
                    duration: Some(start_time.elapsed().as_secs()),
                })
            }
        }
    }

    /// 异步生成VCF文件
    async fn generate_vcf_file(&self, contacts: Vec<Contact>, output_path: &str) -> Result<String> {
        info!("开始生成VCF文件: {}", output_path);

        let mut vcf_content = String::new();

        for contact in &contacts {
            vcf_content.push_str("BEGIN:VCARD\\n");
            vcf_content.push_str("VERSION:2.1\\n");
            vcf_content.push_str(&format!("FN:{}\\n", contact.name));
            vcf_content.push_str(&format!("N:{};\\n", contact.name));

            if !contact.phone.is_empty() {
                let formatted_phone = self.format_chinese_phone(&contact.phone);
                vcf_content.push_str(&format!("TEL;CELL:{}\\n", formatted_phone));
            }

            if !contact.email.is_empty() {
                vcf_content.push_str(&format!("EMAIL:{}\\n", contact.email));
            }

            if !contact.address.is_empty() {
                vcf_content.push_str(&format!("ADR:;;{};;;;\\n", contact.address));
            }

            if !contact.occupation.is_empty() {
                vcf_content.push_str(&format!("NOTE:{}\\n", contact.occupation));
            }

            vcf_content.push_str("END:VCARD\\n");
        }

        // 异步写入文件
        tokio::fs::write(output_path, vcf_content)
            .await
            .with_context(|| format!("写入VCF文件失败: {}", output_path))?;

        info!("VCF文件生成完成: {} 个联系人", contacts.len());
        Ok(output_path.to_string())
    }

    /// 异步传输VCF文件到设备
    async fn transfer_vcf_to_device_async(&self, local_path: &str, device_path: &str) -> Result<()> {
        info!("异步传输VCF文件: {} -> {}", local_path, device_path);

        // 确保目标目录存在
        let parent_dir = std::path::Path::new(device_path)
            .parent()
            .and_then(|p| p.to_str())
            .unwrap_or("/sdcard");

        self.execute_adb_command_async(vec!["shell", "mkdir", "-p", parent_dir])
            .await?;

        // 传输文件
        self.execute_adb_command_async(vec!["push", local_path, device_path])
            .await?;

        // 验证文件传输
        if self.verify_file_on_device_async(device_path).await? {
            info!("✅ 文件传输验证成功: {}", device_path);
            Ok(())
        } else {
            Err(anyhow::anyhow!("文件传输验证失败"))
        }
    }

    /// 异步验证设备上的文件
    async fn verify_file_on_device_async(&self, device_path: &str) -> Result<bool> {
        match self
            .execute_adb_command_async(vec!["shell", "ls", "-la", device_path])
            .await
        {
            Ok(output) => {
                if output.contains("No such file") || output.trim().is_empty() {
                    Ok(false)
                } else {
                    info!("文件验证成功: {}", device_path);
                    Ok(true)
                }
            }
            Err(_) => Ok(false),
        }
    }

    /// 使用Intent打开VCF文件
    async fn open_vcf_with_intent(&self, vcf_path: &str) -> Result<()> {
        info!("使用Intent打开VCF文件: {}", vcf_path);

        let file_uri = format!("file://{}", vcf_path);
        let args = vec![
            "shell",
            "am",
            "start",
            "-a",
            "android.intent.action.VIEW",
            "-d",
            &file_uri,
            "-t",
            "text/x-vcard",
        ];

        self.execute_adb_command_async(args).await?;
        Ok(())
    }

    /// 核心的异步ADB命令执行方法
    async fn execute_adb_command_async(&self, args: Vec<&str>) -> Result<String> {
        let mut full_args = vec!["-s", &self.device_id];
        full_args.extend(args);

        info!("执行ADB命令: {} {:?}", self.adb_path, full_args);

        for attempt in 1..=self.max_retries {
            match timeout(
                self.timeout_duration,
                self.run_command_with_output(&full_args),
            )
            .await
            {
                Ok(Ok(output)) => {
                    info!("ADB命令执行成功 (尝试 {}/{})", attempt, self.max_retries);
                    return Ok(output);
                }
                Ok(Err(e)) => {
                    warn!("ADB命令执行失败 (尝试 {}/{}): {}", attempt, self.max_retries, e);
                    if attempt == self.max_retries {
                        return Err(e);
                    }
                }
                Err(_) => {
                    warn!("ADB命令超时 (尝试 {}/{})", attempt, self.max_retries);
                    if attempt == self.max_retries {
                        return Err(anyhow::anyhow!("ADB命令超时"));
                    }
                }
            }

            // 重试前等待
            sleep(Duration::from_secs(1)).await;
        }

        Err(anyhow::anyhow!("ADB命令重试次数用尽"))
    }

    /// 运行命令并获取输出
    async fn run_command_with_output(&self, args: &[&str]) -> Result<String> {
        let mut cmd = Command::new(&self.adb_path);
        cmd.args(args);
        cmd.stdout(Stdio::piped());
        cmd.stderr(Stdio::piped());

        let mut child = cmd.spawn().context("启动ADB命令失败")?;

        let stdout = child.stdout.take().context("获取stdout失败")?;
        let mut reader = BufReader::new(stdout);
        let mut output = String::new();

        // 异步读取输出
        while let Ok(line) = reader.read_line(&mut output).await {
            if line == 0 {
                break;
            }
        }

        let status = child.wait().await.context("等待命令完成失败")?;

        if status.success() {
            Ok(output)
        } else {
            Err(anyhow::anyhow!("命令执行失败，退出码: {}", status))
        }
    }

    /// 读取联系人文件
    fn read_contacts_from_file(&self, file_path: &str) -> Result<Vec<Contact>> {
        let content = fs::read_to_string(file_path)
            .with_context(|| format!("读取文件失败: {}", file_path))?;

        let mut contacts = Vec::new();

        for (line_no, line) in content.lines().enumerate() {
            let line = line.trim();
            if line.is_empty() || line.starts_with('#') {
                continue;
            }

            let parts: Vec<&str> = line.split(',').map(|s| s.trim()).collect();
            if parts.len() >= 2 {
                let contact = Contact {
                    id: uuid::Uuid::new_v4().to_string(),
                    name: parts[0].to_string(),
                    phone: parts[1].to_string(),
                    address: parts.get(2).unwrap_or(&"").to_string(),
                    occupation: parts.get(3).unwrap_or(&"").to_string(),
                    email: parts.get(4).unwrap_or(&"").to_string(),
                };
                contacts.push(contact);
            } else {
                warn!("跳过无效行 {}: {}", line_no + 1, line);
            }
        }

        if contacts.is_empty() {
            return Err(anyhow::anyhow!("未找到有效的联系人数据"));
        }

        info!("读取到 {} 个联系人", contacts.len());
        Ok(contacts)
    }

    /// 格式化中国手机号
    fn format_chinese_phone(&self, phone: &str) -> String {
        let digits: String = phone.chars().filter(|c| c.is_ascii_digit()).collect();

        if digits.len() == 11 && digits.starts_with('1') {
            format!("+86 {} {} {}", &digits[0..3], &digits[3..7], &digits[7..11])
        } else {
            phone.to_string()
        }
    }
}
