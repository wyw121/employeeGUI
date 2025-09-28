use anyhow::Result;
use std::fs;
use std::path::Path;

/// 将简单的 TXT（每行一个手机号，或 name,phone）转换为 VCF 文件，返回 VCF 路径。
/// - 若输入已是 .vcf 则直接返回。
pub fn ensure_vcf_path(input_path: &str) -> Result<String> {
    let p = Path::new(input_path);
    if let Some(ext) = p.extension() {
        if ext.to_string_lossy().to_lowercase() == "vcf" {
            return Ok(input_path.to_string());
        }
    }

    let content = fs::read_to_string(input_path)?;
    let mut vcf = String::new();
    let mut idx = 1;
    for line in content.lines() {
        let line = line.trim();
        if line.is_empty() { continue; }
        let (name, phone) = if line.contains(',') {
            let mut parts = line.splitn(2, ',');
            let n = parts.next().unwrap_or("").trim();
            let ph = parts.next().unwrap_or("").trim();
            (if n.is_empty() { format!("联系人{}", idx) } else { n.to_string() }, ph.to_string())
        } else {
            (format!("联系人{}", idx), line.to_string())
        };
        vcf.push_str("BEGIN:VCARD\n");
        vcf.push_str("VERSION:2.1\n");
        vcf.push_str(&format!("FN:{}\n", name));
        vcf.push_str(&format!("N:{};\n", name));
        vcf.push_str(&format!("TEL;CELL:{}\n", phone));
        vcf.push_str("END:VCARD\n");
        idx += 1;
    }

    let out = p.with_extension("vcf");
    fs::write(&out, vcf)?;
    Ok(out.to_string_lossy().to_string())
}
