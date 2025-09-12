use anyhow::{Context, Result};
use serde::{Deserialize, Serialize};
use std::fs;
use std::process::Command;
use tokio::time::{sleep, Duration};
use tracing::{error, info, warn};

// 核心数据结构
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

pub struct VcfImporter {
    device_id: String,
    adb_path: String,
}

impl VcfImporter {
    pub fn new(device_id: String) -> Self {
        Self {
            device_id,
            adb_path: "adb".to_string(), // 使用系统默认ADB
        }
    }

    /// 解析联系人文件（支持txt格式：姓名,电话,地址,职业,邮箱）
    pub fn parse_contacts_from_file(&self, file_path: &str) -> Result<Vec<Contact>> {
        info!("开始解析联系人文件: {}", file_path);
        
        let content = fs::read_to_string(file_path)
            .with_context(|| format!("无法读取文件: {}", file_path))?;
        
        let mut contacts = Vec::new();
        
        for (line_num, line) in content.lines().enumerate() {
            let line = line.trim();
            if line.is_empty() || line.starts_with('#') {
                continue;
            }
            
            let parts: Vec<&str> = line.split(',').collect();
            if parts.len() >= 2 {
                let contact = Contact {
                    id: (line_num + 1).to_string(),
                    name: parts[0].trim().to_string(),
                    phone: parts[1].trim().to_string(),
                    address: parts.get(2).unwrap_or(&"").trim().to_string(),
                    occupation: parts.get(3).unwrap_or(&"").trim().to_string(),
                    email: parts.get(4).unwrap_or(&"").trim().to_string(),
                };
                contacts.push(contact);
            }
        }
        
        info!("成功解析 {} 个联系人", contacts.len());
        Ok(contacts)
    }

    /// 生成VCF文件内容
    pub fn generate_vcf_content(&self, contacts: &[Contact]) -> String {
        let mut vcf_content = String::new();
        
        for contact in contacts {
            vcf_content.push_str("BEGIN:VCARD\n");
            vcf_content.push_str("VERSION:3.0\n");
            vcf_content.push_str(&format!("FN:{}\n", contact.name));
            vcf_content.push_str(&format!("TEL:{}\n", contact.phone));
            
            if !contact.email.is_empty() {
                vcf_content.push_str(&format!("EMAIL:{}\n", contact.email));
            }
            
            if !contact.address.is_empty() {
                vcf_content.push_str(&format!("ADR:;;{}\n", contact.address));
            }
            
            if !contact.occupation.is_empty() {
                vcf_content.push_str(&format!("TITLE:{}\n", contact.occupation));
            }
            
            vcf_content.push_str("END:VCARD\n");
        }
        
        vcf_content
    }

    /// 写入VCF文件
    pub fn write_vcf_file(&self, vcf_content: &str, output_path: &str) -> Result<()> {
        fs::write(output_path, vcf_content)
            .with_context(|| format!("无法写入VCF文件: {}", output_path))?;
        info!("VCF文件已写入: {}", output_path);
        Ok(())
    }

    /// 推送VCF文件到设备
    pub async fn push_vcf_to_device(&self, local_path: &str, device_path: &str) -> Result<()> {
        info!("推送VCF文件到设备: {} -> {}", local_path, device_path);
        
        let output = Command::new(&self.adb_path)
            .args(["-s", &self.device_id, "push", local_path, device_path])
            .output()
            .with_context(|| "执行adb push命令失败")?;
        
        if !output.status.success() {
            let stderr = String::from_utf8_lossy(&output.stderr);
            return Err(anyhow::anyhow!("推送文件失败: {}", stderr));
        }
        
        info!("文件推送成功");
        Ok(())
    }

    /// 使用Intent打开VCF文件
    pub async fn open_vcf_with_intent(&self, device_path: &str) -> Result<()> {
        info!("使用Intent打开VCF文件: {}", device_path);
        
        let intent_command = format!(
            "am start -a android.intent.action.VIEW -d file://{} -t text/x-vcard",
            device_path
        );
        
        let output = Command::new(&self.adb_path)
            .args(["-s", &self.device_id, "shell", &intent_command])
            .output()
            .with_context(|| "执行Intent命令失败")?;
        
        if !output.status.success() {
            let stderr = String::from_utf8_lossy(&output.stderr);
            return Err(anyhow::anyhow!("Intent命令失败: {}", stderr));
        }
        
        info!("Intent命令执行成功");
        Ok(())
    }

    /// 基础的VCF导入方法（权限测试中使用的可靠方法）
    pub async fn import_vcf_contacts(&self, contacts_file_path: &str) -> Result<VcfImportResult> {
        let start_time = std::time::Instant::now();
        info!("开始VCF导入流程，文件: {}", contacts_file_path);

        // 1. 解析联系人文件
        let contacts = self.parse_contacts_from_file(contacts_file_path)?;
        let total_contacts = contacts.len();
        
        if total_contacts == 0 {
            return Ok(VcfImportResult {
                success: false,
                total_contacts: 0,
                imported_contacts: 0,
                failed_contacts: 0,
                message: "没有找到有效的联系人数据".to_string(),
                details: None,
                duration: Some(start_time.elapsed().as_secs()),
            });
        }

        // 2. 生成VCF文件
        let vcf_content = self.generate_vcf_content(&contacts);
        let temp_dir = std::env::temp_dir();
        let vcf_path = temp_dir.join("contacts_import.vcf");
        let vcf_path_str = vcf_path.to_string_lossy();
        
        self.write_vcf_file(&vcf_content, &vcf_path_str)?;

        // 3. 推送到设备
        let device_path = "/sdcard/Download/contacts_import.vcf";
        self.push_vcf_to_device(&vcf_path_str, device_path).await?;

        // 4. 使用Intent打开
        self.open_vcf_with_intent(device_path).await?;

        // 5. 等待用户操作
        info!("等待用户在设备上完成导入操作...");
        sleep(Duration::from_secs(5)).await;

        let duration = start_time.elapsed().as_secs();
        
        Ok(VcfImportResult {
            success: true,
            total_contacts,
            imported_contacts: total_contacts, // 假设全部成功
            failed_contacts: 0,
            message: "VCF文件已推送到设备并打开".to_string(),
            details: Some(format!("设备路径: {}", device_path)),
            duration: Some(duration),
        })
    }
}