/**
 * 联系人导入自动化调试工具
 * 
 * 用于实时分析vCard对话框检测和点击问题
 */

import { AutomationEngine } from '../modules/contact-import/automation';
import invokeCompat from '../api/core/tauriInvoke';

export class ContactImportDebugger {
  private deviceId: string;

  constructor(deviceId: string) {
    this.deviceId = deviceId;
  }

  /**
   * 实时抓取并分析当前页面
   */
  async analyzeCurrentPage(): Promise<void> {
    console.log('🔍 开始分析当前页面...');

    try {
      // 1. 抓取XML
      const xmlContent = await invokeCompat<string>('adb_dump_ui_xml', {
        deviceId: this.deviceId
      });

      if (!xmlContent) {
        console.error('❌ 无法抓取XML内容');
        return;
      }

      console.log('✅ XML抓取成功，长度:', xmlContent.length);

      // 2. 分析XML结构
      this.analyzeXmlStructure(xmlContent);

      // 3. 检测vCard对话框
      this.detectVCardDialog(xmlContent);

      // 4. 检测应用选择器对话框
      this.detectAppSelector(xmlContent);

    } catch (error) {
      console.error('❌ 页面分析失败:', error);
    }
  }

  /**
   * 分析XML结构
   */
  private analyzeXmlStructure(xmlContent: string): void {
    console.log('\n📊 XML结构分析:');

    // 检查包名
    const packages = [...xmlContent.matchAll(/package="([^"]*)"/g)]
      .map(match => match[1])
      .filter((pkg, index, arr) => arr.indexOf(pkg) === index);
    
    console.log('📦 发现的包名:', packages);

    // 检查可点击按钮
    const clickableButtons = [...xmlContent.matchAll(/<node[^>]*text="([^"]*)"[^>]*resource-id="([^"]*)"[^>]*clickable="true"[^>]*>/g)]
      .map(match => ({ text: match[1], resourceId: match[2] }));
    
    console.log('🔘 可点击按钮:');
    clickableButtons.forEach(btn => {
      console.log(`  - "${btn.text}" (${btn.resourceId})`);
    });

    // 检查关键文本
    const textMessages = [...xmlContent.matchAll(/text="([^"]*)"/g)]
      .map(match => match[1])
      .filter(text => text.length > 0);
    
    console.log('💬 文本消息:');
    textMessages.forEach(text => {
      if (text.includes('vCard') || text.includes('联系人') || text.includes('导入') || text.includes('确定') || text.includes('取消')) {
        console.log(`  - "${text}"`);
      }
    });
  }

  /**
   * 检测vCard确认对话框
   */
  private detectVCardDialog(xmlContent: string): void {
    console.log('\n🎯 vCard对话框检测:');

    // 1. 检查包名
    const hasContactsPackage = xmlContent.includes('package="com.hihonor.contacts"');
    console.log('📦 联系人包名:', hasContactsPackage ? '✅ 存在' : '❌ 不存在');

    // 2. 检查vCard关键词
    const vCardKeywords = ['vcard', 'VCard', '导入联系人', '导入通讯录'];
    const foundKeywords = vCardKeywords.filter(keyword => 
      xmlContent.toLowerCase().includes(keyword.toLowerCase())
    );
    console.log('🔤 vCard关键词:', foundKeywords.length > 0 ? `✅ 找到: ${foundKeywords.join(', ')}` : '❌ 未找到');

    // 3. 检查确定按钮
    const confirmButtonRegex = /<node[^>]*resource-id="android:id\/button1"[^>]*text="确定"[^>]*bounds="([^"]*)"[^>]*clickable="true"[^>]*>/i;
    const confirmMatch = xmlContent.match(confirmButtonRegex);
    
    if (confirmMatch) {
      console.log('✅ 确定按钮:', {
        resourceId: 'android:id/button1',
        text: '确定',
        bounds: confirmMatch[1],
        clickable: true
      });
    } else {
      console.log('❌ 确定按钮: 未找到');
      // 尝试查找其他确定按钮
      const alternativeButtons = [...xmlContent.matchAll(/<node[^>]*text="确定"[^>]*resource-id="([^"]*)"[^>]*bounds="([^"]*)"[^>]*clickable="true"[^>]*>/g)];
      if (alternativeButtons.length > 0) {
        console.log('🔍 替代确定按钮:');
        alternativeButtons.forEach(match => {
          console.log(`  - resource-id="${match[1]}", bounds="${match[2]}"`);
        });
      }
    }

    // 4. 检查取消按钮
    const cancelButtonExists = xmlContent.includes('resource-id="android:id/button2"') && xmlContent.includes('text="取消"');
    console.log('🚫 取消按钮:', cancelButtonExists ? '✅ 存在' : '❌ 不存在');

    // 5. 综合判断
    const isVCardDialog = hasContactsPackage && foundKeywords.length > 0 && confirmMatch && cancelButtonExists;
    console.log('🎯 vCard对话框判断:', isVCardDialog ? '✅ 检测到' : '❌ 未检测到');
  }

  /**
   * 检测应用选择器对话框
   */
  private detectAppSelector(xmlContent: string): void {
    console.log('\n📱 应用选择器检测:');

    // 1. 检查包名
    const hasAppSelectorPackage = xmlContent.includes('package="com.hihonor.android.internal.app"');
    console.log('📦 应用选择器包名:', hasAppSelectorPackage ? '✅ 存在' : '❌ 不存在');

    // 2. 检查标题
    const hasTitle = xmlContent.includes('使用以下方式打开');
    console.log('📋 标题文本:', hasTitle ? '✅ 存在' : '❌ 不存在');

    // 3. 检查"仅此一次"按钮
    const onceButtonExists = xmlContent.includes('resource-id="android:id/button_once"') && xmlContent.includes('text="仅此一次"');
    console.log('⏺️ 仅此一次按钮:', onceButtonExists ? '✅ 存在' : '❌ 不存在');

    // 4. 检查"始终"按钮
    const alwaysButtonExists = xmlContent.includes('resource-id="android:id/button_always"') && xmlContent.includes('text="始终"');
    console.log('🔄 始终按钮:', alwaysButtonExists ? '✅ 存在' : '❌ 不存在');

    // 5. 综合判断
    const isAppSelector = hasAppSelectorPackage && hasTitle && (onceButtonExists || alwaysButtonExists);
    console.log('📱 应用选择器判断:', isAppSelector ? '✅ 检测到' : '❌ 未检测到');
  }

  /**
   * 手动执行点击测试
   */
  async testClick(): Promise<void> {
    console.log('\n👆 开始点击测试...');

    try {
      // 1. 抓取当前XML
      const xmlContent = await invokeCompat<string>('adb_dump_ui_xml', {
        deviceId: this.deviceId
      });

      if (!xmlContent) {
        console.error('❌ 无法抓取XML');
        return;
      }

      // 2. 查找确定按钮
      const confirmButtonRegex = /<node[^>]*resource-id="android:id\/button1"[^>]*text="确定"[^>]*bounds="([^"]*)"[^>]*clickable="true"[^>]*>/i;
      const confirmMatch = xmlContent.match(confirmButtonRegex);

      if (!confirmMatch) {
        console.error('❌ 未找到确定按钮');
        return;
      }

      const bounds = confirmMatch[1];
      console.log('🎯 找到确定按钮，bounds:', bounds);

      // 3. 方案1：通过resource-id点击
      console.log('🚀 方案1：通过resource-id点击...');
      try {
        const result1 = await invokeCompat('adb_click_element', {
          deviceId: this.deviceId,
          resourceId: 'android:id/button1'
        });
        console.log('✅ resource-id点击结果:', result1);
        
        if (result1) {
          console.log('🎉 点击成功！');
          return;
        }
      } catch (error) {
        console.warn('⚠️ resource-id点击失败:', error);
      }

      // 4. 方案2：通过坐标点击
      console.log('🚀 方案2：通过坐标点击...');
      const coords = this.parseBounds(bounds);
      if (coords) {
        try {
          const result2 = await invokeCompat('adb_tap_coordinate', {
            deviceId: this.deviceId,
            x: coords.centerX,
            y: coords.centerY
          });
          console.log('✅ 坐标点击结果:', result2);
          console.log(`🎯 点击坐标: (${coords.centerX}, ${coords.centerY})`);
        } catch (error) {
          console.error('❌ 坐标点击失败:', error);
        }
      } else {
        console.error('❌ 无法解析坐标');
      }

    } catch (error) {
      console.error('❌ 点击测试失败:', error);
    }
  }

  /**
   * 解析bounds坐标
   */
  private parseBounds(bounds: string): { centerX: number; centerY: number } | null {
    const match = bounds.match(/\[(\d+),(\d+)\]\[(\d+),(\d+)\]/);
    if (!match) return null;

    const left = parseInt(match[1]);
    const top = parseInt(match[2]);
    const right = parseInt(match[3]);
    const bottom = parseInt(match[4]);

    return {
      centerX: Math.floor((left + right) / 2),
      centerY: Math.floor((top + bottom) / 2)
    };
  }

  /**
   * 完整的自动化测试
   */
  async runFullTest(): Promise<void> {
    console.log('🧪 开始完整自动化测试...\n');

    // 1. 分析当前页面
    await this.analyzeCurrentPage();

    // 2. 等待2秒
    console.log('\n⏱️ 等待2秒...');
    await new Promise(resolve => setTimeout(resolve, 2000));

    // 3. 执行点击测试
    await this.testClick();

    // 4. 等待1秒查看结果
    console.log('\n⏱️ 等待1秒查看结果...');
    await new Promise(resolve => setTimeout(resolve, 1000));

    // 5. 再次分析页面（检查是否成功）
    console.log('\n🔍 验证点击结果...');
    await this.analyzeCurrentPage();
  }
}

// 导出便捷函数
export async function debugContactImport(deviceId: string): Promise<void> {
  const debugTool = new ContactImportDebugger(deviceId);
  await debugTool.runFullTest();
}

export async function quickAnalyze(deviceId: string): Promise<void> {
  const debugTool = new ContactImportDebugger(deviceId);
  await debugTool.analyzeCurrentPage();
}

export async function quickClick(deviceId: string): Promise<void> {
  const debugTool = new ContactImportDebugger(deviceId);
  await debugTool.testClick();
}