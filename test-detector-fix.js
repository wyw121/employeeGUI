/**
 * 测试修复后的检测器
 */

const xmlContent = `<?xml version='1.0' encoding='UTF-8' standalone='yes' ?><hierarchy rotation="0"><node index="0" text="" resource-id="" class="android.widget.FrameLayout" package="com.hihonor.android.internal.app" content-desc="" checkable="false" checked="false" clickable="false" enabled="true" focusable="false" focused="false" scrollable="false" long-clickable="false" password="false" selected="false" bounds="[0,813][720,1484]"><node index="0" text="" resource-id="" class="android.widget.FrameLayout" package="com.hihonor.android.internal.app" content-desc="" checkable="false" checked="false" clickable="false" enabled="true" focusable="false" focused="false" scrollable="false" long-clickable="false" password="false" selected="false" bounds="[24,813][696,1484]"><node index="0" text="" resource-id="android:id/content" class="android.widget.FrameLayout" package="com.hihonor.android.internal.app" content-desc="" checkable="false" checked="false" clickable="false" enabled="true" focusable="false" focused="false" scrollable="false" long-clickable="false" password="false" selected="false" bounds="[24,813][696,1484]"><node index="0" text="" resource-id="android:id/parentPanel" class="android.widget.LinearLayout" package="com.hihonor.android.internal.app" content-desc="" checkable="false" checked="false" clickable="false" enabled="true" focusable="false" focused="false" scrollable="false" long-clickable="false" password="false" selected="false" bounds="[24,813][696,1484]"><node index="0" text="" resource-id="android:id/topPanel" class="android.widget.LinearLayout" package="com.hihonor.android.internal.app" content-desc="" checkable="false" checked="false" clickable="false" enabled="true" focusable="false" focused="false" scrollable="false" long-clickable="false" password="false" selected="false" bounds="[24,813][696,939]"><node index="0" text="" resource-id="android:id/title_template" class="android.widget.LinearLayout" package="com.hihonor.android.internal.app" content-desc="" checkable="false" checked="false" clickable="false" enabled="true" focusable="false" focused="false" scrollable="false" long-clickable="false" password="false" selected="false" bounds="[24,813][696,939]"><node index="0" text="使用以下方式打开" resource-id="android:id/alertTitle" class="android.widget.TextView" package="com.hihonor.android.internal.app" content-desc="" checkable="false" checked="false" clickable="false" enabled="true" focusable="false" focused="false" scrollable="false" long-clickable="false" password="false" selected="false" bounds="[72,845][648,907]" /></node></node><node index="1" text="" resource-id="android:id/customPanel" class="android.widget.FrameLayout" package="com.hihonor.android.internal.app" content-desc="" checkable="false" checked="false" clickable="false" enabled="true" focusable="false" focused="false" scrollable="false" long-clickable="false" password="false" selected="false" bounds="[24,939][696,1484]"><node index="0" text="" resource-id="android:id/custom" class="android.widget.FrameLayout" package="com.hihonor.android.internal.app" content-desc="" checkable="false" checked="false" clickable="false" enabled="true" focusable="false" focused="false" scrollable="false" long-clickable="false" password="false" selected="false" bounds="[24,939][696,1484]"><node index="0" text="" resource-id="com.hihonor.android.internal.app:id/contentPanel" class="android.widget.LinearLayout" package="com.hihonor.android.internal.app" content-desc="" checkable="false" checked="false" clickable="false" enabled="true" focusable="false" focused="false" scrollable="false" long-clickable="false" password="false" selected="false" bounds="[24,939][696,1484]"><node index="0" text="" resource-id="" class="android.widget.ScrollView" package="com.hihonor.android.internal.app" content-desc="" checkable="false" checked="false" clickable="false" enabled="true" focusable="true" focused="false" scrollable="false" long-clickable="false" password="false" selected="false" bounds="[24,955][696,1372]"><node index="0" text="" resource-id="" class="android.widget.LinearLayout" package="com.hihonor.android.internal.app" content-desc="" checkable="false" checked="false" clickable="false" enabled="true" focusable="false" focused="false" scrollable="false" long-clickable="false" password="false" selected="false" bounds="[24,955][696,1372]"><node index="1" text="" resource-id="com.hihonor.android.internal.app:id/normal_profile_layout" class="android.widget.LinearLayout" package="com.hihonor.android.internal.app" content-desc="" checkable="false" checked="false" clickable="false" enabled="true" focusable="false" focused="false" scrollable="false" long-clickable="false" password="false" selected="false" bounds="[24,955][696,1372]"><node index="0" text="" resource-id="" class="android.widget.FrameLayout" package="com.hihonor.android.internal.app" content-desc="" checkable="false" checked="false" clickable="false" enabled="true" focusable="false" focused="false" scrollable="false" long-clickable="false" password="false" selected="false" bounds="[24,955][696,1372]"><node index="0" text="" resource-id="" class="android.widget.LinearLayout" package="com.hihonor.android.internal.app" content-desc="" checkable="false" checked="false" clickable="false" enabled="true" focusable="false" focused="false" scrollable="false" long-clickable="false" password="false" selected="false" bounds="[24,955][696,1372]"><node index="0" text="" resource-id="" class="android.widget.LinearLayout" package="com.hihonor.android.internal.app" content-desc="" checkable="false" checked="false" clickable="false" enabled="true" focusable="false" focused="false" scrollable="false" long-clickable="false" password="false" selected="true" bounds="[285,955][435,1105]"><node NAF="true" index="0" text="" resource-id="" class="android.widget.ImageView" package="com.hihonor.android.internal.app" content-desc="" checkable="false" checked="false" clickable="true" enabled="true" focusable="true" focused="false" scrollable="false" long-clickable="true" password="false" selected="true" bounds="[296,966][424,1094]" /></node><node index="1" text="联系人" resource-id="" class="android.widget.TextView" package="com.hihonor.android.internal.app" content-desc="" checkable="false" checked="false" clickable="false" enabled="true" focusable="false" focused="false" scrollable="false" long-clickable="false" password="false" selected="false" bounds="[304,1121][415,1172]" /><node index="2" text="使用其他应用" resource-id="" class="android.widget.TextView" package="com.hihonor.android.internal.app" content-desc="" checkable="false" checked="false" clickable="false" enabled="true" focusable="false" focused="false" scrollable="false" long-clickable="false" password="false" selected="false" bounds="[276,1204][444,1242]" /><node index="3" text="" resource-id="" class="android.widget.GridView" package="com.hihonor.android.internal.app" content-desc="" checkable="false" checked="false" clickable="false" enabled="true" focusable="false" focused="false" scrollable="false" long-clickable="true" password="false" selected="false" bounds="[48,1258][672,1368]"><node index="0" text="" resource-id="" class="android.widget.LinearLayout" package="com.hihonor.android.internal.app" content-desc="" checkable="false" checked="false" clickable="false" enabled="true" focusable="false" focused="false" scrollable="false" long-clickable="false" password="false" selected="false" bounds="[48,1258][352,1368]"><node index="0" text="" resource-id="" class="android.widget.LinearLayout" package="com.hihonor.android.internal.app" content-desc="" checkable="false" checked="false" clickable="false" enabled="true" focusable="false" focused="false" scrollable="false" long-clickable="false" password="false" selected="false" bounds="[168,1258][232,1322]"><node index="0" text="" resource-id="" class="android.widget.ImageView" package="com.hihonor.android.internal.app" content-desc="" checkable="false" checked="false" clickable="false" enabled="true" focusable="false" focused="false" scrollable="false" long-clickable="false" password="false" selected="false" bounds="[176,1266][224,1314]" /></node><node index="1" text="阅读" resource-id="android:id/text1" class="android.widget.TextView" package="com.hihonor.android.internal.app" content-desc="" checkable="false" checked="false" clickable="false" enabled="true" focusable="false" focused="false" scrollable="false" long-clickable="false" password="false" selected="false" bounds="[56,1326][344,1368]" /></node><node index="1" text="" resource-id="" class="android.widget.LinearLayout" package="com.hihonor.android.internal.app" content-desc="" checkable="false" checked="false" clickable="false" enabled="true" focusable="false" focused="false" scrollable="false" long-clickable="false" password="false" selected="false" bounds="[368,1258][672,1368]"><node index="0" text="" resource-id="" class="android.widget.LinearLayout" package="com.hihonor.android.internal.app" content-desc="" checkable="false" checked="false" clickable="false" enabled="true" focusable="false" focused="false" scrollable="false" long-clickable="false" password="false" selected="false" bounds="[488,1258][552,1322]"><node index="0" text="" resource-id="" class="android.widget.ImageView" package="com.hihonor.android.internal.app" content-desc="" checkable="false" checked="false" clickable="false" enabled="true" focusable="false" focused="false" scrollable="false" long-clickable="false" password="false" selected="false" bounds="[496,1266][544,1314]" /></node><node index="1" text="保存到网盘" resource-id="android:id/text1" class="android.widget.TextView" package="com.hihonor.android.internal.app" content-desc="" checkable="false" checked="false" clickable="false" enabled="true" focusable="false" focused="false" scrollable="false" long-clickable="false" password="false" selected="false" bounds="[376,1326][664,1368]" /></node></node></node></node></node></node></node><node index="1" text="" resource-id="android:id/button_bar" class="android.widget.LinearLayout" package="com.hihonor.android.internal.app" content-desc="" checkable="false" checked="false" clickable="false" enabled="true" focusable="false" focused="false" scrollable="false" long-clickable="false" password="false" selected="false" bounds="[24,1372][696,1484]"><node index="0" text="" resource-id="" class="android.widget.LinearLayout" package="com.hihonor.android.internal.app" content-desc="" checkable="false" checked="false" clickable="false" enabled="true" focusable="false" focused="false" scrollable="false" long-clickable="false" password="false" selected="false" bounds="[24,1392][696,1484]"><node index="0" text="仅此一次" resource-id="android:id/button_once" class="android.widget.Button" package="com.hihonor.android.internal.app" content-desc="" checkable="false" checked="false" clickable="true" enabled="true" focusable="true" focused="false" scrollable="false" long-clickable="false" password="false" selected="false" bounds="[48,1400][359,1484]" /><node index="1" text="始终" resource-id="android:id/button_always" class="android.widget.Button" package="com.hihonor.android.internal.app" content-desc="" checkable="false" checked="false" clickable="true" enabled="true" focusable="true" focused="false" scrollable="false" long-clickable="false" password="false" selected="false" bounds="[361,1400][672,1484]" /></node></node></node></node></node></node></node></node></node></hierarchy>`;

console.log('🧪 测试修复后的检测逻辑...');

// 模拟检测器的extractOnceButton方法
function testExtractOnceButton(xmlContent, onceButtonId) {
  console.log(`🔍 查找"仅此一次"按钮...`);
  
  // 第一步：找到包含目标resource-id和text的node
  const nodePattern = `<node[^>]*resource-id="${onceButtonId}"[^>]*text="仅此一次"[^>]*>`;
  const altNodePattern = `<node[^>]*text="仅此一次"[^>]*resource-id="${onceButtonId}"[^>]*>`;
  
  let nodeMatch = xmlContent.match(new RegExp(nodePattern, 'i'));
  if (!nodeMatch) {
    nodeMatch = xmlContent.match(new RegExp(altNodePattern, 'i'));
  }
  
  if (!nodeMatch) {
    console.log(`❌ 未找到匹配的节点`);
    return null;
  }
  
  const fullNode = nodeMatch[0];
  console.log(`✅ 找到节点: ${fullNode.substring(0, 100)}...`);
  
  // 第二步：从找到的节点中提取各个属性
  const boundsMatch = fullNode.match(/bounds="([^"]*)"/i);
  const classMatch = fullNode.match(/class="([^"]*)"/i);
  const clickableMatch = fullNode.match(/clickable="([^"]*)"/i);
  
  if (!boundsMatch) {
    console.log(`❌ 未找到bounds属性`);
    return null;
  }
  
  if (!clickableMatch || clickableMatch[1] !== 'true') {
    console.log(`❌ 按钮不可点击`);
    return null;
  }
  
  const result = {
    resourceId: onceButtonId,
    text: "仅此一次",
    bounds: boundsMatch[1],
    className: classMatch ? classMatch[1] : "android.widget.Button",
    clickable: true
  };
  
  console.log(`✅ 成功提取按钮信息:`, result);
  return result;
}

const result = testExtractOnceButton(xmlContent, 'android:id/button_once');

if (result) {
  console.log('\n🎉 检测器修复成功！');
  console.log('现在应该能正常检测到应用选择器对话框了。');
  
  // 计算bounds中心点
  const bounds = result.bounds; // [48,1400][359,1484]
  const boundsMatch = bounds.match(/\[(\d+),(\d+)\]\[(\d+),(\d+)\]/);
  if (boundsMatch) {
    const x1 = parseInt(boundsMatch[1]);
    const y1 = parseInt(boundsMatch[2]);
    const x2 = parseInt(boundsMatch[3]);
    const y2 = parseInt(boundsMatch[4]);
    const centerX = Math.floor((x1 + x2) / 2);
    const centerY = Math.floor((y1 + y2) / 2);
    console.log(`📍 按钮中心点: (${centerX}, ${centerY})`);
  }
} else {
  console.log('\n❌ 检测器仍有问题需要进一步修复');
}