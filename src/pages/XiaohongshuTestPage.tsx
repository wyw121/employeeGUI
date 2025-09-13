/**
 * 小红书好友关注功能测试页面
 * 
 * 用于在应用中独立测试小红书关注功能
 * 访问路径: /xiaohongshu-test
 */

import React from 'react';
import { XiaohongshuFollowTest } from '../components/xiaohongshu-test';

const XiaohongshuTestPage: React.FC = () => {
  const handleFollowComplete = (result: any) => {
    console.log('小红书关注完成:', result);
    
    // 这里可以添加成功后的处理逻辑
    if (result.success) {
      console.log(`✅ 关注成功: ${result.followedCount}/${result.totalContacts}`);
    } else {
      console.log(`❌ 关注失败: ${result.message}`);
    }
  };

  return (
    <div className="xiaohongshu-test-page">
      <XiaohongshuFollowTest
        deviceId="emulator-5556"
        onComplete={handleFollowComplete}
      />
    </div>
  );
};

export default XiaohongshuTestPage;