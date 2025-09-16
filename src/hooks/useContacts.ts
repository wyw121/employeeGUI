import { useCallback, useEffect, useState } from 'react';
import { ContactAPI } from '../api';
import {
    Contact,
    ContactDocument,
    ContactStatistics,
    ContactTask
} from '../types';

/**
 * 通讯录文档管理Hook
 */
export const useContactDocuments = () => {
  const [documents, setDocuments] = useState<ContactDocument[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // 获取文档列表
  const fetchDocuments = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const docs = await ContactAPI.getContactDocuments();
      setDocuments(docs);
    } catch (err) {
      setError('获取文档列表失败');
      console.error('Fetch documents error:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // 上传文档
  const uploadDocument = useCallback(async (filePath: string) => {
    setError(null);
    try {
      const document = await ContactAPI.uploadContactDocument(filePath);
      setDocuments(prev => [document, ...prev]);
      return document;
    } catch (err) {
      setError('文档上传失败');
      console.error('Upload document error:', err);
      throw err;
    }
  }, []);

  // 删除文档
  const deleteDocument = useCallback(async (documentId: string) => {
    setError(null);
    try {
      await ContactAPI.deleteContactDocument(documentId);
      setDocuments(prev => prev.filter(doc => doc.id !== documentId));
    } catch (err) {
      setError('删除文档失败');
      console.error('Delete document error:', err);
      throw err;
    }
  }, []);

  useEffect(() => {
    fetchDocuments();
  }, [fetchDocuments]);

  return {
    documents,
    isLoading,
    error,
    fetchDocuments,
    uploadDocument,
    deleteDocument,
    clearError: () => setError(null)
  };
};

/**
 * 联系人管理Hook
 */
export const useContacts = (documentId?: string) => {
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // 获取联系人列表
  const fetchContacts = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const contactList = await ContactAPI.getContacts(documentId);
      setContacts(contactList);
    } catch (err) {
      setError('获取联系人失败');
      console.error('Fetch contacts error:', err);
    } finally {
      setIsLoading(false);
    }
  }, [documentId]);

  // 搜索联系人
  const searchContacts = useCallback(async (query: string) => {
    setIsLoading(true);
    setError(null);
    try {
      const searchResults = await ContactAPI.searchContacts(query, documentId);
      setContacts(searchResults);
    } catch (err) {
      setError('搜索联系人失败');
      console.error('Search contacts error:', err);
    } finally {
      setIsLoading(false);
    }
  }, [documentId]);

  // 更新联系人
  const updateContact = useCallback(async (contact: Contact) => {
    setError(null);
    try {
      await ContactAPI.updateContact(contact);
      setContacts(prev =>
        prev.map(c => c.id === contact.id ? contact : c)
      );
    } catch (err) {
      setError('更新联系人失败');
      console.error('Update contact error:', err);
      throw err;
    }
  }, []);

  // 删除联系人
  const deleteContact = useCallback(async (contactId: string) => {
    setError(null);
    try {
      await ContactAPI.deleteContact(contactId);
      setContacts(prev => prev.filter(c => c.id !== contactId));
    } catch (err) {
      setError('删除联系人失败');
      console.error('Delete contact error:', err);
      throw err;
    }
  }, []);

  // 批量删除联系人
  const deleteContacts = useCallback(async (contactIds: string[]) => {
    setError(null);
    try {
      await ContactAPI.deleteContacts(contactIds);
      setContacts(prev => prev.filter(c => !contactIds.includes(c.id)));
    } catch (err) {
      setError('批量删除失败');
      console.error('Delete contacts error:', err);
      throw err;
    }
  }, []);

  useEffect(() => {
    fetchContacts();
  }, [fetchContacts]);

  return {
    contacts,
    isLoading,
    error,
    fetchContacts,
    searchContacts,
    updateContact,
    deleteContact,
    deleteContacts,
    clearError: () => setError(null)
  };
};

/**
 * 联系任务管理Hook
 */
export const useContactTasks = () => {
  const [tasks, setTasks] = useState<ContactTask[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // 获取任务列表
  const fetchTasks = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const taskList = await ContactAPI.getContactTasks();
      setTasks(taskList);
    } catch (err) {
      setError('获取任务列表失败');
      console.error('Fetch tasks error:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // 创建任务
  const createTask = useCallback(async (task: Omit<ContactTask, 'id' | 'createdAt'>) => {
    setError(null);
    try {
      const newTask = await ContactAPI.createContactTask(task);
      setTasks(prev => [newTask, ...prev]);
      return newTask;
    } catch (err) {
      setError('创建任务失败');
      console.error('Create task error:', err);
      throw err;
    }
  }, []);

  // 开始任务
  const startTask = useCallback(async (taskId: string) => {
    setError(null);
    try {
      await ContactAPI.startContactTask(taskId);
      setTasks(prev =>
        prev.map(task =>
          task.id === taskId
            ? { ...task, status: 'running' as any, startedAt: new Date() }
            : task
        )
      );
    } catch (err) {
      setError('启动任务失败');
      console.error('Start task error:', err);
      throw err;
    }
  }, []);

  // 暂停任务
  const pauseTask = useCallback(async (taskId: string) => {
    setError(null);
    try {
      await ContactAPI.pauseContactTask(taskId);
      setTasks(prev =>
        prev.map(task =>
          task.id === taskId
            ? { ...task, status: 'paused' as any }
            : task
        )
      );
    } catch (err) {
      setError('暂停任务失败');
      console.error('Pause task error:', err);
      throw err;
    }
  }, []);

  // 停止任务
  const stopTask = useCallback(async (taskId: string) => {
    setError(null);
    try {
      await ContactAPI.stopContactTask(taskId);
      setTasks(prev =>
        prev.map(task =>
          task.id === taskId
            ? { ...task, status: 'cancelled' as any, completedAt: new Date() }
            : task
        )
      );
    } catch (err) {
      setError('停止任务失败');
      console.error('Stop task error:', err);
      throw err;
    }
  }, []);

  // 删除任务
  const deleteTask = useCallback(async (taskId: string) => {
    setError(null);
    try {
      await ContactAPI.deleteContactTask(taskId);
      setTasks(prev => prev.filter(task => task.id !== taskId));
    } catch (err) {
      setError('删除任务失败');
      console.error('Delete task error:', err);
      throw err;
    }
  }, []);

  useEffect(() => {
    fetchTasks();
  }, [fetchTasks]);

  return {
    tasks,
    isLoading,
    error,
    fetchTasks,
    createTask,
    startTask,
    pauseTask,
    stopTask,
    deleteTask,
    clearError: () => setError(null)
  };
};

/**
 * 联系统计Hook
 */
export const useContactStatistics = () => {
  const [statistics, setStatistics] = useState<ContactStatistics | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // 获取统计数据
  const fetchStatistics = useCallback(async (timeRange?: 'today' | 'week' | 'month' | 'all') => {
    setIsLoading(true);
    setError(null);
    try {
      const stats = await ContactAPI.getContactStatistics(timeRange);
      setStatistics(stats);
    } catch (err) {
      setError('获取统计数据失败');
      console.error('Fetch statistics error:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  return {
    statistics,
    isLoading,
    error,
    fetchStatistics,
    clearError: () => setError(null)
  };
};

