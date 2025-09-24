/**
 * 子节点信息提取测试套件
 * 
 * 验证XML子节点信息提取的各种场景
 */

import { ChildNodeExtractor, type ChildNodeInfo, type XmlElementLike } from '../child-node-extractor';
import { XmlEnhancementService } from '../xml-enhancement';
import { buildEnhancedMatchingFromElementAndXml } from '../../pages/SmartScriptBuilderPage/helpers/matchingHelpers';

export class ChildNodeExtractionTests {
  /**
   * 测试基础子节点信息提取
   */
  static testBasicChildNodeExtraction() {
    console.log('🧪 测试基础子节点信息提取...');
    
    const testElement: XmlElementLike = {
      text: '',  // 父节点无文本
      content_desc: '',
      resource_id: 'parent_button',
      class_name: 'android.widget.FrameLayout',
      children: [
        {
          text: '关注',  // 子节点有文本
          content_desc: '点击关注用户',
          resource_id: 'btn_text',
          class_name: 'android.widget.TextView',
        }
      ]
    };
    
    const childInfo = ChildNodeExtractor.extractChildNodeInfo(testElement);
    
    console.log('提取结果:', childInfo);
    
    // 验证结果
    if (childInfo.first_child_text === '关注' && 
        childInfo.first_child_content_desc === '点击关注用户' &&
        childInfo.first_child_resource_id === 'btn_text') {
      console.log('✅ 基础子节点信息提取测试通过');
      return true;
    } else {
      console.log('❌ 基础子节点信息提取测试失败');
      return false;
    }
  }
  
  /**
   * 测试深度文本收集
   */
  static testDescendantTextCollection() {
    console.log('🧪 测试深度文本收集...');
    
    const testElement: XmlElementLike = {
      text: '',
      class_name: 'android.widget.LinearLayout',
      children: [
        {
          text: '用户名',
          class_name: 'android.widget.TextView',
          children: []
        },
        {
          text: '',
          class_name: 'android.widget.FrameLayout',
          children: [
            {
              text: '设置',
              class_name: 'android.widget.TextView',
              children: []
            },
            {
              text: '1 条通知',
              class_name: 'android.widget.TextView',
              children: []
            }
          ]
        }
      ]
    };
    
    const childInfo = ChildNodeExtractor.extractChildNodeInfo(testElement);
    
    console.log('深度文本收集结果:', childInfo);
    
    // 验证结果
    if (childInfo.descendant_texts && 
        childInfo.descendant_texts.includes('用户名') &&
        childInfo.descendant_texts.includes('设置') &&
        childInfo.descendant_texts.includes('1 条通知')) {
      console.log('✅ 深度文本收集测试通过');
      return true;
    } else {
      console.log('❌ 深度文本收集测试失败');
      return false;
    }
  }
  
  /**
   * 测试XML上下文增强
   */
  static testXmlContextEnhancement() {
    console.log('🧪 测试XML上下文增强...');
    
    const mockXmlContent = `
<node bounds="[522,212][648,268]" class="android.widget.FrameLayout" clickable="true">
  <node bounds="[522,212][648,268]" text="关注" class="android.widget.TextView" content-desc="点击关注"/>
</node>
<node bounds="[144,198][482,238]" class="android.widget.TextView" text="用户名" clickable="false"/>
    `.trim();
    
    const testElement = {
      resource_id: '',
      text: '',  // 父容器无文本
      content_desc: '',
      class_name: 'android.widget.FrameLayout',
      bounds: '[522,212][648,268]'
    };
    
    const enhancementService = new XmlEnhancementService();
    const enhancedElement = enhancementService.enhanceElement(testElement, mockXmlContent);
    
    console.log('XML上下文增强结果:', enhancedElement);
    
    // 验证是否成功提取子节点文本
    if (enhancedElement.first_child_text === '关注') {
      console.log('✅ XML上下文增强测试通过');
      return true;
    } else {
      console.log('❌ XML上下文增强测试失败');
      return false;
    }
  }
  
  /**
   * 测试匹配配置增强
   */
  static testEnhancedMatching() {
    console.log('🧪 测试增强匹配配置生成...');
    
    const mockXmlContent = `
<node bounds="[522,212][648,268]" class="android.widget.FrameLayout" clickable="true" resource-id="follow_button">
  <node bounds="[522,212][648,268]" text="关注" class="android.widget.TextView" content-desc="点击关注"/>
</node>
    `.trim();
    
    const testElement = {
      resource_id: 'follow_button',
      text: '',  // 父容器无文本
      content_desc: '',
      class_name: 'android.widget.FrameLayout',
      bounds: '[522,212][648,268]'
    };
    
    const matchingResult = buildEnhancedMatchingFromElementAndXml(testElement, mockXmlContent);
    
    console.log('增强匹配配置结果:', matchingResult);
    
    // 验证是否包含子节点信息
    if (matchingResult && 
        (matchingResult.values.first_child_text === '关注' || 
         matchingResult.values.text === '关注')) {  // 可能被智能合并到主text字段
      console.log('✅ 增强匹配配置测试通过');
      return true;
    } else {
      console.log('❌ 增强匹配配置测试失败');
      return false;
    }
  }
  
  /**
   * 运行所有测试
   */
  static runAllTests() {
    console.log('🚀 开始运行子节点信息提取测试套件...');
    
    const results = [
      this.testBasicChildNodeExtraction(),
      this.testDescendantTextCollection(),
      this.testXmlContextEnhancement(),
      this.testEnhancedMatching(),
    ];
    
    const passCount = results.filter(r => r).length;
    const totalCount = results.length;
    
    console.log(`📊 测试结果: ${passCount}/${totalCount} 测试通过`);
    
    if (passCount === totalCount) {
      console.log('🎉 所有子节点提取功能测试通过！');
    } else {
      console.log('⚠️ 部分测试失败，需要检查子节点提取逻辑');
    }
    
    return passCount === totalCount;
  }
}

// 在控制台中可以运行: ChildNodeExtractionTests.runAllTests()
if (typeof window !== 'undefined') {
  (window as any).ChildNodeExtractionTests = ChildNodeExtractionTests;
}