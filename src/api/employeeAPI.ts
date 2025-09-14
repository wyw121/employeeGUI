import { invoke } from '@tauri-apps/api/core';
import type { EmployeeData, EmployeeFormData } from '../types';

/**
 * 员工API接口层 - 封装所有Tauri命令调用
 * 这一层隔离UI和后端逻辑，提供统一的API接口
 */
export class EmployeeAPI {
  /**
   * 获取所有员工列表
   */
  static async getEmployees(): Promise<EmployeeData[]> {
    try {
      return await invoke<EmployeeData[]>('get_employees');
    } catch (error) {
      console.error('Failed to fetch employees:', error);
      throw new Error(`获取员工列表失败: ${error}`);
    }
  }

  /**
   * 添加新员工
   */
  static async addEmployee(employee: EmployeeFormData): Promise<EmployeeData> {
    try {
      return await invoke<EmployeeData>('add_employee', { employee });
    } catch (error) {
      console.error('Failed to add employee:', error);
      throw new Error(`添加员工失败: ${error}`);
    }
  }

  /**
   * 更新员工信息
   */
  static async updateEmployee(employee: EmployeeData): Promise<EmployeeData> {
    try {
      return await invoke<EmployeeData>('update_employee', { employee });
    } catch (error) {
      console.error('Failed to update employee:', error);
      throw new Error(`更新员工信息失败: ${error}`);
    }
  }

  /**
   * 删除员工
   */
  static async deleteEmployee(id: number): Promise<void> {
    try {
      await invoke<void>('delete_employee', { id });
    } catch (error) {
      console.error('Failed to delete employee:', error);
      throw new Error(`删除员工失败: ${error}`);
    }
  }
}

export default EmployeeAPI;
