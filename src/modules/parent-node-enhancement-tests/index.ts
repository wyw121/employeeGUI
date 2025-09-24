/**
 * 父节点增强功能测试套件
 * 
 * 验证父节点信息提取、XML增强、后端兼容性等功能
 */

import { ParentNodeExtractor, type ParentNodeInfo, type XmlElementWithParent } from '../parent-node-extractor/ParentNodeExtractor';
import { ParentXmlEnhancementService, type ParentEnhancedElement } from '../parent-xml-enhancement/ParentXmlEnhancementService';
import { ParentBackendCompatibilityHandler, type ExtendedParentMatchCriteria } from '../parent-backend-compatibility/ParentBackendCompatibilityHandler';

export interface ParentEnhancementTestResult {
  testName: string;
  success: boolean;
  details: string;
  data?: any;
}

export class ParentNodeEnhancementTests {
  /**
   * 运行所有父节点增强测试
   */
  static runAllTests(): ParentEnhancementTestResult[] {
    const results: ParentEnhancementTestResult[] = [];
    
    console.log('🧪 开始父节点增强功能测试...');
    
    // 测试1: 基础父节点信息提取
    results.push(this.testBasicParentExtraction());
    
    // 测试2: 可点击祖先查找
    results.push(this.testClickableAncestorFinding());
    
    // 测试3: XML上下文父节点增强
    results.push(this.testParentXmlEnhancement());
    
    // 测试4: 后端兼容性处理
    results.push(this.testBackendCompatibility());
    
    // 测试5: 智能推荐分析
    results.push(this.testSmartRecommendation());
    
    // 测试6: 完整集成流程
    results.push(this.testFullIntegrationFlow());
    
    // 汇总结果
    const passCount = results.filter(r => r.success).length;
    const totalCount = results.length;
    
    console.log(`🎯 父节点增强测试完成: ${passCount}/${totalCount} 通过`);
    
    return results;
  }
  
  /**
   * 测试1: 基础父节点信息提取
   */
  static testBasicParentExtraction(): ParentEnhancementTestResult {
    try {
      const testElement: XmlElementWithParent = {
        text: '关注',
        class_name: 'android.widget.TextView',
        resource_id: '',
        parent: {
          class_name: 'android.widget.FrameLayout',
          resource_id: 'com.xingin.xhs:id/follow_button',
          bounds: '[100,200][300,250]',
          clickable: true
        }
      };
      
      const parentInfo = ParentNodeExtractor.extractParentNodeInfo(testElement);
      
      const expectedFields = {
        parent_class: 'android.widget.FrameLayout',
        parent_resource_id: 'com.xingin.xhs:id/follow_button',
        parent_bounds: '[100,200][300,250]'
      };
      
      const success = parentInfo.parent_class === expectedFields.parent_class &&
                     parentInfo.parent_resource_id === expectedFields.parent_resource_id &&
                     parentInfo.parent_bounds === expectedFields.parent_bounds;
      
      return {
        testName: '基础父节点信息提取',
        success,
        details: success ? '成功提取父节点信息' : '父节点信息提取失败',
        data: { parentInfo, expected: expectedFields }
      };
      
    } catch (error) {
      return {
        testName: '基础父节点信息提取',
        success: false,
        details: `测试异常: ${error}`,
        data: { error }
      };
    }
  }
  
  /**
   * 测试2: 可点击祖先查找
   */
  static testClickableAncestorFinding(): ParentEnhancementTestResult {
    try {
      const testElement: XmlElementWithParent = {
        text: '关注',
        class_name: 'android.widget.TextView',
        parent: {
          class_name: 'android.widget.LinearLayout',
          parent: {
            class_name: 'android.widget.FrameLayout',
            resource_id: 'com.xingin.xhs:id/follow_container',
            bounds: '[50,150][350,300]',
            clickable: true
          }
        }
      };
      
      const parentInfo = ParentNodeExtractor.extractParentNodeInfo(testElement);
      
      const success = parentInfo.clickable_ancestor_class === 'android.widget.FrameLayout' &&
                     parentInfo.clickable_ancestor_resource_id === 'com.xingin.xhs:id/follow_container';
      
      return {
        testName: '可点击祖先查找',
        success,
        details: success ? '成功找到可点击祖先' : '可点击祖先查找失败',
        data: { parentInfo, element: testElement }
      };
      
    } catch (error) {
      return {
        testName: '可点击祖先查找',
        success: false,
        details: `测试异常: ${error}`,
        data: { error }
      };
    }
  }
  
  /**
   * 测试3: XML上下文父节点增强
   */
  static testParentXmlEnhancement(): ParentEnhancementTestResult {
    try {
      const testElement = {
        text: '关注',
        class_name: 'android.widget.TextView',
        bounds: '[120,210][180,240]'
      };
      
      const mockXmlContent = `
        <hierarchy>
          <android.widget.FrameLayout bounds="[100,200][300,250]" 
                                     resource-id="com.xingin.xhs:id/follow_button"
                                     clickable="true">
            <android.widget.TextView bounds="[120,210][180,240]" 
                                    text="关注"
                                    class="android.widget.TextView"/>
            <android.widget.TextView bounds="[190,215][280,235]"
                                    text="2.1万粉丝"
                                    class="android.widget.TextView"/>
          </android.widget.FrameLayout>
        </hierarchy>
      `;
      
      const enhanced = ParentXmlEnhancementService.enhanceElementWithParentInfo(testElement, mockXmlContent);
      
      const success = enhanced !== null &&
                     enhanced.parent_class?.includes('FrameLayout') &&
                     enhanced.parent_resource_id?.includes('follow_button');
      
      return {
        testName: 'XML上下文父节点增强',
        success,
        details: success ? '成功通过XML增强父节点信息' : 'XML父节点增强失败',
        data: { enhanced, testElement }
      };
      
    } catch (error) {
      return {
        testName: 'XML上下文父节点增强',
        success: false,
        details: `测试异常: ${error}`,
        data: { error }
      };
    }
  }
  
  /**
   * 测试4: 后端兼容性处理
   */
  static testBackendCompatibility(): ParentEnhancementTestResult {
    try {
      const testCriteria: ExtendedParentMatchCriteria = {
        strategy: 'standard',
        fields: ['text'],
        values: { 'text': '关注' },
        parent_class: 'android.widget.FrameLayout',
        parent_resource_id: 'com.xingin.xhs:id/follow_button',
        clickable_ancestor_class: 'android.widget.FrameLayout',
        clickable_ancestor_resource_id: 'com.xingin.xhs:id/follow_button'
      };
      
      const enhanced = ParentBackendCompatibilityHandler.enhanceParentMatchCriteriaForBackend(testCriteria);
      
      const expectedFields = ['parent-class', 'parent-resource-id', 'clickable-ancestor-class', 'clickable-ancestor-resource-id'];
      const hasAllFields = expectedFields.every(field => enhanced.fields.includes(field));
      
      const success = hasAllFields &&
                     enhanced.values['parent-resource-id'] === 'com.xingin.xhs:id/follow_button';
      
      return {
        testName: '后端兼容性处理',
        success,
        details: success ? '后端兼容性字段转换成功' : '后端兼容性处理失败',
        data: { enhanced, testCriteria }
      };
      
    } catch (error) {
      return {
        testName: '后端兼容性处理',
        success: false,
        details: `测试异常: ${error}`,
        data: { error }
      };
    }
  }
  
  /**
   * 测试5: 智能推荐分析
   */
  static testSmartRecommendation(): ParentEnhancementTestResult {
    try {
      // 测试TextView元素应该推荐使用父节点匹配
      const textViewElement: XmlElementWithParent = {
        text: '关注',
        class_name: 'android.widget.TextView',
        clickable: false,
        parent: {
          class_name: 'android.widget.FrameLayout',
          clickable: true
        }
      };
      
      const recommendation = ParentNodeExtractor.shouldUseParentNodeMatching(textViewElement);
      
      const success = recommendation.recommended === true &&
                     recommendation.confidence > 0.8;
      
      return {
        testName: '智能推荐分析',
        success,
        details: success ? '智能推荐分析准确' : '智能推荐分析不准确',
        data: { recommendation, element: textViewElement }
      };
      
    } catch (error) {
      return {
        testName: '智能推荐分析',
        success: false,
        details: `测试异常: ${error}`,
        data: { error }
      };
    }
  }
  
  /**
   * 测试6: 完整集成流程
   */
  static testFullIntegrationFlow(): ParentEnhancementTestResult {
    try {
      // 模拟完整的父节点增强流程
      const originalElement = {
        text: '关注',
        class_name: 'android.widget.TextView',
        bounds: '[120,210][180,240]'
      };
      
      const xmlContent = `
        <android.widget.FrameLayout bounds="[100,200][300,250]" 
                                   resource-id="com.xingin.xhs:id/follow_button"
                                   clickable="true">
          <android.widget.TextView bounds="[120,210][180,240]" 
                                  text="关注"
                                  class="android.widget.TextView"/>
        </android.widget.FrameLayout>
      `;
      
      // 步骤1: XML增强
      const enhanced = ParentXmlEnhancementService.enhanceElementWithParentInfo(originalElement, xmlContent);
      
      if (!enhanced) {
        return {
          testName: '完整集成流程',
          success: false,
          details: 'XML增强步骤失败',
          data: { originalElement, xmlContent }
        };
      }
      
      // 步骤2: 构建匹配条件
      const criteria: ExtendedParentMatchCriteria = {
        strategy: 'parent-enhanced',
        fields: ['text', 'parent-resource-id'],
        values: {
          'text': enhanced.text || '',
          'parent-resource-id': enhanced.parent_resource_id || ''
        },
        parent_resource_id: enhanced.parent_resource_id,
        parent_class: enhanced.parent_class
      };
      
      // 步骤3: 后端兼容性处理
      const compatible = ParentBackendCompatibilityHandler.enhanceParentMatchCriteriaForBackend(criteria);
      
      const success = compatible.fields.includes('parent-resource-id') &&
                     compatible.values['parent-resource-id']?.includes('follow_button');
      
      return {
        testName: '完整集成流程',
        success,
        details: success ? '完整流程测试成功' : '完整流程测试失败',
        data: { original: originalElement, enhanced, criteria, compatible }
      };
      
    } catch (error) {
      return {
        testName: '完整集成流程',
        success: false,
        details: `测试异常: ${error}`,
        data: { error }
      };
    }
  }
  
  /**
   * 输出测试报告
   */
  static generateTestReport(results: ParentEnhancementTestResult[]): string {
    const report = ['# 父节点增强功能测试报告\n'];
    
    results.forEach((result, index) => {
      const status = result.success ? '✅ 通过' : '❌ 失败';
      report.push(`## 测试 ${index + 1}: ${result.testName}`);
      report.push(`**状态**: ${status}`);
      report.push(`**详情**: ${result.details}\n`);
      
      if (result.data && !result.success) {
        report.push(`**错误数据**: \`${JSON.stringify(result.data, null, 2)}\`\n`);
      }
    });
    
    const passCount = results.filter(r => r.success).length;
    const totalCount = results.length;
    
    report.push(`\n## 测试总结`);
    report.push(`- 总测试数: ${totalCount}`);
    report.push(`- 通过数: ${passCount}`);
    report.push(`- 失败数: ${totalCount - passCount}`);
    report.push(`- 通过率: ${Math.round((passCount / totalCount) * 100)}%`);
    
    return report.join('\n');
  }
}

/**
 * 快速运行父节点增强测试
 */
export function runParentNodeEnhancementTests(): void {
  console.log('🚀 启动父节点增强功能测试...');
  
  const results = ParentNodeEnhancementTests.runAllTests();
  const report = ParentNodeEnhancementTests.generateTestReport(results);
  
  console.log('\n' + report);
  
  // 如果有失败的测试，在控制台警告
  const failedTests = results.filter(r => !r.success);
  if (failedTests.length > 0) {
    console.warn('⚠️ 部分父节点增强测试失败:', failedTests.map(t => t.testName));
  }
}

export default ParentNodeEnhancementTests;