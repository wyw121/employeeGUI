import {
    AlertCircle,
    BookOpen,
    CheckCircle,
    FileText,
    Mail,
    MessageCircle,
    Phone,
    Play,
    RefreshCw,
    Tag,
    Trash2,
    User,
    Users
} from 'lucide-react';
import React, { useEffect, useState } from 'react';
import { ContactDocumentUploader } from '../../components/contact/ContactDocumentUploader';
import { ContactFollowTask } from '../../components/contact/ContactFollowTask';
import { ContactList } from '../../components/contact/ContactList';
import { ContactStatistics } from '../../components/contact/ContactStatistics';
import { PageWrapper } from '../../components/layout';
import { Contact, ContactDocument, DocumentStatus } from '../../types';

/**
 * 通讯录管理页面
 * 功能：上传通讯录文档、解析联系人信息、创建联系任务
 */
export const ContactManagementPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'documents' | 'contacts' | 'follow' | 'statistics'>('documents');
  const [documents, setDocuments] = useState<ContactDocument[]>([]);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [selectedDocument, setSelectedDocument] = useState<ContactDocument | null>(null);
  const [selectedContact, setSelectedContact] = useState<Contact | null>(null);
  const [showContactDetail, setShowContactDetail] = useState(false);

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
    { key: 'follow', label: '关注任务', icon: Play, count: undefined },
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

  const handleUploadSuccess = (document: ContactDocument, contacts: Contact[]) => {
    setDocuments(prev => [document, ...prev]);
    // 将解析的联系人添加到联系人列表中
    setContacts(prev => [...contacts, ...prev]);
    console.log(`成功导入文档：${document.filename}，包含 ${contacts.length} 个联系人`);
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

  const handleContactSelect = (contact: Contact) => {
    setSelectedContact(contact);
    setShowContactDetail(true);
  };

  const renderContactsTab = () => (
    <div className="bg-white rounded-lg border border-gray-200">
      <div className="px-6 py-4 border-b border-gray-200">
        <h3 className="text-lg font-medium text-gray-900">联系人列表</h3>
      </div>
      <ContactList contacts={contacts} onContactSelect={handleContactSelect} />
    </div>
  );

  const renderFollowTab = () => (
    <ContactFollowTask contacts={contacts} />
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
      case 'follow':
        return renderFollowTab();
      case 'statistics':
        return renderStatisticsTab();
      default:
        return renderDocumentsTab();
    }
  };

  return (
    <PageWrapper
      title="通讯录管理"
      subtitle="上传通讯录文档，管理联系人信息，创建自动联系任务"
      icon={<BookOpen className="w-6 h-6 text-indigo-600" />}
      onRefresh={() => window.location.reload()}
    >
      <div className="space-y-6">
        {/* 选项卡导航 */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm">
          <div className="border-b border-gray-200">
            <nav className="flex space-x-8 px-6">
              {tabs.map((tab) => {
                const Icon = tab.icon;
                return (
                  <button
                    key={tab.key}
                    onClick={() => setActiveTab(tab.key as any)}
                    className={`py-4 px-1 border-b-2 font-medium text-sm flex items-center space-x-2 transition-colors ${
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
          <div className="p-6">
            {renderTabContent()}
          </div>
        </div>
      </div>

      {/* 联系人详情弹窗 */}
      {showContactDetail && selectedContact && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
            <div className="mt-3">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-medium text-gray-900">联系人详情</h3>
                <button
                  onClick={() => setShowContactDetail(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  ✕
                </button>
              </div>

              <div className="space-y-4">
                <div className="flex items-center space-x-3">
                  <div className="w-12 h-12 rounded-full bg-indigo-100 flex items-center justify-center">
                    <User className="w-6 h-6 text-indigo-600" />
                  </div>
                  <div>
                    <h4 className="text-lg font-medium text-gray-900">{selectedContact.name}</h4>
                  </div>
                </div>

                {selectedContact.phone && (
                  <div className="flex items-center space-x-3 text-gray-600">
                    <Phone className="w-5 h-5" />
                    <span>{selectedContact.phone}</span>
                  </div>
                )}

                {selectedContact.email && (
                  <div className="flex items-center space-x-3 text-gray-600">
                    <Mail className="w-5 h-5" />
                    <span>{selectedContact.email}</span>
                  </div>
                )}

                {selectedContact.wechat && (
                  <div className="flex items-center space-x-3 text-gray-600">
                    <MessageCircle className="w-5 h-5" />
                    <span>微信: {selectedContact.wechat}</span>
                  </div>
                )}

                {selectedContact.notes && (
                  <div className="space-y-2">
                    <div className="text-sm font-medium text-gray-700">备注</div>
                    <p className="text-sm text-gray-600 bg-gray-50 p-3 rounded-md">
                      {selectedContact.notes}
                    </p>
                  </div>
                )}

                {selectedContact.tags && selectedContact.tags.length > 0 && (
                  <div className="space-y-2">
                    <div className="text-sm font-medium text-gray-700">标签</div>
                    <div className="flex flex-wrap gap-2">
                      {selectedContact.tags.map((tag) => (
                        <span
                          key={tag}
                          className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-indigo-100 text-indigo-800"
                        >
                          <Tag className="w-3 h-3 mr-1" />
                          {tag}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              <div className="mt-6 flex justify-end space-x-3">
                <button
                  onClick={() => setShowContactDetail(false)}
                  className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50"
                >
                  关闭
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </PageWrapper>
  );
};

