export interface Employee {
  id?: number;
  name: string;
  email: string;
  department: string;
  position: string;
  salary: number;
  hire_date: string;
}

export interface EmployeeFormData extends Omit<Employee, 'id'> {}
