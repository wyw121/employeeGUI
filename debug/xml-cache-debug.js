// 调试XML缓存关联问题的测试脚本

/**
 * 在浏览器控制台中运行此脚本来调试XML缓存关联问题
 */

// 🔍 检查XML缓存管理器状态
function debugXmlCacheManager() {
  console.log('🔍 === XML缓存管理器调试信息 ===');
  
  try {
    // 导入XmlCacheManager (注意：这在实际运行时需要根据模块加载方式调整)
    const xmlCacheManager = XmlCacheManager.getInstance();
    const stats = xmlCacheManager.getCacheStats();
    
    console.log('📊 缓存统计:', stats);
    console.log('📦 缓存总数:', stats.totalCacheCount);
    console.log('🔗 步骤关联数:', stats.totalStepMappings);
    console.log('🆔 所有缓存ID:', stats.cacheIds);
    console.log('⏰ 最近缓存:', stats.recentCaches);
    
    // 检查每个缓存的详细信息
    stats.cacheIds.forEach(cacheId => {
      const cacheData = xmlCacheManager.getCachedXml(cacheId);
      if (cacheData) {
        console.log(`📄 缓存详情 [${cacheId}]:`, {
          deviceId: cacheData.deviceId,
          deviceName: cacheData.deviceName,
          timestamp: new Date(cacheData.timestamp).toLocaleString(),
          elementCount: cacheData.pageInfo.elementCount,
          xmlContentLength: cacheData.xmlContent.length
        });
      }
    });
    
  } catch (error) {
    console.error('❌ XML缓存管理器调试失败:', error);
  }
}

// 🔍 检查步骤参数中的XML关联信息
function debugStepXmlAssociations(steps) {
  console.log('🔍 === 步骤XML关联调试信息 ===');
  
  if (!steps || !Array.isArray(steps)) {
    console.warn('⚠️ 未提供有效的steps数组');
    return;
  }
  
  steps.forEach((step, index) => {
    console.log(`🔸 步骤 ${index + 1} [${step.id}]: ${step.name}`);
    console.log(`   - xmlCacheId: ${step.parameters?.xmlCacheId || '未设置'}`);
    console.log(`   - hasXmlContent: ${!!step.parameters?.xmlContent}`);
    console.log(`   - xmlTimestamp: ${step.parameters?.xmlTimestamp ? new Date(step.parameters.xmlTimestamp).toLocaleString() : '未设置'}`);
    console.log(`   - deviceId: ${step.parameters?.deviceId || '未设置'}`);
    console.log(`   - isEnhanced: ${!!step.parameters?.isEnhanced}`);
    
    if (step.parameters?.xmlCacheId && step.parameters.xmlCacheId !== 'unknown') {
      // 检查这个xmlCacheId是否在缓存管理器中存在
      try {
        const xmlCacheManager = XmlCacheManager.getInstance();
        const cacheData = xmlCacheManager.getCachedXml(step.parameters.xmlCacheId);
        if (cacheData) {
          console.log(`   ✅ XML缓存存在，来源设备: ${cacheData.deviceName}`);
        } else {
          console.log(`   ❌ XML缓存不存在！`);
        }
      } catch (error) {
        console.log(`   ❌ 检查XML缓存失败:`, error);
      }
    }
    
    console.log(''); // 空行分隔
  });
}

// 🔍 模拟步骤参数修改流程
function debugStepEditFlow(stepId, steps) {
  console.log('🔍 === 模拟步骤修改流程 ===');
  
  const step = steps?.find(s => s.id === stepId);
  if (!step) {
    console.warn(`⚠️ 未找到步骤: ${stepId}`);
    return;
  }
  
  console.log('📝 目标步骤:', step.name);
  console.log('🔗 步骤XML关联信息:', {
    xmlCacheId: step.parameters?.xmlCacheId,
    hasXmlContent: !!step.parameters?.xmlContent,
    timestamp: step.parameters?.xmlTimestamp ? new Date(step.parameters.xmlTimestamp).toLocaleString() : '未设置'
  });
  
  // 模拟页面分析器加载流程
  console.log('🔄 模拟页面分析器加载流程...');
  if (step.parameters?.xmlCacheId) {
    try {
      const xmlCacheManager = XmlCacheManager.getInstance();
      const xmlData = xmlCacheManager.getCachedXml(step.parameters.xmlCacheId);
      
      if (xmlData) {
        console.log('✅ XML数据加载成功:', {
          cacheId: xmlData.cacheId,
          deviceName: xmlData.deviceName,
          elementCount: xmlData.pageInfo.elementCount,
          timestamp: new Date(xmlData.timestamp).toLocaleString()
        });
      } else {
        console.log('❌ XML数据加载失败 - 缓存不存在');
      }
    } catch (error) {
      console.log('❌ XML数据加载失败:', error);
    }
  } else {
    console.log('⚠️ 步骤未关联XML缓存ID');
  }
}

// 使用说明
console.log(`
🛠️  XML缓存关联问题调试脚本使用方法:

1. 调试XML缓存管理器状态:
   debugXmlCacheManager()

2. 调试步骤XML关联信息 (需要传入steps数组):
   debugStepXmlAssociations(steps)

3. 模拟步骤修改流程 (需要传入stepId和steps数组):
   debugStepEditFlow('step_123', steps)

💡 提示: 
- 在SmartScriptBuilderPage中，steps变量包含所有步骤
- 可以在控制台中访问React组件的状态来获取steps数据
- 注意检查xmlCacheId是否正确保存和关联
`);

// 导出调试函数(如果支持模块导出)
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    debugXmlCacheManager,
    debugStepXmlAssociations,
    debugStepEditFlow
  };
}