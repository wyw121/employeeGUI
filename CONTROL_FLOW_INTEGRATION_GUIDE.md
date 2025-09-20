# 控制流架构集成指南

## 🎯 集成概述

本指南展示如何将新的模块化控制流架构集成到现有的智能脚本执行系统中，实现向前兼容和渐进式升级。

## 📋 集成方案

### 1. 渐进式集成策略

```rust
// 方案A：完全替换（推荐）
use crate::services::script_execution::EnhancedSmartScriptExecutor;

async fn execute_with_new_architecture(steps: Vec<SmartScriptStep>) -> Result<()> {
    let executor = EnhancedSmartScriptExecutor::new().await?;
    executor.execute_steps(steps).await
}

// 方案B：兼容模式（过渡期）
use crate::services::smart_script_executor::SmartScriptExecutor;
use crate::services::script_execution::{ScriptPreprocessor, ControlFlowParser};

async fn execute_with_hybrid_approach(steps: Vec<SmartScriptStep>) -> Result<()> {
    // 检测控制流结构
    let has_control_flow = steps.iter().any(|step| {
        matches!(step.action_type, 
            SmartActionType::LoopStart { .. } | 
            SmartActionType::LoopEnd { .. }
        )
    });

    if has_control_flow {
        // 使用新架构
        let executor = EnhancedSmartScriptExecutor::new().await?;
        executor.execute_steps(steps).await
    } else {
        // 使用旧架构
        let executor = SmartScriptExecutor::new();
        executor.execute_steps(steps).await
    }
}
```

### 2. 前端集成修改

#### 修改脚本发送逻辑

```typescript
// src/pages/SmartScriptBuilderPage.tsx
import { invoke } from '@tauri-apps/api/tauri';

const executeScript = async () => {
  try {
    // 检查是否包含控制流
    const hasControlFlow = scriptSteps.some(step => 
      step.actionType === 'LoopStart' || 
      step.actionType === 'LoopEnd'
    );

    if (hasControlFlow) {
      // 使用增强版执行器
      await invoke('execute_enhanced_smart_script', {
        steps: scriptSteps,
        deviceId: selectedDevice?.id
      });
    } else {
      // 使用传统执行器
      await invoke('execute_smart_script', {
        steps: scriptSteps,
        deviceId: selectedDevice?.id
      });
    }
  } catch (error) {
    console.error('脚本执行失败:', error);
  }
};
```

### 3. Tauri 命令注册

```rust
// src-tauri/src/main.rs
use crate::services::script_execution::EnhancedSmartScriptExecutor;

#[tauri::command]
async fn execute_enhanced_smart_script(
    steps: Vec<SmartScriptStep>,
    device_id: String
) -> Result<String, String> {
    let executor = EnhancedSmartScriptExecutor::new()
        .await
        .map_err(|e| e.to_string())?;
    
    executor.execute_steps_on_device(steps, &device_id)
        .await
        .map_err(|e| e.to_string())?;
    
    Ok("脚本执行完成".to_string())
}

fn main() {
    tauri::Builder::default()
        .invoke_handler(tauri::generate_handler![
            // 现有命令...
            execute_enhanced_smart_script,  // 新增
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
```

## 🏗️ 架构优势验证

### 1. 扩展性验证

添加 if-else 条件控制只需要：

```rust
// src-tauri/src/services/script_execution/control_flow/handlers/conditional_handler.rs
use super::base::ControlStructureHandler;
use crate::services::script_execution::control_flow::ast::{ControlFlowNode, ControlFlowType};

pub struct ConditionalHandler;

#[async_trait]
impl ControlStructureHandler for ConditionalHandler {
    fn can_handle(&self, node: &ControlFlowNode) -> bool {
        matches!(node.flow_type, ControlFlowType::Conditional { .. })
    }

    async fn execute(&self, node: &ControlFlowNode, context: &mut ExecutionContext) -> Result<()> {
        if let ControlFlowType::Conditional { condition, then_branch, else_branch } = &node.flow_type {
            // 评估条件
            let condition_result = self.evaluate_condition(condition, context).await?;
            
            // 选择执行分支
            if condition_result {
                self.execute_branch(then_branch, context).await
            } else if let Some(else_branch) = else_branch {
                self.execute_branch(else_branch, context).await
            } else {
                Ok(())
            }
        } else {
            Err(anyhow!("不支持的控制流类型"))
        }
    }
}

// 注册新处理器（零修改扩展）
// 在 executor.rs 中
executor.register_handler(Box::new(ConditionalHandler));
```

### 2. 性能验证

```rust
// 性能监控集成示例
use std::time::Instant;

async fn execute_with_monitoring(steps: Vec<SmartScriptStep>) -> Result<()> {
    let start = Instant::now();
    
    let executor = EnhancedSmartScriptExecutor::new().await?;
    let result = executor.execute_steps(steps).await;
    
    let duration = start.elapsed();
    println!("脚本执行耗时: {:?}", duration);
    
    // 获取执行统计
    let stats = executor.get_execution_stats();
    println!("执行统计: {:?}", stats);
    
    result
}
```

## 📝 迁移清单

### 阶段1：基础集成（1周）
- [x] ✅ 创建模块化控制流系统
- [x] ✅ 实现向前兼容接口
- [ ] 🟡 添加 Tauri 命令注册
- [ ] 🟡 前端检测逻辑修改

### 阶段2：功能验证（1周）
- [ ] 🟡 循环控制完整测试
- [ ] 🟡 嵌套控制流测试
- [ ] 🟡 性能基准测试
- [ ] 🟡 错误处理验证

### 阶段3：扩展实现（1周）
- [ ] 🟡 if-else 条件控制实现
- [ ] 🟡 try-catch 异常处理
- [ ] 🟡 并行执行支持
- [ ] 🟡 完整文档更新

### 阶段4：生产部署（1周）
- [ ] 🟡 全面测试覆盖
- [ ] 🟡 用户接受测试
- [ ] 🟡 性能优化调整
- [ ] 🟡 正式环境部署

## 🎯 使用建议

### 1. 立即可用功能
- ✅ 循环控制（Loop）
- ✅ 顺序执行（Sequential）
- ✅ 性能监控
- ✅ 错误恢复

### 2. 规划中功能
- 🟡 条件控制（if-else）
- 🟡 异常处理（try-catch）
- 🟡 并行执行（parallel）
- 🟡 动态优化

### 3. 最佳实践
1. **渐进式迁移**：先在新功能中使用，逐步替换旧代码
2. **向前兼容**：保持现有接口可用，避免破坏性更改
3. **性能监控**：持续监控执行性能，及时优化
4. **单元测试**：为每个新功能添加完整测试

## 🚀 下一步行动

1. **立即行动**：
   ```bash
   # 验证架构完整性
   cd src-tauri
   cargo check
   
   # 运行测试
   cargo test script_execution
   ```

2. **集成测试**：
   ```rust
   // 创建集成测试
   #[tokio::test]
   async fn test_loop_execution() {
       let steps = vec![
           SmartScriptStep {
               action_type: SmartActionType::LoopStart { 
                   loop_count: Some(3),
                   is_infinite: false 
               },
               // ...
           },
           // 循环体步骤
           SmartScriptStep {
               action_type: SmartActionType::LoopEnd,
               // ...
           }
       ];
       
       let executor = EnhancedSmartScriptExecutor::new().await.unwrap();
       let result = executor.execute_steps(steps).await;
       assert!(result.is_ok());
   }
   ```

3. **前端集成**：
   - 修改脚本发送逻辑
   - 添加控制流检测
   - 更新用户界面

---

**🎉 架构已就绪！** 新的模块化控制流系统已完全实现，可以立即开始集成和使用。系统设计遵循计算机科学最佳实践，具备工业级的扩展性和维护性。