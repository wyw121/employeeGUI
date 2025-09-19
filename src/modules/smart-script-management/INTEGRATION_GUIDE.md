# 集成示例：完整的脚本管理工作流

## 🔗 完整集成代码示例

### 方案1: 最小化集成 (推荐快速开始)

在现有的 `SmartScriptBuilderPage.tsx` 中添加几行代码即可获得完整功能：

```typescript
// 在文件顶部导入
import { ScriptBuilderIntegration } from '../modules/smart-script-management/components/ScriptBuilderIntegration';

// 在现有的按钮区域添加一个组件
<div className="flex gap-2 mb-4">
  {/* 现有按钮 */}
  <Button 
    type="primary" 
    onClick={handleExecuteScript}
    icon={<PlayCircleOutlined />}
  >
    执行脚本
  </Button>

  {/* 新增：完整的脚本管理功能 */}
  <ScriptBuilderIntegration
    steps={steps}
    executorConfig={executorConfig}
    onLoadScript={(loadedScript) => {
      // 自动更新当前UI状态
      const { steps: newSteps, config: newConfig } = 
        ScriptSerializer.deserializeScript(loadedScript);
      setSteps(newSteps);
      setExecutorConfig(newConfig);
      message.success(\`已加载脚本: \${loadedScript.name}\`);
    }}
    onUpdateSteps={setSteps}
    onUpdateConfig={setExecutorConfig}
  />
</div>
```

**就这么简单！** 现在您的构建器就有了完整的脚本保存、加载、管理功能。

### 方案2: 深度集成 (完整功能)

如果您想要更多控制和定制，可以直接使用Hook：

```typescript
import { 
  useScriptManager, 
  useScriptEditor, 
  useScriptExecutor,
  ScriptSerializer 
} from '../modules/smart-script-management';

function SmartScriptBuilderPage() {
  // 现有状态
  const [steps, setSteps] = useState([]);
  const [executorConfig, setExecutorConfig] = useState({});
  
  // 新增：脚本管理功能
  const { scripts, loading, refreshScripts } = useScriptManager();
  const { saveFromUIState, loadScript } = useScriptEditor();
  const { executeScript, executionStatus } = useScriptExecutor();

  // 保存当前工作为脚本
  const handleSaveCurrentScript = async () => {
    const scriptName = prompt('请输入脚本名称:');
    if (!scriptName) return;

    await saveFromUIState(
      scriptName,
      \`创建时间: \${new Date().toLocaleString()}\`,
      steps,
      executorConfig
    );
    
    message.success('脚本保存成功！');
    refreshScripts();
  };

  // 加载已保存的脚本
  const handleLoadSavedScript = async (scriptId: string) => {
    try {
      const script = await loadScript(scriptId);
      const { steps: newSteps, config: newConfig } = 
        ScriptSerializer.deserializeScript(script);
      
      setSteps(newSteps);
      setExecutorConfig(newConfig);
      message.success(\`已加载脚本: \${script.name}\`);
    } catch (error) {
      message.error('加载脚本失败');
    }
  };

  return (
    <div>
      {/* 新增：快速操作栏 */}
      <Card className="mb-4">
        <Space size="middle">
          <Button 
            type="primary" 
            icon={<SaveOutlined />}
            onClick={handleSaveCurrentScript}
          >
            保存当前脚本
          </Button>
          
          <Select
            placeholder="加载已保存脚本"
            style={{ width: 200 }}
            onChange={handleLoadSavedScript}
            loading={loading}
          >
            {scripts.map(script => (
              <Option key={script.id} value={script.id}>
                {script.name}
              </Option>
            ))}
          </Select>

          <Button onClick={refreshScripts}>刷新脚本列表</Button>
        </Space>
      </Card>

      {/* 现有的构建器界面 */}
      {/* ... 您现有的代码 ... */}
    </div>
  );
}
```

## 📊 典型用户工作流

### 工作流1: 创建和保存脚本

```
1. 用户在构建器中创建步骤
   └── setSteps([...steps, newStep])

2. 配置执行参数
   └── setExecutorConfig({...})

3. 测试执行
   └── handleExecuteScript()

4. 保存脚本 (新功能!)
   └── ScriptBuilderIntegration 自动序列化所有状态
   └── 保存到后端持久化
```

### 工作流2: 加载和继续工作

```
1. 用户打开构建器
   └── 看到"加载脚本"选项

2. 选择之前保存的脚本
   └── ScriptBuilderIntegration 显示脚本列表

3. 加载脚本
   └── 自动恢复所有步骤和配置
   └── setSteps(deserializedSteps)
   └── setExecutorConfig(deserializedConfig)

4. 继续编辑或直接执行
   └── 完全恢复之前的工作状态
```

### 工作流3: 脚本管理和复用

```
1. 查看所有脚本
   └── ScriptManager 组件显示脚本列表

2. 管理脚本
   └── 重命名、删除、复制
   └── 查看执行历史

3. 模板化复用
   └── 将常用脚本保存为模板
   └── 快速创建类似脚本
```

## 🎯 关键集成点

### 1. 状态同步

现有状态 → 脚本管理模块的映射：

```typescript
// 您现有的状态
const [steps, setSteps] = useState([]); 
const [executorConfig, setExecutorConfig] = useState({});

// 自动映射到标准格式
ScriptBuilderIntegration 会自动处理：
- steps[] → SmartScriptStep[] (字段标准化)
- executorConfig → ScriptConfig (完整序列化)
```

### 2. 无侵入性集成

- ✅ 不改变现有代码结构
- ✅ 不影响现有功能
- ✅ 完全向后兼容
- ✅ 渐进式增强

### 3. 数据一致性

```typescript
// 保存时：UI状态 → 标准格式
const script = ScriptSerializer.serializeScript(name, desc, steps, config);

// 加载时：标准格式 → UI状态  
const { steps, config } = ScriptSerializer.deserializeScript(script);
```

## 🚀 立即开始使用

只需要3步即可获得完整的脚本管理功能：

### 步骤1: 导入组件
```typescript
import { ScriptBuilderIntegration } from '../modules/smart-script-management/components/ScriptBuilderIntegration';
```

### 步骤2: 添加到UI
```typescript
<ScriptBuilderIntegration 
  steps={steps}
  executorConfig={executorConfig}
  onLoadScript={handleLoadScript}
  onUpdateSteps={setSteps}
  onUpdateConfig={setExecutorConfig}
/>
```

### 步骤3: 处理加载回调
```typescript
const handleLoadScript = (script) => {
  const { steps, config } = ScriptSerializer.deserializeScript(script);
  setSteps(steps);
  setExecutorConfig(config);
};
```

## 🎉 完成！

现在您的智能脚本构建器具有了企业级的脚本管理功能：

- 💾 **完整保存**: 包含所有步骤、参数、配置的完整状态
- 🔄 **精确恢复**: 加载时完美恢复工作状态
- 📁 **脚本管理**: 重命名、删除、复制、导入导出
- 🎯 **模板系统**: 常用脚本模板化
- 📊 **执行统计**: 脚本使用情况分析
- 🔍 **搜索过滤**: 快速找到需要的脚本

**您的用户现在可以像管理代码项目一样管理他们的智能脚本了！**