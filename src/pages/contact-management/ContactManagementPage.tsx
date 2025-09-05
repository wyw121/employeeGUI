import React, { useState, useEffect } from 'react';
import { 
  FileText, 
  Users, 
  Play, 
  Settings,
  RefreshCw,
  Trash2,
  AlertCircle,
  CheckCircle
} from 'lucide-react';
import { ContactDocument, Contact, ContactTask, DocumentStatus } from '../../types';
import { ContactDocumentUploader } from '../../components/contact/ContactDocumentUploader';
import { ContactList } from '../../components/contact/ContactList';
import { ContactTaskForm } from '../../components/contact/ContactTaskForm';
import { ContactStatistics } from '../../components/contact/ContactStatistics';

/**
 * 通讯录管理页面
 * 功能：上传通讯录文档、解析联系人信息、创建联系任务
 */
export const ContactManagementPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'documents' | 'contacts' | 'tasks' | 'statistics'>('documents');
  const [documents, setDocuments] = useState<ContactDocument[]>([]);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [tasks, setTasks] = useState<ContactTask[]>([]);
  const [selectedDocument, setSelectedDocument] = useState<ContactDocument | null>(null);

  // 模拟数据
  useEffect(() => {
    setDocuments([
      {
        id: '1',
        filename: '客户通讯录_2024.txt',
        filepath: 'C:\\Documents\\客户通讯录_2024.txt',
        uploadTime: new Date(),
        totalContacts: 150,
        processedContacts: 150,
        status: 'completed',
        format: 'txt'
      },
      {
        id: '2', 
        filename: '潜在客户.csv',
        filepath: 'C:\\Documents\\潜在客户.csv',
        uploadTime: new Date(),
        totalContacts: 89,
        processedContacts: 45,
        status: 'processing',
        format: 'csv'
      }
    ]);

    setContacts([
      {
        id: '1',
        name: '张三',
        phone: '13800138001',
        wechat: 'zhangsan001',
        platform: 'wechat',
        tags: ['VIP客户', '高价值'],
        notes: '重要客户，优先联系'
      },
      {
        id: '2',
        name: '李四', 
        phone: '13800138002',
        qq: '123456789',
        platform: 'qq',
        tags: ['潜在客户'],
        notes: '对产品有兴趣'
      }
    ]);
  }, []);

  const tabs = [
    { key: 'documents', label: '文档管理', icon: FileText, count: documents.length },
    { key: 'contacts', label: '联系人', icon: Users, count: contacts.length },
    { key: 'tasks', label: '联系任务', icon: Play, count: tasks.length },
    { key: 'statistics', label: '联系统计', icon: RefreshCw, count: undefined }
  ];

  const getStatusIcon = (status: DocumentStatus) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="w-5 h-5 text-green-500" />;
      case 'processing':
      case 'parsing':
        return <RefreshCw className="w-5 h-5 text-blue-500 animate-spin" />;
      case 'error':
        return <AlertCircle className="w-5 h-5 text-red-500" />;
      default:
        return <FileText className="w-5 h-5 text-gray-500" />;
    }
  };

  const getStatusText = (status: DocumentStatus) => {
    const statusMap: Record<DocumentStatus, string> = {
      uploading: '上传中',
      parsing: '解析中',
      parsed: '解析完成',
      processing: '处理中',
      completed: '已完成',
      error: '错误'
    };
    return statusMap[status] || status;
  };

  const getTaskStatusClass = (status: string) => {
    switch (status) {
      case 'completed':
        return 'bg-green-100 text-green-800';
      case 'running':
        return 'bg-blue-100 text-blue-800';
      case 'failed':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const handleUploadSuccess = (document: ContactDocument) => {
    setDocuments(prev => [document, ...prev]);
  };

  const handleDeleteDocument = (documentId: string) => {
    setDocuments(prev => prev.filter(doc => doc.id !== documentId));
    if (selectedDocument?.id === documentId) {
      setSelectedDocument(null);
    }
  };

  const renderDocumentsTab = () => (
    <div className="space-y-6">
      {/* 上传区域 */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <h3 className="text-lg font-medium text-gray-900 mb-4">上传通讯录文档</h3>
        <ContactDocumentUploader onUploadSuccess={handleUploadSuccess} />
      </div>

      {/* 文档列表 */}
      <div className="bg-white rounded-lg border border-gray-200">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-medium text-gray-900">文档列表</h3>
        </div>
        <div className="divide-y divide-gray-200">
          {documents.map((document) => (
            <div key={document.id} className="p-6 hover:bg-gray-50">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  {getStatusIcon(document.status)}
                  <div>
                    <h4 className="text-sm font-medium text-gray-900">{document.filename}</h4>
                    <p className="text-sm text-gray-500">
                      {document.totalContacts} 个联系人 • {getStatusText(document.status)}
                    </p>
                    <p className="text-xs text-gray-400 mt-1">
                      上传时间: {document.uploadTime.toLocaleString()}
                    </p>
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  {document.status === 'processing' && (
                    <div className="flex items-center text-sm text-blue-600">
                      <RefreshCw className="w-4 h-4 mr-1 animate-spin" />
                      {document.processedContacts}/{document.totalContacts}
                    </div>
                  )}
                  <button
                    onClick={() => setSelectedDocument(document)}
                    className="text-blue-600 hover:text-blue-700 text-sm font-medium"
                  >
                    查看详情
                  </button>
                  <button
                    onClick={() => handleDeleteDocument(document.id)}
                    className="text-red-600 hover:text-red-700"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
              {document.status === 'processing' && (
                <div className="mt-3">
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div
                      className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                      style={{ 
                        width: `${(document.processedContacts / document.totalContacts) * 100}%` 
                      }}
                    />
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );

  const renderContactsTab = () => (
    <div className="bg-white rounded-lg border border-gray-200">
      <div className="px-6 py-4 border-b border-gray-200">
        <h3 className="text-lg font-medium text-gray-900">联系人列表</h3>
      </div>
      <ContactList contacts={contacts} onContactSelect={(contact) => console.log('Selected:', contact)} />
    </div>
  );

  const renderTasksTab = () => (
    <div className="space-y-6">
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <h3 className="text-lg font-medium text-gray-900 mb-4">创建联系任务</h3>
        <ContactTaskForm 
          contacts={contacts}
          onTaskCreate={(task) => {
            setTasks(prev => [task, ...prev]);
          }}
        />
      </div>

      <div className="bg-white rounded-lg border border-gray-200">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-medium text-gray-900">任务列表</h3>
        </div>
        <div className="divide-y divide-gray-200">
          {tasks.length === 0 ? (
            <div className="p-6 text-center text-gray-500">
              还没有创建任何联系任务
            </div>
          ) : (
            tasks.map((task) => (
              <div key={task.id} className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="text-sm font-medium text-gray-900">
                      联系任务 #{task.id}
                    </h4>
                    <p className="text-sm text-gray-500">
                      {task.contacts.length} 个联系人 • {task.platform}
                    </p>
                  </div>
                  <div className="flex items-center space-x-2">
                    <span className={`px-2 py-1 text-xs rounded-full ${
                      getTaskStatusClass(task.status)
                    }`}>
                      {task.status}
                    </span>
                    <button className="text-blue-600 hover:text-blue-700">
                      <Settings className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );

  const renderStatisticsTab = () => (
    <ContactStatistics />
  );

  const renderTabContent = () => {
    switch (activeTab) {
      case 'documents':
        return renderDocumentsTab();
      case 'contacts':
        return renderContactsTab();
      case 'tasks':
        return renderTasksTab();
      case 'statistics':
        return renderStatisticsTab();
      default:
        return renderDocumentsTab();
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">通讯录管理</h1>
        <p className="mt-2 text-sm text-gray-600">
          上传通讯录文档，管理联系人信息，创建自动联系任务
        </p>
      </div>

      {/* 选项卡导航 */}
      <div className="border-b border-gray-200 mb-8">
        <nav className="-mb-px flex space-x-8">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key as any)}
                className={`py-2 px-1 border-b-2 font-medium text-sm flex items-center space-x-2 ${
                  activeTab === tab.key
                    ? 'border-indigo-500 text-indigo-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <Icon className="w-4 h-4" />
                <span>{tab.label}</span>
                {tab.count !== undefined && (
                  <span className={`ml-2 py-0.5 px-2 rounded-full text-xs ${
                    activeTab === tab.key
                      ? 'bg-indigo-100 text-indigo-600'
                      : 'bg-gray-100 text-gray-600'
                  }`}>
                    {tab.count}
                  </span>
                )}
              </button>
            );
          })}
        </nav>
      </div>

      {/* 选项卡内容 */}
      {renderTabContent()}
    </div>
  );
};
