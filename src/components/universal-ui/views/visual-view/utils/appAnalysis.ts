// 应用与页面信息分析工具（从 VisualElementView 抽离）

export interface AppPageInfo { appName: string; pageName: string; }

export function analyzeAppAndPageInfo(xmlString: string): AppPageInfo {
  if (!xmlString) return { appName: "未知应用", pageName: "未知页面" };
  try {
    const parser = new DOMParser();
    const xmlDoc = parser.parseFromString(xmlString, 'text/xml');
    let appName = '未知应用';
    const rootNode = xmlDoc.querySelector('hierarchy node');
    if (rootNode) {
      const packageName = rootNode.getAttribute('package') || '';
      const appMappings: Record<string,string> = {
        'com.xingin.xhs':'小红书','com.tencent.mm':'微信','com.taobao.taobao':'淘宝','com.jingdong.app.mall':'京东','com.tmall.wireless':'天猫','com.sina.weibo':'微博','com.ss.android.ugc.aweme':'抖音','com.tencent.mobileqq':'QQ','com.alibaba.android.rimet':'钉钉','com.autonavi.minimap':'高德地图','com.baidu.BaiduMap':'百度地图','com.netease.cloudmusic':'网易云音乐','com.tencent.qqmusic':'QQ音乐'
      };
      appName = appMappings[packageName] || packageName.split('.').pop() || '未知应用';
    }
    let pageName = '未知页面';
    const allNodes = xmlDoc.querySelectorAll('node');
    const selectedTabs: string[] = [];
    allNodes.forEach(node => {
      const text = node.getAttribute('text') || '';
      const contentDesc = node.getAttribute('content-desc') || '';
      const selected = node.getAttribute('selected') === 'true';
      if ((contentDesc.includes('首页')||contentDesc.includes('市集')||contentDesc.includes('发布')||contentDesc.includes('消息')||contentDesc.includes('我')||['首页','市集','消息','我'].includes(text)) && selected) {
        selectedTabs.push(text || contentDesc);
      }
      if ((text === '关注' || text === '发现' || text === '视频') && selected) {
        selectedTabs.push(text);
      }
    });
    if (selectedTabs.length) {
      const bottomNav = selectedTabs.find(t=>['首页','市集','发布','消息','我'].includes(t)) || '';
      const topTab = selectedTabs.find(t=>['关注','发现','视频'].includes(t)) || '';
      if (bottomNav && topTab) pageName = `${bottomNav}-${topTab}页面`; else if (bottomNav) pageName = `${bottomNav}页面`; else if (topTab) pageName = `${topTab}页面`;
    }
    if (pageName === '未知页面') {
      const allText = Array.from(allNodes).map(n => `${n.getAttribute('text')||''} ${n.getAttribute('content-desc')||''}`).join(' ').toLowerCase();
      if (allText.includes('登录')||allText.includes('注册')) pageName='登录注册页面';
      else if (allText.includes('设置')) pageName='设置页面';
      else if (allText.includes('搜索')) pageName='搜索页面';
      else pageName='主页面';
    }
    return { appName, pageName };
  } catch (e) {
    console.error('分析APP和页面信息失败', e);
    return { appName: '未知应用', pageName: '未知页面' };
  }
}
