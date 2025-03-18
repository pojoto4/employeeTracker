import inquirer from "inquirer";
import { pool, connectToDb } from "./db/connection.js";
import figlet from "figlet";

console.log(
  figlet.textSync("Employee Manager", {
    font: "Standard",
    horizontalLayout: "default",
    verticalLayout: "default",
    width: 80,
    whitespaceBreak: true,
  })
);

await connectToDb();
// view all departments, view all roles, view all employees, add a department, add a role, add an employee, and update an employee role

async function init() {
  try {
    const answers = await inquirer.prompt([
      {
        type: "list",
        name: "initialPrompt",
        message: "What would you like to do?",
        choices: [
          "view all departments",
          "view all roles",
          "view all employees",
          "add a department",
          "add a role",
          "add an employee",
          "update employee role",
          "exit",
        ],
      },
    ]);

    switch (answers.initialPrompt) {
      case "view all departments":
        await viewAllDepartments();
        break;
      case "view all roles":
        await viewAllRoles();
        break;
      case "view all employees":
        await viewAllEmployees();
        break;
      case "add a department":
        await addADepartment();
        break;
      case "add a role":
        await addARole();
        break;
      case "add an employee":
        await addAnEmployee();
        break;
      case "update employee role":
        await updateAnEmployee();
        break;
      default:
        quit();
        break;
    }
  } catch (err) {
    console.log(err);
  }
}

async function viewAllDepartments() {
  const sql = `SELECT * FROM department`;

  const result = await pool.query(sql);
  console.table(result.rows);
  init();
}

async function viewAllRoles() {
  const sql = `SELECT * FROM role`;

  const result = await pool.query(sql);
  console.table(result.rows);
  init();
}

async function viewAllEmployees() {
  const sql = `
    SELECT 
      e.id,
      e.first_name,
      e.last_name,
      r.title,
      d.name AS department,
      r.salary,
      CONCAT(m.first_name, ' ', m.last_name) AS manager
    FROM employee e
    LEFT JOIN role r ON e.role_id = r.id
    LEFT JOIN department d ON r.department_id = d.id
    LEFT JOIN employee m ON e.manager_id = m.id
    ORDER BY e.id
  `;

  const result = await pool.query(sql);
  console.table(result.rows);
  init();
}

async function addADepartment() {
  const { newDepartment } = await inquirer.prompt([
    {
      type: "input",
      name: "newDepartment",
      message: "What is the name of the department?",
      validate: (input) =>
        input.trim() !== "" || "Department name cannot be empty.",
    },
  ]);

  const sql = `INSERT INTO department (name) VALUES ($1) RETURNING *`;

  try {
    const result = await pool.query(sql, [newDepartment]);
    console.table(result.rows);
  } catch (error) {
    console.error("Error adding department:", error.message);
  }

  init();
}

async function addARole() {
  const departmentNames = await pool.query("SELECT id, name FROM department");
  const departments = departmentNames.rows;
  const { roleName, salaryAmount, departmentName } = await inquirer.prompt([
    {
      type: "input",
      name: "roleName",
      message: "What is the name of the role?",
      validate: (input) => input.trim() !== "" || "Role name cannot be empty.",
    },
    {
      type: "number",
      name: "salaryAmount",
      message: "What is the salary of the role?",
      validate: (input) =>
        !isNaN(input) || "Please enter a valid number for salary.",
    },
    {
      type: "list",
      name: "departmentName",
      message: "Which department does the role belong to?",
      choices: departments.map((dept) => ({ name: dept.name, value: dept.id })),
    },
  ]);

  const sql = `INSERT INTO role (title, salary, department_id) VALUES ($1, $2, $3) RETURNING *`;

  try {
    const result = await pool.query(sql, [
      roleName,
      salaryAmount,
      departmentName,
    ]);
    console.log("New role added successfully:");
    console.table(result.rows);
  } catch (error) {
    console.error("Error adding role:", error.message);
  }

  init();
}

async function addAnEmployee() {
  const roleNames = await pool.query("SELECT id, title FROM role");
  const roles = roleNames.rows;
  const managerNames = await pool.query(
    "SELECT id, first_name, last_name FROM employee"
  );
  const managers = managerNames.rows;

  const { firstName, lastName, roleName, managerName } = await inquirer.prompt([
    {
      type: "input",
      name: "firstName",
      message: "What is the employee's first name?",
      validate: (input) => input.trim() !== "" || "First name cannot be empty.",
    },
    {
      type: "input",
      name: "lastName",
      message: "What is the employee's last name?",
      validate: (input) => input.trim() !== "" || "Last name cannot be empty.",
    },
    {
      type: "list",
      name: "roleName",
      message: "What is the employee's role?",
      choices: roles.map((role) => ({ name: role.title, value: role.id })),
    },
    {
      type: "list",
      name: "managerName",
      message: "Who is the employee's manager?",
      choices: [
        { name: "None", value: null },
        ...managers.map((manager) => ({
          name: manager.first_name + " " + manager.last_name,
          value: manager.id,
        })),
      ],
    },
  ]);

  const sql = `INSERT INTO employee (first_name, last_name, role_id, manager_id) VALUES ($1, $2, $3, $4) RETURNING *`;

  try {
    const result = await pool.query(sql, [
      firstName,
      lastName,
      roleName,
      managerName,
    ]);
    console.log("New employee added successfully:");
    console.table(result.rows);
  } catch (error) {
    console.error("Error adding employee:", error.message);
  }

  init();
}

async function updateAnEmployee() {
  const employeeNames = await pool.query(
    "SELECT id, first_name, last_name FROM employee"
  );
  const employees = employeeNames.rows;
  const roleNames = await pool.query("SELECT id, title FROM role");
  const roles = roleNames.rows;

  const { employeeName, roleName } = await inquirer.prompt([
    {
      type: "list",
      name: "employeeName",
      message: "Which employee's role do you want to update?",
      choices: employees.map((employee) => ({
        name: employee.first_name + " " + employee.last_name,
        value: employee.id,
      })),
    },
    {
      type: "list",
      name: "roleName",
      message: "Which role do you want to assign the selected employee?",
      choices: roles.map((role) => ({ name: role.title, value: role.id })),
    },
  ]);

  const sql = `UPDATE employee SET role_id = $1 WHERE id = $2 RETURNING *`;

  try {
    const result = await pool.query(sql, [roleName, employeeName]);
    console.log("Employee updated successfully:");
    console.table(result.rows);
  } catch (error) {
    console.error("Error adding employee:", error.message);
  }

  init();
}

function quit() {
  console.log("Goodbye");
  process.exit();
}

init();
