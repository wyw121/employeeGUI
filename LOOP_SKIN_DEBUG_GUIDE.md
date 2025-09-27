## 🎨 循环体皮肤切换问题排查指南

### 📋 问题现状
用户在"🎨 外观换肤"中的"循环体皮肤"选择器无法正常切换循环体的持久配色。

### 🔍 快速定位步骤

#### 步骤1: 确认UI组件存在
1. 打开浏览器开发者工具（F12）
2. 在控制台中运行: `document.querySelector('[title="🎨 外观换肤"]')`
3. 应该返回对应的DOM元素，如果返回null则UI组件未渲染

#### 步骤2: 测试皮肤切换功能
1. 复制以下代码到浏览器控制台执行:
```javascript
// 快速测试皮肤切换
const skinCard = document.querySelector('[title="🎨 外观换肤"]');
if (skinCard) {
  const select = skinCard.querySelector('.ant-select');
  console.log('外观换肤组件:', select ? '✅ 存在' : '❌ 缺失');
  
  // 检查是否有循环体步骤
  const loopCards = document.querySelectorAll('[class*="loop-surface"], [class*="loop-start"], [class*="loop-end"]');
  console.log('循环体卡片数量:', loopCards.length);
  
  if (loopCards.length === 0) {
    console.log('⚠️  没有循环体步骤，无法测试皮肤效果');
  }
} else {
  console.log('❌ 外观换肤组件未找到');
}
```

#### 步骤3: 检查样式文件加载
```javascript
// 检查皮肤主题样式是否加载
let foundThemes = false;
for (let sheet of document.styleSheets) {
  try {
    for (let rule of sheet.cssRules) {
      if (rule.selectorText && (rule.selectorText.includes('loop-theme-rose') || rule.selectorText.includes('loop-theme-sky'))) {
        foundThemes = true;
        console.log('✅ 找到皮肤样式:', rule.selectorText);
        break;
      }
    }
  } catch (e) {}
}
if (!foundThemes) {
  console.log('❌ 皮肤主题样式未加载');
}
```

### 🛠️ 可能的原因与解决方案

#### 问题1: 样式文件未正确导入
**症状**: 皮肤选择器存在，但选择后没有视觉变化
**解决方案**: 检查CSS导入链
```
src/style.css → 
  src/styles/surfaces.css → 
    src/styles/surfaces/themes.css
```

#### 问题2: 步骤参数未正确更新
**症状**: UI存在但步骤的parameters中没有loopTheme字段
**解决方案**: 检查applyLoopTheme函数是否正确调用

#### 问题3: CSS类名生成逻辑错误
**症状**: parameters有loopTheme但CSS类没有应用
**解决方案**: 检查DraggableStepCard中的类名生成逻辑

### 🔧 临时修复方案

如果问题紧急，可以使用以下内联样式方案:

```javascript
// 临时应用玫瑰主题到所有循环体
function applyRoseThemeTemporarily() {
  const loopElements = document.querySelectorAll('.loop-surface, .light-surface');
  loopElements.forEach(el => {
    if (el.closest('[class*="loop-"], [class*="step-card"]')) {
      el.style.setProperty('--loop-text', '#4a0e2e');
      el.style.setProperty('--loop-text-strong', '#3a0a24');
      el.style.setProperty('--loop-muted', '#7a2f4a');
      el.style.setProperty('--loop-btn-bg', 'rgba(74, 14, 46, 0.06)');
      el.style.setProperty('--loop-btn-bg-hover', 'rgba(74, 14, 46, 0.1)');
      el.style.setProperty('--loop-btn-border', 'rgba(74, 14, 46, 0.3)');
    }
  });
  console.log('✅ 临时应用玫瑰主题完成');
}

// 执行临时修复
applyRoseThemeTemporarily();
```

### 📝 代码检查清单

1. **ControlPanel.tsx** ✅
   - 外观换肤UI组件存在
   - onChange事件绑定正确

2. **useSmartScriptBuilder.ts** ✅  
   - applyLoopTheme函数实现正确
   - controlPanelProps包含皮肤相关属性

3. **DraggableStepCard.tsx** ✅
   - loopThemeClass生成逻辑正确
   - className数组包含皮肤类

4. **themes.css** ✅
   - rose和sky主题样式定义完整
   - CSS变量设置正确

### 🎯 重点排查方向

1. **没有循环体步骤**: 如果当前脚本中没有循环开始/结束步骤，皮肤效果不会显示
2. **样式优先级**: 其他样式可能覆盖了主题样式
3. **React状态更新**: 皮肤切换后React组件可能未正确重渲染

### 🚀 建议的排查顺序

1. 先执行上述JavaScript诊断脚本
2. 确保有循环体步骤存在  
3. 手动测试皮肤切换
4. 检查浏览器开发者工具中的CSS应用情况
5. 如果仍有问题，使用临时内联样式验证效果