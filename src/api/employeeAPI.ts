import { invoke } from '@tauri-apps/api/tauri';
import type { Employee, EmployeeFormData } from '../types';

/**
 * 员工API接口层 - 封装所有Tauri命令调用
 * 这一层隔离UI和后端逻辑，提供统一的API接口
 */
export class EmployeeAPI {
  /**
   * 获取所有员工列表
   */
  static async getEmployees(): Promise<Employee[]> {
    try {
      return await invoke<Employee[]>('get_employees');
    } catch (error) {
      console.error('Failed to fetch employees:', error);
      throw new Error(`获取员工列表失败: ${error}`);
    }
  }

  /**
   * 添加新员工
   */
  static async addEmployee(employee: EmployeeFormData): Promise<Employee> {
    try {
      return await invoke<Employee>('add_employee', { employee });
    } catch (error) {
      console.error('Failed to add employee:', error);
      throw new Error(`添加员工失败: ${error}`);
    }
  }

  /**
   * 更新员工信息
   */
  static async updateEmployee(employee: Employee): Promise<Employee> {
    try {
      return await invoke<Employee>('update_employee', { employee });
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
