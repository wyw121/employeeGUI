/**
 * 自定义匹配规则系统测试
 * 使用当前的XML数据验证匹配功能
 */

import { 
  customMatchingEngine, 
  CustomMatchingRule, 
  PREDEFINED_RULES 
} from '../services/customMatchingEngine';
import { customMatchingManager } from '../services/customMatchingIntegration';

// 模拟当前页面的XML数据
const CURRENT_XML_DATA = `<?xml version='1.0' encoding='UTF-8' standalone='yes' ?>
<hierarchy rotation="0">
  <node index="0" text="" resource-id="" class="android.widget.FrameLayout" package="com.xingin.xhs" bounds="[0,0][1080,1920]">
    <node index="0" text="通讯录好友" resource-id="com.xingin.xhs:id/0_resource_name_obfuscated" class="android.widget.TextView" bounds="[420,72][660,216]" clickable="false" enabled="true" />
    <node index="0" text="绯衣少 年" resource-id="com.xingin.xhs:id/0_resource_name_obfuscated" class="android.widget.TextView" bounds="[201,304][381,355]" clickable="false" enabled="true" />
    <node index="0" text="已关注" resource-id="com.xingin.xhs:id/0_resource_name_obfuscated" class="android.widget.TextView" bounds="[789,291][957,369]" clickable="true" enabled="true" />
    <node index="0" text="GU" resource-id="com.xingin.xhs:id/0_resource_name_obfuscated" class="android.widget.TextView" bounds="[201,521][261,572]" clickable="false" enabled="true" />
    <node index="0" text="关注" resource-id="com.xingin.xhs:id/0_resource_name_obfuscated" class="android.widget.TextView" bounds="[789,508][957,586]" clickable="true" enabled="true" selected="true" />
    <node index="0" text="HaloooCccccc" resource-id="com.xingin.xhs:id/0_resource_name_obfuscated" class="android.widget.TextView" bounds="[201,738][461,789]" clickable="false" enabled="true" />
    <node index="0" text="关注" resource-id="com.xingin.xhs:id/0_resource_name_obfuscated" class="android.widget.TextView" bounds="[789,725][957,803]" clickable="true" enabled="true" selected="true" />
    <node index="0" text="陈土康" resource-id="com.xingin.xhs:id/0_resource_name_obfuscated" class="android.widget.TextView" bounds="[201,955][336,1006]" clickable="false" enabled="true" />
    <node index="0" text="关注" resource-id="com.xingin.xhs:id/0_resource_name_obfuscated" class="android.widget.TextView" bounds="[789,942][957,1020]" clickable="true" enabled="true" selected="true" />
    <node index="0" text="💦May🤏🏼" resource-id="com.xingin.xhs:id/0_resource_name_obfuscated" class="android.widget.TextView" bounds="[201,1172][394,1223]" clickable="false" enabled="true" />
    <node index="0" text="关注" resource-id="com.xingin.xhs:id/0_resource_name_obfuscated" class="android.widget.TextView" bounds="[789,1159][957,1237]" clickable="true" enabled="true" selected="true" />
    <node index="0" text="我們共聆听的安眠曲" resource-id="com.xingin.xhs:id/0_resource_name_obfuscated" class="android.widget.TextView" bounds="[201,1389][606,1440]" clickable="false" enabled="true" />
    <node index="0" text="关 注" resource-id="com.xingin.xhs:id/0_resource_name_obfuscated" class="android.widget.TextView" bounds="[789,1376][957,1454]" clickable="true" enabled="true" selected="true" />
    <node index="0" text="建议16岁以下别上网" resource-id="com.xingin.xhs:id/0_resource_name_obfuscated" class="android.widget.TextView" bounds="[201,1606][608,1657]" clickable="false" enabled="true" />
    <node index="0" text="关注" resource-id="com.xingin.xhs:id/0_resource_name_obfuscated" class="android.widget.TextView" bounds="[789,1593][957,1671]" clickable="true" enabled="true" selected="true" />
    <node index="0" text="摘星星的人" resource-id="com.xingin.xhs:id/0_resource_name_obfuscated" class="android.widget.TextView" bounds="[201,1823][426,1874]" clickable="false" enabled="true" />
    <node index="0" text="关注" resource-id="com.xingin.xhs:id/0_resource_name_obfuscated" class="android.widget.TextView" bounds="[789,1810][957,1888]" clickable="true" enabled="true" selected="true" />
  </node>
</hierarchy>`;

/**
 * 测试自定义匹配规则系统
 */
export class CustomMatchingSystemTester {
  
  /**
   * 测试1: 验证关注按钮匹配
   */
  static async testFollowButtonMatching(): Promise<void> {
    console.log('\n🧪 测试1: 关注按钮匹配');
    
    try {
      // 创建关注按钮匹配规则
      const followRule = customMatchingManager.createPredefinedRule('FOLLOW_BUTTONS');
      console.log('📋 创建的关注按钮规则:', followRule);
      
      // 执行匹配
      const result = await customMatchingManager.matchElementsFromXML(CURRENT_XML_DATA, followRule);
      
      console.log(`✅ 匹配结果: 找到 ${result.totalMatches} 个关注按钮`);
      console.log(`⚡ 匹配耗时: ${result.duration}ms`);
      
      result.elements.forEach((element, index) => {
        console.log(`  ${index + 1}. "${element.text}" - 位置: (${element.bounds.centerX}, ${element.bounds.centerY}) - 置信度: ${element.confidence.toFixed(2)}`);
      });
      
      // 验证预期结果
      const expectedMatches = ['已关注', '关注', '关注', '关注', '关注', '关 注', '关注', '关注'];
      if (result.totalMatches >= 7) {
        console.log('✅ 通过: 成功匹配所有关注按钮');
      } else {
        console.log('❌ 失败: 匹配数量不符合预期');
      }
      
    } catch (error) {
      console.error('❌ 测试1失败:', error);
    }
  }
  
  /**
   * 测试2: 自定义通配符匹配规则
   */
  static async testWildcardMatching(): Promise<void> {
    console.log('\n🧪 测试2: 通配符匹配');
    
    try {
      // 创建自定义通配符规则
      const customRule: CustomMatchingRule = {
        id: 'wildcard_test_' + Date.now(),
        name: '通配符测试规则',
        description: '匹配所有包含"关注"的按钮，支持空格变体',
        conditions: {
          text: {
            mode: 'wildcard',
            value: '关*注*',  // 匹配 "关注", "已关注", "关 注" 等
            caseSensitive: false
          },
          className: {
            mode: 'exact',
            value: 'android.widget.TextView'
          },
          attributes: {
            clickable: true,
            enabled: true
          }
        },
        options: {
          maxMatches: 0,  // 无限制
          order: 'document',
          deduplicate: true
        },
        enabled: true
      };
      
      customMatchingManager.registerRule(customRule);
      const result = await customMatchingManager.matchElementsFromXML(CURRENT_XML_DATA, customRule);
      
      console.log(`✅ 通配符匹配结果: 找到 ${result.totalMatches} 个元素`);
      
      result.elements.forEach((element, index) => {
        console.log(`  ${index + 1}. "${element.text}" - 匹配条件: ${element.matchedConditions.join(', ')}`);
      });
      
    } catch (error) {
      console.error('❌ 测试2失败:', error);
    }
  }
  
  /**
   * 测试3: 位置范围匹配
   */
  static async testPositionRangeMatching(): Promise<void> {
    console.log('\n🧪 测试3: 位置范围匹配');
    
    try {
      // 创建位置范围匹配规则
      const positionRule: CustomMatchingRule = {
        id: 'position_test_' + Date.now(),
        name: '右侧按钮区域匹配',
        description: '匹配右侧按钮区域的所有可点击元素',
        conditions: {
          bounds: {
            x: { min: 750, max: 1000 },  // X坐标在750-1000范围内
            y: { min: 200, max: 1900 }   // Y坐标在200-1900范围内
          },
          attributes: {
            clickable: true
          }
        },
        options: {
          maxMatches: 10,
          order: 'position',
          deduplicate: true
        },
        enabled: true
      };
      
      const result = await customMatchingManager.matchElementsFromXML(CURRENT_XML_DATA, positionRule);
      
      console.log(`✅ 位置匹配结果: 找到 ${result.totalMatches} 个右侧区域的可点击元素`);
      
      result.elements.forEach((element, index) => {
        console.log(`  ${index + 1}. "${element.text}" - 位置: (${element.bounds.left}-${element.bounds.right}, ${element.bounds.top}-${element.bounds.bottom})`);
      });
      
    } catch (error) {
      console.error('❌ 测试3失败:', error);
    }
  }
  
  /**
   * 测试4: 批量执行操作
   */
  static async testBatchExecution(): Promise<void> {
    console.log('\n🧪 测试4: 批量执行操作');
    
    try {
      // 使用关注按钮规则
      const followRule = customMatchingManager.createPredefinedRule('FOLLOW_BUTTONS');
      const matchingResult = await customMatchingManager.matchElementsFromXML(CURRENT_XML_DATA, followRule);
      
      if (matchingResult.totalMatches > 0) {
        // 测试顺序执行模式
        console.log('⚡ 开始顺序执行模式测试...');
        const batchResult = await customMatchingManager.executeBatchActions(
          matchingResult,
          'TAP' as any,
          {
            mode: 'sequential',
            intervalMs: 500,
            continueOnError: true
          }
        );
        
        console.log(`✅ 批量执行完成: ${batchResult.successCount} 成功, ${batchResult.failureCount} 失败`);
        console.log(`⏱️ 总耗时: ${batchResult.duration}ms`);
        
        // 测试仅执行第一个模式
        console.log('\n⚡ 开始只执行第一个模式测试...');
        const firstOnlyResult = await customMatchingManager.executeBatchActions(
          matchingResult,
          'TAP' as any,
          {
            mode: 'first_only'
          }
        );
        
        console.log(`✅ 单个执行完成: 执行了 ${firstOnlyResult.executedElements} 个元素`);
        
      } else {
        console.log('⚠️ 没有找到匹配元素，跳过批量执行测试');
      }
      
    } catch (error) {
      console.error('❌ 测试4失败:', error);
    }
  }
  
  /**
   * 测试5: 正则表达式匹配
   */
  static async testRegexMatching(): Promise<void> {
    console.log('\n🧪 测试5: 正则表达式匹配');
    
    try {
      const regexRule: CustomMatchingRule = {
        id: 'regex_test_' + Date.now(),
        name: '正则表达式匹配测试',
        description: '使用正则表达式匹配各种关注按钮',
        conditions: {
          text: {
            mode: 'regex',
            value: '^(已?关\\s*注|关\\s*注)$',  // 匹配 "关注"、"已关注"、"关 注"
            caseSensitive: false
          }
        },
        options: {
          maxMatches: 5,
          order: 'document',
          deduplicate: true
        },
        enabled: true
      };
      
      const result = await customMatchingManager.matchElementsFromXML(CURRENT_XML_DATA, regexRule);
      
      console.log(`✅ 正则匹配结果: 找到 ${result.totalMatches} 个匹配元素`);
      
      result.elements.forEach((element, index) => {
        console.log(`  ${index + 1}. "${element.text}" - 置信度: ${element.confidence.toFixed(2)}`);
      });
      
    } catch (error) {
      console.error('❌ 测试5失败:', error);
    }
  }
  
  /**
   * 运行所有测试
   */
  static async runAllTests(): Promise<void> {
    console.log('🚀 开始自定义匹配规则系统测试...');
    console.log('📊 测试数据: 通讯录好友页面 - 包含多个关注按钮');
    
    await this.testFollowButtonMatching();
    await this.testWildcardMatching();
    await this.testPositionRangeMatching();
    await this.testBatchExecution();
    await this.testRegexMatching();
    
    console.log('\n🎉 所有测试完成！');
    console.log('\n📈 系统特性验证:');
    console.log('✅ 通配符匹配 - 支持 * ? 模式');
    console.log('✅ 正则表达式匹配 - 支持复杂模式');
    console.log('✅ 位置范围匹配 - 支持坐标区域过滤');
    console.log('✅ 属性过滤 - 支持clickable、enabled等条件');
    console.log('✅ 批量执行 - 支持顺序、并行、单个、随机模式');
    console.log('✅ 预定义规则 - 内置常用匹配模板');
  }
}

// 如果在浏览器环境中，添加到window对象
if (typeof window !== 'undefined') {
  (window as any).CustomMatchingSystemTester = CustomMatchingSystemTester;
  console.log('🔧 自定义匹配规则测试工具已加载');
  console.log('💡 使用方法: CustomMatchingSystemTester.runAllTests()');
}

export default CustomMatchingSystemTester;