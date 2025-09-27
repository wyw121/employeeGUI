# 🧪 测试用白色系循环样式使用指南

## 概述
新增了一套独特的白色系循环样式 `test-white-loop`，用于测试样式系统是否正确启用。这套样式具有以下特点：

## 视觉特征
- **卡片整体**: 纯白背景 + 淡紫色边框 + 紫色阴影
- **头部**: 深紫色背景条 + 白色文字
- **内容区**: 纯白背景 + 深灰色文字
- **按钮**: 半透明白色背景 + 紫色链接
- **循环体子步骤**: 极淡紫背景 + 深紫文字
- **特殊标记**: 左上角显示 "🧪 TEST" 黄色标签

## 启用方法

### 1. 在步骤参数中添加测试标记
```javascript
const testStep = {
  id: "test-step-1",
  name: "测试循环开始",
  step_type: "loop_start",
  description: "这是一个测试用的循环开始步骤",
  parameters: {
    testWhiteLoop: true,  // 🔑 关键：设置为 true 启用测试样式
    // ...其他参数
  },
  enabled: true
};
```

### 2. 对循环体内的子步骤也启用测试样式
```javascript
const childStep = {
  id: "test-child-step",
  name: "循环体内测试步骤",
  step_type: "action_click",
  parent_loop_id: "test-step-1",  // 循环体内步骤
  parameters: {
    testWhiteLoop: true,  // 子步骤也启用测试样式
    // ...其他参数
  },
  enabled: true
};
```

### 3. 循环结束步骤
```javascript
const endStep = {
  id: "test-end-step",
  name: "测试循环结束",
  step_type: "loop_end",
  parameters: {
    testWhiteLoop: true,  // 结束步骤也启用
    // ...其他参数
  },
  enabled: true
};
```

## CSS 类层次结构
```
test-white-loop          # 最高优先级，覆盖所有默认样式
├── loop-surface         # 循环表面基础类
├── in-loop-step         # 循环体内步骤（如果适用）
├── loop-anchor          # 循环锚点（开始/结束步骤）
└── loop-theme-*         # 其他主题类（会被测试样式覆盖）
```

## 测试验证要点

### ✅ 应该看到的效果
1. **可读性**: 所有文字都应该清晰可读，无白字白底情况
2. **独特外观**: 与默认循环样式明显不同的紫色系外观
3. **层级正确**: 测试样式能覆盖暗色主题和默认循环样式
4. **响应交互**: 按钮 hover、开关切换等交互正常
5. **标识明显**: 左上角有 "🧪 TEST" 标签

### ❌ 需要修复的问题
1. 如果文字仍然是白色（不可读）
2. 如果样式没有应用（仍显示默认外观）
3. 如果测试标签没有显示
4. 如果子步骤样式不一致

## 调试方法

### 1. 检查 DOM 类名
```javascript
// 在浏览器开发者工具中检查元素
const card = document.querySelector('.test-white-loop');
console.log(card?.className);
// 应该包含: test-white-loop loop-surface in-loop-step (或 loop-anchor)
```

### 2. 检查计算样式
```javascript
// 检查背景色是否为白色
const computedStyle = window.getComputedStyle(card);
console.log('Background:', computedStyle.backgroundColor);
// 应该是: rgb(255, 255, 255) 或类似白色值
```

### 3. 检查参数传递
```javascript
// 确认步骤参数中包含测试标记
console.log(step.parameters?.testWhiteLoop);
// 应该是: true
```

## 使用场景

1. **样式系统测试**: 验证 CSS 层级和覆盖是否正确
2. **主题切换测试**: 测试不同主题间的切换
3. **可读性验证**: 确保所有文字在各种背景下都可读
4. **回归测试**: 在修改样式代码后验证没有破坏现有功能

## 注意事项

- 这是**测试专用**样式，不应在生产环境中启用
- 测试完成后记得移除 `testWhiteLoop: true` 参数
- 如果样式不生效，检查 CSS 文件是否正确加载
- 确保 `loop.css` 文件在样式层级中的优先级足够高

---
*本功能用于开发和测试，确保循环体样式系统的健壮性。*