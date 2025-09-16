import React, { useEffect, useState } from "react";
import { isTauri } from '@tauri-apps/api/core';
import { AntDesignIntegrationDemo } from "./components/AntDesignDemo";
import "./style.css";

function App() {
  const [tauriReady, setTauriReady] = useState(false);

  useEffect(() => {
    // 检查并等待Tauri环境准备就绪
    const initializeTauri = async () => {
      try {
        if (isTauri()) {
          console.log('✅ Tauri environment detected');
          // 给Tauri一点时间完成初始化
          await new Promise(resolve => setTimeout(resolve, 100));
        } else {
          console.warn('⚠️ Not running in Tauri environment - some features may not work');
        }
      } catch (error) {
        console.error('❌ Tauri initialization error:', error);
      } finally {
        setTauriReady(true);
      }
    };

    initializeTauri();
  }, []);

  if (!tauriReady) {
    return (
      <div style={{ 
        display: 'flex', 
        justifyContent: 'center', 
        alignItems: 'center', 
        height: '100vh',
        fontSize: '16px'
      }}>
        正在初始化应用...
      </div>
    );
  }

  // 只显示Ant Design集成方案
  return <AntDesignIntegrationDemo />;
}

export default App;

