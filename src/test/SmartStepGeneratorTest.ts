/**
 * 智能步骤生成器测试文件
 * 用于验证步骤名称和描述的生成效果
 */

import SmartStepGenerator from '../modules/SmartStepGenerator';

// 模拟你的实际测试数据
const mockSmartDescription = `🎯 🏠 小红书主页 📱 应用：小红书 💡 功能说明：浏览推荐内容和关注动态 📍 元素位置：位于小红书底部导航栏的"首页"按钮，是应用的主要导航入口 ✅ 建议操作：点击此导航按钮，将跳转到对应页面 🔍 识别置信度：98% (非常高)`;

const mockElement = {
  id: 'element_123',
  text: '首页',
  element_type: 'Button',
  resource_id: 'com.xingin.xhs:id/home_tab',
  content_desc: '首页',
  smartDescription: mockSmartDescription,
  smartAnalysis: {
    confidence: 98,
    pageType: '小红书主页',
    appName: '小红书'
  }
};

// 测试函数
export const testSmartStepGenerator = () => {
  console.group('🧪 智能步骤生成器测试');
  
  console.log('📝 原始智能描述:');
  console.log(mockSmartDescription);
  console.log('\n');
  
  const stepInfo = SmartStepGenerator.generateStepInfo(mockElement);
  
  console.log('✨ 生成结果:');
  console.log(`🏷️  步骤名称: "${stepInfo.name}"`);
  console.log(`📝 步骤描述:`);
  console.log(stepInfo.description);
  console.log(`🔍 搜索条件: "${stepInfo.searchCriteria}"`);
  
  console.groupEnd();
  
  return stepInfo;
};

// 测试多种情况
export const testVariousCases = () => {
  console.group('🧪 多种情况测试');
  
  const testCases = [
    // 情况1：有完整智能描述
    {
      name: '完整智能描述',
      element: mockElement
    },
    
    // 情况2：没有智能描述，只有文本
    {
      name: '仅文本元素',
      element: {
        id: 'element_456',
        text: '发现',
        element_type: 'TextView',
        resource_id: 'com.xingin.xhs:id/discover_tab',
        content_desc: '发现页面'
      }
    },
    
    // 情况3：没有文本，只有类型
    {
      name: '仅类型信息',
      element: {
        id: 'element_789',
        element_type: 'ImageView',
        resource_id: 'com.xingin.xhs:id/profile_avatar'
      }
    },
    
    // 情况4：微信场景
    {
      name: '微信导航',
      element: {
        id: 'element_999',
        text: '通讯录',
        element_type: 'Button',
        smartDescription: `📱 微信通讯录 💡 功能说明：管理联系人和好友列表 📍 元素位置：位于微信底部导航栏的"通讯录"按钮`
      }
    }
  ];
  
  testCases.forEach((testCase, index) => {
    console.log(`\n--- 测试 ${index + 1}: ${testCase.name} ---`);
    const stepInfo = SmartStepGenerator.generateStepInfo(testCase.element);
    console.log(`名称: "${stepInfo.name}"`);
    console.log(`描述: ${stepInfo.description.split('\n')[0]}...`);
  });
  
  console.groupEnd();
};

// 浏览器控制台中的快速测试函数
if (typeof window !== 'undefined') {
  (window as any).testSmartStep = testSmartStepGenerator;
  (window as any).testVariousCases = testVariousCases;
}

export default {
  testSmartStepGenerator,
  testVariousCases
};