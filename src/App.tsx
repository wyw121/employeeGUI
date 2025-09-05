import { useEffect, useState } from "react";
import { AuthGuard } from "./components/auth/AuthGuard";
import { AppHeader, MainLayout, Sidebar, StatusBar } from "./components/layout";
import { useAuth, useDevices } from "./hooks";
import {
    ContactManagementPage,
    DeviceManagementPage,
    StatisticsPage,
    TaskManagementPage
} from "./pages";
import { AdbTestPage } from "./pages/AdbTestPage";
import "./style.css";

function App() {
  const [currentPage, setCurrentPage] = useState('devices');
  const [balance] = useState(1000);
  const [currentTime, setCurrentTime] = useState(new Date().toLocaleTimeString());
  const { devices } = useDevices();
  const { employee, logout } = useAuth();

  // 更新时间
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date().toLocaleTimeString('zh-CN', {
        hour12: false,
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit'
      }));
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  // 模拟窗口控制函数
  const handleMinimize = () => {
    // 在Tauri应用中，这里会调用Tauri API
    console.log('最小化窗口');
  };

  const handleMaximize = () => {
    // 在Tauri应用中，这里会调用Tauri API
    console.log('最大化窗口');
  };

  const handleClose = () => {
    // 在Tauri应用中，这里会调用Tauri API
    console.log('关闭应用');
  };

  const renderCurrentPage = () => {
    switch (currentPage) {
      case 'devices':
        return <DeviceManagementPage />;
      case 'contacts':
        return <ContactManagementPage />;
      case 'tasks':
        return <TaskManagementPage />;
      case 'statistics':
        return <StatisticsPage />;
      case 'adb-test':
        return <AdbTestPage />;
      default:
        return <DeviceManagementPage />;
    }
  };

  const header = (
    <AppHeader
      title="社交平台自动化操作系统"
      user={{
        name: employee?.displayName || "未登录用户",
        avatar: employee?.avatar
      }}
      onMinimize={handleMinimize}
      onMaximize={handleMaximize}
      onClose={handleClose}
      onSettings={() => console.log('打开设置')}
      onProfile={() => console.log('打开个人资料')}
      onLogout={logout}
    />
  );

  const sidebar = (
    <Sidebar
      currentPage={currentPage}
      onPageChange={setCurrentPage}
      balance={balance}
    />
  );

  const statusBar = (
    <StatusBar
      isConnected={true}
      activeDevices={devices.filter(d => d.status === 'connected').length}
      totalDevices={devices.length}
      currentTime={currentTime}
      status={`当前页面: ${getCurrentPageName(currentPage)}`}
    />
  );

  return (
    <AuthGuard>
      <MainLayout sidebar={sidebar} header={header} statusBar={statusBar}>
        {renderCurrentPage()}
      </MainLayout>
    </AuthGuard>
  );
}

// 辅助函数：获取当前页面名称
function getCurrentPageName(pageId: string): string {
  const pageNames: Record<string, string> = {
    devices: '设备管理',
    contacts: '通讯录管理',
    tasks: '任务管理',
    statistics: '关注统计',
    'adb-test': 'ADB测试'
  };
  return pageNames[pageId] || '未知页面';
}

export default App;
