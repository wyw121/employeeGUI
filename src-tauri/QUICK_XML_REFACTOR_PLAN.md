# quick-xml 重构计划 (XML Judgment Service)

## 1. 背景与动机
当前 `xml_judgment_service` 解析逻辑主要依赖正则与手工字符串裁剪：
- 解析鲁棒性差：压缩/嵌套/属性顺序变化可能失败
- 难以支持增量能力：层级上下文、兄弟节点、XPath 派生
- 性能不可控：大量 `contains` 字符串扫描

目标：使用 `quick-xml` 替换手写解析路径，提供结构化 DOM 式遍历能力，并保持现有对外 Tauri 命令 API **不破坏**。

## 2. 范围 (In Scope / Out of Scope)
In Scope:
- `parser.rs` 中 `parse_xml_root`, `parse_element`, `extract_node_opening_tags`, `extract_field_value`
- `match_logic.rs` 中基于行扫描的匹配阶段重写为结构化节点迭代
- `queries.rs` 中 `find_elements`, `wait_for_element`
- 新增一个统一的 `XmlTree` / `LightNode` 抽象层

Out of Scope (后续阶段)：
- XPath 完整实现
- DOM diff / 增量更新
- UI dump 缓存淘汰策略

## 3. 分阶段实施计划
| 阶段 | 名称 | 目标 | 退出准则 |
|------|------|------|----------|
| P0 | 准备 | 引入依赖、创建新 parser_v2 模块 | 构建通过，无行为切换 |
| P1 | 并行解析 | parser_v2 生成节点列表 (不接入匹配) | 单元测试覆盖 ≥ 6 (多属性、缺失、嵌套) |
| P2 | 匹配迁移 | 将 `match_logic` 行扫描分支迁移到节点遍历 | 回归测试匹配结果一致（样本 15 条） |
| P3 | 查询迁移 | `find_elements` / `wait_for_element` 切换至 v2 | 超时行为一致，成功/失败语义一致 |
| P4 | 切换与回退 | 默认启用 v2，可通过 env 变量回退 | 开关机制验证通过 |
| P5 | 清理 | 移除旧正则实现 / 文档更新 | 无代码引用旧解析函数 |

## 4. 技术设计概览
### 4.1 依赖与版本
```toml
# Cargo.toml (新增)
[dependencies]
quick-xml = { version = "0.31", features = ["encoding"] }
``` 

### 4.2 结构
```
xml_judgment_service/
  parser.rs          # 旧实现 (保留直到 P5)
  parser_v2.rs       # 新 quick-xml 解析
  tree.rs            # LightNode / XmlTree 抽象
  match_logic.rs     # 重写匹配使用 XmlTree (P2)
```

### 4.3 LightNode 设计
```rust
pub struct LightNode<'a> {
  pub tag: &'a str,
  pub attrs: SmallVec<[(&'a str, &'a str); 8]>,
  pub text: Option<&'a str>,
  pub depth: u16,
  pub index_in_parent: u16,
  pub parent: Option<usize>,
  pub children: Range<usize>, // 在 nodes 向量里的范围
}
```

### 4.4 API 兼容策略
| 现有 API | 是否变更签名 | 行为要求 | 备注 |
|----------|--------------|----------|------|
| `get_device_ui_xml` | 否 | 原样返回 | 解析与否不影响 |
| `find_xml_ui_elements` | 否 | 返回 matched=true/false | 解析内部改用 v2 |
| `wait_for_ui_element` | 否 | 轮询语义保持 | 复用 v2 解析缓存 |
| `match_element_by_criteria` | 否 | 匹配结果一致或更优 | 增加上下文能力不破坏字段 |

### 4.5 回退机制
环境变量：`XML_PARSER_V2=0` -> 强制走旧 parser；默认启用 v2。
实现方式：
```rust
fn is_v2_enabled() -> bool {
  std::env::var("XML_PARSER_V2").map(|v| v != "0").unwrap_or(true)
}
```

### 4.6 性能指标 (目标)
| 指标 | 基线 (估计) | 目标 | 验证方式 |
|------|-------------|------|----------|
| 单次解析 200KB dump | ~15-25ms | <10ms | bench / debug log | 
| 匹配遍历耗时 | O(N * F) 行扫描 | O(N + F) 预索引 | 节点计数 * 字段数 |
| 内存峰值 | 复制多行字符串 | 零拷贝切片 | heap profiler (可选) |

### 4.7 错误处理策略
- quick-xml 解析错误 -> 返回统一 `Err("XML解析失败: <简要原因>")`
- 不合法 UTF-8 -> 使用 lossy fallback
- 空文档 -> `Ok(XmlTree(empty))` + 上层 matched=false

## 5. 测试策略
| 测试类型 | 场景 | 样本 |
|----------|------|------|
| 单元测试 parser_v2 | 属性顺序变化 | 3 |
| | 嵌套 3 层 | 2 |
| | bounds 提取 | 2 |
| | 文本包含特殊字符 | 2 |
| 匹配回归 | strategy: standard/absolute/relaxed | 各 5 |
| 轮询行为 | 超时路径 / 立即命中 | 4 |
| 回退机制 | XML_PARSER_V2=0 | 2 |

## 6. 渐进发布
1. P2 结束后：隐藏日志 `parser=v2` 打点
2. P3：比较 v1/v2 匹配差异（若差异 -> warn + 继续使用 v1 结果）
3. P4：移除双跑，默认单跑 v2

## 7. 风险与缓解
| 风险 | 描述 | 缓解 |
|------|------|------|
| 解析差异导致脚本失效 | 特殊控件属性排列异常 | 双跑对比 + 回退开关 |
| 性能回退 | 解析超时或退化 | 采样日志 + 基准测试 |
| 内存上升 | 构建大量临时 String | 使用 &str + smallvec |
| 条件匹配偏差 | 正则/包含语义变动 | 保留旧逻辑对比 1 版本周期 |

## 8. 回滚方案
出现以下任一：
- 匹配失败率 > 基线 +15%
- 解析平均耗时 > 2x 基线
- panic / OOM 相关日志 >= 3/小时

执行：
1. 设置部署环境变量 `XML_PARSER_V2=0`
2. 观察 24h 指标恢复
3. 记录问题样本，加入回归集

## 9. 后续扩展 (Deferred)
- XPath 子集支持（id / contains / nth-child）
- 差异增量 (UI 变化追踪) cache + diff
- 语义字段权重统计 (频率 -> 推荐自动匹配策略)

## 10. 执行清单 (Ready Checklist)
- [ ] Cargo.toml 添加依赖
- [ ] parser_v2.rs 骨架 + 单元测试
- [ ] LightNode 内存布局基准
- [ ] 双跑对比 gating (feature flag)
- [ ] 日志指标：parse_time_ms / node_count / match_time_ms
- [ ] 文档 README 更新解析章节

---
Owner: ADB Matching Core
Planned Start: 2025-09-27
ETA P3 完成: +3 工作日
