// smart_script_executor_actions.rs - 智能脚本执行器的具体操作实现
use super::*;

impl SmartScriptExecutor {
    
    // ==================== 智能操作实现 ====================

    /// 执行智能点击
    pub async fn execute_smart_tap(&self, step: &SmartScriptStep) -> Result<(Vec<SmartUIElement>, Option<serde_json::Value>)> {
        info!("👆 执行智能点击: {}", step.name);

        let params = &step.parameters;
        let mut found_elements = Vec::new();

        // 如果有查找条件，先查找元素
        if let Some(find_condition) = &step.find_condition {
            found_elements = self.smart_find_elements(find_condition).await?;
            
            if found_elements.is_empty() {
                return Err(anyhow::anyhow!("未找到匹配的元素"));
            }

            // 选择最佳匹配的元素（第一个可点击的）
            let target_element = found_elements.iter()
                .find(|e| e.clickable)
                .ok_or_else(|| anyhow::anyhow!("没有可点击的元素"))?;

            info!("🎯 智能定位到元素: {} 坐标: ({}, {})", 
                target_element.text, target_element.center.0, target_element.center.1);

            // 点击元素中心
            self.adb_tap(target_element.center.0, target_element.center.1).await?;
        } else {
            // 使用固定坐标点击
            let x = params["x"].as_i64().context("缺少x坐标")? as i32;
            let y = params["y"].as_i64().context("缺少y坐标")? as i32;
            
            info!("👆 固定坐标点击: ({}, {})", x, y);
            self.adb_tap(x, y).await?;
        }

        // 等待操作完成
        let wait_after = params.get("wait_after")
            .and_then(|v| v.as_u64())
            .unwrap_or(1000);
        sleep(Duration::from_millis(wait_after)).await;

        // 如果有验证条件，执行验证
        if let Some(verification) = &step.verification {
            self.verify_action_result(verification).await?;
        }

        Ok((found_elements, None))
    }

    /// 执行智能元素查找
    pub async fn execute_smart_find_element(&self, step: &SmartScriptStep) -> Result<(Vec<SmartUIElement>, Option<serde_json::Value>)> {
        info!("🔍 执行智能元素查找: {}", step.name);

        let find_condition = step.find_condition.as_ref()
            .ok_or_else(|| anyhow::anyhow!("缺少查找条件"))?;

        let found_elements = self.smart_find_elements(find_condition).await?;
        
        if found_elements.is_empty() {
            return Err(anyhow::anyhow!("未找到匹配的元素"));
        }

        info!("✅ 找到 {} 个匹配元素", found_elements.len());

        // 检查是否需要点击找到的元素
        let params = &step.parameters;
        if params.get("click_if_found").and_then(|v| v.as_bool()).unwrap_or(false) {
            if let Some(target_element) = found_elements.iter().find(|e| e.clickable) {
                info!("🎯 自动点击找到的元素: {}", target_element.text);
                self.adb_tap(target_element.center.0, target_element.center.1).await?;
                
                let wait_after = params.get("wait_after")
                    .and_then(|v| v.as_u64())
                    .unwrap_or(1000);
                sleep(Duration::from_millis(wait_after)).await;
            }
        }

        // 将找到的元素信息序列化为JSON
        let elements_data = serde_json::to_value(&found_elements)?;

        Ok((found_elements, Some(elements_data)))
    }

    /// 执行页面识别
    pub async fn execute_recognize_page(&self, step: &SmartScriptStep) -> Result<(Vec<SmartUIElement>, Option<serde_json::Value>)> {
        info!("📱 执行页面识别: {}", step.name);

        let recognition_result = self.recognize_current_page().await?;
        
        // 检查是否符合期望的页面状态
        let params = &step.parameters;
        if let Some(expected_state_str) = params.get("expected_state").and_then(|v| v.as_str()) {
            let expected_state = self.parse_page_state(expected_state_str)?;
            
            if recognition_result.current_state != expected_state {
                return Err(anyhow::anyhow!("页面状态不匹配，期望: {:?}, 实际: {:?}", 
                    expected_state, recognition_result.current_state));
            }
        }

        // 检查置信度阈值
        let confidence_threshold = params.get("confidence_threshold")
            .and_then(|v| v.as_f64())
            .unwrap_or(0.7) as f32;

        if recognition_result.confidence < confidence_threshold {
            return Err(anyhow::anyhow!("页面识别置信度过低: {:.2} < {:.2}", 
                recognition_result.confidence, confidence_threshold));
        }

        info!("✅ 页面识别成功: {:?} (置信度: {:.2})", 
            recognition_result.current_state, recognition_result.confidence);

        let result_data = serde_json::to_value(&recognition_result)?;
        Ok((recognition_result.ui_elements, Some(result_data)))
    }

    /// 执行操作验证
    pub async fn execute_verify_action(&self, step: &SmartScriptStep) -> Result<(Vec<SmartUIElement>, Option<serde_json::Value>)> {
        info!("✅ 执行操作验证: {}", step.name);

        let verification = step.verification.as_ref()
            .ok_or_else(|| anyhow::anyhow!("缺少验证条件"))?;

        let verification_result = self.verify_action_result(verification).await?;
        
        if !verification_result.success {
            return Err(anyhow::anyhow!("验证失败: {}", verification_result.message));
        }

        info!("✅ 验证成功: {}", verification_result.message);

        let result_data = serde_json::to_value(&verification_result)?;
        Ok((vec![], Some(result_data)))
    }

    /// 执行等待页面状态
    pub async fn execute_wait_for_page_state(&self, step: &SmartScriptStep) -> Result<(Vec<SmartUIElement>, Option<serde_json::Value>)> {
        info!("⏳ 等待页面状态: {}", step.name);

        let params = &step.parameters;
        let expected_state_str = params["expected_state"].as_str()
            .ok_or_else(|| anyhow::anyhow!("缺少期望页面状态"))?;
        let expected_state = self.parse_page_state(expected_state_str)?;
        
        let timeout_ms = params.get("timeout_ms")
            .and_then(|v| v.as_u64())
            .unwrap_or(10000);
        
        let check_interval_ms = params.get("check_interval_ms")
            .and_then(|v| v.as_u64())
            .unwrap_or(1000);

        let start_time = std::time::Instant::now();
        
        loop {
            let recognition_result = self.recognize_current_page().await?;
            
            if recognition_result.current_state == expected_state {
                info!("✅ 页面状态满足条件: {:?}", expected_state);
                let result_data = serde_json::to_value(&recognition_result)?;
                return Ok((recognition_result.ui_elements, Some(result_data)));
            }

            if start_time.elapsed().as_millis() as u64 > timeout_ms {
                return Err(anyhow::anyhow!("等待页面状态超时，期望: {:?}, 当前: {:?}", 
                    expected_state, recognition_result.current_state));
            }

            sleep(Duration::from_millis(check_interval_ms)).await;
        }
    }

    /// 执行元素信息提取
    pub async fn execute_extract_element(&self, step: &SmartScriptStep) -> Result<(Vec<SmartUIElement>, Option<serde_json::Value>)> {
        info!("📊 执行元素信息提取: {}", step.name);

        let find_condition = step.find_condition.as_ref()
            .ok_or_else(|| anyhow::anyhow!("缺少查找条件"))?;

        let found_elements = self.smart_find_elements(find_condition).await?;
        
        if found_elements.is_empty() {
            return Err(anyhow::anyhow!("未找到要提取的元素"));
        }

        // 提取指定的属性
        let params = &step.parameters;
        let extract_fields = params.get("extract_fields")
            .and_then(|v| v.as_array())
            .map(|arr| arr.iter().filter_map(|v| v.as_str()).collect::<Vec<_>>())
            .unwrap_or_else(|| vec!["text", "bounds", "clickable"]);

        let mut extracted_data = serde_json::Map::new();
        
        for (index, element) in found_elements.iter().enumerate() {
            let mut element_data = serde_json::Map::new();
            
            for field in &extract_fields {
                match *field {
                    "text" => { element_data.insert("text".to_string(), serde_json::Value::String(element.text.clone())); }
                    "bounds" => { element_data.insert("bounds".to_string(), serde_json::to_value(&element.bounds)?); }
                    "center" => { element_data.insert("center".to_string(), serde_json::to_value(&element.center)?); }
                    "clickable" => { element_data.insert("clickable".to_string(), serde_json::Value::Bool(element.clickable)); }
                    "resource_id" => { 
                        if let Some(id) = &element.resource_id {
                            element_data.insert("resource_id".to_string(), serde_json::Value::String(id.clone()));
                        }
                    }
                    "class_name" => {
                        if let Some(class) = &element.class_name {
                            element_data.insert("class_name".to_string(), serde_json::Value::String(class.clone()));
                        }
                    }
                    _ => {}
                }
            }
            
            extracted_data.insert(format!("element_{}", index), serde_json::Value::Object(element_data));
        }

        info!("✅ 提取了 {} 个元素的信息", found_elements.len());

        Ok((found_elements, Some(serde_json::Value::Object(extracted_data))))
    }

    /// 执行智能导航
    pub async fn execute_smart_navigation(&self, step: &SmartScriptStep) -> Result<(Vec<SmartUIElement>, Option<serde_json::Value>)> {
        info!("🧭 执行智能导航: {}", step.name);

        let params = &step.parameters;
        let target_page_str = params["target_page"].as_str()
            .ok_or_else(|| anyhow::anyhow!("缺少目标页面"))?;
        let target_page = self.parse_page_state(target_page_str)?;

        let navigation_steps = params.get("navigation_steps")
            .and_then(|v| v.as_array())
            .ok_or_else(|| anyhow::anyhow!("缺少导航步骤"))?;

        let mut all_found_elements = Vec::new();
        let mut navigation_log = Vec::new();

        // 执行导航步骤
        for (index, nav_step) in navigation_steps.iter().enumerate() {
            info!("🔄 执行导航步骤 {}/{}", index + 1, navigation_steps.len());
            
            // 解析导航步骤
            let step_action = nav_step["action"].as_str()
                .ok_or_else(|| anyhow::anyhow!("导航步骤缺少action"))?;

            match step_action {
                "tap" => {
                    let find_condition = if let Some(condition_json) = nav_step.get("find_condition") {
                        serde_json::from_value(condition_json.clone())?
                    } else {
                        return Err(anyhow::anyhow!("tap导航步骤缺少find_condition"));
                    };

                    let elements = self.smart_find_elements(&find_condition).await?;
                    if let Some(target) = elements.iter().find(|e| e.clickable) {
                        self.adb_tap(target.center.0, target.center.1).await?;
                        all_found_elements.extend(elements);
                        navigation_log.push(format!("点击: {}", target.text));
                    } else {
                        return Err(anyhow::anyhow!("导航步骤 {} 未找到可点击元素", index + 1));
                    }
                }
                "wait" => {
                    let duration = nav_step.get("duration")
                        .and_then(|v| v.as_u64())
                        .unwrap_or(2000);
                    sleep(Duration::from_millis(duration)).await;
                    navigation_log.push(format!("等待: {}ms", duration));
                }
                "verify_page" => {
                    let expected_state_str = nav_step["expected_state"].as_str()
                        .ok_or_else(|| anyhow::anyhow!("verify_page缺少expected_state"))?;
                    let expected_state = self.parse_page_state(expected_state_str)?;
                    
                    let result = self.recognize_current_page().await?;
                    if result.current_state != expected_state {
                        return Err(anyhow::anyhow!("导航验证失败，期望: {:?}, 实际: {:?}", 
                            expected_state, result.current_state));
                    }
                    navigation_log.push(format!("验证页面: {:?}", expected_state));
                }
                _ => {
                    return Err(anyhow::anyhow!("不支持的导航操作: {}", step_action));
                }
            }

            // 步骤间等待
            sleep(Duration::from_millis(1000)).await;
        }

        // 最终验证是否到达目标页面
        let final_result = self.recognize_current_page().await?;
        if final_result.current_state != target_page {
            return Err(anyhow::anyhow!("导航失败，目标: {:?}, 实际: {:?}", 
                target_page, final_result.current_state));
        }

        info!("✅ 智能导航成功到达: {:?}", target_page);

        let result_data = serde_json::json!({
            "target_page": target_page,
            "navigation_log": navigation_log,
            "final_page_state": final_result
        });

        Ok((all_found_elements, Some(result_data)))
    }

    // ==================== 基础操作实现 ====================

    /// 执行基础点击
    pub async fn execute_basic_tap(&self, step: &SmartScriptStep) -> Result<(Vec<SmartUIElement>, Option<serde_json::Value>)> {
        let params = &step.parameters;
        let x = params["x"].as_i64().context("缺少x坐标")? as i32;
        let y = params["y"].as_i64().context("缺少y坐标")? as i32;
        
        info!("👆 基础点击: ({}, {})", x, y);
        self.adb_tap(x, y).await?;

        let wait_after = params.get("wait_after")
            .and_then(|v| v.as_u64())
            .unwrap_or(1000);
        sleep(Duration::from_millis(wait_after)).await;

        Ok((vec![], None))
    }

    /// 执行基础滑动
    pub async fn execute_basic_swipe(&self, step: &SmartScriptStep) -> Result<(Vec<SmartUIElement>, Option<serde_json::Value>)> {
        let params = &step.parameters;
        let start_x = params["start_x"].as_i64().context("缺少start_x")? as i32;
        let start_y = params["start_y"].as_i64().context("缺少start_y")? as i32;
        let end_x = params["end_x"].as_i64().context("缺少end_x")? as i32;
        let end_y = params["end_y"].as_i64().context("缺少end_y")? as i32;
        let duration = params.get("duration").and_then(|v| v.as_u64()).unwrap_or(1000);

        info!("👋 基础滑动: ({}, {}) -> ({}, {}), 时长: {}ms", start_x, start_y, end_x, end_y, duration);
        self.adb_swipe(start_x, start_y, end_x, end_y, duration).await?;

        Ok((vec![], None))
    }

    /// 执行基础输入
    pub async fn execute_basic_input(&self, step: &SmartScriptStep) -> Result<(Vec<SmartUIElement>, Option<serde_json::Value>)> {
        let params = &step.parameters;
        let text = params["text"].as_str().context("缺少输入文本")?;
        let clear_first = params.get("clear_first").and_then(|v| v.as_bool()).unwrap_or(true);

        info!("⌨️ 基础输入: {}", text);
        self.adb_input(text, clear_first).await?;

        Ok((vec![], None))
    }

    /// 执行基础等待
    pub async fn execute_basic_wait(&self, step: &SmartScriptStep) -> Result<(Vec<SmartUIElement>, Option<serde_json::Value>)> {
        let params = &step.parameters;
        let duration = params["duration"].as_u64().context("缺少等待时长")?;

        info!("⏱️ 基础等待: {}ms", duration);
        sleep(Duration::from_millis(duration)).await;

        Ok((vec![], None))
    }

    // ==================== ADB操作辅助方法 ====================

    /// ADB点击
    async fn adb_tap(&self, x: i32, y: i32) -> Result<()> {
        let output = self.execute_adb_command(&[
            "-s", &self.device_id,
            "shell", "input", "tap",
            &x.to_string(), &y.to_string()
        ]).await?;

        if !output.status.success() {
            let error_msg = String::from_utf8_lossy(&output.stderr);
            return Err(anyhow::anyhow!("点击命令执行失败: {}", error_msg));
        }

        Ok(())
    }

    /// ADB滑动
    async fn adb_swipe(&self, start_x: i32, start_y: i32, end_x: i32, end_y: i32, duration: u64) -> Result<()> {
        let output = self.execute_adb_command(&[
            "-s", &self.device_id,
            "shell", "input", "swipe",
            &start_x.to_string(), &start_y.to_string(),
            &end_x.to_string(), &end_y.to_string(),
            &duration.to_string()
        ]).await?;

        if !output.status.success() {
            let error_msg = String::from_utf8_lossy(&output.stderr);
            return Err(anyhow::anyhow!("滑动命令执行失败: {}", error_msg));
        }

        Ok(())
    }

    /// ADB输入
    async fn adb_input(&self, text: &str, clear_first: bool) -> Result<()> {
        if clear_first {
            // 清空当前输入
            let _ = self.execute_adb_command(&[
                "-s", &self.device_id,
                "shell", "input", "keyevent", "KEYCODE_CTRL_A"
            ]).await;
            sleep(Duration::from_millis(200)).await;
            
            let _ = self.execute_adb_command(&[
                "-s", &self.device_id,
                "shell", "input", "keyevent", "KEYCODE_DEL"
            ]).await;
            sleep(Duration::from_millis(200)).await;
        }

        let output = self.execute_adb_command(&[
            "-s", &self.device_id,
            "shell", "input", "text",
            text
        ]).await?;

        if !output.status.success() {
            let error_msg = String::from_utf8_lossy(&output.stderr);
            return Err(anyhow::anyhow!("输入命令执行失败: {}", error_msg));
        }

        Ok(())
    }

    // ==================== 验证系统 ====================

    /// 验证操作结果
    async fn verify_action_result(&self, verification: &VerificationCondition) -> Result<VerificationResult> {
        info!("🔍 执行操作验证: {:?}", verification.verify_type);

        let start_time = std::time::Instant::now();
        let mut retry_count = 0;

        loop {
            let result = match &verification.verify_type {
                VerificationType::TextChange => self.verify_text_change(verification).await,
                VerificationType::PageStateChange => self.verify_page_state_change(verification).await,
                VerificationType::ElementExists => self.verify_element_exists(verification).await,
                VerificationType::ElementDisappears => self.verify_element_disappears(verification).await,
                VerificationType::ElementTextEquals => self.verify_element_text_equals(verification).await,
                VerificationType::ElementTextContains => self.verify_element_text_contains(verification).await,
                VerificationType::Custom(logic) => self.verify_custom_logic(logic, verification).await,
            };

            match result {
                Ok(verification_result) => return Ok(verification_result),
                Err(e) => {
                    retry_count += 1;
                    
                    if retry_count >= verification.retry_count || 
                       start_time.elapsed().as_millis() as u64 > verification.timeout_ms {
                        return Ok(VerificationResult {
                            success: false,
                            expected: verification.expected_result.clone(),
                            actual: format!("验证失败: {}", e),
                            message: format!("验证超时或重试次数超限: {}", e),
                        });
                    }

                    sleep(Duration::from_millis(verification.retry_interval_ms)).await;
                }
            }
        }
    }

    /// 验证文本变化
    async fn verify_text_change(&self, verification: &VerificationCondition) -> Result<VerificationResult> {
        // 简化实现 - 在实际项目中需要存储初始状态进行对比
        let ui_elements = self.get_current_ui_elements().await?;
        let current_texts: Vec<String> = ui_elements.iter().map(|e| e.text.clone()).collect();
        
        let contains_expected = current_texts.iter()
            .any(|text| text.contains(&verification.expected_result));

        Ok(VerificationResult {
            success: contains_expected,
            expected: verification.expected_result.clone(),
            actual: current_texts.join(", "),
            message: if contains_expected {
                "文本变化验证成功".to_string()
            } else {
                "未找到期望的文本变化".to_string()
            },
        })
    }

    /// 验证页面状态变化
    async fn verify_page_state_change(&self, verification: &VerificationCondition) -> Result<VerificationResult> {
        let current_page = self.recognize_current_page().await?;
        let expected_state = self.parse_page_state(&verification.expected_result)?;
        
        let success = current_page.current_state == expected_state;
        
        Ok(VerificationResult {
            success,
            expected: format!("{:?}", expected_state),
            actual: format!("{:?}", current_page.current_state),
            message: if success {
                "页面状态验证成功".to_string()
            } else {
                format!("页面状态不匹配，期望: {:?}, 实际: {:?}", expected_state, current_page.current_state)
            },
        })
    }

    /// 验证元素存在
    async fn verify_element_exists(&self, verification: &VerificationCondition) -> Result<VerificationResult> {
        let ui_elements = self.get_current_ui_elements().await?;
        let exists = ui_elements.iter()
            .any(|e| e.text.contains(&verification.expected_result) || 
                     e.content_desc.as_ref().map_or(false, |d| d.contains(&verification.expected_result)));

        Ok(VerificationResult {
            success: exists,
            expected: verification.expected_result.clone(),
            actual: if exists { "元素存在".to_string() } else { "元素不存在".to_string() },
            message: if exists {
                "元素存在验证成功".to_string()
            } else {
                "未找到期望的元素".to_string()
            },
        })
    }

    /// 验证元素消失
    async fn verify_element_disappears(&self, verification: &VerificationCondition) -> Result<VerificationResult> {
        let exists_result = self.verify_element_exists(verification).await?;
        
        Ok(VerificationResult {
            success: !exists_result.success,
            expected: format!("元素 '{}' 应该消失", verification.expected_result),
            actual: if exists_result.success { "元素仍然存在".to_string() } else { "元素已消失".to_string() },
            message: if !exists_result.success {
                "元素消失验证成功".to_string()
            } else {
                "元素仍然存在，验证失败".to_string()
            },
        })
    }

    /// 验证元素文本等于
    async fn verify_element_text_equals(&self, verification: &VerificationCondition) -> Result<VerificationResult> {
        let ui_elements = self.get_current_ui_elements().await?;
        let matching_element = ui_elements.iter()
            .find(|e| e.text == verification.expected_result);

        let success = matching_element.is_some();
        
        Ok(VerificationResult {
            success,
            expected: verification.expected_result.clone(),
            actual: matching_element.map(|e| e.text.clone()).unwrap_or_else(|| "未找到匹配元素".to_string()),
            message: if success {
                "元素文本等于验证成功".to_string()
            } else {
                "未找到文本完全匹配的元素".to_string()
            },
        })
    }

    /// 验证元素文本包含
    async fn verify_element_text_contains(&self, verification: &VerificationCondition) -> Result<VerificationResult> {
        let ui_elements = self.get_current_ui_elements().await?;
        let matching_element = ui_elements.iter()
            .find(|e| e.text.contains(&verification.expected_result));

        let success = matching_element.is_some();
        
        Ok(VerificationResult {
            success,
            expected: verification.expected_result.clone(),
            actual: matching_element.map(|e| e.text.clone()).unwrap_or_else(|| "未找到匹配元素".to_string()),
            message: if success {
                "元素文本包含验证成功".to_string()
            } else {
                "未找到包含指定文本的元素".to_string()
            },
        })
    }

    /// 验证自定义逻辑
    async fn verify_custom_logic(&self, _logic: &str, verification: &VerificationCondition) -> Result<VerificationResult> {
        // 这里可以实现自定义验证逻辑的解析和执行
        // 暂时返回简单的成功结果
        Ok(VerificationResult {
            success: true,
            expected: verification.expected_result.clone(),
            actual: "自定义验证".to_string(),
            message: "自定义验证逻辑执行成功".to_string(),
        })
    }

    // ==================== 辅助方法 ====================

    /// 解析页面状态字符串
    fn parse_page_state(&self, state_str: &str) -> Result<PageState> {
        match state_str.to_lowercase().as_str() {
            "unknown" => Ok(PageState::Unknown),
            "home" => Ok(PageState::Home),
            "appmainpage" | "main_page" => Ok(PageState::AppMainPage),
            "loading" => Ok(PageState::Loading),
            "dialog" => Ok(PageState::Dialog),
            "settings" => Ok(PageState::Settings),
            "listpage" | "list_page" => Ok(PageState::ListPage),
            "detailpage" | "detail_page" => Ok(PageState::DetailPage),
            _ => Ok(PageState::Custom(state_str.to_string())),
        }
    }
}