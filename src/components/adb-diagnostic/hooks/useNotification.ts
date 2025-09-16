import { useState, useEffect, useCallback, useRef } from 'react';
import { useLogManager } from './useLogManager';
import { LogCategory } from '../../../services/adb-diagnostic/LogManager';

export interface NotificationItem {
  id: string;
  type: 'success' | 'info' | 'warning' | 'error';
  title: string;
  message?: string;
  timestamp: Date;
  duration?: number; // 自动消失时间(ms)，0表示不自动消失
  actions?: Array<{
    label: string;
    action: () => void;
    type?: 'primary' | 'default';
  }>;
  data?: any; // 附加数据
  read?: boolean;
}

export interface UseNotificationReturn {
  // 通知数据
  notifications: NotificationItem[];
  unreadCount: number;
  
  // 通知操作
  addNotification: (notification: Omit<NotificationItem, 'id' | 'timestamp'>) => string;
  removeNotification: (id: string) => void;
  markAsRead: (id: string) => void;
  markAllAsRead: () => void;
  clearAll: () => void;
  
  // 便捷方法
  success: (title: string, message?: string, options?: Partial<NotificationItem>) => string;
  info: (title: string, message?: string, options?: Partial<NotificationItem>) => string;
  warning: (title: string, message?: string, options?: Partial<NotificationItem>) => string;
  error: (title: string, message?: string, options?: Partial<NotificationItem>) => string;
  
  // 批量操作
  getNotificationsByType: (type: NotificationItem['type']) => NotificationItem[];
  removeOldNotifications: (olderThan: number) => void; // 删除多少毫秒前的通知
}

/**
 * useNotification Hook
 * 提供统一的通知管理系统
 */
export const useNotification = (
  maxNotifications: number = 50,
  defaultDuration: number = 5000
): UseNotificationReturn => {
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const { info: logInfo } = useLogManager();
  const autoRemoveTimersRef = useRef<Map<string, NodeJS.Timeout>>(new Map());

  // 清理定时器
  useEffect(() => {
    return () => {
      autoRemoveTimersRef.current.forEach(timer => clearTimeout(timer));
      autoRemoveTimersRef.current.clear();
    };
  }, []);

  // 添加通知
  const addNotification = useCallback((
    notification: Omit<NotificationItem, 'id' | 'timestamp'>
  ): string => {
    const id = `notification_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const newNotification: NotificationItem = {
      ...notification,
      id,
      timestamp: new Date(),
      duration: notification.duration ?? defaultDuration,
      read: false
    };

    setNotifications(prev => {
      let updated = [newNotification, ...prev];
      
      // 限制最大通知数量
      if (updated.length > maxNotifications) {
        updated = updated.slice(0, maxNotifications);
      }
      
      return updated;
    });

    // 设置自动删除定时器
    if (newNotification.duration && newNotification.duration > 0) {
      const timer = setTimeout(() => {
        removeNotification(id);
      }, newNotification.duration);
      
      autoRemoveTimersRef.current.set(id, timer);
    }

    // 记录到日志
    logInfo(LogCategory.SYSTEM, 'useNotification', `添加通知: ${notification.title}`, {
      type: notification.type,
      duration: newNotification.duration
    });

    return id;
  }, [defaultDuration, maxNotifications, logInfo]);

  // 删除通知
  const removeNotification = useCallback((id: string) => {
    setNotifications(prev => prev.filter(notification => notification.id !== id));
    
    // 清理自动删除定时器
    const timer = autoRemoveTimersRef.current.get(id);
    if (timer) {
      clearTimeout(timer);
      autoRemoveTimersRef.current.delete(id);
    }
  }, []);

  // 标记为已读
  const markAsRead = useCallback((id: string) => {
    setNotifications(prev => 
      prev.map(notification => 
        notification.id === id 
          ? { ...notification, read: true }
          : notification
      )
    );
  }, []);

  // 标记全部为已读
  const markAllAsRead = useCallback(() => {
    setNotifications(prev => 
      prev.map(notification => ({ ...notification, read: true }))
    );
  }, []);

  // 清空所有通知
  const clearAll = useCallback(() => {
    setNotifications([]);
    
    // 清理所有定时器
    autoRemoveTimersRef.current.forEach(timer => clearTimeout(timer));
    autoRemoveTimersRef.current.clear();
    
    logInfo(LogCategory.SYSTEM, 'useNotification', '清空所有通知');
  }, [logInfo]);

  // 便捷方法 - 成功通知
  const success = useCallback((
    title: string, 
    message?: string, 
    options?: Partial<NotificationItem>
  ): string => {
    return addNotification({
      type: 'success',
      title,
      message,
      ...options
    });
  }, [addNotification]);

  // 便捷方法 - 信息通知
  const info = useCallback((
    title: string, 
    message?: string, 
    options?: Partial<NotificationItem>
  ): string => {
    return addNotification({
      type: 'info',
      title,
      message,
      ...options
    });
  }, [addNotification]);

  // 便捷方法 - 警告通知
  const warning = useCallback((
    title: string, 
    message?: string, 
    options?: Partial<NotificationItem>
  ): string => {
    return addNotification({
      type: 'warning',
      title,
      message,
      duration: 0, // 警告默认不自动消失
      ...options
    });
  }, [addNotification]);

  // 便捷方法 - 错误通知
  const error = useCallback((
    title: string, 
    message?: string, 
    options?: Partial<NotificationItem>
  ): string => {
    return addNotification({
      type: 'error',
      title,
      message,
      duration: 0, // 错误默认不自动消失
      ...options
    });
  }, [addNotification]);

  // 按类型获取通知
  const getNotificationsByType = useCallback((type: NotificationItem['type']): NotificationItem[] => {
    return notifications.filter(notification => notification.type === type);
  }, [notifications]);

  // 删除旧通知
  const removeOldNotifications = useCallback((olderThan: number) => {
    const cutoffTime = Date.now() - olderThan;
    
    setNotifications(prev => {
      const filtered = prev.filter(notification => 
        notification.timestamp.getTime() > cutoffTime
      );
      
      // 清理对应的定时器
      const removedIds = prev
        .filter(notification => notification.timestamp.getTime() <= cutoffTime)
        .map(notification => notification.id);
      
      removedIds.forEach(id => {
        const timer = autoRemoveTimersRef.current.get(id);
        if (timer) {
          clearTimeout(timer);
          autoRemoveTimersRef.current.delete(id);
        }
      });
      
      return filtered;
    });
    
    logInfo(LogCategory.SYSTEM, 'useNotification', `删除 ${olderThan}ms 前的旧通知`);
  }, [logInfo]);

  // 计算未读数量
  const unreadCount = notifications.filter(notification => !notification.read).length;

  return {
    // 数据
    notifications,
    unreadCount,
    
    // 操作
    addNotification,
    removeNotification,
    markAsRead,
    markAllAsRead,
    clearAll,
    
    // 便捷方法
    success,
    info,
    warning,
    error,
    
    // 批量操作
    getNotificationsByType,
    removeOldNotifications
  };
};