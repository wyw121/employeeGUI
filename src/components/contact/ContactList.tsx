import { Mail, MessageCircle, Phone, Tag, User } from 'lucide-react';
import React from 'react';
import { Contact, Platform } from '../../types';

interface ContactListProps {
  contacts: Contact[];
  onContactSelect: (contact: Contact) => void;
  selectedContacts?: string[];
  onContactToggle?: (contactId: string) => void;
  multiSelect?: boolean;
}

export const ContactList: React.FC<ContactListProps> = ({
  contacts,
  onContactSelect,
  selectedContacts = [],
  onContactToggle,
  multiSelect = false
}) => {
  const getPlatformIcon = (platform?: Platform) => {
    switch (platform) {
      case 'wechat':
        return '💬';
      case 'qq':
        return '🐧';
      case 'xiaohongshu':
        return '📕';
      case 'douyin':
        return '🎵';
      case 'weibo':
        return '📰';
      default:
        return '👤';
    }
  };

  const getPlatformName = (platform?: Platform) => {
    const names = {
      wechat: '微信',
      qq: 'QQ',
      xiaohongshu: '小红书',
      douyin: '抖音',
      weibo: '微博'
    };
    return platform ? names[platform] : '未知';
  };

  const handleContactClick = (contact: Contact) => {
    if (multiSelect && onContactToggle) {
      onContactToggle(contact.id);
    } else {
      onContactSelect(contact);
    }
  };

  if (contacts.length === 0) {
    return (
      <div className="p-8 text-center">
        <User className="mx-auto h-12 w-12 text-gray-400" />
        <h3 className="mt-4 text-lg font-medium text-gray-900">暂无联系人</h3>
        <p className="mt-2 text-sm text-gray-500">
          请先上传通讯录文档以添加联系人
        </p>
      </div>
    );
  }

  return (
    <div className="divide-y divide-gray-200">
      {contacts.map((contact) => (
        <div
          key={contact.id}
          className={`p-4 hover:bg-gray-50 cursor-pointer transition-colors ${
            selectedContacts.includes(contact.id) ? 'bg-blue-50 border-blue-200' : ''
          }`}
          onClick={() => handleContactClick(contact)}
        >
          <div className="flex items-start space-x-4">
            {multiSelect && (
              <input
                type="checkbox"
                checked={selectedContacts.includes(contact.id)}
                onChange={() => onContactToggle?.(contact.id)}
                className="mt-1 h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
              />
            )}

            <div className="flex-shrink-0">
              <div className="w-10 h-10 rounded-full bg-indigo-100 flex items-center justify-center">
                <span className="text-lg">
                  {getPlatformIcon(contact.platform)}
                </span>
              </div>
            </div>

            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between">
                <h4 className="text-sm font-medium text-gray-900 truncate">
                  {contact.name}
                </h4>
                <span className="text-xs text-gray-500">
                  {getPlatformName(contact.platform)}
                </span>
              </div>

              <div className="mt-1 space-y-1">
                {contact.phone && (
                  <div className="flex items-center text-sm text-gray-600">
                    <Phone className="w-3 h-3 mr-1" />
                    <span>{contact.phone}</span>
                  </div>
                )}

                {contact.email && (
                  <div className="flex items-center text-sm text-gray-600">
                    <Mail className="w-3 h-3 mr-1" />
                    <span>{contact.email}</span>
                  </div>
                )}

                {contact.wechat && (
                  <div className="flex items-center text-sm text-gray-600">
                    <MessageCircle className="w-3 h-3 mr-1" />
                    <span>微信: {contact.wechat}</span>
                  </div>
                )}

                {contact.qq && (
                  <div className="flex items-center text-sm text-gray-600">
                    <MessageCircle className="w-3 h-3 mr-1" />
                    <span>QQ: {contact.qq}</span>
                  </div>
                )}
              </div>

              {contact.tags && contact.tags.length > 0 && (
                <div className="mt-2 flex flex-wrap gap-1">
                  {contact.tags.map((tag, index) => (
                    <span
                      key={index}
                      className="inline-flex items-center px-2 py-0.5 rounded text-xs bg-gray-100 text-gray-800"
                    >
                      <Tag className="w-3 h-3 mr-1" />
                      {tag}
                    </span>
                  ))}
                </div>
              )}

              {contact.notes && (
                <p className="mt-2 text-sm text-gray-500 line-clamp-2">
                  {contact.notes}
                </p>
              )}

              {contact.lastContactTime && (
                <div className="mt-2 text-xs text-gray-400">
                  最后联系: {contact.lastContactTime.toLocaleDateString()}
                  {contact.contactCount && (
                    <span className="ml-2">
                      已联系 {contact.contactCount} 次
                    </span>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
};

