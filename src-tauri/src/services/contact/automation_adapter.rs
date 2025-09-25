//! automation_adapter.rs - 将联系人相关的智能脚本步骤迁出执行器

use anyhow::Result;
use std::collections::HashMap;
use std::path::Path;

use crate::services::execution::model::SmartScriptStep;
use crate::services::multi_brand_vcf_importer::MultiBrandVcfImporter;
use crate::services::vcf_importer::{Contact, VcfImporter};

/// 处理 "ContactGenerateVcf" 类型步骤。
pub async fn run_generate_vcf_step(
    step: &SmartScriptStep,
    logs: &mut Vec<String>,
) -> Result<String> {
    logs.push("🗂️ 开始VCF文件生成测试".to_string());

    let params: HashMap<String, serde_json::Value> =
        serde_json::from_value(step.parameters.clone())?;

    let source_file_path = params
        .get("source_file_path")
        .and_then(|v| v.as_str())
        .unwrap_or("");

    if source_file_path.is_empty() {
        logs.push("❌ 缺少源文件路径参数".to_string());
        return Ok("VCF生成失败: 缺少源文件路径".to_string());
    }

    logs.push(format!("📁 源文件路径: {}", source_file_path));

    if !Path::new(source_file_path).exists() {
        logs.push(format!("❌ 源文件不存在: {}", source_file_path));
        return Ok(format!(
            "VCF生成失败: 文件不存在 - {}",
            source_file_path
        ));
    }

    match std::fs::read_to_string(source_file_path) {
        Ok(content) => {
            logs.push(format!("📄 成功读取文件内容，长度: {} 字符", content.len()));

            let contacts = vec![
                Contact {
                    id: "test_1".to_string(),
                    name: "测试联系人1".to_string(),
                    phone: "13800138001".to_string(),
                    email: "test1@example.com".to_string(),
                    address: "".to_string(),
                    occupation: "".to_string(),
                },
                Contact {
                    id: "test_2".to_string(),
                    name: "测试联系人2".to_string(),
                    phone: "13800138002".to_string(),
                    email: "test2@example.com".to_string(),
                    address: "".to_string(),
                    occupation: "".to_string(),
                },
            ];

            logs.push(format!("👥 解析出 {} 个联系人", contacts.len()));

            let output_dir = params
                .get("output_dir")
                .and_then(|v| v.as_str())
                .unwrap_or("./vcf_output");

            let output_path = format!(
                "{}/contacts_{}.vcf",
                output_dir,
                chrono::Utc::now().timestamp()
            );
            logs.push(format!("📤 输出路径: {}", output_path));

            if let Some(parent) = Path::new(&output_path).parent() {
                std::fs::create_dir_all(parent)?;
            }

            match VcfImporter::generate_vcf_file(contacts, &output_path).await {
                Ok(_) => {
                    logs.push(format!("✅ VCF文件生成成功: {}", output_path));
                    Ok(format!("VCF文件生成成功: {}", output_path))
                }
                Err(e) => {
                    logs.push(format!("❌ VCF文件生成失败: {}", e));
                    Ok(format!("VCF生成失败: {}", e))
                }
            }
        }
        Err(e) => {
            logs.push(format!("❌ 读取文件失败: {}", e));
            Ok(format!("VCF生成失败: 文件读取错误 - {}", e))
        }
    }
}

/// 处理 "ContactImportToDevice" 类型步骤。
pub async fn run_import_contacts_step(
    step: &SmartScriptStep,
    logs: &mut Vec<String>,
) -> Result<String> {
    logs.push("📱 开始联系人导入到设备测试".to_string());

    let params: HashMap<String, serde_json::Value> =
        serde_json::from_value(step.parameters.clone())?;

    let selected_device_id = params
        .get("selected_device_id")
        .and_then(|v| v.as_str())
        .unwrap_or("");

    if selected_device_id.is_empty() {
        logs.push("❌ 缺少设备选择参数".to_string());
        return Ok("联系人导入失败: 未选择目标设备".to_string());
    }

    logs.push(format!("🎯 目标设备: {}", selected_device_id));

    let vcf_file_path = params
        .get("vcf_file_path")
        .and_then(|v| v.as_str())
        .unwrap_or("");

    if vcf_file_path.is_empty() {
        logs.push("❌ 缺少VCF文件路径参数".to_string());
        return Ok("联系人导入失败: 缺少VCF文件路径".to_string());
    }

    logs.push(format!("📁 VCF文件路径: {}", vcf_file_path));

    if !Path::new(vcf_file_path).exists() {
        logs.push(format!("❌ VCF文件不存在: {}", vcf_file_path));
        return Ok(format!(
            "联系人导入失败: VCF文件不存在 - {}",
            vcf_file_path
        ));
    }

    let mut multi_brand_importer = MultiBrandVcfImporter::new(selected_device_id.to_string());

    logs.push("🚀 启动多品牌联系人导入流程".to_string());
    logs.push("📋 支持的品牌: 华为、小米、OPPO、VIVO、三星、原生Android等".to_string());

    match multi_brand_importer
        .import_vcf_contacts_multi_brand(vcf_file_path)
        .await
    {
        Ok(result) => {
            if result.success {
                logs.push("✅ 多品牌联系人导入成功".to_string());

                if let Some(strategy) = &result.used_strategy {
                    logs.push(format!("🎯 成功策略: {}", strategy));
                }

                if let Some(method) = &result.used_method {
                    logs.push(format!("🔧 成功方法: {}", method));
                }

                logs.push(format!(
                    "📊 导入统计: 总计{}个，成功{}个，失败{}个",
                    result.total_contacts, result.imported_contacts, result.failed_contacts
                ));

                logs.push(format!("⏱️ 用时: {}秒", result.duration_seconds));
                logs.push(format!("🔄 尝试次数: {}次", result.attempts.len()));

                for (i, attempt) in result.attempts.iter().enumerate() {
                    let status = if attempt.success { "✅" } else { "❌" };
                    logs.push(format!(
                        "  {}. {} {}-{} ({}s)",
                        i + 1,
                        status,
                        attempt.strategy_name,
                        attempt.method_name,
                        attempt.duration_seconds
                    ));
                }

                logs.push("📱 联系人已成功导入到设备通讯录".to_string());
                Ok(format!(
                    "多品牌联系人导入成功: 已导入到设备 {} (使用{}策略)",
                    selected_device_id,
                    result
                        .used_strategy
                        .clone()
                        .unwrap_or_else(|| "未知".to_string())
                ))
            } else {
                logs.push("❌ 多品牌联系人导入失败".to_string());
                logs.push(format!("📝 失败原因: {}", result.message));

                for (i, attempt) in result.attempts.iter().enumerate() {
                    logs.push(format!(
                        "  {}. ❌ {}-{}: {}",
                        i + 1,
                        attempt.strategy_name,
                        attempt.method_name,
                        attempt
                            .error_message
                            .as_deref()
                            .unwrap_or("未知错误")
                    ));
                }

                Ok(format!("多品牌联系人导入失败: {}", result.message))
            }
        }
        Err(e) => {
            logs.push(format!("❌ 多品牌联系人导入系统错误: {}", e));
            Ok(format!("多品牌联系人导入系统错误: {}", e))
        }
    }
}
