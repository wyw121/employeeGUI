import React, { useState, useEffect } from 'react';
import { EmployeeTable, EmployeeForm } from '../components';
import { EmployeeAPI } from '../api';
import type { Employee, EmployeeFormData } from '../types';

/**
 * 员工管理主页面
 * 包含员工列表展示、添加、编辑、删除功能
 */
export const EmployeePage: React.FC = () => {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [editingEmployee, setEditingEmployee] = useState<Employee | null>(null);
  const [isShowingForm, setIsShowingForm] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isFormLoading, setIsFormLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // 加载员工列表
  const loadEmployees = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const data = await EmployeeAPI.getEmployees();
      setEmployees(data);
    } catch (error) {
      setError(error instanceof Error ? error.message : '加载员工列表失败');
      console.error('Failed to load employees:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // 组件挂载时加载数据
  useEffect(() => {
    loadEmployees();
  }, []);

  // 处理添加员工
  const handleAddEmployee = async (employeeData: EmployeeFormData) => {
    try {
      setIsFormLoading(true);
      setError(null);
      await EmployeeAPI.addEmployee(employeeData);
      await loadEmployees(); // 重新加载列表
      setIsShowingForm(false);
    } catch (error) {
      setError(error instanceof Error ? error.message : '添加员工失败');
      console.error('Failed to add employee:', error);
    } finally {
      setIsFormLoading(false);
    }
  };

  // 处理更新员工
  const handleUpdateEmployee = async (employeeData: EmployeeFormData) => {
    if (!editingEmployee?.id) return;

    try {
      setIsFormLoading(true);
      setError(null);
      const updatedEmployee: Employee = {
        ...employeeData,
        id: editingEmployee.id
      };
      await EmployeeAPI.updateEmployee(updatedEmployee);
      await loadEmployees(); // 重新加载列表
      setEditingEmployee(null);
      setIsShowingForm(false);
    } catch (error) {
      setError(error instanceof Error ? error.message : '更新员工失败');
      console.error('Failed to update employee:', error);
    } finally {
      setIsFormLoading(false);
    }
  };

  // 处理删除员工
  const handleDeleteEmployee = async (id: number) => {
    if (!confirm('确定要删除这个员工吗？')) return;

    try {
      setError(null);
      await EmployeeAPI.deleteEmployee(id);
      await loadEmployees(); // 重新加载列表
    } catch (error) {
      setError(error instanceof Error ? error.message : '删除员工失败');
      console.error('Failed to delete employee:', error);
    }
  };

  // 处理编辑员工
  const handleEditEmployee = (employee: Employee) => {
    setEditingEmployee(employee);
    setIsShowingForm(true);
  };

  // 处理取消表单
  const handleCancelForm = () => {
    setEditingEmployee(null);
    setIsShowingForm(false);
    setError(null);
  };

  // 处理表单提交
  const handleFormSubmit = (employeeData: EmployeeFormData) => {
    if (editingEmployee) {
      handleUpdateEmployee(employeeData);
    } else {
      handleAddEmployee(employeeData);
    }
  };

  return (
    <div className="min-h-screen bg-gray-100">
      <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          {/* 页头 */}
          <div className="flex justify-between items-center mb-6">
            <h1 className="text-3xl font-bold text-gray-900">员工管理系统</h1>
            {!isShowingForm && (
              <button
                onClick={() => setIsShowingForm(true)}
                className="bg-indigo-600 hover:bg-indigo-700 text-white font-medium py-2 px-4 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
              >
                添加员工
              </button>
            )}
          </div>

          {/* 错误提示 */}
          {error && (
            <div className="mb-4 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-md">
              {error}
              <button
                onClick={() => setError(null)}
                className="float-right text-red-500 hover:text-red-700"
              >
                ✕
              </button>
            </div>
          )}

          {/* 表单区域 */}
          {isShowingForm && (
            <div className="mb-6">
              <EmployeeForm
                employee={editingEmployee}
                onSubmit={handleFormSubmit}
                onCancel={handleCancelForm}
                isLoading={isFormLoading}
              />
            </div>
          )}

          {/* 员工列表 */}
          {!isShowingForm && (
            <div className="bg-white shadow overflow-hidden sm:rounded-md">
              <EmployeeTable
                employees={employees}
                onEdit={handleEditEmployee}
                onDelete={handleDeleteEmployee}
                isLoading={isLoading}
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
