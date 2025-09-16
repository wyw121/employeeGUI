import { useAuth } from './useAuth';

/**
 * 权限检查Hook
 * 用于检查当前用户是否具有特定权限
 */
export const usePermissions = () => {
  const { employee, hasPermission } = useAuth();

  /**
   * 检查是否为管理员
   */
  const isAdmin = () => {
    return employee?.role === 'admin';
  };

  /**
   * 检查是否为主管
   */
  const isSupervisor = () => {
    return employee?.role === 'supervisor' || isAdmin();
  };

  /**
   * 检查是否为操作员
   */
  const isOperator = () => {
    return employee?.role === 'operator' || isSupervisor();
  };

  /**
   * 检查是否可以管理设备
   */
  const canManageDevices = () => {
    return hasPermission('devices', 'update') || hasPermission('devices', 'delete');
  };

  /**
   * 检查是否可以管理用户
   */
  const canManageUsers = () => {
    return hasPermission('users', 'create') || hasPermission('users', 'update') || hasPermission('users', 'delete');
  };

  /**
   * 检查是否可以查看日志
   */
  const canViewLogs = () => {
    return hasPermission('logs', 'read');
  };

  /**
   * 检查是否可以管理任务
   */
  const canManageTasks = () => {
    return hasPermission('tasks', 'create') || hasPermission('tasks', 'update') || hasPermission('tasks', 'delete');
  };

  /**
   * 检查是否可以执行任务
   */
  const canExecuteTasks = () => {
    return hasPermission('tasks', 'execute');
  };

  /**
   * 检查是否可以管理通讯录
   */
  const canManageContacts = () => {
    return hasPermission('contacts', 'create') || hasPermission('contacts', 'update') || hasPermission('contacts', 'delete');
  };

  /**
   * 检查是否可以查看统计
   */
  const canViewStatistics = () => {
    return hasPermission('statistics', 'read');
  };

  /**
   * 检查是否可以修改系统设置
   */
  const canModifySettings = () => {
    return hasPermission('settings', 'update');
  };

  return {
    employee,
    hasPermission,

    // 角色检查
    isAdmin,
    isSupervisor,
    isOperator,

    // 功能权限检查
    canManageDevices,
    canManageUsers,
    canViewLogs,
    canManageTasks,
    canExecuteTasks,
    canManageContacts,
    canViewStatistics,
    canModifySettings
  };
};

export default usePermissions;

