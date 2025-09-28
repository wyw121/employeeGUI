use std::collections::HashMap;
use crate::services::multi_brand_vcf_types::{
    VcfImportStrategy, ImportMethod, ImportStep, ImportStepType, VerificationMethod, VerificationType,
};

/// 构建内置的多品牌 VCF 导入策略列表
pub fn builtin_strategies() -> Vec<VcfImportStrategy> {
    let mut strategies: Vec<VcfImportStrategy> = Vec::new();

    // 华为/荣耀策略（避免 provider 包，优先使用 UI 包）
    let huawei_strategy = VcfImportStrategy {
        strategy_name: "Huawei_EMUI".to_string(),
        brand_patterns: vec!["huawei".into(), "honor".into(), "荣耀".into()],
        contact_app_packages: vec![
            "com.hihonor.contacts".into(),
            "com.huawei.contacts".into(),
            "com.android.contacts".into(),
        ],
        import_methods: vec![
            ImportMethod {
                method_name: "EMUI_Standard_Import".into(),
                steps: vec![
                    ImportStep { step_type: ImportStepType::LaunchContactApp, description: "启动华为通讯录".into(), parameters: HashMap::new() },
                    ImportStep { step_type: ImportStepType::NavigateToImport, description: "导航到导入功能".into(), parameters: HashMap::new() },
                    ImportStep { step_type: ImportStepType::SelectVcfFile, description: "选择VCF文件".into(), parameters: HashMap::new() },
                ],
                timeout_seconds: 120,
                retry_count: 2,
            },
        ],
        verification_methods: vec![
            VerificationMethod { method_name: "ContactCount".into(), verification_type: VerificationType::ContactCount, expected_results: HashMap::new() },
        ],
    };

    // 小米/红米策略
    let xiaomi_strategy = VcfImportStrategy {
        strategy_name: "MIUI_Xiaomi".to_string(),
        brand_patterns: vec!["xiaomi".into(), "redmi".into(), "小米".into(), "红米".into()],
        contact_app_packages: vec![
            "com.android.contacts".into(),
            "com.miui.contacts".into(),
            "com.xiaomi.contacts".into(),
        ],
        import_methods: vec![
            ImportMethod {
                method_name: "MIUI_Standard_Import".into(),
                steps: vec![
                    ImportStep { step_type: ImportStepType::LaunchContactApp, description: "启动MIUI通讯录".into(), parameters: HashMap::new() },
                    ImportStep { step_type: ImportStepType::NavigateToImport, description: "导航到导入/导出".into(), parameters: HashMap::new() },
                    ImportStep { step_type: ImportStepType::SelectVcfFile, description: "从存储设备导入".into(), parameters: HashMap::new() },
                ],
                timeout_seconds: 120,
                retry_count: 2,
            },
        ],
        verification_methods: vec![
            VerificationMethod { method_name: "ContactCount".into(), verification_type: VerificationType::ContactCount, expected_results: HashMap::new() },
        ],
    };

    // 原生 Android 策略
    let android_strategy = VcfImportStrategy {
        strategy_name: "Stock_Android".to_string(),
        brand_patterns: vec!["google".into(), "pixel".into(), "android".into()],
        contact_app_packages: vec!["com.android.contacts".into(), "com.google.android.contacts".into()],
        import_methods: vec![
            ImportMethod {
                method_name: "Stock_Android_Import".into(),
                steps: vec![
                    ImportStep { step_type: ImportStepType::LaunchContactApp, description: "启动原生通讯录".into(), parameters: HashMap::new() },
                    ImportStep { step_type: ImportStepType::NavigateToImport, description: "导航到导入".into(), parameters: HashMap::new() },
                    ImportStep { step_type: ImportStepType::SelectVcfFile, description: "选择VCF文件".into(), parameters: HashMap::new() },
                ],
                timeout_seconds: 120,
                retry_count: 2,
            },
        ],
        verification_methods: vec![
            VerificationMethod { method_name: "ContactCount".into(), verification_type: VerificationType::ContactCount, expected_results: HashMap::new() },
        ],
    };

    // OPPO/一加/realme 策略（ColorOS）
    let oppo_strategy = VcfImportStrategy {
        strategy_name: "ColorOS_OPPO".to_string(),
        brand_patterns: vec!["oppo".into(), "oneplus".into(), "realme".into()],
        contact_app_packages: vec![
            "com.android.contacts".into(),
            "com.oppo.contacts".into(),
            "com.coloros.contacts".into(),
        ],
        import_methods: vec![
            ImportMethod {
                method_name: "ColorOS_Import".into(),
                steps: vec![
                    ImportStep { step_type: ImportStepType::LaunchContactApp, description: "启动ColorOS通讯录".into(), parameters: HashMap::new() },
                    ImportStep { step_type: ImportStepType::NavigateToImport, description: "导航到导入联系人".into(), parameters: HashMap::new() },
                    ImportStep { step_type: ImportStepType::SelectVcfFile, description: "从文件导入".into(), parameters: HashMap::new() },
                ],
                timeout_seconds: 120,
                retry_count: 2,
            },
        ],
        verification_methods: vec![
            VerificationMethod { method_name: "ContactCount".into(), verification_type: VerificationType::ContactCount, expected_results: HashMap::new() },
        ],
    };

    // VIVO/iQOO 策略（FuntouchOS）
    let vivo_strategy = VcfImportStrategy {
        strategy_name: "FuntouchOS_VIVO".to_string(),
        brand_patterns: vec!["vivo".into(), "iqoo".into()],
        contact_app_packages: vec!["com.android.contacts".into(), "com.vivo.contacts".into()],
        import_methods: vec![
            ImportMethod {
                method_name: "FuntouchOS_Import".into(),
                steps: vec![
                    ImportStep { step_type: ImportStepType::LaunchContactApp, description: "启动VIVO通讯录".into(), parameters: HashMap::new() },
                    ImportStep { step_type: ImportStepType::NavigateToImport, description: "导航到导入".into(), parameters: HashMap::new() },
                    ImportStep { step_type: ImportStepType::SelectVcfFile, description: "从存储卡导入".into(), parameters: HashMap::new() },
                ],
                timeout_seconds: 120,
                retry_count: 2,
            },
        ],
        verification_methods: vec![
            VerificationMethod { method_name: "ContactCount".into(), verification_type: VerificationType::ContactCount, expected_results: HashMap::new() },
        ],
    };

    // 三星策略（OneUI）
    let samsung_strategy = VcfImportStrategy {
        strategy_name: "OneUI_Samsung".to_string(),
        brand_patterns: vec!["samsung".into(), "三星".into()],
        contact_app_packages: vec![
            "com.android.contacts".into(),
            "com.samsung.android.contacts".into(),
            "com.samsung.android.app.contacts".into(),
        ],
        import_methods: vec![
            ImportMethod {
                method_name: "OneUI_Import".into(),
                steps: vec![
                    ImportStep { step_type: ImportStepType::LaunchContactApp, description: "启动三星通讯录".into(), parameters: HashMap::new() },
                    ImportStep { step_type: ImportStepType::NavigateToImport, description: "导航到导入/导出联系人".into(), parameters: HashMap::new() },
                    ImportStep { step_type: ImportStepType::SelectVcfFile, description: "从设备存储空间导入".into(), parameters: HashMap::new() },
                ],
                timeout_seconds: 120,
                retry_count: 2,
            },
        ],
        verification_methods: vec![
            VerificationMethod { method_name: "ContactCount".into(), verification_type: VerificationType::ContactCount, expected_results: HashMap::new() },
        ],
    };

    strategies.extend(vec![
        huawei_strategy,
        xiaomi_strategy,
        android_strategy,
        oppo_strategy,
        vivo_strategy,
        samsung_strategy,
    ]);

    strategies
}
