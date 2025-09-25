# 执行器重构迁移路线表 (初版)

> 本表基于自动扫描脚本 `npm run scan:executor` 输出的 `debug/refactor-scan/executor_functions.json` 与启发式分类结果生成。
> 目的：指导从巨石 `smart_script_executor` 向分层/模块化（Interaction / ControlFlow / UiMatching / Resilience / Logging / ExecutionContext / Utils）迁移。

## 1. 核心阶段划分

| 阶段 | 目标 | 范围 | 完成判定 | 风险级 | 缓解措施 |
|------|------|------|----------|--------|-----------|
| P0 基线冻结 | 冻结巨石新增功能 | 仅允许修Bug | 设立分支/PR守卫 | 中 | 代码所有人评审 | 
| P1 动作抽取 | 拆出交互动作适配层 | click/swipe/input/back/wait | `InteractionAdapter` 覆盖80%调用 | 高 | 保留旧路径回退开关 |
| P2 匹配整合 | 统一元素定位与策略 | match/find/locator/recognize | `UiMatcherService` 接管全部匹配 | 中 | 对比日志与截图 |
| P3 控制流内聚 | 循环/条件迁移 | loop/if/condition/evaluate | `ControlFlowEngine` 通过集成测试 | 中 | 保留冗余日志 diff |
| P4 重试韧性 | 统一重试/超时 | retry/attempt | `RetryPolicy` + 指标 | 低 | 指标对比失败率 |
| P5 日志规范化 | 结构化事件流 | log/debug/error/trace | 单一 `StructuredLogger` | 低 | JSON Schema 校验 |
| P6 上下文与工具 | context/util 收敛 | context/build/format/parse | `ExecutionContext` 无跨层访问 | 低 | 编译期访问控制 |
| P7 清理收尾 | 删除巨石残余 | legacy 函数 | 文件 <300 行 | 中 | 回归脚本全绿 |

## 2. 模块分类映射

| 分类 | 说明 | 建议新模块 | 典型函数前缀 | 迁移优先级 |
|------|------|------------|--------------|------------|
| action | 设备交互原子动作 | interaction | click/swipe/input/back | ★★★★★ |
| match | UI元素匹配/页面判定 | ui_matching | match/find/locator | ★★★★☆ |
| control_flow | 条件/循环/步骤调度 | control_flow | loop/if/cond/eval | ★★★★☆ |
| retry | 重试/超时/降级 | resilience | retry/attempt | ★★★☆☆ |
| log | 结构化日志/事件 | logging | log/debug/error | ★★☆☆☆ |
| context | 执行上下文状态 | execution_context | context/state/env | ★★☆☆☆ |
| util | 字符串/解析/构造 | utils | build/parse/format | ★☆☆☆☆ |
| uncategorized | 待人工复核 | to_classify | mixed | 依内容定 |

## 3. 重复函数处理策略

| 函数名 | 出现次数 | 处理策略 | 合并后位置 | 备注 |
|--------|----------|----------|------------|------|
| execute_single_step | 多处 | 选最简+参数化 | control_flow::executor | 提供 Hook 点 |
| execute_single_step_test | 多处 | 合并为测试命令适配 | control_flow::executor | 标记 test_only |
| evaluate_condition | ≥2 | 合并并支持 AST | control_flow::evaluator | 扩展策略 |
| retry_* (集合) | 多处 | 统一策略表驱动 | resilience::retry_policy | 指标输出 |

> 实际列表请运行扫描脚本后补全。（本初版占位）

## 4. 迁移任务矩阵 (示例行)

| ID | 函数 | 原文件 | 分类 | 建议模块 | 操作 | 验收标准 | 风险 | 状态 |
|----|------|--------|------|----------|------|----------|------|------|
| A001 | click_follow_button | smart_script_executor.rs | action | interaction | 抽取+注入Interface | 行为与前后截图一致 | 中 | 待办 |
| A002 | swipe_smart | smart_script_executor_actions.rs | action | interaction | 抽取 | 滑动路径diff<=5% | 中 | 待办 |
| M010 | match_element_by_criteria | smart_script_executor_impl.rs | match | ui_matching | 迁移+统一Criteria | 匹配成功率不降 | 高 | 待办 |
| C020 | execute_single_step | smart_script_executor.rs | control_flow | control_flow | 合并与参数标准化 | 回归成功率不降 | 高 | 待办 |
| R005 | retry_with_backoff | smart_script_executor.rs | retry | resilience | 移入策略模块 | 重试统计可采集 | 中 | 待办 |
| L003 | log_step_result | smart_script_executor.rs | log | logging | 换成结构化 | JSON schema 校验过 | 低 | 待办 |
| X002 | build_bounds_key | smart_script_executor_impl.rs | util | utils | 批量迁移 | 结果哈希一致 | 低 | 待办 |

> 运行脚本后，用实际 JSON 生成完整矩阵（可再写一个 generate_table.mjs 自动填充）。

## 5. 验收指标 (KPIs)

| 指标 | 基线 | 目标 | 说明 |
|------|------|------|------|
| 单步执行成功率 | 基线采集 | 不下降 | 同样 200 步测试集 |
| 匹配成功率 | 基线采集 | +1~3% | 标准策略场景 |
| 平均执行时延 | 基线采集 | -10% | 拆分后缓存/短路优化 |
| 代码行数 (smart_script_executor*) | ~1494 + impl/actions | < 300 | P7 完成 |
| 重复函数名组数 | 扫描结果 | -90% | 去重合并 |
| 单测覆盖 (新模块) | 0 | ≥60% | actions/match/control_flow 核心 |

## 6. 工具链与脚本

| 名称 | 作用 | 命令 |
|------|------|------|
| 执行器函数扫描 | 输出函数/分类/重复 | `npm run scan:executor` |
| (预留) 迁移表生成 | 从 JSON 补全矩阵 | `npm run gen:executor-table` (待实现) |
| (预留) KPI 基线采集 | 生成执行统计 | `npm run kpi:baseline` (待实现) |

## 7. 后续可自动化脚本（建议）

1. generate_table.mjs：将 JSON -> 完整迁移矩阵（状态列初始为 待办）
2. kpi_baseline.mjs：批量调用 Tauri 命令执行固定脚本集，输出统计 baseline.json
3. diff_validator.mjs：比较迁移前后日志结构与关键字段
4. dead_code_detector.mjs：识别迁移后未再引用的旧函数

## 8. 立即行动清单

- [ ] 运行 `npm run scan:executor` 产出首份 JSON/Markdown
- [ ] 补全第 4 节迁移矩阵（用自动脚本生成）
- [ ] 建立 `interaction/` `ui_matching/` `control_flow/` 目标目录骨架 (Rust)
- [ ] 引入 `RetryPolicy` trait + metrics 钩子
- [ ] 结构化日志 Schema (YAML/JSON) 草案

## 9. 维护策略

- 新增执行逻辑一律放入对应新模块，不再写回巨石
- 每合并一次迁移 PR，增量运行扫描脚本并附上 diff
- KPI 脚本每晚定时跑，突增回归率/失败率报警

---

> 本文件为初版框架，后续根据扫描产出自动补充。执行脚本后请更新 “重复函数处理策略” 与 “迁移任务矩阵”。
