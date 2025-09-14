import React, { useState, useEffect } from 'react';
import type { Employee, EmployeeFormData } from '../types';

interface EmployeeFormProps {
  employee?: Employee | null;
  onSubmit: (employee: EmployeeFormData) => void;
  onCancel: () => void;
  isLoading?: boolean;
}

/**
 * 员工表单组件
 * 可复用的表单组件，支持新增和编辑模式
 */
export const EmployeeForm: React.FC<EmployeeFormProps> = ({
  employee,
  onSubmit,
  onCancel,
  isLoading = false
}) => {
  const [formData, setFormData] = useState<EmployeeFormData>({
    name: '',
    email: '',
    department: '',
    position: '',
    salary: 0,
    hire_date: new Date().toISOString().split('T')[0]
  });

  // 当employee prop变化时，更新表单数据
  useEffect(() => {
    if (employee) {
      setFormData({
        name: employee.name,
        email: employee.email,
        department: employee.department,
        position: employee.position,
        salary: employee.salary,
        hire_date: employee.hire_date
      });
    } else {
      setFormData({
        name: '',
        email: '',
        department: '',
        position: '',
        salary: 0,
        hire_date: new Date().toISOString().split('T')[0]
      });
    }
  }, [employee]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (isLoading) return;
    onSubmit(formData);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: name === 'salary' ? parseFloat(value) || 0 : value
    }));
  };

  const isEditing = !!employee;

  return (
    <div className="bg-white p-6 rounded-lg shadow">
      <h2 className="text-lg font-medium text-gray-900 mb-6">
        {isEditing ? '编辑员工' : '添加员工'}
      </h2>
      
      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
          <div>
            <label htmlFor="name" className="block text-sm font-medium text-gray-700">
              姓名 *
            </label>
            <input
              type="text"
              name="name"
              id="name"
              required
              value={formData.name}
              onChange={handleInputChange}
              className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
              disabled={isLoading}
            />
          </div>

          <div>
            <label htmlFor="email" className="block text-sm font-medium text-gray-700">
              邮箱 *
            </label>
            <input
              type="email"
              name="email"
              id="email"
              required
              value={formData.email}
              onChange={handleInputChange}
              className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
              disabled={isLoading}
            />
          </div>

          <div>
            <label htmlFor="department" className="block text-sm font-medium text-gray-700">
              部门 *
            </label>
            <select
              name="department"
              id="department"
              required
              value={formData.department}
              onChange={handleInputChange}
              className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
              disabled={isLoading}
            >
              <option value="">请选择部门</option>
              <option value="技术部">技术部</option>
              <option value="产品部">产品部</option>
              <option value="市场部">市场部</option>
              <option value="销售部">销售部</option>
              <option value="人事部">人事部</option>
              <option value="财务部">财务部</option>
            </select>
          </div>

          <div>
            <label htmlFor="position" className="block text-sm font-medium text-gray-700">
              职位 *
            </label>
            <input
              type="text"
              name="position"
              id="position"
              required
              value={formData.position}
              onChange={handleInputChange}
              className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
              disabled={isLoading}
            />
          </div>

          <div>
            <label htmlFor="salary" className="block text-sm font-medium text-gray-700">
              薪资 *
            </label>
            <input
              type="number"
              name="salary"
              id="salary"
              required
              min="0"
              step="0.01"
              value={formData.salary}
              onChange={handleInputChange}
              className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
              disabled={isLoading}
            />
          </div>

          <div>
            <label htmlFor="hire_date" className="block text-sm font-medium text-gray-700">
              入职日期 *
            </label>
            <input
              type="date"
              name="hire_date"
              id="hire_date"
              required
              value={formData.hire_date}
              onChange={handleInputChange}
              className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
              disabled={isLoading}
            />
          </div>
        </div>

        <div className="flex justify-end space-x-3">
          <button
            type="button"
            onClick={onCancel}
            className="bg-white py-2 px-4 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
            disabled={isLoading}
          >
            取消
          </button>
          <button
            type="submit"
            className="ml-3 inline-flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50"
            disabled={isLoading}
          >
            {isLoading ? '保存中...' : (isEditing ? '更新' : '添加')}
          </button>
        </div>
      </form>
    </div>
  );
};
