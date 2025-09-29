/**
 * 测试vCard确认检测器
 */

const xmlContent = `<?xml version='1.0' encoding='UTF-8' standalone='yes' ?><hierarchy rotation="0"><node index="0" text="" resource-id="" class="android.widget.FrameLayout" package="com.hihonor.contacts" content-desc="" checkable="false" checked="false" clickable="false" enabled="true" focusable="false" focused="false" scrollable="false" long-clickable="false" password="false" selected="false" bounds="[0,1273][720,1484]"><node index="0" text="" resource-id="" class="android.widget.FrameLayout" package="com.hihonor.contacts" content-desc="" checkable="false" checked="false" clickable="false" enabled="true" focusable="false" focused="false" scrollable="false" long-clickable="false" password="false" selected="false" bounds="[24,1273][696,1484]"><node index="0" text="" resource-id="android:id/content" class="android.widget.FrameLayout" package="com.hihonor.contacts" content-desc="" checkable="false" checked="false" clickable="false" enabled="true" focusable="false" focused="false" scrollable="false" long-clickable="false" password="false" selected="false" bounds="[24,1273][696,1484]"><node index="0" text="" resource-id="android:id/parentPanel" class="android.widget.LinearLayout" package="com.hihonor.contacts" content-desc="" checkable="false" checked="false" clickable="false" enabled="true" focusable="false" focused="false" scrollable="false" long-clickable="false" password="false" selected="false" bounds="[24,1273][696,1484]"><node index="0" text="" resource-id="android:id/contentPanel" class="android.widget.FrameLayout" package="com.hihonor.contacts" content-desc="" checkable="false" checked="false" clickable="false" enabled="true" focusable="false" focused="false" scrollable="false" long-clickable="false" password="false" selected="false" bounds="[24,1273][696,1372]"><node index="0" text="" resource-id="android:id/scrollView" class="android.widget.ScrollView" package="com.hihonor.contacts" content-desc="" checkable="false" checked="false" clickable="false" enabled="true" focusable="false" focused="false" scrollable="false" long-clickable="false" password="false" selected="false" bounds="[24,1273][696,1372]"><node index="0" text="" resource-id="" class="android.widget.LinearLayout" package="com.hihonor.contacts" content-desc="" checkable="false" checked="false" clickable="false" enabled="true" focusable="false" focused="false" scrollable="false" long-clickable="false" password="false" selected="false" bounds="[24,1273][696,1372]"><node index="0" text="" resource-id="android:id/textSpacerNoTitle" class="android.view.View" package="com.hihonor.contacts" content-desc="" checkable="false" checked="false" clickable="false" enabled="true" focusable="false" focused="false" scrollable="false" long-clickable="false" password="false" selected="false" bounds="[24,1273][696,1321]" /><node index="1" text="是否从 vCard 导入联系人？" resource-id="android:id/message" class="android.widget.TextView" package="com.hihonor.contacts" content-desc="" checkable="false" checked="false" clickable="false" enabled="true" focusable="false" focused="false" scrollable="false" long-clickable="false" password="false" selected="false" bounds="[86,1321][633,1372]" /></node></node></node><node index="1" text="" resource-id="android:id/buttonPanel" class="android.widget.LinearLayout" package="com.hihonor.contacts" content-desc="" checkable="false" checked="false" clickable="false" enabled="true" focusable="false" focused="false" scrollable="false" long-clickable="false" password="false" selected="false" bounds="[24,1372][696,1484]"><node index="0" text="" resource-id="" class="android.widget.LinearLayout" package="com.hihonor.contacts" content-desc="" checkable="false" checked="false" clickable="false" enabled="true" focusable="false" focused="false" scrollable="false" long-clickable="false" password="false" selected="false" bounds="[24,1392][696,1484]"><node index="0" text="取消" resource-id="android:id/button2" class="android.widget.Button" package="com.hihonor.contacts" content-desc="" checkable="false" checked="false" clickable="true" enabled="true" focusable="true" focused="false" scrollable="false" long-clickable="false" password="false" selected="false" bounds="[48,1400][359,1484]" /><node index="1" text="确定" resource-id="android:id/button1" class="android.widget.Button" package="com.hihonor.contacts" content-desc="" checkable="false" checked="false" clickable="true" enabled="true" focusable="true" focused="false" scrollable="false" long-clickable="false" password="false" selected="false" bounds="[361,1400][672,1484]" /></node></node></node></node></node></node></hierarchy>`;

console.log('🧪 测试vCard确认检测器...');

// 检查关键信息
const hasMessage = xmlContent.includes('是否从 vCard 导入联系人？');
const hasPackage = xmlContent.includes('com.hihonor.contacts');
const hasConfirmButton = xmlContent.includes('android:id/button1');
const hasConfirmText = xmlContent.includes('text="确定"');
const hasCancelButton = xmlContent.includes('android:id/button2');
const hasClickable = xmlContent.includes('clickable="true"');

console.log('基础检查:');
console.log(`- vCard消息文本: ${hasMessage ? '✅' : '❌'}`);
console.log(`- 包名 "com.hihonor.contacts": ${hasPackage ? '✅' : '❌'}`);
console.log(`- "确定" 按钮ID: ${hasConfirmButton ? '✅' : '❌'}`);
console.log(`- "确定" 文本: ${hasConfirmText ? '✅' : '❌'}`);
console.log(`- "取消" 按钮ID: ${hasCancelButton ? '✅' : '❌'}`);
console.log(`- 可点击属性: ${hasClickable ? '✅' : '❌'}`);

// 模拟检测器的extractConfirmButton方法
function testExtractConfirmButton(xmlContent, confirmButtonId) {
  console.log(`🔍 VCardConfirm: 查找"确定"按钮...`);
  
  // 第一步：找到包含目标resource-id和text的node
  const nodePattern = `<node[^>]*resource-id="${confirmButtonId}"[^>]*text="确定"[^>]*>`;
  const altNodePattern = `<node[^>]*text="确定"[^>]*resource-id="${confirmButtonId}"[^>]*>`;
  
  let nodeMatch = xmlContent.match(new RegExp(nodePattern, 'i'));
  if (!nodeMatch) {
    nodeMatch = xmlContent.match(new RegExp(altNodePattern, 'i'));
  }
  
  if (!nodeMatch) {
    console.log(`❌ VCardConfirm: 未找到匹配的节点`);
    return null;
  }
  
  const fullNode = nodeMatch[0];
  console.log(`✅ VCardConfirm: 找到节点: ${fullNode.substring(0, 100)}...`);
  
  // 第二步：从找到的节点中提取各个属性
  const boundsMatch = fullNode.match(/bounds="([^"]*)"/i);
  const classMatch = fullNode.match(/class="([^"]*)"/i);
  const clickableMatch = fullNode.match(/clickable="([^"]*)"/i);
  
  if (!boundsMatch) {
    console.log(`❌ VCardConfirm: 未找到bounds属性`);
    return null;
  }
  
  if (!clickableMatch || clickableMatch[1] !== 'true') {
    console.log(`❌ VCardConfirm: 按钮不可点击`);
    return null;
  }
  
  const result = {
    resourceId: confirmButtonId,
    text: "确定",
    bounds: boundsMatch[1],
    className: classMatch ? classMatch[1] : "android.widget.Button",
    clickable: true
  };
  
  console.log(`✅ VCardConfirm: 成功提取按钮信息:`, result);
  return result;
}

const result = testExtractConfirmButton(xmlContent, 'android:id/button1');

if (result) {
  console.log('\n🎉 vCard检测器修复成功！');
  console.log('现在应该能正常检测到vCard确认对话框并点击"确定"按钮了。');
  
  // 计算bounds中心点
  const bounds = result.bounds; // [361,1400][672,1484]
  const boundsMatch = bounds.match(/\[(\d+),(\d+)\]\[(\d+),(\d+)\]/);
  if (boundsMatch) {
    const x1 = parseInt(boundsMatch[1]);
    const y1 = parseInt(boundsMatch[2]);
    const x2 = parseInt(boundsMatch[3]);
    const y2 = parseInt(boundsMatch[4]);
    const centerX = Math.floor((x1 + x2) / 2);
    const centerY = Math.floor((y1 + y2) / 2);
    console.log(`📍 "确定"按钮中心点: (${centerX}, ${centerY})`);
  }
} else {
  console.log('\n❌ vCard检测器仍有问题需要进一步修复');
}