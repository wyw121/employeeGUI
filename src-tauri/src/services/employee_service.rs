use rusqlite::{Connection, Result as SqliteResult};
use serde::{Deserialize, Serialize};
use std::path::PathBuf;
use tauri::api::path::app_data_dir;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Employee {
    pub id: Option<i32>,
    pub name: String,
    pub email: String,
    pub department: String,
    pub position: String,
    pub salary: f64,
    pub hire_date: String,
}

pub struct EmployeeService {
    conn: Connection,
}

impl EmployeeService {
    pub fn new() -> SqliteResult<Self> {
        // 获取应用数据目录
        let app_data_dir = app_data_dir(&tauri::Config::default()).unwrap_or_else(|| {
            PathBuf::from("./data")
        });
        
        // 确保目录存在
        std::fs::create_dir_all(&app_data_dir).unwrap_or_default();
        
        let db_path = app_data_dir.join("employees.db");
        let conn = Connection::open(db_path)?;

        // 创建员工表
        conn.execute(
            "CREATE TABLE IF NOT EXISTS employees (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                name TEXT NOT NULL,
                email TEXT NOT NULL UNIQUE,
                department TEXT NOT NULL,
                position TEXT NOT NULL,
                salary REAL NOT NULL,
                hire_date TEXT NOT NULL
            )",
            [],
        )?;

        Ok(Self { conn })
    }

    pub fn get_all(&self) -> SqliteResult<Vec<Employee>> {
        let mut stmt = self.conn.prepare(
            "SELECT id, name, email, department, position, salary, hire_date FROM employees"
        )?;
        
        let employee_iter = stmt.query_map([], |row| {
            Ok(Employee {
                id: Some(row.get(0)?),
                name: row.get(1)?,
                email: row.get(2)?,
                department: row.get(3)?,
                position: row.get(4)?,
                salary: row.get(5)?,
                hire_date: row.get(6)?,
            })
        })?;

        let mut employees = Vec::new();
        for employee in employee_iter {
            employees.push(employee?);
        }
        
        Ok(employees)
    }

    pub fn create(&mut self, mut employee: Employee) -> SqliteResult<Employee> {
        self.conn.execute(
            "INSERT INTO employees (name, email, department, position, salary, hire_date) 
             VALUES (?1, ?2, ?3, ?4, ?5, ?6)",
            [
                &employee.name,
                &employee.email,
                &employee.department,
                &employee.position,
                &employee.salary.to_string(),
                &employee.hire_date,
            ],
        )?;

        employee.id = Some(self.conn.last_insert_rowid() as i32);
        Ok(employee)
    }

    pub fn update(&mut self, employee: Employee) -> SqliteResult<Employee> {
        let id = employee.id.ok_or_else(|| {
            rusqlite::Error::InvalidParameterName("Employee ID is required for update".to_string())
        })?;

        self.conn.execute(
            "UPDATE employees SET name = ?1, email = ?2, department = ?3, position = ?4, salary = ?5, hire_date = ?6 
             WHERE id = ?7",
            [
                &employee.name,
                &employee.email,
                &employee.department,
                &employee.position,
                &employee.salary.to_string(),
                &employee.hire_date,
                &id.to_string(),
            ],
        )?;

        Ok(employee)
    }

    pub fn delete(&mut self, id: i32) -> SqliteResult<()> {
        self.conn.execute("DELETE FROM employees WHERE id = ?1", [id])?;
        Ok(())
    }

    pub fn get_by_id(&self, id: i32) -> SqliteResult<Option<Employee>> {
        let mut stmt = self.conn.prepare(
            "SELECT id, name, email, department, position, salary, hire_date FROM employees WHERE id = ?1"
        )?;

        let mut employee_iter = stmt.query_map([id], |row| {
            Ok(Employee {
                id: Some(row.get(0)?),
                name: row.get(1)?,
                email: row.get(2)?,
                department: row.get(3)?,
                position: row.get(4)?,
                salary: row.get(5)?,
                hire_date: row.get(6)?,
            })
        })?;

        match employee_iter.next() {
            Some(employee) => Ok(Some(employee?)),
            None => Ok(None),
        }
    }
}
