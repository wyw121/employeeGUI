/**
 * 小红书关注功能独立测试入口
 * 
 * 这个文件可以独立运行，不依赖主项目的其他模块
 * 用于在集成前验证小红书关注功能是否正常工作
 */

import React from 'react';
import { ConfigProvider } from 'antd';
import zhCN from 'antd/locale/zh_CN';
import XiaohongshuTestPage from './XiaohongshuTestPage';

/**
 * 独立测试应用
 */
const StandaloneTestApp: React.FC = () => {
  return (
    <ConfigProvider locale={zhCN}>
      <div style={{ 
        minHeight: '100vh',
        padding: '0',
        margin: '0'
      }}>
        <XiaohongshuTestPage />
      </div>
    </ConfigProvider>
  );
};

export default StandaloneTestApp;