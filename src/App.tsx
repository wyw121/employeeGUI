import { useState } from "react";
import { MainLayout, Sidebar } from "./components/layout";
import { 
  DeviceManagementPage, 
  TaskManagementPage, 
  StatisticsPage,
  ContactManagementPage
} from "./pages";
import "./style.css";

function App() {
  const [currentPage, setCurrentPage] = useState('devices');
  const [balance] = useState(1000); // 示例余额，实际应该从API获取

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
      default:
        return <DeviceManagementPage />;
    }
  };

  const sidebar = (
    <Sidebar
      currentPage={currentPage}
      onPageChange={setCurrentPage}
      balance={balance}
    />
  );

  return (
    <MainLayout sidebar={sidebar}>
      {renderCurrentPage()}
    </MainLayout>
  );
}

export default App;
