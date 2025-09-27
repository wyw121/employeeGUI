# 如何启用测试白色循环样式

## 当前状态分析
从你提供的DOM结构可以看出，当前的循环开始步骤使用的是默认样式：

```html
<div class="ant-card ... loop-surface loop-anchor ... loop-card loop-start ...">
```

**缺少**: `test-white-loop` 类名，说明测试样式没有被启用。

## 启用步骤

### 1. 找到对应的步骤数据
你需要在步骤数据中找到这个"循环开始"步骤，它的结构应该类似：

```javascript
{
  id: "some-loop-id",
  name: "循环开始", 
  step_type: "loop_start",
  description: "开始执行 新循环",
  parameters: {
    // 当前参数...
    loops: 3,
    // 其他参数...
  },
  enabled: true
}
```

### 2. 添加测试标记
在 `parameters` 对象中添加 `testWhiteLoop: true`：

```javascript
{
  id: "some-loop-id",
  name: "循环开始",
  step_type: "loop_start", 
  description: "开始执行 新循环",
  parameters: {
    loops: 3,
    testWhiteLoop: true,  // 🔑 添加这一行
    // 其他参数...
  },
  enabled: true
}
```

### 3. 预期效果
启用后，DOM 应该变成：

```html
<div class="ant-card ... test-white-loop loop-surface loop-anchor ... loop-card loop-start ...">
```

视觉上你会看到：
- ✨ 卡片变成**纯白背景** + **淡紫色边框**
- ✨ 头部变成**深紫色背景** + **白色文字**
- ✨ 左上角出现 **"🧪 TEST"** 黄色标签
- ✨ 所有按钮变成**半透明白色背景**
- ✨ 整体呈现明显不同的**紫白色系**主题

## 代码位置提示

根据项目结构，你可能需要在以下位置修改步骤数据：

1. **智能脚本构建器** - 如果是通过UI创建的循环
2. **步骤管理组件** - 负责步骤CRUD的地方  
3. **状态管理** - 如果使用Zustand/Redux等状态管理
4. **本地存储/数据库** - 如果步骤数据持久化存储

## 快速测试方法

如果你想快速验证样式效果，可以：

1. **浏览器开发者工具**中手动添加类名：
   ```javascript
   // 在Console中执行
   document.querySelector('.loop-anchor').classList.add('test-white-loop');
   ```

2. **临时修改DOM**：
   - 找到循环卡片元素
   - 在class属性中手动添加 `test-white-loop`
   - 立即看到样式变化

## 验证清单

启用后检查以下项目：

- [ ] 卡片背景变为纯白色
- [ ] 边框变为淡紫色  
- [ ] 头部背景变为深紫色
- [ ] 头部文字变为白色
- [ ] 左上角显示"🧪 TEST"标签
- [ ] 按钮有半透明白色背景
- [ ] 所有文字清晰可读

如果以上任何一项没有显示，说明样式可能被其他规则覆盖，需要进一步调试CSS优先级。

---

**问题排查**：如果添加了 `testWhiteLoop: true` 但样式没有变化，请检查：
1. 参数是否正确传递到组件
2. 组件是否重新渲染
3. CSS文件是否正确加载
4. 浏览器是否需要强制刷新 (Ctrl+F5)