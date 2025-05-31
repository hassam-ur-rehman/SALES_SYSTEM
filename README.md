# Sales Management System (DBMS Project 2.0)

A web-based application for managing sales, inventory, customers, and suppliers. Built with Node.js, Express.js, EJS, and MySQL.

## Table of Contents
1.  [Features](#features)
2.  [Prerequisites](#prerequisites)
3.  [Setup and Installation](#setup-and-installation)
4.  [Running the Application](#running-the-application)
5.  [Using the Application](#using-the-application)
    *   [User Roles](#user-roles)
    *   [Registration](#registration)
    *   [Login & Logout](#login--logout)
    *   [Dashboard (Home Page)](#dashboard-home-page)
    *   [Managing Items](#managing-items)
    *   [Managing Categories](#managing-categories)
    *   [Managing Suppliers](#managing-suppliers)
    *   [Managing Customers](#managing-customers)
    *   [Recording Sales](#recording-sales)
    *   [Viewing Sales Details](#viewing-sales-details)
    *   [Viewing Records (Future)](#viewing-records-future)
    *   [User Management (Future - Admin)](#user-management-future---admin)
6.  [Database Schema](#database-schema)
7.  [Future Enhancements](#future-enhancements)

## Features

*   User registration and secure login (password hashing with bcrypt, session management).
*   Dashboard providing quick access to different modules.
*   **Item Management:**
    *   List all inventory items.
    *   Add new items with details (SKU, description, prices, stock, category, supplier).
    *   Edit existing item details.
    *   Delete items (with checks for existing sales references).
*   **Category Management:**
    *   List all item categories.
    *   Add new categories.
    *   Edit existing categories.
    *   Delete categories.
    *   Link categories to items.
*   **Supplier Management:**
    *   List all suppliers.
    *   Add new suppliers with contact details.
    *   Edit existing supplier details.
    *   Delete suppliers (with checks for purchase order references).
    *   Link suppliers to items.
*   **Customer Management:**
    *   List all customers.
    *   Add new customers with contact details.
    *   Edit existing customer details.
    *   Delete customers.
*   **Sales Processing:**
    *   Create new sales transactions (retail/wholesale).
    *   Associate sales with customers (optional, for guest sales).
    *   Dynamically add multiple items to a sale, specifying quantity and price at sale.
    *   Automatic stock level updates upon sale completion (via database triggers).
    *   Automatic logging of sales in inventory transaction records (via database triggers).
*   **Sales Viewing:**
    *   List recent sales.
    *   View detailed information for individual sales, including items sold.
*   Protected routes ensuring only logged-in users can access management features.
*   (Planned) Role-based access control for certain features.
*   (Planned) Reporting features.

## Prerequisites

*   [Node.js](https://nodejs.org/) (v16.x or later recommended)
*   [NPM](https://www.npmjs.com/) (usually comes with Node.js)
*   [MySQL Server](https://dev.mysql.com/downloads/mysql/) (v8.x recommended)
*   A MySQL client tool (e.g., MySQL Workbench, DBeaver, phpMyAdmin) for database setup.

## Setup and Installation

1.  **Clone the Repository (or Download Files):**
    ```bash
    # If using Git
    git clone <repository_url>
    cd "dbms project 2.0"
    ```
    If you have the files directly, navigate to the `dbms project 2.0` directory.

2.  **Install Dependencies:**
    Open a terminal in the project root (`dbms project 2.0`) and run:
    ```bash
    npm install
    ```
    This will install all the necessary packages listed in `package.json` (Express, EJS, mysql2, bcrypt, express-session, etc.).

3.  **Database Setup:**
    *   Ensure your MySQL server is running.
    *   Using your MySQL client, create the database:
        ```sql
        CREATE DATABASE salesdb;
        ```
    *   Connect to the `salesdb` database.
    *   Execute the SQL schema script provided (e.g., `schema.sql` or the SQL code you have) to create all the necessary tables (`Users`, `Items`, `Categories`, `Suppliers`, `Customer`, `Sales`, `Sale_Items`, `Inventory_Transactions`, `Purchase_Orders`, `Purchase_Order_Items`) and their relationships (foreign keys, triggers).

4.  **Environment Variables:**
    *   In the project root (`dbms project 2.0`), create a file named `.env`.
    *   Add the following content, replacing placeholder values with your actual credentials:
        ```env
        DB_HOST=localhost
        DB_USER=your_mysql_username
        DB_PASSWORD=your_mysql_password
        DB_NAME=salesdb
        APP_PORT=3000
        SESSION_SECRET=yourVeryStrongAndRandomSecretKey!ChangeThis!
        NODE_ENV=development # Set to 'production' for deployment
        ```
        *   Replace `your_mysql_username` and `your_mysql_password`.
        *   Ensure `DB_NAME` is `salesdb`.
        *   Change `SESSION_SECRET` to a long, random, unique string.

5.  **Create an Initial Admin User (Manual Step):**
    *   Run the utility script to hash a password:
        ```bash
        node hash-password.js
        ```
    *   When prompted, enter a strong password for your admin account (e.g., `adminpass123`).
    *   Copy the entire hashed password string outputted to the terminal.
    *   In your MySQL client (connected to `salesdb`), insert the admin user:
        ```sql
        INSERT INTO Users (username, password_hash, full_name, role, is_active)
        VALUES ('admin', 'PASTE_THE_COPIED_HASH_HERE', 'Administrator', 'admin', TRUE);
        ```
        (Replace `PASTE_THE_COPIED_HASH_HERE` with the actual hash).

## Running the Application

1.  Open a terminal in the project root (`dbms project 2.0`).
2.  Start the server:
    ```bash
    node app.js
    ```
3.  If successful, you will see a message like: `Server for DBMS Project 2.0 is running on http://localhost:3000`.
4.  Open your web browser and navigate to `http://localhost:3000`.

## Using the Application

### User Roles
The system currently supports the following roles (you may define more):
*   **admin:** Has full access to all features, including user management (when implemented).
*   **staff:** Can manage inventory, sales, customers, suppliers, and categories. (Default role for new registrations).
*   **(manager):** (Planned) May have intermediate permissions, like viewing reports or approving certain actions.

### Registration
1.  Navigate to the application (e.g., `http://localhost:3000`).
2.  If not logged in, click the "Login" link in the navigation.
3.  On the login page, click the "Register here" link.
4.  Fill in the registration form:
    *   Full Name
    *   Username (must be unique)
    *   Password (must be at least 6 characters)
    *   Confirm Password
5.  Click "Register".
6.  Upon successful registration, you will be redirected to the login page with a success message.

### Login & Logout
*   **Login:**
    1.  Navigate to the "Login" page (usually via the navigation bar or if redirected when trying to access a protected page).
    2.  Enter your registered Username and Password.
    3.  Click "Login".
    4.  If successful, you will be redirected to the Dashboard/Home page. The navigation bar will show "Logout (your_username)".
    5.  If unsuccessful (e.g., invalid credentials, inactive account), an error message will be displayed on the login page.
*   **Logout:**
    1.  Click the "Logout (your_username)" link in the navigation bar.
    2.  You will be logged out and redirected to the login page with a success message.

### Dashboard (Home Page)
Once logged in, the home page serves as a dashboard providing:
*   A personalized welcome message.
*   Quick link "cards" to navigate to major sections of the application (Manage Sales, Items, Customers, etc.).
*   Some links may be visible only to certain user roles (e.g., "User Management" for admins).

### Managing Items
1.  Navigate to "Items" from the dashboard or main navigation.
2.  **View Items:** A list of all inventory items is displayed with details like SKU, category, supplier, price, and stock.
3.  **Add New Item:**
    *   Click the "Add New Item" button.
    *   Fill in the item details form. Fields marked with `*` are required.
    *   You can select existing Categories and Suppliers from dropdowns.
    *   If a required Category or Supplier is missing, click the "(+ Add New)" link next to the respective dropdown. This will take you to a form to add the new category/supplier. After adding, you'll be redirected back to the item form (you may need to re-select from the dropdown or refresh if the new item doesn't appear immediately).
    *   Click "Add Item" to save.
4.  **Edit Item:**
    *   In the items list, click the "Edit" link for the desired item.
    *   The item form will load, pre-filled with the item's current details.
    *   Modify the details as needed.
    *   Click "Update Item" to save changes.
5.  **Delete Item:**
    *   In the items list, click the "Delete" link for the item.
    *   A confirmation dialog will appear. Click "OK" to confirm.
    *   **Note:** An item cannot be deleted if it is part of any existing sales records due to data integrity constraints. You will receive an error message in such cases. Consider marking such items as "discontinued" or "inactive" (a feature not yet implemented) instead of hard deleting.

### Managing Categories
1.  Navigate to "Categories".
2.  **View Categories:** A list of all item categories.
3.  **Add New Category:** Click "Add New Category", fill in the name and optional description, and save.
4.  **Edit Category:** Click "Edit" for a category, modify, and save.
5.  **Delete Category:** Click "Delete" and confirm. Items previously in this category will have their category field set to NULL.

### Managing Suppliers
1.  Navigate to "Suppliers".
2.  **View Suppliers:** A list of all suppliers.
3.  **Add New Supplier:** Click "Add New Supplier", fill in the details, and save.
4.  **Edit Supplier:** Click "Edit" for a supplier, modify, and save.
5.  **Delete Supplier:** Click "Delete" and confirm.
    *   **Note:** A supplier cannot be deleted if they are referenced in existing Purchase Orders (if that module is active). Items previously linked to this supplier will have their supplier field set to NULL.

### Managing Customers
1.  Navigate to "Customers".
2.  **View Customers:** A list of all customers.
3.  **Add New Customer:** Click "Add New Customer", fill in the details, and save.
4.  **Edit Customer:** Click "Edit" for a customer, modify, and save.
5.  **Delete Customer:** Click "Delete" and confirm. Sales previously associated with this customer will have their customer field set to NULL (guest sale).

### Recording Sales
1.  Navigate to "Sales" and click "Create New Sale" (or directly to `/sales/add`).
2.  **Fill in Sale Details:**
    *   Select a Customer (optional, defaults to Guest Sale).
    *   Select the Processing User (staff member making the sale).
    *   Choose Sale Type (Retail/Wholesale).
    *   Enter Payment Method (optional).
    *   Add Notes (optional).
3.  **Add Items to Sale:**
    *   Use the "Select Item" dropdown to choose an item. Available stock is shown.
    *   Enter the "Quantity".
    *   Click "Add to Sale". The item will appear in the table below. The unit price will be based on the selected Sale Type (retail or wholesale price from the item's record).
    *   You can add multiple different items or increase the quantity of an already added item.
    *   Stock levels are checked client-side to prevent overselling from the dropdown.
    *   Remove items from the current sale using the "Remove" button next to each item in the table.
4.  **Record Sale:**
    *   Once all items are added and details are correct, click the "Record Sale" button.
    *   The system will perform server-side stock checks again.
    *   If successful, the sale will be recorded, stock levels for sold items will be updated, and an inventory transaction will be logged (all via database triggers).
    *   You will be redirected to the sales list with a success message.
    *   If there are errors (e.g., insufficient stock discovered server-side, validation issues), an error message will be shown, and you may need to adjust the sale.

### Viewing Sales Details
1.  Navigate to "Sales".
2.  A list of recent sales will be displayed.
3.  Click the "View Details" link for any sale.
4.  A page will show all information for that sale, including customer details (if any), user who processed it, and a list of all items sold with their quantities and prices at the time of sale.

### Viewing Records (Future)
*   (Not yet implemented) A section to view inventory transaction logs.

### User Management (Future - Admin)
*   (Not yet implemented) Admins will be able to manage user accounts (activate/deactivate, change roles).

## Database Schema
The system uses the following main tables:
*   `Users`: Stores user credentials and roles.
*   `Items`: Inventory items, stock levels, prices.
*   `Categories`: For organizing items.
*   `Suppliers`: Information about suppliers.
*   `Customer`: Customer details.
*   `Sales`: Header information for each sale transaction.
*   `Sale_Items`: Line items for each sale, linking `Sales` and `Items`.
*   `Inventory_Transactions`: Audit log for all stock movements (sales, purchases, adjustments).
*   `Purchase_Orders` & `Purchase_Order_Items`: (Optional module) For tracking orders placed with suppliers.

Refer to the SQL schema file for detailed table structures, columns, and relationships.

## Future Enhancements
*   Role-based authorization for finer-grained access control.
*   Dashboard with key performance indicators (KPIs).
*   Advanced sales and inventory reporting (e.g., profit margins, stock aging).
*   Purchase order management.
*   Barcode scanning integration.
*   Printing receipts/invoices.
*   More robust client-side and server-side validation.
*   Pagination for long lists.
*   Search and filtering capabilities on list pages.
*   AJAX for smoother UI interactions (e.g., adding items to sale without page refresh).
