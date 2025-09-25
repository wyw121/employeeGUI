/// 模块二：控制流解析器
/// 
/// 职责：
/// - 将线性步骤列表解析为控制流AST
/// - 识别各种控制结构的边界
/// - 处理嵌套控制结构
/// - 验证控制流的正确性

use anyhow::{Result, anyhow};
use std::collections::HashMap;
use tracing::{info, warn, error};

use crate::services::execution::model::{SmartScriptStep, SmartActionType};
use super::ast::{ControlFlowNode, ControlFlowType, ExecutionPlan, LinearStep, StepContext, ExecutionStats, ControlStructureCount, ComplexityRating};

/// 控制流解析器
pub struct ControlFlowParser {
    /// 解析配置
    config: ParserConfig,
    
    /// 解析统计
    stats: ParsingStats,
}

/// 解析器配置
#[derive(Debug, Clone)]
pub struct ParserConfig {
    /// 是否启用嵌套验证
    pub validate_nesting: bool,
    
    /// 是否启用性能优化
    pub enable_optimization: bool,
    
    /// 最大嵌套深度限制
    pub max_nesting_depth: i32,
    
    /// 是否允许未匹配的控制结构
    pub allow_unmatched_structures: bool,
}

/// 解析统计信息
#[derive(Debug, Clone, Default)]
pub struct ParsingStats {
    /// 解析的控制结构数量
    pub structures_parsed: i32,
    
    /// 发现的嵌套层级
    pub max_nesting_found: i32,
    
    /// 解析错误数量
    pub parsing_errors: i32,
    
    /// 解析警告数量
    pub parsing_warnings: i32,
}

/// 控制结构边界信息
#[derive(Debug, Clone)]
struct ControlBoundary {
    /// 结构类型
    structure_type: ControlStructureType,
    
    /// 开始位置
    start_index: usize,
    
    /// 结束位置
    end_index: Option<usize>,
    
    /// 结构参数
    parameters: HashMap<String, serde_json::Value>,
    
    /// 唯一标识
    id: String,
}

/// 控制结构类型枚举
#[derive(Debug, Clone, PartialEq)]
enum ControlStructureType {
    Loop,
    Conditional,
    TryCatch,
    Parallel,
}

impl ControlFlowParser {
    /// 创建新的解析器实例
    pub fn new() -> Self {
        Self {
            config: ParserConfig::default(),
            stats: ParsingStats::default(),
        }
    }
    
    /// 使用自定义配置创建解析器
    pub fn with_config(config: ParserConfig) -> Self {
        Self {
            config,
            stats: ParsingStats::default(),
        }
    }
    
    /// 将线性步骤列表解析为控制流AST
    pub fn parse_to_ast(&mut self, steps: Vec<SmartScriptStep>) -> Result<ControlFlowNode> {
        info!("🔍 开始解析控制流，步骤数量: {}", steps.len());
        
        self.stats = ParsingStats::default();
        
        // 1. 识别所有控制结构边界
        let boundaries = self.identify_control_boundaries(&steps)?;
        
        // 2. 验证控制结构的正确性
        self.validate_control_structures(&boundaries)?;
        
        // 3. 构建嵌套的AST结构
    let ast = self.build_ast_from_boundaries(&steps, &boundaries, 0, steps.len())?;
        
        info!("✅ 控制流解析完成，统计信息: {:?}", self.stats);
        
        Ok(ast)
    }
    
    /// 将AST线性化为执行计划
    pub fn linearize_ast(&self, ast: &ControlFlowNode) -> Result<ExecutionPlan> {
        info!("📋 开始线性化AST为执行计划");
        
        let mut linear_steps = Vec::new();
        let mut nesting_level = 0;
        let mut loop_stack: Vec<i32> = Vec::new();
        
        self.linearize_node(ast, &mut linear_steps, &mut nesting_level, &mut loop_stack)?;
        
        // 计算执行统计信息
        let stats = self.calculate_execution_stats(&linear_steps);
        
        let plan = ExecutionPlan {
            linear_steps,
            stats,
        };
        
        info!("✅ AST线性化完成，总步骤数: {}", plan.stats.total_steps);
        
        Ok(plan)
    }
    
    /// 识别控制结构边界
    fn identify_control_boundaries(&mut self, steps: &[SmartScriptStep]) -> Result<Vec<ControlBoundary>> {
        let mut boundaries = Vec::new();
        let mut boundary_stack = Vec::new();
        
        for (i, step) in steps.iter().enumerate() {
            match step.step_type {
                SmartActionType::LoopStart => {
                    let loop_id = self.extract_control_id(&step.parameters, "loop_id")?;
                    let parameters = self.extract_parameters(&step.parameters)?;
                    
                    let boundary = ControlBoundary {
                        structure_type: ControlStructureType::Loop,
                        start_index: i,
                        end_index: None,
                        parameters,
                        id: loop_id,
                    };
                    
                    boundary_stack.push(boundaries.len());
                    boundaries.push(boundary);
                    self.stats.structures_parsed += 1;
                }
                
                SmartActionType::LoopEnd => {
                    let loop_id = self.extract_control_id(&step.parameters, "loop_id")?;
                    
                    // 找到匹配的循环开始
                    if let Some(boundary_index) = boundary_stack.pop() {
                        if boundaries[boundary_index].id == loop_id {
                            boundaries[boundary_index].end_index = Some(i);
                        } else {
                            return Err(anyhow!("循环结构不匹配: 期望 {}, 找到 {}", 
                                             boundaries[boundary_index].id, loop_id));
                        }
                    } else {
                        if !self.config.allow_unmatched_structures {
                            return Err(anyhow!("发现未匹配的循环结束: {}", loop_id));
                        }
                        self.stats.parsing_warnings += 1;
                    }
                }
                
                // 未来扩展：条件判断
                // SmartActionType::IfStart => { ... }
                // SmartActionType::IfEnd => { ... }
                
                _ => {
                    // 普通步骤，无需处理
                }
            }
        }
        
        // 检查是否有未关闭的控制结构
        if !boundary_stack.is_empty() && !self.config.allow_unmatched_structures {
            return Err(anyhow!("发现 {} 个未关闭的控制结构", boundary_stack.len()));
        }
        
        info!("🎯 识别到 {} 个控制结构边界", boundaries.len());
        
        Ok(boundaries)
    }
    
    /// 验证控制结构的正确性
    fn validate_control_structures(&mut self, boundaries: &[ControlBoundary]) -> Result<()> {
        if !self.config.validate_nesting {
            return Ok(());
        }
        
        // 检查嵌套深度
        let max_depth = self.calculate_max_nesting_depth(boundaries);
        self.stats.max_nesting_found = max_depth;
        
        if max_depth > self.config.max_nesting_depth {
            warn!("嵌套深度 {} 超过限制 {}", max_depth, self.config.max_nesting_depth);
            return Err(anyhow!("嵌套深度超过限制: {}", max_depth));
        }
        
        // 检查控制结构的完整性
        for boundary in boundaries {
            if boundary.end_index.is_none() {
                self.stats.parsing_errors += 1;
                return Err(anyhow!("控制结构 {} 缺少结束标记", boundary.id));
            }
        }
        
        Ok(())
    }
    
    /// 从边界信息构建AST
    fn build_ast_from_boundaries(
        &self, 
        steps: &[SmartScriptStep], 
        boundaries: &[ControlBoundary], 
        start_index: usize,
        stop_index: usize
    ) -> Result<ControlFlowNode> {
        let mut current_index = start_index;
        let mut children = Vec::new();
        let mut sequential_steps = Vec::new();
        
        // 限定扫描范围，确保在循环体内不会越界到上层的 LoopEnd
        while current_index < steps.len() && current_index < stop_index {
            // 检查当前位置是否是控制结构的开始
            if let Some(boundary) = boundaries.iter().find(|b| b.start_index == current_index) {
                // 如果有积累的顺序步骤，先创建顺序节点
                if !sequential_steps.is_empty() {
                    let seq_node = ControlFlowNode::sequential(
                        format!("seq_{}", children.len()),
                        "Sequential Block".to_string(),
                        sequential_steps.clone()
                    );
                    children.push(seq_node);
                    sequential_steps.clear();
                }
                
                // 处理控制结构
                let control_node = self.build_control_structure_node(steps, boundary, boundaries)?;
                children.push(control_node);
                
                // 跳过整个控制结构
                current_index = boundary.end_index.unwrap() + 1;
            } else {
                // 检查是否是传入边界集合中的结束标记
                if boundaries.iter().any(|b| b.end_index == Some(current_index)) {
                    break;
                }
                
                // 普通步骤，添加到顺序执行列表
                // 显式过滤控制结构标记，防止误加入
                match steps[current_index].step_type {
                    SmartActionType::LoopStart | SmartActionType::LoopEnd => {
                        // 忽略控制结构标记
                    }
                    _ => sequential_steps.push(steps[current_index].clone()),
                }
                current_index += 1;
            }
        }
        
        // 处理剩余的顺序步骤
        if !sequential_steps.is_empty() {
            let seq_node = ControlFlowNode::sequential(
                format!("seq_{}", children.len()),
                "Sequential Block".to_string(),
                sequential_steps
            );
            children.push(seq_node);
        }
        
        // 如果只有一个子节点，直接返回它
        if children.len() == 1 {
            Ok(children.into_iter().next().unwrap())
        } else {
            // 创建根节点并挂载所有子节点（避免返回空的顺序节点导致线性化为0步）
            let mut root = ControlFlowNode::sequential(
                "root".to_string(),
                "Root Node".to_string(),
                vec![]
            );
            root.children = children;
            Ok(root)
        }
    }
    
    /// 构建具体的控制结构节点
    fn build_control_structure_node(
        &self, 
        steps: &[SmartScriptStep], 
        boundary: &ControlBoundary, 
        all_boundaries: &[ControlBoundary]
    ) -> Result<ControlFlowNode> {
        match boundary.structure_type {
            ControlStructureType::Loop => {
                let iterations = boundary.parameters.get("loop_count")
                    .and_then(|v| v.as_i64())
                    .unwrap_or(3) as i32;
                
                let is_infinite = boundary.parameters.get("is_infinite_loop")
                    .and_then(|v| v.as_bool())
                    .unwrap_or(false);
                
                // 构建循环体内的子节点
                let loop_body_start = boundary.start_index + 1;
                let loop_body_end = boundary.end_index.unwrap();
                
                let child_boundaries: Vec<ControlBoundary> = all_boundaries.iter()
                    .filter(|b| b.start_index > boundary.start_index && b.start_index < loop_body_end)
                    .cloned()
                    .collect();
                
                let loop_body = if child_boundaries.is_empty() {
                    // 简单循环：只包含顺序步骤
                    let body_steps = steps[loop_body_start..loop_body_end].to_vec();
                    vec![ControlFlowNode::sequential(
                        format!("{}_body", boundary.id),
                        "Loop Body".to_string(),
                        body_steps
                    )]
                } else {
                    // 复杂循环：包含嵌套控制结构
                    vec![self.build_ast_from_boundaries(steps, &child_boundaries, loop_body_start, loop_body_end)?]
                };
                
                Ok(ControlFlowNode::loop_node(
                    boundary.id.clone(),
                    format!("Loop {}", boundary.id),
                    iterations,
                    is_infinite,
                    loop_body
                ))
            }
            
            // 未来扩展其他控制结构
            _ => {
                Err(anyhow!("不支持的控制结构类型: {:?}", boundary.structure_type))
            }
        }
    }
    
    /// 线性化AST节点
    fn linearize_node(
        &self, 
        node: &ControlFlowNode, 
        linear_steps: &mut Vec<LinearStep>, 
        nesting_level: &mut i32,
        loop_stack: &mut Vec<i32>
    ) -> Result<()> {
        *nesting_level += 1;
        
        match &node.flow_type {
            ControlFlowType::Sequential => {
                for step in &node.steps {
                    // 根据循环迭代栈生成稳定的后缀，确保跨多层循环时ID唯一
                    let mut modified_step = step.clone();
                    if !loop_stack.is_empty() {
                        let id_suffix = loop_stack
                            .iter()
                            .map(|i| format!("__iter_{}", i))
                            .collect::<String>();
                        modified_step.id = format!("{}{}", modified_step.id, id_suffix);
                        // 名称保持兼容：显示最近一层的迭代计数
                        if let Some(last) = loop_stack.last() {
                            modified_step.name = format!("{} (第{}次)", modified_step.name, last);
                        }
                    }

                    let linear_step = LinearStep {
                        step: modified_step,
                        context: StepContext {
                            source_node_id: node.id.clone(),
                            loop_iteration: loop_stack.last().cloned(),
                            conditional_path: None,
                            nesting_level: *nesting_level,
                        },
                    };
                    linear_steps.push(linear_step);
                }
                
                // 处理子节点
                for child in &node.children {
                    self.linearize_node(child, linear_steps, nesting_level, loop_stack)?;
                }
            }
            
            ControlFlowType::Loop { iterations, is_infinite, .. } => {
                let iter_count = if *is_infinite { 1000 } else { *iterations };
                
                for iteration in 1..=iter_count {
                    // 入栈当前迭代次数
                    loop_stack.push(iteration);
                    for child in &node.children {
                        // 在当前迭代上下文中线性化子节点
                        self.linearize_node(child, linear_steps, nesting_level, loop_stack)?;
                    }
                    // 出栈
                    loop_stack.pop();
                }
            }
            
            // 未来扩展其他控制结构
            _ => {
                return Err(anyhow!("不支持的控制流类型线性化: {:?}", node.flow_type));
            }
        }
        
        *nesting_level -= 1;
        Ok(())
    }
    
    /// 线性化循环迭代
    // 已移除旧的 linearize_loop_iteration；逻辑合并至 linearize_node + loop_stack
    
    /// 工具方法：提取控制结构ID
    fn extract_control_id(&self, parameters: &serde_json::Value, key: &str) -> Result<String> {
        parameters.get(key)
            .and_then(|v| v.as_str())
            .map(|s| s.to_string())
            .ok_or_else(|| anyhow!("缺少控制结构ID: {}", key))
    }
    
    /// 工具方法：提取参数映射
    fn extract_parameters(&self, parameters: &serde_json::Value) -> Result<HashMap<String, serde_json::Value>> {
        parameters.as_object()
            .map(|obj| obj.iter().map(|(k, v)| (k.clone(), v.clone())).collect())
            .ok_or_else(|| anyhow!("参数格式错误"))
    }
    
    /// 计算最大嵌套深度
    fn calculate_max_nesting_depth(&self, boundaries: &[ControlBoundary]) -> i32 {
        let mut max_depth = 0;
        let mut current_depth = 0;
        let mut events = Vec::new();
        
        // 收集所有开始和结束事件
        for boundary in boundaries {
            events.push((boundary.start_index, 1)); // 开始事件
            if let Some(end_index) = boundary.end_index {
                events.push((end_index, -1)); // 结束事件
            }
        }
        
        // 按位置排序
        events.sort_by_key(|&(index, _)| index);
        
        // 计算嵌套深度
        for (_, delta) in events {
            current_depth += delta;
            max_depth = max_depth.max(current_depth);
        }
        
        max_depth
    }
    
    /// 计算执行统计信息
    fn calculate_execution_stats(&self, linear_steps: &[LinearStep]) -> ExecutionStats {
        let mut loop_count = 0;
        let conditional_count = 0;
        let mut max_nesting = 0;
        
        for step in linear_steps {
            max_nesting = max_nesting.max(step.context.nesting_level);
            if step.context.loop_iteration.is_some() {
                loop_count += 1;
            }
        }
        
        let complexity_rating = if max_nesting <= 1 {
            ComplexityRating::Simple
        } else if max_nesting <= 3 {
            ComplexityRating::Moderate
        } else if max_nesting <= 5 {
            ComplexityRating::Complex
        } else {
            ComplexityRating::Advanced
        };
        
        ExecutionStats {
            total_steps: linear_steps.len(),
            control_structure_count: ControlStructureCount {
                loops: loop_count / 1000, // 大致估算循环数量
                conditionals: conditional_count,
                try_catches: 0,
                parallels: 0,
            },
            estimated_duration_ms: (linear_steps.len() as u64) * 500, // 假设每步500ms
            complexity_rating,
        }
    }
}

impl Default for ParserConfig {
    fn default() -> Self {
        Self {
            validate_nesting: true,
            enable_optimization: true,
            max_nesting_depth: 10,
            allow_unmatched_structures: false,
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::services::execution::model::{SmartScriptStep, SmartActionType};

    fn step(id: &str, name: &str, step_type: SmartActionType, params: serde_json::Value) -> SmartScriptStep {
        SmartScriptStep {
            id: id.to_string(),
            step_type,
            name: name.to_string(),
            description: String::new(),
            parameters: params,
            enabled: true,
            order: 0,
        }
    }

    #[test]
    fn linearize_simple_flow_with_loop_should_produce_steps() {
        let mut parser = ControlFlowParser::new();

        // 构造：普通 → 循环(2次，含1步) → 普通
        let mut steps: Vec<SmartScriptStep> = Vec::new();

        // 普通步骤（循环前）
        steps.push(step(
            "s1",
            "普通A",
            SmartActionType::Tap,
            serde_json::json!({"x": 10, "y": 10}),
        ));

        // 循环开始
        steps.push(step(
            "loop_start",
            "循环开始",
            SmartActionType::LoopStart,
            serde_json::json!({
                "loop_id": "L1",
                "loop_count": 2,
                "is_infinite_loop": false
            }),
        ));

        // 循环体内 1 步
        steps.push(step(
            "find1",
            "智能查找",
            SmartActionType::SmartFindElement,
            serde_json::json!({
                "matching": {
                    "strategy": "standard",
                    "fields": ["text"],
                    "values": {"text": "关注"}
                }
            }),
        ));

        // 循环结束
        steps.push(step(
            "loop_end",
            "循环结束",
            SmartActionType::LoopEnd,
            serde_json::json!({"loop_id": "L1"}),
        ));

        // 普通步骤（循环后）
        steps.push(step(
            "s2",
            "普通B",
            SmartActionType::Wait,
            serde_json::json!({"ms": 300}),
        ));

        let ast = parser.parse_to_ast(steps).expect("parse ast");
        let plan = parser.linearize_ast(&ast).expect("linearize ast");

        // 期望：普通A(1) + 循环体1步 * 2次(2) + 普通B(1) = 4
        assert_eq!(plan.stats.total_steps, 4, "线性化步骤数应为 4");
    }

    #[test]
    fn linearize_no_control_structures_should_keep_count() {
        let mut parser = ControlFlowParser::new();
        let steps = vec![
            step(
                "a",
                "点A",
                SmartActionType::Tap,
                serde_json::json!({"x":1,"y":1}),
            ),
            step(
                "b",
                "点B",
                SmartActionType::Tap,
                serde_json::json!({"x":2,"y":2}),
            ),
        ];

        let ast = parser.parse_to_ast(steps).expect("parse ast");
        let plan = parser.linearize_ast(&ast).expect("linearize ast");
        assert_eq!(plan.stats.total_steps, 2, "应保留原有步骤数");
    }

    #[test]
    fn linearize_nested_loops_should_expand_properly() {
        let mut parser = ControlFlowParser::new();

        // 构造：外层循环(2次)
        //        内层循环(3次)
        //           动作A, 动作B  (共2步)
        let mut steps: Vec<SmartScriptStep> = Vec::new();

        // 外层 LoopStart
        steps.push(step(
            "outer_start",
            "循环开始(外)",
            SmartActionType::LoopStart,
            serde_json::json!({
                "loop_id": "OUTER",
                "loop_count": 2,
                "is_infinite_loop": false
            }),
        ));

        // 内层 LoopStart
        steps.push(step(
            "inner_start",
            "循环开始(内)",
            SmartActionType::LoopStart,
            serde_json::json!({
                "loop_id": "INNER",
                "loop_count": 3,
                "is_infinite_loop": false
            }),
        ));

        // 循环体动作A
        steps.push(step(
            "act_a",
            "动作A",
            SmartActionType::Tap,
            serde_json::json!({"x": 10, "y": 10}),
        ));

        // 循环体动作B
        steps.push(step(
            "act_b",
            "动作B",
            SmartActionType::Wait,
            serde_json::json!({"ms": 100}),
        ));

        // 内层 LoopEnd
        steps.push(step(
            "inner_end",
            "循环结束(内)",
            SmartActionType::LoopEnd,
            serde_json::json!({"loop_id": "INNER"}),
        ));

        // 外层 LoopEnd
        steps.push(step(
            "outer_end",
            "循环结束(外)",
            SmartActionType::LoopEnd,
            serde_json::json!({"loop_id": "OUTER"}),
        ));

        let ast = parser.parse_to_ast(steps).expect("parse ast");
        let plan = parser.linearize_ast(&ast).expect("linearize ast");

        // 期望展开：外2次 * 内3次 * 2步 = 12 步
        assert_eq!(plan.stats.total_steps, 12, "嵌套循环应正确展开为 12 步");

        // 额外校验：ID 后缀应包含两层 __iter_ 前后顺序稳定
        let ids: Vec<String> = plan.linear_steps.iter().map(|ls| ls.step.id.clone()).collect();
        let names: Vec<String> = plan.linear_steps.iter().map(|ls| ls.step.name.clone()).collect();
        
        // 打印详细的展开结果，验证执行顺序
        println!("=== 嵌套循环线性化结果 ===");
        for (i, linear_step) in plan.linear_steps.iter().enumerate() {
            println!("步骤 {}: ID='{}', 名称='{}'", 
                i + 1, 
                linear_step.step.id, 
                linear_step.step.name
            );
        }

        assert!(ids.iter().all(|id| id.contains("__iter_")), "线性化后的ID应包含迭代后缀");
        
        // 验证执行顺序：外循环第1次的内循环应完全执行完3次，然后才是外循环第2次
        let expected_sequence = vec![
            "act_a__iter_1__iter_1", "act_b__iter_1__iter_1", // 外1内1
            "act_a__iter_1__iter_2", "act_b__iter_1__iter_2", // 外1内2
            "act_a__iter_1__iter_3", "act_b__iter_1__iter_3", // 外1内3
            "act_a__iter_2__iter_1", "act_b__iter_2__iter_1", // 外2内1
            "act_a__iter_2__iter_2", "act_b__iter_2__iter_2", // 外2内2
            "act_a__iter_2__iter_3", "act_b__iter_2__iter_3", // 外2内3
        ];
        
        for (i, expected_id) in expected_sequence.iter().enumerate() {
            assert_eq!(ids[i], *expected_id, "步骤 {} 的ID不匹配，期望: {}, 实际: {}", 
                i + 1, expected_id, ids[i]);
        }
        
        println!("嵌套循环执行顺序验证通过！");
    }
}