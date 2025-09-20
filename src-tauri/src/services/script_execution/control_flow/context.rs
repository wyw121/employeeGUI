/// 模块四：执行上下文管理器
/// 
/// 职责：
/// - 管理脚本执行的全局状态
/// - 提供变量作用域管理
/// - 跟踪执行栈和调用链
/// - 支持条件判断的上下文传递

use anyhow::Result;
use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use tracing::{info, debug};

/// 执行上下文管理器
#[derive(Debug, Clone)]
pub struct ExecutionContext {
    /// 全局变量存储
    global_variables: HashMap<String, ContextVariable>,
    
    /// 执行栈（支持嵌套作用域）
    execution_stack: Vec<ExecutionScope>,
    
    /// 执行统计信息
    stats: ExecutionStats,
    
    /// 上下文配置
    config: ContextConfig,
}

/// 执行作用域
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ExecutionScope {
    /// 作用域ID
    pub scope_id: String,
    
    /// 作用域类型
    pub scope_type: ScopeType,
    
    /// 作用域级别的变量
    pub local_variables: HashMap<String, ContextVariable>,
    
    /// 创建时间
    pub created_at: i64,
    
    /// 父作用域ID
    pub parent_scope_id: Option<String>,
}

/// 作用域类型
#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum ScopeType {
    /// 全局作用域
    Global,
    
    /// 循环作用域
    Loop {
        loop_id: String,
        current_iteration: i32,
        max_iterations: i32,
    },
    
    /// 条件分支作用域
    Conditional {
        condition_id: String,
        branch_name: String,
        condition_result: bool,
    },
    
    /// 异常处理作用域
    TryCatch {
        try_id: String,
        in_catch_block: bool,
    },
    
    /// 函数调用作用域（未来扩展）
    Function {
        function_name: String,
        parameters: HashMap<String, ContextVariable>,
    },
}

/// 上下文变量
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ContextVariable {
    /// 变量名
    pub name: String,
    
    /// 变量值
    pub value: serde_json::Value,
    
    /// 变量类型
    pub var_type: VariableType,
    
    /// 是否为只读
    pub readonly: bool,
    
    /// 变量来源
    pub source: VariableSource,
    
    /// 创建时间
    pub created_at: i64,
    
    /// 最后修改时间
    pub modified_at: i64,
}

/// 变量类型
#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum VariableType {
    String,
    Number,
    Boolean,
    Array,
    Object,
    Null,
}

/// 变量来源
#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum VariableSource {
    /// 用户定义
    UserDefined,
    
    /// 系统内置
    SystemBuiltin,
    
    /// 步骤执行结果
    StepResult {
        step_id: String,
        result_key: String,
    },
    
    /// 循环迭代器
    LoopIterator {
        loop_id: String,
    },
    
    /// 条件评估结果
    ConditionalResult {
        condition_id: String,
    },
}

/// 上下文配置
#[derive(Debug, Clone)]
pub struct ContextConfig {
    /// 最大变量数量
    pub max_variables: usize,
    
    /// 最大作用域深度
    pub max_scope_depth: usize,
    
    /// 是否启用变量追踪
    pub enable_variable_tracking: bool,
    
    /// 变量生存期（毫秒）
    pub variable_ttl_ms: Option<u64>,
}

/// 执行统计信息
#[derive(Debug, Clone, Default, Serialize, Deserialize)]
pub struct ExecutionStats {
    /// 创建的作用域数量
    pub scopes_created: i32,
    
    /// 管理的变量数量
    pub variables_managed: i32,
    
    /// 变量访问次数
    pub variable_accesses: i64,
    
    /// 作用域切换次数
    pub scope_switches: i64,
}

impl ExecutionContext {
    /// 创建新的执行上下文
    pub fn new() -> Self {
        let mut context = Self {
            global_variables: HashMap::new(),
            execution_stack: Vec::new(),
            stats: ExecutionStats::default(),
            config: ContextConfig::default(),
        };
        
        // 创建全局作用域
        let global_scope = ExecutionScope {
            scope_id: "global".to_string(),
            scope_type: ScopeType::Global,
            local_variables: HashMap::new(),
            created_at: chrono::Utc::now().timestamp_millis(),
            parent_scope_id: None,
        };
        
        context.execution_stack.push(global_scope);
        context.stats.scopes_created += 1;
        
        info!("🎯 执行上下文已创建");
        
        context
    }
    
    /// 使用自定义配置创建上下文
    pub fn with_config(config: ContextConfig) -> Self {
        let mut context = Self::new();
        context.config = config;
        context
    }
    
    /// 进入新的作用域
    pub fn enter_scope(&mut self, scope_type: ScopeType) -> Result<String> {
        let scope_id = format!("scope_{}_{}", self.stats.scopes_created, chrono::Utc::now().timestamp_millis());
        let parent_scope_id = self.current_scope().map(|s| s.scope_id.clone());
        
        let new_scope = ExecutionScope {
            scope_id: scope_id.clone(),
            scope_type: scope_type.clone(),
            local_variables: HashMap::new(),
            created_at: chrono::Utc::now().timestamp_millis(),
            parent_scope_id,
        };
        
        self.execution_stack.push(new_scope);
        self.stats.scopes_created += 1;
        self.stats.scope_switches += 1;
        
        debug!("🔄 进入新作用域: {} ({:?})", scope_id, scope_type);
        
        // 检查作用域深度限制
        if self.execution_stack.len() > self.config.max_scope_depth {
            return Err(anyhow::anyhow!(
                "作用域深度超过限制: {} > {}",
                self.execution_stack.len(),
                self.config.max_scope_depth
            ));
        }
        
        Ok(scope_id)
    }
    
    /// 退出当前作用域
    pub fn exit_scope(&mut self) -> Result<ExecutionScope> {
        if self.execution_stack.len() <= 1 {
            return Err(anyhow::anyhow!("不能退出全局作用域"));
        }
        
        let exited_scope = self.execution_stack.pop()
            .ok_or_else(|| anyhow::anyhow!("执行栈为空"))?;
        
        self.stats.scope_switches += 1;
        
        debug!("🔙 退出作用域: {}", exited_scope.scope_id);
        
        Ok(exited_scope)
    }
    
    /// 获取当前作用域
    pub fn current_scope(&self) -> Option<&ExecutionScope> {
        self.execution_stack.last()
    }
    
    /// 获取当前作用域（可变引用）
    pub fn current_scope_mut(&mut self) -> Option<&mut ExecutionScope> {
        self.execution_stack.last_mut()
    }
    
    /// 获取当前深度
    pub fn current_depth(&self) -> i32 {
        self.execution_stack.len() as i32
    }
    
    /// 设置变量
    pub fn set_variable(&mut self, name: String, value: serde_json::Value, source: VariableSource) -> Result<()> {
        let var_type = Self::infer_variable_type(&value);
        let now = chrono::Utc::now().timestamp_millis();
        
        let variable = ContextVariable {
            name: name.clone(),
            value: value.clone(),
            var_type,
            readonly: false,
            source,
            created_at: now,
            modified_at: now,
        };
        
        // 检查变量数量限制
        let total_vars = self.global_variables.len() + 
            self.execution_stack.iter().map(|s| s.local_variables.len()).sum::<usize>();
        
        if total_vars >= self.config.max_variables {
            return Err(anyhow::anyhow!(
                "变量数量超过限制: {} >= {}",
                total_vars,
                self.config.max_variables
            ));
        }
        
        // 在当前作用域设置变量
        if let Some(current_scope) = self.current_scope_mut() {
            current_scope.local_variables.insert(name.clone(), variable);
        } else {
            self.global_variables.insert(name.clone(), variable);
        }
        
        self.stats.variables_managed += 1;
        
        debug!("📝 设置变量: {} = {:?}", name, &value);
        
        Ok(())
    }
    
    /// 获取变量值
    pub fn get_variable(&mut self, name: &str) -> Option<&ContextVariable> {
        self.stats.variable_accesses += 1;
        
        // 从当前作用域向上搜索
        for scope in self.execution_stack.iter().rev() {
            if let Some(var) = scope.local_variables.get(name) {
                return Some(var);
            }
        }
        
        // 搜索全局变量
        self.global_variables.get(name)
    }
    
    /// 删除变量
    pub fn remove_variable(&mut self, name: &str) -> bool {
        // 先尝试从当前作用域删除
        if let Some(current_scope) = self.current_scope_mut() {
            if current_scope.local_variables.remove(name).is_some() {
                debug!("🗑️ 从当前作用域删除变量: {}", name);
                return true;
            }
        }
        
        // 从全局变量删除
        if self.global_variables.remove(name).is_some() {
            debug!("🗑️ 从全局作用域删除变量: {}", name);
            return true;
        }
        
        false
    }
    
    /// 清理过期变量
    pub fn cleanup_expired_variables(&mut self) {
        if let Some(ttl) = self.config.variable_ttl_ms {
            let now = chrono::Utc::now().timestamp_millis();
            let cutoff = now - ttl as i64;
            
            // 清理全局变量
            self.global_variables.retain(|_, var| var.created_at > cutoff);
            
            // 清理作用域变量
            for scope in &mut self.execution_stack {
                scope.local_variables.retain(|_, var| var.created_at > cutoff);
            }
        }
    }
    
    /// 获取所有可见变量
    pub fn get_all_visible_variables(&self) -> HashMap<String, &ContextVariable> {
        let mut variables = HashMap::new();
        
        // 添加全局变量
        for (name, var) in &self.global_variables {
            variables.insert(name.clone(), var);
        }
        
        // 从底层到顶层添加作用域变量（顶层覆盖底层）
        for scope in &self.execution_stack {
            for (name, var) in &scope.local_variables {
                variables.insert(name.clone(), var);
            }
        }
        
        variables
    }
    
    /// 获取执行统计信息
    pub fn get_stats(&self) -> &ExecutionStats {
        &self.stats
    }
    
    /// 推断变量类型
    fn infer_variable_type(value: &serde_json::Value) -> VariableType {
        match value {
            serde_json::Value::Null => VariableType::Null,
            serde_json::Value::Bool(_) => VariableType::Boolean,
            serde_json::Value::Number(_) => VariableType::Number,
            serde_json::Value::String(_) => VariableType::String,
            serde_json::Value::Array(_) => VariableType::Array,
            serde_json::Value::Object(_) => VariableType::Object,
        }
    }
}

impl Default for ContextConfig {
    fn default() -> Self {
        Self {
            max_variables: 1000,
            max_scope_depth: 20,
            enable_variable_tracking: true,
            variable_ttl_ms: Some(3600_000), // 1小时
        }
    }
}

impl Default for ExecutionContext {
    fn default() -> Self {
        Self::new()
    }
}

/// 循环作用域便利构造器
impl ExecutionContext {
    /// 进入循环作用域
    pub fn enter_loop_scope(&mut self, loop_id: String, max_iterations: i32) -> Result<String> {
        let scope_type = ScopeType::Loop {
            loop_id,
            current_iteration: 0,
            max_iterations,
        };
        
        self.enter_scope(scope_type)
    }
    
    /// 更新循环迭代次数
    pub fn update_loop_iteration(&mut self, iteration: i32) -> Result<()> {
        if let Some(current_scope) = self.current_scope_mut() {
            if let ScopeType::Loop { current_iteration, .. } = &mut current_scope.scope_type {
                *current_iteration = iteration;
                
                // 更新循环迭代器变量
                let iterator_var = ContextVariable {
                    name: "__loop_iteration".to_string(),
                    value: serde_json::Value::Number(serde_json::Number::from(iteration)),
                    var_type: VariableType::Number,
                    readonly: true,
                    source: VariableSource::LoopIterator {
                        loop_id: match &current_scope.scope_type {
                            ScopeType::Loop { loop_id, .. } => loop_id.clone(),
                            _ => "unknown".to_string(),
                        },
                    },
                    created_at: chrono::Utc::now().timestamp_millis(),
                    modified_at: chrono::Utc::now().timestamp_millis(),
                };
                
                current_scope.local_variables.insert("__loop_iteration".to_string(), iterator_var);
                
                return Ok(());
            }
        }
        
        Err(anyhow::anyhow!("当前作用域不是循环作用域"))
    }
}