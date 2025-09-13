/**
 * 小红书关注功能测试路由配置
 * 
 * 添加这个路由配置可以让您通过 /xiaohongshu-test 路径访问测试页面
 */

import React from 'react';
import { Routes, Route } from 'react-router-dom';
import XiaohongshuTestPage from './XiaohongshuTestPage';
import XiaohongshuQuickTest from './XiaohongshuQuickTest';
import XiaohongshuScriptTest from './XiaohongshuScriptTest';
import XiaohongshuFollowTest from './XiaohongshuFollowTest';

/**
 * 小红书测试路由组件
 */
export const XiaohongshuTestRoutes: React.FC = () => {
  return (
    <Routes>
      {/* 主测试页面 - 包含所有测试选项卡 */}
      <Route path="/xiaohongshu-test" element={<XiaohongshuTestPage />} />
      
      {/* 单独的测试组件路由 */}
      <Route path="/xiaohongshu-test/quick" element={<XiaohongshuQuickTest />} />
      <Route path="/xiaohongshu-test/script" element={<XiaohongshuScriptTest />} />
      <Route path="/xiaohongshu-test/component" element={<XiaohongshuFollowTest />} />
    </Routes>
  );
};

/**
 * 独立测试页面组件（不需要路由）
 */
export const StandaloneXiaohongshuTest: React.FC = () => {
  return <XiaohongshuTestPage />;
};

export default XiaohongshuTestRoutes;